import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Form, Input, Button, Select, Slider, 
  InputNumber, Tabs, Spin, Alert, Row, Col, 
  Statistic, Switch, Divider, Space, Typography 
} from 'antd';
import UnifiedLENRVisualizer from './visualization/UnifiedLENRVisualizer';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

// API endpoints
const SIMULATION_ENDPOINT = `${API_BASE_URL}/api/simulations`;

const SimulationDashboard = () => {
  const [form] = Form.useForm();
  
  // Simulation state
  const [simulationId, setSimulationId] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [simulationParams, setSimulationParams] = useState({
    temperature: 300,
    pressure: 1,
    materialType: 'palladium',
    loadingRatio: 0.8,
    enhancementFactor: 1.0,
    simulationDuration: 60,
    timeStep: 0.1
  });
  
  // Results state
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Performance metrics
  const [metrics, setMetrics] = useState({
    calculationTime: 0,
    energyOutput: 0,
    excessHeat: 0,
    convergenceRate: 0
  });
  
  // Visualization data
  const [visualizationData, setVisualizationData] = useState(null);
  const [activeTab, setActiveTab] = useState('1');
  
  // Poll for simulation updates
  const pollSimulationStatus = useCallback(async (id, retryCount = 0) => {
    if (!id) return;
    
    const MAX_RETRIES = 3;
    const POLL_INTERVAL = 1000;
    const MAX_POLL_DURATION = 60000; // 60 seconds max polling
    
    try {
      const response = await axios.get(`${SIMULATION_ENDPOINT}/${id}/status`, {
        timeout: 5000 // 5 second timeout per request
      });
      const { status, progress, results } = response.data;
      
      if (status === 'completed') {
        setSimulating(false);
        setResults(results);
        
        // Generate visualization data from results
        if (results) {
          const visData = transformResultsToVisualizationData(results);
          setVisualizationData(visData);
          
          // Update metrics
          if (results.metrics) {
            setMetrics({
              calculationTime: results.metrics.calculationTime || 0,
              energyOutput: results.metrics.energyOutput || 0,
              excessHeat: results.metrics.excessHeat || 0,
              convergenceRate: results.metrics.convergenceRate || 0
            });
          }
        }
      } else if (status === 'failed' || status === 'cancelled') {
        setSimulating(false);
        setError(`Simulation ${status}. Please check parameters and try again.`);
      } else if (status === 'running' || status === 'created') {
        // Continue polling with timeout protection
        const startTime = window.simulationStartTime || Date.now();
        if (!window.simulationStartTime) {
          window.simulationStartTime = startTime;
        }
        
        const elapsedTime = Date.now() - window.simulationStartTime;
        
        if (elapsedTime < MAX_POLL_DURATION) {
          setTimeout(() => pollSimulationStatus(id, 0), POLL_INTERVAL);
        } else {
          // Stop polling after max duration
          setSimulating(false);
          setError('Simulation timeout. Please try again with shorter duration.');
          window.simulationStartTime = null;
        }
      }
    } catch (err) {
      console.error('Error polling simulation status:', err);
      
      // Retry logic for network errors
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying poll... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        setTimeout(() => pollSimulationStatus(id, retryCount + 1), POLL_INTERVAL * 2);
      } else {
        setError('Failed to connect to simulation server. Please check if the backend is running.');
      setSimulating(false);
        window.simulationStartTime = null;
      }
    }
  }, []);
  
  // Start simulation
  const startSimulation = async (values) => {
    try {
      setLoading(true);
      setError(null);
      
      // Prepare simulation parameters
      const simulationRequest = {
        parameters: {
          ...values,
          temperature: Number(values.temperature),
          pressure: Number(values.pressure),
          loadingRatio: Number(values.loadingRatio),
          enhancementFactor: Number(values.enhancementFactor),
          simulationDuration: Number(values.simulationDuration || 60),
          timeStep: Number(values.timeStep || 0.1)
        }
      };
      
      // Start simulation via API
      const response = await axios.post(SIMULATION_ENDPOINT, simulationRequest);
      const { id } = response.data;
      
      setSimulationId(id);
      setSimulationParams(simulationRequest.parameters);
      setSimulating(true);
      
      // Start polling for updates
      pollSimulationStatus(id);
    } catch (err) {
      console.error('Error starting simulation:', err);
      setError('Error starting simulation. Please check parameters and try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Stop simulation
  const stopSimulation = async () => {
    if (!simulationId) return;
    
    try {
      await axios.post(`${SIMULATION_ENDPOINT}/${simulationId}/stop`);
      setSimulating(false);
    } catch (err) {
      console.error('Error stopping simulation:', err);
      setError('Error stopping simulation. Please try again.');
    }
  };
  
  // Reset simulation
  const resetSimulation = () => {
    setSimulationId(null);
    setSimulating(false);
    setResults(null);
    setVisualizationData(null);
    setError(null);
    form.resetFields();
  };
  
  // Transform simulation results to visualization data
  const transformResultsToVisualizationData = (results) => {
    if (!results) {
      console.warn('No results provided, generating mock data');
      return generateMockVisualizationData();
    }
    
    // Transform the backend results to the format expected by UnifiedLENRVisualizer
    const visualizationData = {
      latticeData: results.latticeData || {
        type: 'FCC',
        material: 'palladium',
        temperature: 300,
        loading_ratio: 0.6,
        points: []
      },
      fusionEvents: results.fusionData?.events || [],
      enhancementData: results.enhancementData || {
        regions: []
      },
      energyData: results.energyData || [],
      temperatureData: results.temperatureData || [],
      fluidDynamicsData: results.fluidDynamicsData || []
    };
    
    // Log the transformed data for debugging
    console.log('Transformed visualization data:', visualizationData);
    
    return visualizationData;
  };
  
  // Generate mock visualization data for testing
  const generateMockVisualizationData = () => {
    console.log('Generating mock visualization data for testing');
    
    // Generate lattice points for an 8x8x8 FCC structure
    const latticeSize = 8;
    const latticeConstant = 3.89; // Palladium lattice constant
    const latticePoints = [];
    
    for (let x = 0; x < latticeSize; x++) {
      for (let y = 0; y < latticeSize; y++) {
        for (let z = 0; z < latticeSize; z++) {
          latticePoints.push({ 
            x: x * latticeConstant, 
            y: y * latticeConstant, 
            z: z * latticeConstant,
            type: 'host'
          });
        }
      }
    }
    
    // Generate fusion events
    const fusionEvents = [];
    for (let i = 0; i < 5; i++) {
      fusionEvents.push({
        position: {
          x: Math.random() * latticeSize * latticeConstant,
          y: Math.random() * latticeSize * latticeConstant,
          z: Math.random() * latticeSize * latticeConstant
        },
        energy: Math.random() * 10 + 5,
        time: Math.random() * 60
      });
        }
    
    // Generate enhancement regions
    const enhancementData = {
      regions: [
        {
          coordinates: {
            x: latticeSize * latticeConstant * 0.5,
            y: latticeSize * latticeConstant * 0.5,
            z: latticeSize * latticeConstant * 0.5
          },
          radius: 5.0,
          enhancement_factor: 2.5,
          type: 'phonon_coupling'
        }
      ]
    };
    
    // Generate energy data (time series)
    const energyData = Array(100).fill(0).map((_, i) => 
      10 + 5 * Math.sin(i * 0.1) + Math.random() * 2
    );
    
    // Generate temperature data (time series)
    const temperatureData = Array(100).fill(0).map((_, i) => ({
      time: i * 0.1,
      value: 300 + 20 * Math.sin(i * 0.05) + Math.random() * 5
    }));
    
    return {
      latticeData: {
        type: 'FCC',
        material: 'palladium',
        temperature: 300,
        loading_ratio: 0.6,
        points: latticePoints
      },
      fusionEvents: fusionEvents,
      enhancementData: enhancementData,
      energyData: energyData,
      temperatureData: temperatureData,
      fluidDynamicsData: []
    };
  };
  
  // Handle form submission
  const handleFormSubmit = (values) => {
    startSimulation(values);
  };
  
  return (
    <div className="simulation-dashboard">
      <Title level={2}>LENR Simulation Dashboard</Title>
      <Divider />
      
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="Simulation Parameters" bordered={false}>
            <Form
              form={form}
              layout="vertical"
              initialValues={simulationParams}
              onFinish={handleFormSubmit}
            >
              <Form.Item
                name="temperature"
                label="Temperature (K)"
                rules={[{ required: true, message: 'Please input temperature' }]}
              >
                <Slider
                  min={273}
                  max={1273}
                  step={1}
                  tooltipVisible
                  marks={{ 273: '273K', 773: '773K', 1273: '1273K' }}
                />
              </Form.Item>
              
              <Form.Item
                name="pressure"
                label="Pressure (atm)"
                rules={[{ required: true, message: 'Please input pressure' }]}
              >
                <Slider
                  min={0.1}
                  max={10}
                  step={0.1}
                  tooltipVisible
                  marks={{ 0.1: '0.1', 5: '5', 10: '10' }}
                />
              </Form.Item>
              
              <Form.Item
                name="materialType"
                label="Material"
                rules={[{ required: true, message: 'Please select a material' }]}
              >
                <Select
                  id="materialType"
                  name="materialType"
                  aria-label="Select material type"
                >
                  <Option value="palladium">Palladium</Option>
                  <Option value="nickel">Nickel</Option>
                  <Option value="titanium">Titanium</Option>
                  <Option value="platinum">Platinum</Option>
                </Select>
              </Form.Item>
              
              <Form.Item
                name="loadingRatio"
                label="Loading Ratio (D/Pd)"
                rules={[{ required: true, message: 'Please input loading ratio' }]}
              >
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  tooltipVisible
                  marks={{ 0: '0', 0.5: '0.5', 1: '1' }}
                />
              </Form.Item>
              
              <Form.Item
                name="enhancementFactor"
                label="Enhancement Factor"
                rules={[{ required: true, message: 'Please input enhancement factor' }]}
              >
                <InputNumber
                  id="enhancementFactor"
                  name="enhancementFactor"
                  min={0.1}
                  max={10}
                  step={0.1}
                  style={{ width: '100%' }}
                  aria-label="Enhancement factor value"
                />
              </Form.Item>
              
              <Form.Item
                name="simulationDuration"
                label="Simulation Duration (s)"
                rules={[{ required: true, message: 'Please input simulation duration' }]}
              >
                <InputNumber
                  id="simulationDuration"
                  name="simulationDuration"
                  min={1}
                  max={3600}
                  step={1}
                  style={{ width: '100%' }}
                  aria-label="Simulation duration in seconds"
                />
              </Form.Item>
              
              <Form.Item
                name="timeStep"
                label="Time Step (s)"
                rules={[{ required: true, message: 'Please input time step' }]}
              >
                <InputNumber
                  id="timeStep"
                  name="timeStep"
                  min={0.01}
                  max={1}
                  step={0.01}
                  style={{ width: '100%' }}
                  aria-label="Time step in seconds"
                />
              </Form.Item>
              
              <Form.Item>
                <Space>
                  {!simulating ? (
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      loading={loading}
                      htmlType="submit"
                    >
                      Start Simulation
                    </Button>
                  ) : (
                    <Button
                      danger
                      icon={<PauseCircleOutlined />}
                      onClick={stopSimulation}
                    >
                      Stop Simulation
                    </Button>
                  )}
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={resetSimulation}
                  >
                    Reset
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
          
          {results && (
            <Card 
              title="Performance Metrics" 
              bordered={false}
              style={{ marginTop: 16 }}
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="Calculation Time"
                    value={metrics.calculationTime}
                    suffix="s"
                    precision={2}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Energy Output"
                    value={metrics.energyOutput}
                    suffix="J"
                    precision={2}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Excess Heat"
                    value={metrics.excessHeat}
                    suffix="W"
                    precision={2}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Convergence"
                    value={metrics.convergenceRate * 100}
                    suffix="%"
                    precision={0}
                  />
                </Col>
              </Row>
            </Card>
          )}
        </Col>
        
        <Col xs={24} md={16}>
          <Card 
            title="Simulation Results"
            bordered={false}
            className="visualization-container"
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
                <p style={{ marginTop: 16 }}>Starting simulation...</p>
              </div>
            ) : simulating ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
                <p style={{ marginTop: 16 }}>Simulation in progress...</p>
              </div>
            ) : visualizationData ? (
              <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <TabPane tab="3D Visualization" key="1">
                  <div style={{ height: 500 }}>
                    <UnifiedLENRVisualizer visualizationData={visualizationData} />
                  </div>
                </TabPane>
                <TabPane tab="Temperature Profile" key="2">
                  <div style={{ height: 400 }}>
                    {/* Temperature Chart Component */}
                    <p>Temperature profile visualization will be displayed here</p>
                  </div>
                </TabPane>
                <TabPane tab="Energy Levels" key="3">
                  <div style={{ height: 400 }}>
                    {/* Energy Chart Component */}
                    <p>Energy level visualization will be displayed here</p>
                  </div>
                </TabPane>
                <TabPane tab="Raw Data" key="4">
                  <div style={{ height: 400, overflow: 'auto' }}>
                    <pre>{JSON.stringify(results, null, 2)}</pre>
                  </div>
                </TabPane>
              </Tabs>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">
                  Adjust parameters and start a simulation to see results
                </Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SimulationDashboard; 