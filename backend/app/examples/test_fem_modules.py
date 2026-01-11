"""
Test FEM Modules

This script tests that all the FEM modules can be imported correctly
and runs some basic functionality tests.
"""

import sys
import os
import numpy as np
import traceback

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

def test_imports():
    """Test that all FEM modules can be imported"""
    print("Testing FEM module imports...")
    
    successful_imports = []
    failed_imports = []
    
    modules_to_test = [
        "app.physics.fem_solver",
        "app.physics.fem_mesh",
        "app.physics.fem_lenr"
    ]
    
    for module_name in modules_to_test:
        try:
            print(f"  Importing {module_name}...", end="")
            __import__(module_name)
            print(" OK")
            successful_imports.append(module_name)
        except Exception as e:
            print(" FAILED")
            print(f"    Error: {e}")
            traceback.print_exc()
            failed_imports.append((module_name, str(e)))
    
    print(f"\nSuccessfully imported {len(successful_imports)} of {len(modules_to_test)} modules.")
    
    if failed_imports:
        print("\nFailed imports:")
        for module, error in failed_imports:
            print(f"  - {module}: {error}")
    
    return len(failed_imports) == 0

def test_mesh_creation():
    """Test that mesh creation works"""
    print("\nTesting mesh creation...")
    
    try:
        from app.physics.fem_solver import ElementType
        from app.physics.fem_mesh import MeshGenerator
        
        # Test rectangle mesh
        print("  Creating rectangle mesh...", end="")
        rect_mesh = MeshGenerator.create_rectangle_mesh(
            width=1.0,
            height=1.0,
            nx=10,
            ny=10,
            element_type=ElementType.LINEAR_TRIANGLE
        )
        print(f" OK - created mesh with {rect_mesh.num_nodes} nodes and {rect_mesh.num_elements} elements")
        
        # Test circular mesh
        print("  Creating circular mesh...", end="")
        circle_mesh = MeshGenerator.create_circular_mesh(
            radius=0.5,
            num_radial=5,
            num_angular=12,
            element_type=ElementType.LINEAR_TRIANGLE
        )
        print(f" OK - created mesh with {circle_mesh.num_nodes} nodes and {circle_mesh.num_elements} elements")
        
        # Test cylinder mesh (only if 3D meshes are working)
        print("  Creating cylinder mesh...", end="")
        cylinder_mesh = MeshGenerator.create_cylinder_mesh(
            radius=0.5,
            height=1.0,
            num_radial=5,
            num_angular=12,
            num_axial=5,
            element_type=ElementType.LINEAR_TETRAHEDRON
        )
        print(f" OK - created mesh with {cylinder_mesh.num_nodes} nodes and {cylinder_mesh.num_elements} elements")
        
        return True
    except Exception as e:
        print(" FAILED")
        print(f"  Error: {e}")
        traceback.print_exc()
        return False

def test_lenr_materials():
    """Test LENR material presets"""
    print("\nTesting LENR material presets...")
    
    try:
        from app.physics.fem_lenr import LENRPresets
        
        # Test palladium-deuterium preset
        print("  Creating Pd-D material preset...", end="")
        pd_d_materials = LENRPresets.palladium_deuterium()
        print(f" OK - created {len(pd_d_materials)} materials")
        
        # Test nickel-hydrogen preset
        print("  Creating Ni-H material preset...", end="")
        ni_h_materials = LENRPresets.nickel_hydrogen()
        print(f" OK - created {len(ni_h_materials)} materials")
        
        # Verify some basic properties
        print("  Verifying material properties...", end="")
        assert 'Palladium' in pd_d_materials
        assert 'Deuterium' in pd_d_materials
        assert 'Nickel' in ni_h_materials
        assert 'Hydrogen' in ni_h_materials
        
        pd = pd_d_materials['Palladium']
        assert pd.density > 0
        assert pd.atomic_number == 46.0
        assert pd.work_function > 0
        assert 'Deuterium' in pd.inclusions
        
        print(" OK")
        
        return True
    except Exception as e:
        print(" FAILED")
        print(f"  Error: {e}")
        traceback.print_exc()
        return False

def run_minimal_example():
    """Run a minimal example to test the full FEM stack"""
    print("\nRunning minimal FEM example...")
    
    try:
        from app.physics.fem_solver import ElementType, PhysicsType, FEMConfig, BoundaryCondition
        from app.physics.fem_mesh import MeshGenerator
        from app.physics.fem_lenr import LENRSimulationBuilder
        
        # Create a simple 2D rectangle mesh
        print("  Creating mesh...", end="")
        mesh = MeshGenerator.create_rectangle_mesh(
            width=0.1,  # 10 cm
            height=0.05,  # 5 cm
            nx=10,
            ny=5,
            element_type=ElementType.LINEAR_TRIANGLE
        )
        print(" OK")
        
        # Create a simulation with Pd-D materials
        print("  Setting up simulation...", end="")
        simulation = (LENRSimulationBuilder()
            .with_mesh(mesh)
            .with_preset("pd-d")
            .with_config(FEMConfig(
                element_type=ElementType.LINEAR_TRIANGLE,
                physics_type=PhysicsType.THERMAL,
                solver_type="direct"
            ))
            .build())
        print(" OK")
        
        # Add boundary conditions
        print("  Adding boundary conditions...", end="")
        left_bc = BoundaryCondition(
            boundary_name="left",
            condition_type="dirichlet",
            value=300.0  # 300K
        )
        
        right_bc = BoundaryCondition(
            boundary_name="right",
            condition_type="dirichlet",
            value=400.0  # 400K
        )
        
        simulation.set_boundary_conditions([left_bc, right_bc])
        print(" OK")
        
        # Run thermal simulation
        print("  Running thermal simulation...", end="")
        temperature = simulation.run_thermal_simulation()
        print(" OK")
        
        # Calculate LENR physics
        print("  Calculating LENR physics...", end="")
        simulation._calculate_lenr_physics()
        print(" OK")
        
        # Check results
        print("  Checking results...", end="")
        assert temperature is not None
        assert temperature.shape[0] == mesh.num_nodes
        assert np.min(temperature) >= 300.0
        assert np.max(temperature) <= 400.0
        assert simulation.tunneling_probability is not None
        assert simulation.fusion_rate is not None
        print(" OK")
        
        # Output some stats
        print("\n  Results summary:")
        print(f"    Temperature range: {np.min(temperature):.2f}K - {np.max(temperature):.2f}K")
        if simulation.fusion_rate is not None:
            print(f"    Max fusion rate: {np.max(simulation.fusion_rate):.2e} fusions/s")
            print(f"    Total power: {np.sum(simulation.power_density):.2e} W")
        
        return True
    except Exception as e:
        print(" FAILED")
        print(f"  Error: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # Run tests in sequence, stopping if any fail
    if not test_imports():
        print("\nImport tests failed, stopping further tests.")
        sys.exit(1)
    
    if not test_mesh_creation():
        print("\nMesh creation tests failed, stopping further tests.")
        sys.exit(1)
    
    if not test_lenr_materials():
        print("\nLENR material tests failed, stopping further tests.")
        sys.exit(1)
    
    # Optionally run the minimal example
    # This may take longer and requires all components to work together
    should_run_example = os.environ.get('RUN_EXAMPLE', 'False').lower() in ('true', '1', 't')
    if should_run_example:
        if not run_minimal_example():
            print("\nMinimal example failed.")
            sys.exit(1)
        else:
            print("\nMinimal example succeeded.")
    else:
        print("\nSkipping minimal example. Set RUN_EXAMPLE=True to run it.")
    
    print("\nAll tests passed successfully!")
    sys.exit(0) 