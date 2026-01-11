  setLoading(true);
  setError(null);
  try {
    const response = await fetch(`http://localhost:8000/api/simulations/${simulationId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
  }
} catch (error) {
  setError(error.message);
} finally {
  setLoading(false);
} 