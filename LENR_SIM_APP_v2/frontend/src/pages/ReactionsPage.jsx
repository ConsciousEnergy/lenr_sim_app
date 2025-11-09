import { useState } from 'react';
import { 
  Typography, 
  Card, 
  Tabs, 
  Space, 
  Button,
  Breadcrumb,
  Alert,
  Row,
  Col
} from 'antd';
import { 
  ExperimentOutlined, 
  SaveOutlined, 
  SettingOutlined,
  HomeOutlined,
  BulbOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';

// Custom components
import { ReactionConfigurationManager } from '../components/visualizations';
import VisualReactionBuilder from '../components/reactions/VisualReactionBuilder';
import TestingWorkbench from '../components/reactions/TestingWorkbench';
import CustomReactionManager from '../components/reactions/CustomReactionManager';

const { Title, Paragraph } = Typography;
const { TabPane } = Tabs;

/**
 * ReactionsPage Component
 * 
 * This page serves as a central hub for all reaction-related functionality,
 * including creating, testing, and managing custom fusion reactions.
 * 
 * @returns {JSX.Element} The reactions page component
 */
const ReactionsPage = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [selectedReaction, setSelectedReaction] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Handle tab change
  const handleTabChange = (key) => {
    setActiveTab(key);
  };
  
  // Handle reaction selection
  const handleReactionSelect = (reaction) => {
    setSelectedReaction(reaction);
    setTestResults(null); // Clear previous test results
  };
  
  // Handle running a test
  const handleRunTest = async (testConfig) => {
    setLoading(true);
    
    try {
      // In a real app, this would call an API
      const results = await simulateTest(testConfig);
      setTestResults(results);
    } catch (err) {
      console.error('Test error:', err);
      // In a real app, show error message
    } finally {
      setLoading(false);
    }
  };
  
  // Mock function to simulate test results
  const simulateTest = (testConfig) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Generate mock test results based on the reaction and parameters
        const mockResults = {
          reaction: testConfig.reaction,
          parameters: testConfig.params,
          energyOutput: Math.random() * 100 * testConfig.params.temperature,
          crossSection: Math.random() * 0.01 * testConfig.params.temperature,
          reactivity: Math.random() * 0.5 * testConfig.params.temperature,
          neutronFlux: testConfig.reaction.products.some(p => p.name === 'n') 
            ? Math.random() * 1000 
            : 0,
          timePoints: Array.from({ length: 20 }, (_, i) => ({
            time: i * (testConfig.params.duration / 20),
            temperature: testConfig.params.temperature * (1 + Math.random() * 0.1 - 0.05),
            energy: Math.random() * 100 * testConfig.params.temperature * (i / 20)
          })),
          sweepResults: testConfig.params.parameterSweep ? Array.from({ length: testConfig.params.sweepSteps }, (_, i) => {
            const paramValue = testConfig.params.sweepStart + 
              (testConfig.params.sweepEnd - testConfig.params.sweepStart) * (i / (testConfig.params.sweepSteps - 1));
            
            return {
              parameterValue: paramValue,
              energyOutput: Math.random() * 100 * paramValue,
              crossSection: Math.random() * 0.01 * paramValue,
              reactivity: Math.random() * 0.5 * paramValue
            };
          }) : null
        };
        
        resolve(mockResults);
      }, 2000); // Simulate network delay
    });
  };
  
  // Handle comparison with standard reactions
  const handleCompare = async (reaction, params) => {
    setLoading(true);
    
    try {
      // In a real app, this would call an API
      // For now, just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real app, show comparison results
    } catch (err) {
      console.error('Comparison error:', err);
      // In a real app, show error message
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Link to="/">
            <HomeOutlined /> Home
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <ExperimentOutlined /> Reactions
        </Breadcrumb.Item>
      </Breadcrumb>
      
      {/* Page Header */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={2}>
              <ExperimentOutlined /> Custom Fusion Reactions
            </Title>
            <Paragraph>
              Design, test, and manage custom fusion reactions for LENR experiments. Create detailed reaction configurations,
              run simulations with different parameters, and visualize quantum tunneling effects.
            </Paragraph>
          </div>
          
          {!selectedReaction && activeTab === '2' && (
            <Alert
              message="No Reaction Selected"
              description="Please select or create a reaction from the 'Manage Reactions' tab to test it."
              type="info"
              showIcon
            />
          )}
        </Space>
      </Card>
      
      {/* Main Tabs */}
      <Card>
        <Tabs activeKey={activeTab} onChange={handleTabChange} size="large" tabPosition="top">
          <TabPane 
            tab={
              <span>
                <BulbOutlined /> Create Reaction
              </span>
            } 
            key="1"
          >
            <VisualReactionBuilder 
              onSave={handleReactionSelect}
            />
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <ExperimentOutlined /> Test Workbench
              </span>
            } 
            key="2"
          >
            <TestingWorkbench 
              reaction={selectedReaction}
              onRunTest={handleRunTest}
              onCompare={handleCompare}
              testResults={testResults}
              loading={loading}
            />
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <SettingOutlined /> Manage Reactions
              </span>
            } 
            key="3"
          >
            <CustomReactionManager 
              onSelect={handleReactionSelect}
            />
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <SaveOutlined /> Saved Configurations
              </span>
            } 
            key="4"
          >
            <ReactionConfigurationManager />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default ReactionsPage; 