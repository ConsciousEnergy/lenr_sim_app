import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Typography, 
  Card, 
  Steps, 
  Button, 
  Space,
  Row,
  Col,
  Alert,
  Form,
  Input
} from 'antd';
import {
  ExperimentOutlined,
  SettingOutlined,
  RocketOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import ParameterControls from '../components/ParameterControls';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

const NewSimulation = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [simulationName, setSimulationName] = useState('');
  const [simulationDescription, setSimulationDescription] = useState('');
  const [parameters, setParameters] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Handle parameter changes
  const handleParametersChange = (params) => {
    setParameters(params);
  };
  
  // Start simulation
  const handleStartSimulation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Store parameters in localStorage for the simulation page to use
      const simulationConfig = {
        name: simulationName || 'New Simulation',
        description: simulationDescription || '',
        parameters: {
          ...parameters,
          latticeType: parameters.latticeType || 'FCC',
          temperature: parameters.temperature || 300,
          pressure: parameters.pressure || 1.0,
          deuteriumLoading: parameters.deuteriumLoading || 0.6,
          latticeConstant: parameters.latticeConstant || 3.89,
          dimensions: parameters.dimensions || [10, 10, 10],
          defectConcentration: parameters.defectConcentration || 0.01,
          enhancementFactor: parameters.enhancementFactor || 1.0
        },
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem('pendingSimulation', JSON.stringify(simulationConfig));
      
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate to the LENR Simulation page where users can run the actual simulation
      navigate('/lenr-simulation');
    } catch (err) {
      setError('Failed to save configuration. Please try again.');
      console.error('Error starting simulation:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Steps content components
  const steps = [
    {
      title: 'Setup',
      icon: <ExperimentOutlined aria-hidden="true" />,
      content: (
        <Card style={{ marginTop: 24 }}>
          <Title level={4}>Simulation Setup</Title>
          <Paragraph>
            Configure the basic settings for your new LENR simulation. These settings define the general parameters
            of your experiment.
          </Paragraph>
          
          <Form 
            id="simulation-setup-form" 
            name="simulation-setup-form"
            layout="vertical"
          >
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card title="Simulation Information" size="small">
                  <Card.Grid style={{ width: '100%' }}>
                    <Form.Item
                      label="Simulation Name"
                      name="simulationName"
                      htmlFor="simulation-name-input"
                    >
                      <Input
                        id="simulation-name-input"
                        name="simulationName"
                        type="text"
                        value={simulationName}
                        onChange={e => setSimulationName(e.target.value)}
                        placeholder="Enter a name for your simulation"
                        aria-label="Simulation Name"
                      />
                    </Form.Item>
                    
                    <Form.Item
                      label="Description"
                      name="simulationDescription"
                      htmlFor="simulation-description-input"
                    >
                      <Input.TextArea
                        id="simulation-description-input"
                        name="simulationDescription"
                        value={simulationDescription}
                        onChange={e => setSimulationDescription(e.target.value)}
                        placeholder="Enter a description of your simulation"
                        aria-label="Simulation Description"
                        style={{ minHeight: '80px' }}
                      />
                    </Form.Item>
                  </Card.Grid>
                </Card>
              </Col>
            </Row>
          </Form>
        </Card>
      )
    },
    {
      title: 'Parameters',
      icon: <SettingOutlined aria-hidden="true" />,
      content: (
        <ParameterControls
          onParametersChange={handleParametersChange}
          mode="advanced"
        />
      )
    },
    {
      title: 'Launch',
      icon: <RocketOutlined aria-hidden="true" />,
      content: (
        <Card style={{ marginTop: 24 }}>
          <Title level={4}>Launch Simulation</Title>
          <Paragraph>
            You're ready to start your LENR simulation. Review the information below and click "Start Simulation" 
            to begin.
          </Paragraph>
          
          <Card title="Simulation Summary" size="small" style={{ marginBottom: 16 }}>
            <Card.Grid style={{ width: '100%' }}>
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Text strong>Name:</Text>
                </Col>
                <Col span={16}>
                  <Text>{simulationName || 'Unnamed Simulation'}</Text>
                </Col>
                
                <Col span={8}>
                  <Text strong>Description:</Text>
                </Col>
                <Col span={16}>
                  <Text>{simulationDescription || 'No description provided'}</Text>
                </Col>
                
                <Col span={8}>
                  <Text strong>Lattice Type:</Text>
                </Col>
                <Col span={16}>
                  <Text>{parameters.latticeType || 'FCC'}</Text>
                </Col>
                
                <Col span={8}>
                  <Text strong>Temperature:</Text>
                </Col>
                <Col span={16}>
                  <Text>{parameters.temperature ? `${parameters.temperature} K` : '300 K'}</Text>
                </Col>
              </Row>
            </Card.Grid>
          </Card>
          
          <Alert
            type="info"
            message="Ready to Launch"
            description="Your simulation will be queued and started once resources are available. You'll be redirected to the simulation details page once it starts."
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          {error && (
            <Alert
              type="error"
              message="Error"
              description={error}
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Button
              type="primary"
              size="large"
              icon={<RocketOutlined aria-hidden="true" />}
              loading={loading}
              onClick={handleStartSimulation}
              id="start-simulation-button"
              name="start-simulation"
              aria-label="Start Simulation"
            >
              Start Simulation
            </Button>
          </div>
        </Card>
      )
    }
  ];
  
  // Navigation between steps
  const next = () => {
    setCurrentStep(currentStep + 1);
  };
  
  const prev = () => {
    setCurrentStep(currentStep - 1);
  };
  
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={2} id="new-simulation-title">
          <ExperimentOutlined aria-hidden="true" /> New LENR Simulation
        </Title>
        <Text type="secondary">
          Configure and launch a new Low Energy Nuclear Reaction (LENR) simulation
        </Text>
      </div>
      
      <Steps 
        current={currentStep} 
        style={{ marginBottom: 24 }} 
        aria-label="Simulation setup steps"
        role="navigation"
      >
        {steps.map((step, index) => (
          <Step 
            key={step.title} 
            title={step.title} 
            icon={step.icon} 
            id={`step-${index}`}
            aria-current={currentStep === index ? "step" : undefined}
          />
        ))}
      </Steps>
      
      <div 
        className="steps-content" 
        aria-labelledby={`step-${currentStep}`}
        role="region"
        id={`step-${currentStep}-content`}
      >
        {steps[currentStep].content}
      </div>
      
      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Space>
          {currentStep > 0 && (
            <Button 
              onClick={prev}
              id="prev-step-button"
              name="prev-step"
              aria-label="Previous step"
            >
              Previous
            </Button>
          )}
          
          {currentStep < steps.length - 1 && (
            <Button 
              type="primary" 
              onClick={next}
              id="next-step-button"
              name="next-step"
              aria-label="Next step"
            >
              Next
            </Button>
          )}
        </Space>
      </div>
    </div>
  );
};

export default NewSimulation; 