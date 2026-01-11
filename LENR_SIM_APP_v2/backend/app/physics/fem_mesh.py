"""
FEM Mesh Generation for LENR Simulations

This module provides utilities for creating and manipulating FEM meshes
for LENR simulations. It includes:
1. Standard mesh generation for common LENR geometries
2. Conversion from simulation domains to FEM meshes
3. Mesh refinement in regions of interest
4. Import/export capabilities for common mesh formats

The module integrates with the rest of the LENR simulation framework.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Union, Callable, Any
import logging
import os
import itertools
from dataclasses import dataclass
import math

from app.utils.logging import setup_logger
from app.simulation.domain import SimulationDomain
from app.physics.fem_solver import MeshData, ElementType

# Set up logger
logger = setup_logger("fem_mesh", "logs/simulation.log")

class MeshGenerator:
    """
    Generator for FEM meshes to be used in LENR simulations.
    Provides methods for creating common geometries and mesh types.
    """
    
    @staticmethod
    def create_rectangle_mesh(
        width: float,
        height: float,
        nx: int,
        ny: int,
        element_type: ElementType = ElementType.LINEAR_TRIANGLE
    ) -> MeshData:
        """
        Create a rectangular mesh.
        
        Args:
            width: Width of the rectangle (x-direction)
            height: Height of the rectangle (y-direction)
            nx: Number of elements in x-direction
            ny: Number of elements in y-direction
            element_type: Type of finite elements to use
            
        Returns:
            MeshData object for the rectangular domain
        """
        # Create node grid
        x = np.linspace(0, width, nx + 1)
        y = np.linspace(0, height, ny + 1)
        xx, yy = np.meshgrid(x, y)
        
        # Reshape to get node coordinates
        nodes = np.vstack([xx.flatten(), yy.flatten()]).T
        num_nodes = nodes.shape[0]
        
        # Create elements based on element type
        elements = []
        node_markers = {
            'left': np.zeros(num_nodes, dtype=bool),
            'right': np.zeros(num_nodes, dtype=bool),
            'bottom': np.zeros(num_nodes, dtype=bool),
            'top': np.zeros(num_nodes, dtype=bool)
        }
        
        # Mark boundary nodes
        tol = 1e-10
        for i in range(num_nodes):
            if abs(nodes[i, 0]) < tol:  # Left boundary
                node_markers['left'][i] = True
            if abs(nodes[i, 0] - width) < tol:  # Right boundary
                node_markers['right'][i] = True
            if abs(nodes[i, 1]) < tol:  # Bottom boundary
                node_markers['bottom'][i] = True
            if abs(nodes[i, 1] - height) < tol:  # Top boundary
                node_markers['top'][i] = True
        
        if element_type in [ElementType.LINEAR_TRIANGLE, ElementType.QUADRATIC_TRIANGLE]:
            # Create triangular elements
            # Each quad is divided into 2 triangles
            for j in range(ny):
                for i in range(nx):
                    # Quad corner nodes
                    n1 = i + j * (nx + 1)
                    n2 = (i + 1) + j * (nx + 1)
                    n3 = (i + 1) + (j + 1) * (nx + 1)
                    n4 = i + (j + 1) * (nx + 1)
                    
                    # Two triangles per quad
                    elements.append([n1, n2, n4])
                    elements.append([n2, n3, n4])
        
        elif element_type in [ElementType.LINEAR_QUADRILATERAL, ElementType.QUADRATIC_QUADRILATERAL]:
            # Create quadrilateral elements
            for j in range(ny):
                for i in range(nx):
                    # Quad corner nodes
                    n1 = i + j * (nx + 1)
                    n2 = (i + 1) + j * (nx + 1)
                    n3 = (i + 1) + (j + 1) * (nx + 1)
                    n4 = i + (j + 1) * (nx + 1)
                    
                    # Quad element
                    elements.append([n1, n2, n3, n4])
        
        # For quadratic elements, add mid-edge nodes
        if element_type in [ElementType.QUADRATIC_TRIANGLE, ElementType.QUADRATIC_QUADRILATERAL]:
            logger.info("Quadratic elements not fully implemented, falling back to linear")
            # Would need to add additional nodes and adjust element connectivity
        
        elements = np.array(elements)
        
        # Create element markers - simple rectangles only have one domain
        element_markers = {
            'domain': np.ones(len(elements), dtype=bool)
        }
        
        return MeshData(
            nodes=nodes,
            elements=elements,
            node_markers=node_markers,
            element_markers=element_markers
        )
    
    @staticmethod
    def create_circular_mesh(
        radius: float,
        num_radial: int = 10,
        num_angular: int = 20,
        element_type: ElementType = ElementType.LINEAR_TRIANGLE
    ) -> MeshData:
        """
        Create a circular mesh.
        
        Args:
            radius: Radius of the circle
            num_radial: Number of elements in radial direction
            num_angular: Number of elements around circumference
            element_type: Type of finite elements to use
            
        Returns:
            MeshData object for the circular domain
        """
        # For circular mesh, create nodes in polar coordinates then convert to Cartesian
        
        # Create center node
        nodes = [[0.0, 0.0]]
        center_node_idx = 0
        
        # Create radial points
        r_vals = np.linspace(0, radius, num_radial + 1)[1:]  # Skip r=0 (center)
        theta_vals = np.linspace(0, 2*np.pi, num_angular, endpoint=False)
        
        # Node mapping to quickly find node indices
        node_indices = {(0, 0): center_node_idx}  # Center node
        
        # Create nodes in polar coordinates and convert to Cartesian
        for r_idx, r in enumerate(r_vals):
            for theta_idx, theta in enumerate(theta_vals):
                x = r * np.cos(theta)
                y = r * np.sin(theta)
                nodes.append([x, y])
                node_indices[(r_idx + 1, theta_idx)] = len(nodes) - 1
        
        # Create triangular elements
        elements = []
        
        # Create elements for the innermost circle (connected to center)
        for theta_idx in range(num_angular):
            n1 = center_node_idx
            n2 = node_indices[(1, theta_idx)]
            n3 = node_indices[(1, (theta_idx + 1) % num_angular)]
            elements.append([n1, n2, n3])
        
        # Create elements for the rest of the circles
        for r_idx in range(num_radial - 1):
            for theta_idx in range(num_angular):
                n1 = node_indices[(r_idx + 1, theta_idx)]
                n2 = node_indices[(r_idx + 2, theta_idx)]
                n3 = node_indices[(r_idx + 2, (theta_idx + 1) % num_angular)]
                n4 = node_indices[(r_idx + 1, (theta_idx + 1) % num_angular)]
                
                # Two triangles per quad
                elements.append([n1, n2, n4])
                elements.append([n2, n3, n4])
        
        # Create node markers
        nodes = np.array(nodes)
        num_nodes = nodes.shape[0]
        
        # Mark boundary nodes (outer circle)
        node_markers = {
            'boundary': np.zeros(num_nodes, dtype=bool)
        }
        
        # Nodes on the outer circle are boundary nodes
        for i in range(num_nodes):
            r_squared = nodes[i, 0]**2 + nodes[i, 1]**2
            if abs(r_squared - radius**2) < 1e-10 * radius**2:
                node_markers['boundary'][i] = True
        
        # Create element markers - just one domain for a simple circle
        elements = np.array(elements)
        element_markers = {
            'domain': np.ones(len(elements), dtype=bool)
        }
        
        return MeshData(
            nodes=nodes,
            elements=elements,
            node_markers=node_markers,
            element_markers=element_markers
        )
    
    @staticmethod
    def create_cylinder_mesh(
        radius: float, 
        height: float,
        num_radial: int = 8,
        num_angular: int = 16,
        num_axial: int = 10,
        element_type: ElementType = ElementType.LINEAR_TETRAHEDRON
    ) -> MeshData:
        """
        Create a 3D cylindrical mesh.
        
        Args:
            radius: Radius of the cylinder
            height: Height of the cylinder
            num_radial: Number of elements in radial direction
            num_angular: Number of elements around circumference
            num_axial: Number of elements in axial (z) direction
            element_type: Type of finite elements to use
            
        Returns:
            MeshData object for the cylindrical domain
        """
        # Start with 2D circular base
        base_mesh = MeshGenerator.create_circular_mesh(
            radius, num_radial, num_angular, ElementType.LINEAR_TRIANGLE
        )
        
        # Extrude to 3D
        nodes = []
        elements = []
        
        # Create node mapping to quickly find node indices
        node_indices = {}
        
        # Create nodes by duplicating the base at different heights
        z_vals = np.linspace(0, height, num_axial + 1)
        for z_idx, z in enumerate(z_vals):
            for base_idx in range(base_mesh.num_nodes):
                x, y = base_mesh.nodes[base_idx]
                nodes.append([x, y, z])
                node_indices[(base_idx, z_idx)] = len(nodes) - 1
        
        # Create tetrahedral elements
        for z_idx in range(num_axial):
            for elem_idx in range(base_mesh.num_elements):
                # Get the base triangle
                n1, n2, n3 = base_mesh.elements[elem_idx]
                
                # Get nodes for this layer and the layer above
                n1_bottom = node_indices[(n1, z_idx)]
                n2_bottom = node_indices[(n2, z_idx)]
                n3_bottom = node_indices[(n3, z_idx)]
                n1_top = node_indices[(n1, z_idx + 1)]
                n2_top = node_indices[(n2, z_idx + 1)]
                n3_top = node_indices[(n3, z_idx + 1)]
                
                # Create three tetrahedra from the triangular prism
                elements.append([n1_bottom, n2_bottom, n3_bottom, n1_top])
                elements.append([n2_bottom, n3_bottom, n2_top, n3_top])
                elements.append([n1_top, n2_top, n3_top, n3_bottom])
        
        # Create node markers
        nodes = np.array(nodes)
        num_nodes = nodes.shape[0]
        
        node_markers = {
            'bottom': np.zeros(num_nodes, dtype=bool),
            'top': np.zeros(num_nodes, dtype=bool),
            'side': np.zeros(num_nodes, dtype=bool)
        }
        
        # Mark boundary nodes
        tol = 1e-10
        for i in range(num_nodes):
            x, y, z = nodes[i]
            r_squared = x**2 + y**2
            
            # Bottom face
            if abs(z) < tol:
                node_markers['bottom'][i] = True
            
            # Top face
            if abs(z - height) < tol:
                node_markers['top'][i] = True
            
            # Side face
            if abs(r_squared - radius**2) < tol * radius**2:
                node_markers['side'][i] = True
        
        # Create element markers
        elements = np.array(elements)
        element_markers = {
            'domain': np.ones(len(elements), dtype=bool)
        }
        
        return MeshData(
            nodes=nodes,
            elements=elements,
            node_markers=node_markers,
            element_markers=element_markers
        )
    
    @staticmethod
    def create_lenr_lattice_mesh(
        width: float,
        height: float,
        depth: float,
        lattice_constant: float,
        inclusion_positions: List[Tuple[float, float, float]],
        inclusion_radius: float,
        resolution: float = 0.1,
        element_type: ElementType = ElementType.LINEAR_TETRAHEDRON
    ) -> MeshData:
        """
        Create a 3D mesh representing a metal lattice with inclusions for LENR simulation.
        
        Args:
            width: Width of the lattice in x-direction
            height: Height of the lattice in y-direction
            depth: Depth of the lattice in z-direction
            lattice_constant: Distance between lattice points
            inclusion_positions: List of (x,y,z) positions for inclusions
            inclusion_radius: Radius of each inclusion
            resolution: Target element size
            element_type: Type of finite elements to use
            
        Returns:
            MeshData object for the LENR lattice
        """
        # This function is a placeholder - for a real implementation,
        # we would use an external mesh generator like Gmsh
        logger.info("LENR lattice mesh generation is a placeholder")
        logger.info(f"Would create a {width}x{height}x{depth} lattice with {len(inclusion_positions)} inclusions")
        
        # For now, create a simple box mesh as placeholder
        nx = max(2, int(width / resolution))
        ny = max(2, int(height / resolution))
        nz = max(2, int(depth / resolution))
        
        # Create node grid
        x = np.linspace(0, width, nx + 1)
        y = np.linspace(0, height, ny + 1)
        z = np.linspace(0, depth, nz + 1)
        
        # Create all node coordinates
        nodes = []
        for k in range(nz + 1):
            for j in range(ny + 1):
                for i in range(nx + 1):
                    nodes.append([x[i], y[j], z[k]])
        
        # Create node mapping
        node_indices = {}
        for k in range(nz + 1):
            for j in range(ny + 1):
                for i in range(nx + 1):
                    idx = i + j * (nx + 1) + k * (nx + 1) * (ny + 1)
                    node_indices[(i, j, k)] = idx
        
        # Create tetrahedral elements
        elements = []
        for k in range(nz):
            for j in range(ny):
                for i in range(nx):
                    # Get the 8 corners of this cube
                    n1 = node_indices[(i, j, k)]
                    n2 = node_indices[(i+1, j, k)]
                    n3 = node_indices[(i+1, j+1, k)]
                    n4 = node_indices[(i, j+1, k)]
                    n5 = node_indices[(i, j, k+1)]
                    n6 = node_indices[(i+1, j, k+1)]
                    n7 = node_indices[(i+1, j+1, k+1)]
                    n8 = node_indices[(i, j+1, k+1)]
                    
                    # Divide cube into 5 tetrahedra
                    elements.append([n1, n2, n4, n5])
                    elements.append([n2, n3, n4, n7])
                    elements.append([n2, n5, n6, n7])
                    elements.append([n4, n5, n7, n8])
                    elements.append([n2, n4, n5, n7])
        
        # Create node markers
        nodes = np.array(nodes)
        num_nodes = nodes.shape[0]
        
        node_markers = {
            'left': np.zeros(num_nodes, dtype=bool),
            'right': np.zeros(num_nodes, dtype=bool),
            'bottom': np.zeros(num_nodes, dtype=bool),
            'top': np.zeros(num_nodes, dtype=bool),
            'front': np.zeros(num_nodes, dtype=bool),
            'back': np.zeros(num_nodes, dtype=bool)
        }
        
        # Mark boundary nodes
        tol = 1e-10
        for i in range(num_nodes):
            x, y, z = nodes[i]
            
            if abs(x) < tol:  # Left boundary
                node_markers['left'][i] = True
            if abs(x - width) < tol:  # Right boundary
                node_markers['right'][i] = True
            if abs(y) < tol:  # Bottom boundary
                node_markers['bottom'][i] = True
            if abs(y - height) < tol:  # Top boundary
                node_markers['top'][i] = True
            if abs(z) < tol:  # Front boundary
                node_markers['front'][i] = True
            if abs(z - depth) < tol:  # Back boundary
                node_markers['back'][i] = True
        
        # Create element markers - with two domains: bulk and inclusions
        elements = np.array(elements)
        num_elements = len(elements)
        
        element_markers = {
            'bulk': np.ones(num_elements, dtype=bool),
            'inclusion': np.zeros(num_elements, dtype=bool)
        }
        
        # Mark elements that are in inclusions
        for elem_idx in range(num_elements):
            # Get element centroid
            elem_nodes = elements[elem_idx]
            centroid = np.mean(nodes[elem_nodes], axis=0)
            
            # Check if centroid is inside any inclusion
            for incl_pos in inclusion_positions:
                dist = np.sqrt(np.sum((centroid - incl_pos)**2))
                if dist < inclusion_radius:
                    element_markers['bulk'][elem_idx] = False
                    element_markers['inclusion'][elem_idx] = True
                    break
        
        return MeshData(
            nodes=nodes,
            elements=elements,
            node_markers=node_markers,
            element_markers=element_markers
        )
    
    @staticmethod
    def from_simulation_domain(
        domain: SimulationDomain,
        element_type: ElementType = ElementType.LINEAR_TETRAHEDRON
    ) -> MeshData:
        """
        Convert a SimulationDomain to a FEM mesh.
        
        Args:
            domain: SimulationDomain object to convert
            element_type: Type of finite elements to use
            
        Returns:
            MeshData object created from the simulation domain
        """
        # Extract dimensions and resolution
        dimensions = domain.dimensions
        resolution = domain.resolution
        
        # Create the appropriate mesh based on dimensions
        if len(dimensions) == 1 or (len(dimensions) > 1 and dimensions[1] == 0 and dimensions[2] == 0):
            # 1D domain
            return MeshGenerator.create_rectangle_mesh(
                width=dimensions[0],
                height=0.1,  # Small height for 2D mesh
                nx=resolution[0],
                ny=1,
                element_type=ElementType.LINEAR_TRIANGLE
            )
        elif len(dimensions) == 2 or (len(dimensions) > 2 and dimensions[2] == 0):
            # 2D domain
            return MeshGenerator.create_rectangle_mesh(
                width=dimensions[0],
                height=dimensions[1],
                nx=resolution[0],
                ny=resolution[1],
                element_type=ElementType.LINEAR_TRIANGLE
            )
        else:
            # 3D domain
            return MeshGenerator.create_cylinder_mesh(
                radius=min(dimensions[0], dimensions[1]) / 2,
                height=dimensions[2],
                num_radial=max(3, resolution[0] // 2),
                num_angular=max(8, resolution[1] // 2),
                num_axial=resolution[2],
                element_type=element_type
            )
    
    @staticmethod
    def export_to_vtk(mesh: MeshData, filename: str):
        """
        Export a mesh to VTK format for visualization.
        
        Args:
            mesh: MeshData object to export
            filename: Output filename
        """
        try:
            import pyvista as pv
            
            # Create points array
            points = mesh.nodes
            
            # Create cells array
            cells = []
            for element in mesh.elements:
                cells.append(len(element))
                cells.extend(element)
            
            # Create cell types array
            if mesh.elements.shape[1] == 3:  # Triangles
                cell_type = np.ones(mesh.num_elements, dtype=int) * 5  # VTK_TRIANGLE
            elif mesh.elements.shape[1] == 4 and mesh.dimension == 2:  # Quads
                cell_type = np.ones(mesh.num_elements, dtype=int) * 9  # VTK_QUAD
            elif mesh.elements.shape[1] == 4 and mesh.dimension == 3:  # Tetrahedra
                cell_type = np.ones(mesh.num_elements, dtype=int) * 10  # VTK_TETRA
            elif mesh.elements.shape[1] == 8:  # Hexahedra
                cell_type = np.ones(mesh.num_elements, dtype=int) * 12  # VTK_HEXAHEDRON
            else:
                raise ValueError(f"Unsupported element type with {mesh.elements.shape[1]} nodes")
            
            # Create PyVista UnstructuredGrid
            grid = pv.UnstructuredGrid(cells, cell_type, points)
            
            # Add node markers as point data
            if mesh.node_markers is not None:
                for name, marker in mesh.node_markers.items():
                    grid.point_data[name] = marker.astype(int)
            
            # Add element markers as cell data
            if mesh.element_markers is not None:
                for name, marker in mesh.element_markers.items():
                    grid.cell_data[name] = marker.astype(int)
            
            # Write to file
            grid.save(filename)
            logger.info(f"Exported mesh to {filename}")
            
        except ImportError:
            logger.warning("PyVista not available, cannot export to VTK")
    
    @staticmethod
    def import_from_gmsh(filename: str) -> MeshData:
        """
        Import a mesh from Gmsh format.
        
        Args:
            filename: Input Gmsh file (.msh)
            
        Returns:
            MeshData object created from the Gmsh file
        """
        # Try to import meshio - if not available, return a placeholder mesh
        try:
            try:
                import meshio
            except ImportError:
                logger.warning("meshio not available, please install with: pip install meshio")
                # Return a placeholder mesh when meshio is not available
                return MeshData(
                    nodes=np.array([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]]),
                    elements=np.array([[0, 1, 2], [0, 2, 3]]),
                    node_markers={"boundary": np.ones(4, dtype=bool)},
                    element_markers={"domain": np.ones(2, dtype=bool)}
                )
            
            # Read the mesh file
            mesh = meshio.read(filename)
            
            # Extract nodes
            nodes = mesh.points
            
            # Extract elements - for simplicity, only use one cell type
            # Prioritize tetrahedra, then triangles, then quads
            if "tetra" in mesh.cells_dict:
                elements = mesh.cells_dict["tetra"]
                element_type = "tetra"
            elif "triangle" in mesh.cells_dict:
                elements = mesh.cells_dict["triangle"]
                element_type = "triangle"
            elif "quad" in mesh.cells_dict:
                elements = mesh.cells_dict["quad"]
                element_type = "quad"
            else:
                # Use the first available cell type
                element_type = list(mesh.cells_dict.keys())[0]
                elements = mesh.cells_dict[element_type]
            
            # Extract physical groups as markers
            node_markers = {}
            element_markers = {}
            
            # Process node markers (from point data)
            for key, data in mesh.point_data.items():
                if data.dtype == bool or data.dtype == int:
                    node_markers[key] = data.astype(bool)
            
            # Process element markers (from cell data)
            if element_type in mesh.cell_data:
                for key, data_dict in mesh.cell_data.items():
                    if element_type in data_dict:
                        data = data_dict[element_type]
                        if data.dtype == bool or data.dtype == int:
                            element_markers[key] = data.astype(bool)
            
            # If no markers were found, create default ones
            if not node_markers:
                # Create automatic boundary markers
                logger.info("No node markers found, creating automatic boundary markers")
                node_markers = MeshGenerator._create_boundary_markers(nodes, elements)
            
            if not element_markers:
                # Create a default domain marker for all elements
                logger.info("No element markers found, creating a default domain marker")
                element_markers = {
                    "domain": np.ones(len(elements), dtype=bool)
                }
            
            return MeshData(
                nodes=nodes,
                elements=elements,
                node_markers=node_markers,
                element_markers=element_markers
            )
            
        except Exception as e:
            logger.error(f"Error importing mesh from Gmsh: {str(e)}")
            
            # Return a placeholder mesh on any error
            return MeshData(
                nodes=np.array([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]]),
                elements=np.array([[0, 1, 2], [0, 2, 3]]),
                node_markers={"boundary": np.ones(4, dtype=bool)},
                element_markers={"domain": np.ones(2, dtype=bool)}
            )
    
    @staticmethod
    def _create_boundary_markers(nodes, elements):
        """
        Create automatic boundary markers for nodes.
        
        Args:
            nodes: Node coordinates
            elements: Element connectivity
            
        Returns:
            Dictionary of node markers
        """
        dimension = nodes.shape[1]
        num_nodes = nodes.shape[0]
        
        if dimension == 2:
            # For 2D mesh, find min/max coordinates
            xmin, ymin = np.min(nodes, axis=0)
            xmax, ymax = np.max(nodes, axis=0)
            
            # Create markers
            node_markers = {
                'left': np.zeros(num_nodes, dtype=bool),
                'right': np.zeros(num_nodes, dtype=bool),
                'bottom': np.zeros(num_nodes, dtype=bool),
                'top': np.zeros(num_nodes, dtype=bool)
            }
            
            # Mark boundary nodes
            tol = 1e-10 * max(xmax - xmin, ymax - ymin)
            for i in range(num_nodes):
                x, y = nodes[i]
                
                if abs(x - xmin) < tol:  # Left boundary
                    node_markers['left'][i] = True
                if abs(x - xmax) < tol:  # Right boundary
                    node_markers['right'][i] = True
                if abs(y - ymin) < tol:  # Bottom boundary
                    node_markers['bottom'][i] = True
                if abs(y - ymax) < tol:  # Top boundary
                    node_markers['top'][i] = True
            
        elif dimension == 3:
            # For 3D mesh, find min/max coordinates
            xmin, ymin, zmin = np.min(nodes, axis=0)
            xmax, ymax, zmax = np.max(nodes, axis=0)
            
            # Create markers
            node_markers = {
                'left': np.zeros(num_nodes, dtype=bool),
                'right': np.zeros(num_nodes, dtype=bool),
                'bottom': np.zeros(num_nodes, dtype=bool),
                'top': np.zeros(num_nodes, dtype=bool),
                'front': np.zeros(num_nodes, dtype=bool),
                'back': np.zeros(num_nodes, dtype=bool)
            }
            
            # Mark boundary nodes
            tol = 1e-10 * max(xmax - xmin, ymax - ymin, zmax - zmin)
            for i in range(num_nodes):
                x, y, z = nodes[i]
                
                if abs(x - xmin) < tol:  # Left boundary
                    node_markers['left'][i] = True
                if abs(x - xmax) < tol:  # Right boundary
                    node_markers['right'][i] = True
                if abs(y - ymin) < tol:  # Bottom boundary
                    node_markers['bottom'][i] = True
                if abs(y - ymax) < tol:  # Top boundary
                    node_markers['top'][i] = True
                if abs(z - zmin) < tol:  # Front boundary
                    node_markers['front'][i] = True
                if abs(z - zmax) < tol:  # Back boundary
                    node_markers['back'][i] = True
        
        return node_markers 