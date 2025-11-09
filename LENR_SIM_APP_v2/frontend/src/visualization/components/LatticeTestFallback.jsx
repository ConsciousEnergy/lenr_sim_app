
/**
 * Fallback component for LatticeTest when the TypeScript version has issues
 */
const LatticeTestFallback = () => {
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column',
      backgroundColor: '#f0f0f0',
      borderRadius: '8px'
    }}>
      <h2>Lattice Visualization</h2>
      <p>Lattice visualization placeholder</p>
      <div style={{
        width: '200px',
        height: '200px',
        border: '1px solid #ccc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '20px 0'
      }}>
        3D Lattice View
      </div>
      <p>Select visualization settings from the panel on the left</p>
    </div>
  );
};

export default LatticeTestFallback; 