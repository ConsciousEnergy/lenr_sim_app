"""Field visualization utilities for LENR simulations."""
import numpy as np
import pyvista as pv
from typing import Dict, Tuple, Optional, List

def create_scalar_field_plot(
    data: np.ndarray,
    grid_points: Tuple[np.ndarray, np.ndarray, np.ndarray],
    title: str,
    colormap: str = 'viridis',
    opacity: float = 0.7
) -> pv.Grid:
    """Create a 3D scalar field visualization.
    
    Args:
        data: 3D array of scalar field values
        grid_points: Tuple of (x, y, z) grid point coordinates
        title: Plot title
        colormap: Name of the colormap to use
        opacity: Opacity of the volume rendering
        
    Returns:
        PyVista grid object
    """
    x, y, z = grid_points
    grid = pv.StructuredGrid()
    
    grid.dimensions = np.array(data.shape) + 1
    grid.origin = (x[0], y[0], z[0])
    grid.spacing = (
        (x[-1] - x[0]) / (len(x) - 1),
        (y[-1] - y[0]) / (len(y) - 1),
        (z[-1] - z[0]) / (len(z) - 1)
    )
    
    grid.point_data[title] = data.flatten(order='F')
    
    # Set up the plotter
    plotter = pv.Plotter()
    plotter.add_volume(
        grid,
        scalars=title,
        cmap=colormap,
        opacity=opacity
    )
    
    return grid

def create_vector_field_plot(
    vector_data: Tuple[np.ndarray, np.ndarray, np.ndarray],
    grid_points: Tuple[np.ndarray, np.ndarray, np.ndarray],
    title: str,
    scale: float = 1.0,
    density: int = 5
) -> pv.Grid:
    """Create a 3D vector field visualization.
    
    Args:
        vector_data: Tuple of (vx, vy, vz) vector components
        grid_points: Tuple of (x, y, z) grid point coordinates
        title: Plot title
        scale: Scaling factor for vectors
        density: Density of vectors to display
        
    Returns:
        PyVista grid object
    """
    x, y, z = grid_points
    vx, vy, vz = vector_data
    
    grid = pv.StructuredGrid()
    grid.dimensions = np.array(vx.shape) + 1
    grid.origin = (x[0], y[0], z[0])
    grid.spacing = (
        (x[-1] - x[0]) / (len(x) - 1),
        (y[-1] - y[0]) / (len(y) - 1),
        (z[-1] - z[0]) / (len(z) - 1)
    )
    
    vectors = np.column_stack((
        vx.flatten(order='F'),
        vy.flatten(order='F'),
        vz.flatten(order='F')
    ))
    grid.point_data[title] = vectors
    
    # Set up the plotter
    plotter = pv.Plotter()
    plotter.add_arrows(
        grid.points[::density],
        vectors[::density],
        scale=scale
    )
    
    return grid

def create_isosurface_plot(
    data: np.ndarray,
    grid_points: Tuple[np.ndarray, np.ndarray, np.ndarray],
    isovalues: List[float],
    title: str,
    colormap: str = 'viridis',
    opacity: float = 0.5
) -> pv.Grid:
    """Create isosurfaces for scalar field visualization.
    
    Args:
        data: 3D array of scalar field values
        grid_points: Tuple of (x, y, z) grid point coordinates
        isovalues: List of isosurface values
        title: Plot title
        colormap: Name of the colormap to use
        opacity: Opacity of the isosurfaces
        
    Returns:
        PyVista grid object
    """
    x, y, z = grid_points
    grid = pv.StructuredGrid()
    
    grid.dimensions = np.array(data.shape) + 1
    grid.origin = (x[0], y[0], z[0])
    grid.spacing = (
        (x[-1] - x[0]) / (len(x) - 1),
        (y[-1] - y[0]) / (len(y) - 1),
        (z[-1] - z[0]) / (len(z) - 1)
    )
    
    grid.point_data[title] = data.flatten(order='F')
    
    # Set up the plotter
    plotter = pv.Plotter()
    for isovalue in isovalues:
        contours = grid.contour([isovalue])
        plotter.add_mesh(
            contours,
            scalars=title,
            cmap=colormap,
            opacity=opacity
        )
    
    return grid

def save_visualization(
    grid: pv.Grid,
    filename: str,
    camera_position: Optional[Tuple[float, float, float]] = None,
    window_size: Tuple[int, int] = (1024, 768),
    screenshot: bool = True
) -> None:
    """Save visualization to file.
    
    Args:
        grid: PyVista grid object
        filename: Output filename
        camera_position: Optional camera position
        window_size: Window size for rendering
        screenshot: Whether to save as screenshot
    """
    plotter = pv.Plotter(off_screen=True)
    plotter.add_mesh(grid)
    
    if camera_position:
        plotter.camera_position = camera_position
    
    plotter.window_size = window_size
    
    if screenshot:
        plotter.screenshot(filename)
    else:
        plotter.export_vtkjs(filename) 