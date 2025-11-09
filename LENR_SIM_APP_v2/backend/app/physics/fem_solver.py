"""
Finite Element Method (FEM) Solver for LENR Simulations

This module provides FEM capabilities for LENR simulations, including:
1. Electromagnetism - solving Maxwell's equations in various forms
2. Heat Transfer - solving temperature distribution with heat sources
3. Structural Mechanics - analyzing stress, strain, and deformation
4. Coupled Physics - handling multiphysics interactions

The module integrates with the existing simulation framework and uses
numpy and scipy for efficient numerical computations.
"""

import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla
from typing import Dict, List, Tuple, Optional, Union, Callable, Any
import logging
import time
from enum import Enum, auto
from dataclasses import dataclass, field

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("fem_solver", "logs/simulation.log")

class ElementType(Enum):
    """Enumeration of supported finite element types"""
    LINEAR_TRIANGLE = auto()  # P1 element (linear, triangular)
    QUADRATIC_TRIANGLE = auto()  # P2 element (quadratic, triangular)
    LINEAR_TETRAHEDRON = auto()  # Linear tetrahedral element
    QUADRATIC_TETRAHEDRON = auto()  # Quadratic tetrahedral element
    LINEAR_QUADRILATERAL = auto()  # Q1 element (linear, quad)
    QUADRATIC_QUADRILATERAL = auto()  # Q2 element (quadratic, quad)
    LINEAR_HEXAHEDRON = auto()  # Linear hexahedral element
    QUADRATIC_HEXAHEDRON = auto()  # Quadratic hexahedral element

class PhysicsType(Enum):
    """Enumeration of supported physics types"""
    ELECTROMAGNETIC = auto()  # Electromagnetism (E&M fields)
    THERMAL = auto()  # Heat transfer
    STRUCTURAL = auto()  # Solid mechanics
    MULTIPHYSICS = auto()  # Coupled physics

@dataclass
class MeshData:
    """Data class for mesh information"""
    # Nodal coordinates (N x dim)
    nodes: np.ndarray
    # Element connectivity (M x nodes_per_element)
    elements: np.ndarray
    # Node markers for boundary conditions (optional)
    node_markers: Optional[Dict[str, np.ndarray]] = None
    # Element markers for material properties (optional)
    element_markers: Optional[Dict[str, np.ndarray]] = None
    # Facet connectivity and markers (optional)
    facets: Optional[np.ndarray] = None
    facet_markers: Optional[Dict[str, np.ndarray]] = None
    # Dimension of the problem
    dimension: int = field(init=False)
    # Number of nodes
    num_nodes: int = field(init=False)
    # Number of elements
    num_elements: int = field(init=False)
    
    def __post_init__(self):
        """Calculate derived attributes"""
        self.num_nodes = self.nodes.shape[0]
        self.num_elements = self.elements.shape[0]
        self.dimension = self.nodes.shape[1]

@dataclass
class FEMConfig:
    """Configuration for FEM solver"""
    # Element type to use
    element_type: ElementType = ElementType.LINEAR_TRIANGLE
    # Type of physics to solve
    physics_type: PhysicsType = PhysicsType.THERMAL
    # Solver tolerance
    solver_tolerance: float = 1e-6
    # Maximum iterations for iterative solvers
    max_iterations: int = 1000
    # Linear solver type ('direct', 'cg', 'gmres', etc.)
    solver_type: str = 'direct'
    # Whether to use adaptive mesh refinement
    adaptive_refinement: bool = False
    # Error tolerance for adaptive refinement
    refinement_tolerance: float = 1e-3
    # Maximum number of refinement steps
    max_refinement_steps: int = 5

class BoundaryCondition:
    """Class representing a boundary condition"""
    
    def __init__(
        self,
        boundary_name: str,
        condition_type: str,  # 'dirichlet', 'neumann', 'robin'
        value: Union[float, np.ndarray, Callable],
        component: Optional[int] = None
    ):
        """
        Initialize a boundary condition.
        
        Args:
            boundary_name: Name of the boundary (corresponding to node_markers)
            condition_type: Type of boundary condition
            value: Value to apply (scalar, vector, or function)
            component: Component to apply for vector fields (optional)
        """
        self.boundary_name = boundary_name
        self.condition_type = condition_type.lower()
        self.value = value
        self.component = component
        
        # Validate
        if self.condition_type not in ['dirichlet', 'neumann', 'robin']:
            raise ValueError(f"Unsupported boundary condition type: {condition_type}")

class Material:
    """Class representing material properties"""
    
    def __init__(
        self,
        name: str,
        properties: Dict[str, Union[float, np.ndarray, Callable]]
    ):
        """
        Initialize material properties.
        
        Args:
            name: Material name
            properties: Dictionary of material properties
        """
        self.name = name
        self.properties = properties

class FEMSolver:
    """
    Finite Element Method solver for LENR simulations.
    """
    
    def __init__(
        self,
        mesh: MeshData,
        config: Optional[FEMConfig] = None
    ):
        """
        Initialize the FEM solver.
        
        Args:
            mesh: Mesh data for the simulation
            config: Solver configuration
        """
        self.mesh = mesh
        self.config = config or FEMConfig()
        
        # Storage for boundary conditions
        self.boundary_conditions: List[BoundaryCondition] = []
        
        # Storage for materials
        self.materials: Dict[str, Material] = {}
        
        # Maps from element markers to materials
        self.element_material_map: Dict[str, str] = {}
        
        # Solution storage
        self.solution: Optional[np.ndarray] = None
        
        # Derived quantities
        self.derived_quantities: Dict[str, np.ndarray] = {}
        
        # System matrices and vectors
        self.A: Optional[sp.spmatrix] = None  # System matrix
        self.b: Optional[np.ndarray] = None  # RHS vector
        
        # Number of degrees of freedom
        self.num_dofs: int = 0
        
        # Initialize numbering of degrees of freedom based on element type
        self._init_dofs()
        
        logger.info(f"Created FEM solver with {self.num_dofs} degrees of freedom")
    
    def _init_dofs(self):
        """Initialize degrees of freedom based on element type and physics"""
        # Basic case: one DOF per node for scalar problems
        if self.config.physics_type == PhysicsType.THERMAL:
            # Scalar temperature field
            self.num_dofs = self.mesh.num_nodes
            self.dof_map = np.arange(self.mesh.num_nodes)
        elif self.config.physics_type == PhysicsType.ELECTROMAGNETIC:
            # Vector field with dim components per node
            self.num_dofs = self.mesh.num_nodes * self.mesh.dimension
            # Map from (node_idx, component) to global DOF
            self.dof_map = np.arange(self.num_dofs).reshape(self.mesh.num_nodes, self.mesh.dimension)
        elif self.config.physics_type == PhysicsType.STRUCTURAL:
            # Vector field with dim components per node for displacements
            self.num_dofs = self.mesh.num_nodes * self.mesh.dimension
            # Map from (node_idx, component) to global DOF
            self.dof_map = np.arange(self.num_dofs).reshape(self.mesh.num_nodes, self.mesh.dimension)
        elif self.config.physics_type == PhysicsType.MULTIPHYSICS:
            # For coupled problems, will depend on the specific coupling
            # Default to temperature + E-field + displacement
            dofs_per_node = 1 + self.mesh.dimension + self.mesh.dimension
            self.num_dofs = self.mesh.num_nodes * dofs_per_node
            # Map from (node_idx, field, component) to global DOF
            self.dof_map = np.arange(self.num_dofs).reshape(self.mesh.num_nodes, dofs_per_node)
        
        logger.debug(f"Initialized {self.num_dofs} degrees of freedom")
    
    def add_boundary_condition(self, bc: BoundaryCondition):
        """
        Add a boundary condition to the model.
        
        Args:
            bc: Boundary condition to add
        """
        self.boundary_conditions.append(bc)
        logger.debug(f"Added {bc.condition_type} boundary condition on {bc.boundary_name}")
    
    def add_material(self, material: Material, element_marker: str):
        """
        Add a material and associate it with elements.
        
        Args:
            material: Material properties
            element_marker: Element marker to associate with this material
        """
        self.materials[material.name] = material
        self.element_material_map[element_marker] = material.name
        logger.debug(f"Added material {material.name} for elements marked {element_marker}")
    
    def _get_shape_functions(self, element_type: ElementType) -> Tuple[Callable, Callable]:
        """
        Get shape functions and their derivatives for a given element type.
        
        Args:
            element_type: Type of finite element
            
        Returns:
            Tuple of (shape_function, shape_function_derivative) functions
        """
        if element_type == ElementType.LINEAR_TRIANGLE:
            # Linear triangle shape functions in natural coordinates
            def shape_func(xi, eta):
                return np.array([1 - xi - eta, xi, eta])
            
            def shape_deriv(xi, eta):
                return np.array([
                    [-1, -1],  # dN1/dxi, dN1/deta
                    [1, 0],    # dN2/dxi, dN2/deta
                    [0, 1]     # dN3/dxi, dN3/deta
                ])
            
        elif element_type == ElementType.QUADRATIC_TRIANGLE:
            # Quadratic triangle shape functions
            def shape_func(xi, eta):
                return np.array([
                    (1 - xi - eta) * (1 - 2*xi - 2*eta),  # Corner node 1
                    xi * (2*xi - 1),                      # Corner node 2
                    eta * (2*eta - 1),                    # Corner node 3
                    4 * xi * (1 - xi - eta),              # Mid-edge node 1-2
                    4 * xi * eta,                         # Mid-edge node 2-3
                    4 * eta * (1 - xi - eta)              # Mid-edge node 3-1
                ])
            
            def shape_deriv(xi, eta):
                return np.array([
                    [-3 + 4*xi + 4*eta, -3 + 4*xi + 4*eta],  
                    [4*xi - 1, 0],
                    [0, 4*eta - 1],
                    [4 - 8*xi - 4*eta, -4*xi],
                    [4*eta, 4*xi],
                    [-4*eta, 4 - 4*xi - 8*eta]
                ])
        
        elif element_type == ElementType.LINEAR_QUADRILATERAL:
            # Linear quad shape functions
            def shape_func(xi, eta):
                return np.array([
                    0.25 * (1 - xi) * (1 - eta),  # Corner (-1,-1)
                    0.25 * (1 + xi) * (1 - eta),  # Corner (1,-1)
                    0.25 * (1 + xi) * (1 + eta),  # Corner (1,1)
                    0.25 * (1 - xi) * (1 + eta)   # Corner (-1,1)
                ])
            
            def shape_deriv(xi, eta):
                return np.array([
                    [-0.25 * (1 - eta), -0.25 * (1 - xi)],
                    [0.25 * (1 - eta), -0.25 * (1 + xi)],
                    [0.25 * (1 + eta), 0.25 * (1 + xi)],
                    [-0.25 * (1 + eta), 0.25 * (1 - xi)]
                ])
        
        else:
            # Default to linear triangles with a warning
            logger.warning(f"Shape functions for {element_type} not fully implemented, using linear triangle")
            return self._get_shape_functions(ElementType.LINEAR_TRIANGLE)
        
        return shape_func, shape_deriv
    
    def _assemble_system(self):
        """
        Assemble the global system matrix and right-hand side vector.
        The specific assembly depends on the physics type.
        """
        # Initialize system matrix and RHS vector
        self.A = sp.lil_matrix((self.num_dofs, self.num_dofs))
        self.b = np.zeros(self.num_dofs)
        
        # Get shape functions for the chosen element type
        shape_func, shape_deriv = self._get_shape_functions(self.config.element_type)
        
        # Element assembly depends on physics type
        if self.config.physics_type == PhysicsType.THERMAL:
            self._assemble_thermal_system(shape_func, shape_deriv)
        elif self.config.physics_type == PhysicsType.ELECTROMAGNETIC:
            self._assemble_electromagnetic_system(shape_func, shape_deriv)
        elif self.config.physics_type == PhysicsType.STRUCTURAL:
            self._assemble_structural_system(shape_func, shape_deriv)
        elif self.config.physics_type == PhysicsType.MULTIPHYSICS:
            self._assemble_multiphysics_system(shape_func, shape_deriv)
        
        # Convert to CSR format for efficient computations
        self.A = self.A.tocsr()
        
        logger.info(f"Assembled system with {self.A.nnz} non-zero entries")
    
    def _assemble_thermal_system(self, shape_func, shape_deriv):
        """
        Assemble system for thermal problem (heat equation).
        
        Solves:  -∇·(k∇T) = Q  where k=thermal conductivity, Q=heat source
        
        Args:
            shape_func: Shape function evaluator
            shape_deriv: Shape function derivative evaluator
        """
        # Default thermal conductivity if no material is specified
        default_k = 1.0
        default_q = 0.0
        
        # Gaussian quadrature points and weights for triangles
        if self.config.element_type == ElementType.LINEAR_TRIANGLE:
            # 1-point quadrature is exact for linear elements
            quad_points = np.array([[1/3, 1/3]])
            quad_weights = np.array([0.5])  # Area of reference triangle is 0.5
        else:
            # 3-point quadrature for quadratic elements
            quad_points = np.array([
                [1/6, 1/6],
                [2/3, 1/6],
                [1/6, 2/3]
            ])
            quad_weights = np.array([1/6, 1/6, 1/6])
        
        # Loop over all elements
        for elem_idx in range(self.mesh.num_elements):
            # Get element nodes
            elem_nodes = self.mesh.elements[elem_idx]
            node_coords = self.mesh.nodes[elem_nodes]
            
            # Get element material properties
            k, q = default_k, default_q
            if self.mesh.element_markers is not None:
                for marker_name, marker_array in self.mesh.element_markers.items():
                    if marker_array[elem_idx] and marker_name in self.element_material_map:
                        material_name = self.element_material_map[marker_name]
                        material = self.materials[material_name]
                        k = material.properties.get('thermal_conductivity', default_k)
                        q = material.properties.get('heat_source', default_q)
            
            # Element matrix and vector
            n_nodes_per_elem = len(elem_nodes)
            Ae = np.zeros((n_nodes_per_elem, n_nodes_per_elem))
            be = np.zeros(n_nodes_per_elem)
            
            # Numerical integration
            for qp, weight in zip(quad_points, quad_weights):
                xi, eta = qp
                
                # Shape function and derivatives at this point
                N = shape_func(xi, eta)
                dNdxi = shape_deriv(xi, eta)
                
                # Compute Jacobian matrix for coordinate transformation
                J = node_coords.T @ dNdxi
                detJ = np.linalg.det(J)
                
                # Transform shape derivatives to physical coordinates
                Jinv = np.linalg.inv(J)
                dNdx = dNdxi @ Jinv
                
                # Thermal conductivity term: ∫ k * ∇N_i · ∇N_j dΩ
                for i in range(n_nodes_per_elem):
                    grad_Ni = dNdx[i, :]
                    
                    # Source term contribution: ∫ N_i * q dΩ
                    be[i] += N[i] * q * detJ * weight
                    
                    for j in range(n_nodes_per_elem):
                        grad_Nj = dNdx[j, :]
                        # Stiffness term: k * ∇N_i · ∇N_j
                        Ae[i, j] += k * np.dot(grad_Ni, grad_Nj) * detJ * weight
            
            # Assemble into global system
            for i in range(n_nodes_per_elem):
                global_i = self.dof_map[elem_nodes[i]]
                
                # Assemble right-hand side
                self.b[global_i] += be[i]
                
                # Assemble stiffness matrix
                for j in range(n_nodes_per_elem):
                    global_j = self.dof_map[elem_nodes[j]]
                    self.A[global_i, global_j] += Ae[i, j]
        
        # Apply boundary conditions
        self._apply_thermal_boundary_conditions()
    
    def _apply_thermal_boundary_conditions(self):
        """Apply boundary conditions for thermal problems"""
        for bc in self.boundary_conditions:
            if bc.boundary_name not in self.mesh.node_markers:
                logger.warning(f"Boundary {bc.boundary_name} not found in mesh node markers")
                continue
                
            # Get nodes on this boundary
            boundary_nodes = np.where(self.mesh.node_markers[bc.boundary_name])[0]
            
            # Apply based on condition type
            if bc.condition_type == 'dirichlet':
                # Handle Dirichlet BC
                for node_idx in boundary_nodes:
                    dof = self.dof_map[node_idx]
                    
                    # Get boundary value (can be function of position)
                    if callable(bc.value):
                        value = bc.value(self.mesh.nodes[node_idx])
                    else:
                        value = bc.value
                    
                    # Strong enforcement by row/column elimination
                    self.A[dof, :] = 0.0
                    self.A[dof, dof] = 1.0
                    self.b[dof] = value
                    
            elif bc.condition_type == 'neumann':
                # Neumann BC (heat flux): -k∇T·n = q_n
                # For thermal, this is already handled in the weak form
                # if the boundary integral is included
                pass  # Implement boundary integration for Neumann BCs
                
            elif bc.condition_type == 'robin':
                # Robin BC (convection): -k∇T·n = h(T - T_∞)
                # h = convection coefficient, T_∞ = ambient temperature
                pass  # Implement boundary integration for Robin BCs
    
    def _assemble_electromagnetic_system(self, shape_func, shape_deriv):
        """Assemble system for electromagnetic problem (Maxwell's equations)"""
        # Placeholder for E&M assembly
        logger.info("Electromagnetic assembly not yet fully implemented")
        # Will implement different formulations:
        # 1. Electrostatic: ∇·(ε∇V) = -ρ
        # 2. Magnetostatic: ∇×(μ⁻¹∇×A) = J
        # 3. Full-wave: ∇×(μ⁻¹∇×E) - ω²εE = 0
    
    def _assemble_structural_system(self, shape_func, shape_deriv):
        """Assemble system for structural mechanics (elasticity)"""
        # Placeholder for structural mechanics assembly
        logger.info("Structural mechanics assembly not yet fully implemented")
        # Will implement:
        # Linear elasticity: ∇·σ + f = 0
        # where σ = C:ε, ε = sym(∇u)
    
    def _assemble_multiphysics_system(self, shape_func, shape_deriv):
        """Assemble system for coupled multiphysics"""
        # Placeholder for multiphysics assembly
        logger.info("Multiphysics assembly not yet fully implemented")
        # Will implement different coupling strategies:
        # 1. Thermal-EM: Joule heating
        # 2. Thermal-Structural: Thermal stress
        # 3. EM-Structural: Electromagnetic forces
    
    def solve(self) -> np.ndarray:
        """
        Solve the assembled system and return the solution.
        
        Returns:
            Solution vector
        """
        # Assemble the system if not already assembled
        if self.A is None or self.b is None:
            self._assemble_system()
        
        # Solve based on specified solver type
        start_time = time.time()
        
        if self.config.solver_type == 'direct':
            # Direct solver (suitable for smaller problems)
            self.solution = spla.spsolve(self.A, self.b)
        
        elif self.config.solver_type == 'cg':
            # Conjugate gradient (for SPD matrices)
            self.solution, info = spla.cg(
                self.A, self.b,
                tol=self.config.solver_tolerance,
                maxiter=self.config.max_iterations
            )
            if info > 0:
                logger.warning(f"CG solver did not converge after {info} iterations")
            
        elif self.config.solver_type == 'gmres':
            # GMRES (for non-symmetric matrices)
            self.solution, info = spla.gmres(
                self.A, self.b,
                tol=self.config.solver_tolerance,
                maxiter=self.config.max_iterations
            )
            if info > 0:
                logger.warning(f"GMRES solver did not converge after {info} iterations")
        
        else:
            # Default to direct solver
            logger.warning(f"Unknown solver type {self.config.solver_type}, using direct solver")
            self.solution = spla.spsolve(self.A, self.b)
        
        elapsed_time = time.time() - start_time
        logger.info(f"Solved system with {self.num_dofs} DOFs in {elapsed_time:.3f} seconds")
        
        # Compute derived quantities
        self._compute_derived_quantities()
        
        return self.solution
    
    def _compute_derived_quantities(self):
        """Compute derived quantities from the solution"""
        if self.solution is None:
            logger.warning("Cannot compute derived quantities: solution not available")
            return
            
        # What we compute depends on the physics type
        if self.config.physics_type == PhysicsType.THERMAL:
            # For thermal: compute heat fluxes, gradients
            self._compute_thermal_derived_quantities()
            
        elif self.config.physics_type == PhysicsType.ELECTROMAGNETIC:
            # For E&M: compute fields, energy densities
            self._compute_electromagnetic_derived_quantities()
            
        elif self.config.physics_type == PhysicsType.STRUCTURAL:
            # For structural: compute stresses, strains
            self._compute_structural_derived_quantities()
            
        elif self.config.physics_type == PhysicsType.MULTIPHYSICS:
            # For multiphysics: compute all relevant quantities
            self._compute_multiphysics_derived_quantities()
    
    def _compute_thermal_derived_quantities(self):
        """Compute derived quantities for thermal problems"""
        # Extract temperature field (already nodal)
        self.derived_quantities['temperature'] = self.solution.copy()
        
        # Will compute:
        # 1. Temperature gradients
        # 2. Heat fluxes
        # 3. Total heat flow across boundaries
        
        # Placeholder for now
        logger.debug("Thermal derived quantities computation not yet fully implemented")
    
    def _compute_electromagnetic_derived_quantities(self):
        """Compute derived quantities for electromagnetic problems"""
        # Placeholder
        logger.debug("EM derived quantities computation not yet fully implemented")
    
    def _compute_structural_derived_quantities(self):
        """Compute derived quantities for structural problems"""
        # Placeholder
        logger.debug("Structural derived quantities computation not yet fully implemented")
    
    def _compute_multiphysics_derived_quantities(self):
        """Compute derived quantities for multiphysics problems"""
        # Placeholder
        logger.debug("Multiphysics derived quantities computation not yet fully implemented")
    
    def get_nodal_solution(self, field_name: Optional[str] = None) -> np.ndarray:
        """
        Get the solution at nodes.
        
        Args:
            field_name: For multiphysics, specify which field to retrieve
            
        Returns:
            Nodal solution values
        """
        if self.solution is None:
            raise ValueError("Solution not available, run solve() first")
            
        if self.config.physics_type == PhysicsType.MULTIPHYSICS and field_name is None:
            raise ValueError("For multiphysics, must specify which field to retrieve")
            
        # For scalar fields, the solution is already nodal
        if self.config.physics_type == PhysicsType.THERMAL:
            return self.solution
            
        # For vector fields, reshape based on physics type
        if self.config.physics_type == PhysicsType.ELECTROMAGNETIC:
            # Return components as separate arrays
            dim = self.mesh.dimension
            return self.solution.reshape(self.mesh.num_nodes, dim)
            
        if self.config.physics_type == PhysicsType.STRUCTURAL:
            # Return displacement vector
            dim = self.mesh.dimension
            return self.solution.reshape(self.mesh.num_nodes, dim)
            
        if self.config.physics_type == PhysicsType.MULTIPHYSICS:
            # Return specific field based on name
            # Exact implementation depends on how fields are ordered
            pass
            
        return self.solution
    
    def get_derived_quantity(self, name: str) -> np.ndarray:
        """
        Get a specific derived quantity.
        
        Args:
            name: Name of the derived quantity
            
        Returns:
            Derived quantity values
        """
        if name not in self.derived_quantities:
            raise ValueError(f"Derived quantity '{name}' not available")
            
        return self.derived_quantities[name]
    
    def export_vtk(self, filename: str):
        """
        Export solution to VTK format for visualization.
        
        Args:
            filename: Name of the VTK file to create
        """
        logger.info(f"VTK export to {filename} not yet implemented")
        # Will implement VTK export using PyVista 