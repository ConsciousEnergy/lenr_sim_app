
import TestCube from '../visualization/components/TestCube';

const VisualizationTest: React.FC = () => {
  return (
    <div className="visualization-test">
      <h1>Three.js Visualization Test</h1>
      <div className="test-container">
        <TestCube width={800} height={600} />
      </div>
      <style>{`
        .visualization-test {
          padding: 20px;
        }
        
        h1 {
          color: #333;
          margin-bottom: 20px;
        }
        
        .test-container {
          border: 1px solid #ccc;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default VisualizationTest; 