"""
Mock NumPy implementation for testing physics calculations.
"""
from typing import Any, Optional, Tuple, Union
import numpy as np
from numpy.typing import ArrayLike, NDArray

class MockNumPy:
    """Mock NumPy implementation for testing physics calculations."""
    
    def __init__(self, seed: int = 42):
        """Initialize mock NumPy.
        
        Args:
            seed: Random seed for reproducible results
        """
        self._rng = np.random.RandomState(seed)
        
    def array(self, obj: ArrayLike, dtype: Optional[np.dtype] = None) -> NDArray:
        """Create a mock array with deterministic values."""
        return np.array(obj, dtype=dtype)
        
    def linspace(self, start: float, stop: float, num: int = 50) -> NDArray:
        """Create evenly spaced numbers over a specified interval."""
        return np.linspace(start, stop, num)
        
    def exp(self, x: Union[float, NDArray]) -> Union[float, NDArray]:
        """Calculate exponential of input."""
        return np.exp(x)
        
    def sqrt(self, x: Union[float, NDArray]) -> Union[float, NDArray]:
        """Calculate square root of input."""
        return np.sqrt(x)
        
    def random_normal(self, size: Optional[Tuple[int, ...]] = None,
                     loc: float = 0.0, scale: float = 1.0) -> NDArray:
        """Generate random samples from normal distribution."""
        return self._rng.normal(loc=loc, scale=scale, size=size)
        
    def random_uniform(self, low: float = 0.0, high: float = 1.0,
                      size: Optional[Tuple[int, ...]] = None) -> NDArray:
        """Generate random samples from uniform distribution."""
        return self._rng.uniform(low=low, high=high, size=size)
        
    def zeros(self, shape: Union[int, Tuple[int, ...]], 
             dtype: Optional[np.dtype] = None) -> NDArray:
        """Create an array filled with zeros."""
        return np.zeros(shape, dtype=dtype)
        
    def ones(self, shape: Union[int, Tuple[int, ...]], 
            dtype: Optional[np.dtype] = None) -> NDArray:
        """Create an array filled with ones."""
        return np.ones(shape, dtype=dtype)
        
    def arange(self, start: int, stop: Optional[int] = None, 
              step: int = 1) -> NDArray:
        """Create evenly spaced values within a given interval."""
        return np.arange(start, stop, step)
        
    def mean(self, a: NDArray, axis: Optional[int] = None) -> Union[float, NDArray]:
        """Calculate the mean along the specified axis."""
        return np.mean(a, axis=axis)
        
    def std(self, a: NDArray, axis: Optional[int] = None) -> Union[float, NDArray]:
        """Calculate the standard deviation along the specified axis."""
        return np.std(a, axis=axis)
        
    def sum(self, a: NDArray, axis: Optional[int] = None) -> Union[float, NDArray]:
        """Calculate the sum along the specified axis."""
        return np.sum(a, axis=axis)
        
    def dot(self, a: NDArray, b: NDArray) -> NDArray:
        """Calculate dot product of two arrays."""
        return np.dot(a, b)
        
    def meshgrid(self, *xi: NDArray, indexing: str = 'xy') -> Tuple[NDArray, ...]:
        """Create coordinate matrices from coordinate vectors."""
        return np.meshgrid(*xi, indexing=indexing)
        
    def gradient(self, f: NDArray, *varargs: Any, axis: Optional[int] = None,
                edge_order: int = 1) -> Union[NDArray, Tuple[NDArray, ...]]:
        """Calculate the gradient of an array."""
        return np.gradient(f, *varargs, axis=axis, edge_order=edge_order)
        
    # Common physics calculation helpers
    def calculate_tunneling_probability(self, barrier_height: float,
                                     barrier_width: float,
                                     particle_energy: float) -> float:
        """Calculate quantum tunneling probability."""
        # Simplified WKB approximation
        k = np.sqrt(2 * (barrier_height - particle_energy))
        return np.exp(-2 * barrier_width * k)
        
    def calculate_reaction_rate(self, temperature: float,
                              activation_energy: float,
                              prefactor: float) -> float:
        """Calculate reaction rate using Arrhenius equation."""
        # k = A * exp(-Ea/RT)
        return prefactor * np.exp(-activation_energy / (8.314 * temperature))
        
    def calculate_energy_levels(self, potential_well_depth: float,
                              mass: float, n_levels: int = 10) -> NDArray:
        """Calculate energy levels in a potential well."""
        # Simplified quantum harmonic oscillator
        omega = np.sqrt(2 * potential_well_depth / (mass))
        return np.array([(n + 0.5) * omega for n in range(n_levels)])
        
    def calculate_wave_function(self, x: NDArray, energy: float,
                              potential: NDArray) -> NDArray:
        """Calculate wave function for given energy and potential."""
        # Simplified 1D Schrödinger equation solution
        psi = np.zeros_like(x)
        dx = x[1] - x[0]
        k = np.sqrt(2 * (energy - potential))
        psi = np.exp(1j * k * x)
        return psi / np.sqrt(np.sum(np.abs(psi)**2) * dx) 