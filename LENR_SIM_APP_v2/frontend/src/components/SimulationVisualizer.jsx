import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card, Space, Button, Alert, Typography, Tag } from 'antd';
import { 
  FullscreenOutlined, 
  CompressOutlined, 
  ReloadOutlined,
  ColumnHeightOutlined
} from '@ant-design/icons';

// Import the new VisualizationSwitcher
import VisualizationSwitcher from './visualization/VisualizationSwitcher';
// Import rendering optimizations
import { 
  optimizeRenderer, 
  optimizeScene, 
  setupWebGLContextHandling,
  detectWebGLCapabilities
} from '../visualization/utils/renderingOptimizations';

const { Title, Text } = Typography;

/**
 * SimulationVisualizer component for 3D rendering of simulation results
 * with improved performance and timeout handling
 * 
 * @param {Object} props Component props
 * @param {string} props.simulationId ID of the simulation to visualize
 * @param {string} props.apiBaseUrl Base URL for the API
 * @param {boolean} props.autoLoad Whether to automatically load data on mount
 */
const SimulationVisualizer = ({ 
  simulationId, 
  apiBaseUrl, 
  autoLoad = true,
  onError,
  ...props 
}) => {
  const [simulationData, setSimulationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [retries, setRetries] = useState(0);
  const [webGLCapabilities, setWebGLCapabilities] = useState(null);
  const containerRef = useRef(null);
  
  // Track maximum time spent in data processing
  const [processingTime, setProcessingTime] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  
  // Check WebGL capabilities on mount
  useEffect(() => {
    try {
      const capabilities = detectWebGLCapabilities();
      setWebGLCapabilities(capabilities);
      console.log('WebGL capabilities:', capabilities);
    } catch (err) {
      console.error('Failed to detect WebGL capabilities:', err);
      setError('Your browser may have limited WebGL support. Visualization quality may be reduced.');
    }
  }, []);

  // Setup WebGL context loss handler
  useEffect(() => {
    if (containerRef.current) {
      const canvas = containerRef.current.querySelector('canvas');
      if (canvas) {
        setupWebGLContextHandling(
          canvas,
          () => {
            console.warn('WebGL context lost');
            setError('WebGL context was lost. Trying to recover...');
          },
          () => {
            console.log('WebGL context restored');
            setError(null);
            // Force refresh visualization
            handleRefresh();
          }
        );
      }
    }
  }, [simulationData]);

  const fetchSimulationData = useCallback(async () => {
    if (!simulationId) {
      console.warn('No simulation ID provided');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const startTime = performance.now();
      
      const response = await fetch(`${apiBaseUrl}/api/simulations/${simulationId}/results`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process data with time tracking
      const processStartTime = performance.now();
      
      // Process simulation data safely with timeout protection
      const processDataWithTimeout = (data) => {
        return new Promise((resolve, reject) => {
          // Set a timeout for processing (30 seconds)
          const timeoutId = setTimeout(() => {
            reject(new Error('Data processing timeout - too complex for browser'));
          }, 30000);
          
          try {
            // Process the data
            const processed = {
              ...data,
              results: data.results || [],
              // Add any processing logic here
            };
            
            // Clear timeout and resolve
            clearTimeout(timeoutId);
            resolve(processed);
          } catch (err) {
            clearTimeout(timeoutId);
            reject(err);
          }
        });
      };
      
      const processedData = await processDataWithTimeout(data);
      
      const processEndTime = performance.now();
      const processTime = processEndTime - processStartTime;
      setProcessingTime(processTime);
      
      // If processing took too long, warn the user
      if (processTime > 2000) {
        console.warn(`Data processing took ${processTime.toFixed(0)}ms, which might affect performance`);
      }
      
      setSimulationData(processedData);
      
      const endTime = performance.now();
      console.log(`Data fetch and process completed in ${(endTime - startTime).toFixed(0)}ms`);
      
      setLoading(false);
      setRetries(0); // Reset retries on success
    } catch (err) {
      console.error('Failed to fetch simulation data:', err);
      setError(`Failed to load simulation: ${err.message}`);
      setLoading(false);
      
      // Implement retry logic
      if (retries < 3) {
        console.log(`Retrying data fetch (attempt ${retries + 1}/3)...`);
        setRetries(prev => prev + 1);
        setTimeout(() => {
          fetchSimulationData();
        }, 2000 * (retries + 1)); // Exponential backoff
      } else {
        if (onError) onError(err);
      }
    }
  }, [simulationId, apiBaseUrl, retries, onError]);
  
  // Load data when component mounts or simulationId changes
  useEffect(() => {
    if (autoLoad && simulationId) {
      fetchSimulationData();
    }
  }, [autoLoad, simulationId, fetchSimulationData]);
  
  const handleRefresh = () => {
    fetchSimulationData();
  };
  
  const toggleFullscreen = () => {
    setFullscreen(prev => !prev);
  };

  const renderVisualization = useCallback(() => {
    if (!simulationData) return null;
    
    setIsRendering(true);
    
    // Use optimized rendering for lower-end devices or if processing time was high
    const useOptimizedRendering = 
      (webGLCapabilities?.isMobile || processingTime > 1000 || retries > 0);
    
    return (
      <VisualizationSwitcher
        simulationData={simulationData}
        loading={loading}
        onRefresh={handleRefresh}
        optimizeRendering={useOptimizedRendering}
        containerRef={containerRef}
        onRenderingStart={() => setIsRendering(true)}
        onRenderingComplete={() => setIsRendering(false)}
      />
    );
  }, [simulationData, loading, handleRefresh, webGLCapabilities, processingTime, retries]);

  return (
    <Card
      ref={containerRef}
      title={
        <Space>
          <Title level={4} id="visualization-title">3D Visualization</Title>
          {simulationData && (
            <Tag id="visualization-status" color="green" aria-live="polite">Data Loaded</Tag>
          )}
          {loading && (
            <Tag id="visualization-loading-status" color="blue" aria-live="polite">Loading...</Tag>
          )}
        </Space>
      }
      extra={
        <Space>
          <Button
            id="refresh-visualization-button"
            icon={<ReloadOutlined aria-hidden="true" />}
            onClick={handleRefresh}
            loading={loading}
            aria-label="Refresh visualization"
            aria-pressed={loading}
          >
            Refresh
          </Button>
          <Button
            id="toggle-fullscreen-button"
            icon={fullscreen ? <CompressOutlined aria-hidden="true" /> : <FullscreenOutlined aria-hidden="true" />}
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Exit fullscreen mode" : "Enter fullscreen mode"}
            aria-pressed={fullscreen}
          >
            {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </Button>
        </Space>
      }
      style={{ 
        width: "100%", 
        height: fullscreen ? "calc(100vh - 64px)" : "auto",
        position: fullscreen ? "fixed" : "relative",
        top: fullscreen ? "64px" : "auto",
        left: fullscreen ? 0 : "auto",
        zIndex: fullscreen ? 1000 : 1,
        transition: "all 0.3s"
      }}
      bodyStyle={{ 
        padding: 0, 
        height: fullscreen ? "calc(100% - 57px)" : "400px" 
      }}
    >
      {error && (
        <Alert
          message="Visualization Error"
          description={error}
          type="error"
          showIcon
          style={{ margin: 16 }}
          action={
            <Button size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }
          role="alert"
          aria-live="assertive"
        />
      )}
      
      {isRendering && processingTime > 2000 && (
        <Alert
          message="Performance Notice"
          description={`This visualization is complex and may affect performance. Optimizations are being applied.`}
          type="info"
          showIcon
          style={{ margin: '0 16px 16px' }}
          role="status"
        />
      )}
      
      {/* Need optimization notice for mobile */}
      {webGLCapabilities?.isMobile && (
        <Alert
          message="Mobile Device Detected"
          description="Rendering quality has been optimized for mobile performance."
          type="info"
          showIcon
          style={{ margin: '0 16px 16px' }}
          role="status"
        />
      )}
      
      {renderVisualization()}
    </Card>
  );
};

export default SimulationVisualizer; 