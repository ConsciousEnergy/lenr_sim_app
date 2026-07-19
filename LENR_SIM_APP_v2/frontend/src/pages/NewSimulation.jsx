import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Card,
  CardContent,
  CardHeader,
  Stepper,
  Step,
  StepLabel,
  Button,
  Stack,
  Grid,
  Alert,
  AlertTitle,
  TextField,
  Box
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import SettingsIcon from '@mui/icons-material/Settings';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ParameterControls from '../components/ParameterControls';

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
      icon: <ScienceIcon aria-hidden="true" />,
      content: (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" component="h4" gutterBottom>Simulation Setup</Typography>
            <Typography paragraph>
              Configure the basic settings for your new LENR simulation. These settings define the general parameters
              of your experiment.
            </Typography>
            
            <Card variant="outlined">
              <CardHeader title="Simulation Information" titleTypographyProps={{ variant: 'subtitle1' }} />
              <CardContent>
                <Stack spacing={2}>
                  <TextField
                    id="simulation-name-input"
                    name="simulationName"
                    label="Simulation Name"
                    value={simulationName}
                    onChange={e => setSimulationName(e.target.value)}
                    placeholder="Enter a name for your simulation"
                    inputProps={{ 'aria-label': 'Simulation Name' }}
                    fullWidth
                  />
                  
                  <TextField
                    id="simulation-description-input"
                    name="simulationDescription"
                    label="Description"
                    value={simulationDescription}
                    onChange={e => setSimulationDescription(e.target.value)}
                    placeholder="Enter a description of your simulation"
                    inputProps={{ 'aria-label': 'Simulation Description' }}
                    multiline
                    minRows={3}
                    fullWidth
                  />
                </Stack>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )
    },
    {
      title: 'Parameters',
      icon: <SettingsIcon aria-hidden="true" />,
      content: (
        <ParameterControls
          onParametersChange={handleParametersChange}
          mode="advanced"
        />
      )
    },
    {
      title: 'Launch',
      icon: <RocketLaunchIcon aria-hidden="true" />,
      content: (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" component="h4" gutterBottom>Launch Simulation</Typography>
            <Typography paragraph>
              You're ready to start your LENR simulation. Review the information below and click "Start Simulation" 
              to begin.
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardHeader title="Simulation Summary" titleTypographyProps={{ variant: 'subtitle1' }} />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid size={4}><Typography sx={{ fontWeight: 700 }}>Name:</Typography></Grid>
                  <Grid size={8}><Typography>{simulationName || 'Unnamed Simulation'}</Typography></Grid>
                  
                  <Grid size={4}><Typography sx={{ fontWeight: 700 }}>Description:</Typography></Grid>
                  <Grid size={8}><Typography>{simulationDescription || 'No description provided'}</Typography></Grid>
                  
                  <Grid size={4}><Typography sx={{ fontWeight: 700 }}>Lattice Type:</Typography></Grid>
                  <Grid size={8}><Typography>{parameters.latticeType || 'FCC'}</Typography></Grid>
                  
                  <Grid size={4}><Typography sx={{ fontWeight: 700 }}>Temperature:</Typography></Grid>
                  <Grid size={8}><Typography>{parameters.temperature ? `${parameters.temperature} K` : '300 K'}</Typography></Grid>
                </Grid>
              </CardContent>
            </Card>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle>Ready to Launch</AlertTitle>
              Your simulation will be queued and started once resources are available. You'll be redirected to the simulation details page once it starts.
            </Alert>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <AlertTitle>Error</AlertTitle>
                {error}
              </Alert>
            )}
            
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<RocketLaunchIcon aria-hidden="true" />}
                loading={loading}
                onClick={handleStartSimulation}
                id="start-simulation-button"
                name="start-simulation"
                aria-label="Start Simulation"
              >
                Start Simulation
              </Button>
            </Box>
          </CardContent>
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
    <Box>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h4" component="h2" id="new-simulation-title" gutterBottom>
          <ScienceIcon aria-hidden="true" sx={{ verticalAlign: 'middle', mr: 1 }} /> New LENR Simulation
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure and launch a new Low Energy Nuclear Reaction (LENR) simulation
        </Typography>
      </Box>
      
      <Stepper
        activeStep={currentStep}
        sx={{ mb: 3 }}
        aria-label="Simulation setup steps"
      >
        {steps.map((step, index) => (
          <Step key={step.title} id={`step-${index}`}>
            <StepLabel icon={step.icon}>{step.title}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <Box 
        className="steps-content" 
        aria-labelledby={`step-${currentStep}`}
        role="region"
        id={`step-${currentStep}-content`}
      >
        {steps[currentStep].content}
      </Box>
      
      <Box sx={{ mt: 3, textAlign: 'right' }}>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          {currentStep > 0 && (
            <Button 
              variant="outlined"
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
              variant="contained" 
              onClick={next}
              id="next-step-button"
              name="next-step"
              aria-label="Next step"
            >
              Next
            </Button>
          )}
        </Stack>
      </Box>
    </Box>
  );
};

export default NewSimulation;
