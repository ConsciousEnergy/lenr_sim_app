import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  Typography, 
  LinearProgress, 
  Chip,
  Stack,
  Tooltip,
  IconButton,
  Alert,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TimerIcon from '@mui/icons-material/Timer';

// Styled components
const ControlsContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  backgroundColor: theme.palette.background.paper,
  marginBottom: theme.spacing(3),
}));

const StatusChip = styled(Chip)(({ theme, status }) => ({
  fontWeight: 'bold',
  backgroundColor: 
    status === 'ready' ? theme.palette.info.light :
    status === 'running' ? theme.palette.success.light :
    status === 'paused' ? theme.palette.warning.light :
    status === 'completed' ? theme.palette.success.main :
    status === 'error' ? theme.palette.error.light : 
    theme.palette.grey[300],
  color: 
    status === 'ready' ? theme.palette.info.contrastText :
    status === 'running' ? theme.palette.success.contrastText :
    status === 'paused' ? theme.palette.warning.contrastText :
    status === 'completed' ? theme.palette.success.contrastText :
    status === 'error' ? theme.palette.error.contrastText : 
    theme.palette.grey[800],
}));

const SimulationControls = ({ onStart, onPause, onStop, onReset, parameters }) => {
  const [status, setStatus] = useState('ready'); // ready, running, paused, completed, error
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(null);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(null);
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const startSimulation = async () => {
    try {
      // Validate parameters
      if (!parameters || Object.keys(parameters).length === 0) {
        setError('Please set simulation parameters first');
        return;
      }
      
      setStatus('running');
      setProgress(0);
      setElapsedTime(0);
      setError('');
      
      // Start timer
      const startTime = Date.now();
      const timerId = setInterval(() => {
        const seconds = (Date.now() - startTime) / 1000;
        setElapsedTime(seconds);
        
        // Calculate estimated time remaining based on progress
        if (progress > 0) {
          const totalEstimatedTime = seconds / (progress / 100);
          setEstimatedTimeRemaining(totalEstimatedTime - seconds);
        }
      }, 1000);
      
      setTimer(timerId);
      
      // Simulate progress updates
      simulateProgress();
      
      // Call the onStart callback with parameters
      onStart && await onStart(parameters);
      
    } catch (err) {
      setStatus('error');
      setError(`Simulation failed: ${err.message}`);
      clearInterval(timer);
    }
  };
  
  const simulateProgress = () => {
    // This function simulates progress updates
    // In a real application, this would be updated based on backend responses
    let currentProgress = 0;
    
    const progressInterval = setInterval(() => {
      if (status === 'paused') {
        return;
      }
      
      currentProgress += Math.random() * 2;
      
      if (currentProgress >= 100) {
        currentProgress = 100;
        setProgress(100);
        setStatus('completed');
        clearInterval(progressInterval);
        clearInterval(timer);
      } else {
        setProgress(currentProgress);
      }
    }, 500);
    
    return progressInterval;
  };
  
  const pauseSimulation = () => {
    setStatus('paused');
    clearInterval(timer);
    onPause && onPause();
  };
  
  const resumeSimulation = () => {
    setStatus('running');
    
    // Resume timer
    const resumeTime = Date.now() - (elapsedTime * 1000);
    const timerId = setInterval(() => {
      const seconds = (Date.now() - resumeTime) / 1000;
      setElapsedTime(seconds);
      
      // Calculate estimated time remaining based on progress
      if (progress > 0) {
        const totalEstimatedTime = seconds / (progress / 100);
        setEstimatedTimeRemaining(totalEstimatedTime - seconds);
      }
    }, 1000);
    
    setTimer(timerId);
    
    // Simulate progress updates
    simulateProgress();
    
    onStart && onStart(parameters);
  };
  
  const stopSimulation = () => {
    setStatus('ready');
    setProgress(0);
    setElapsedTime(0);
    setEstimatedTimeRemaining(null);
    clearInterval(timer);
    onStop && onStop();
  };
  
  const resetSimulation = () => {
    setStatus('ready');
    setProgress(0);
    setElapsedTime(0);
    setEstimatedTimeRemaining(null);
    setError('');
    clearInterval(timer);
    onReset && onReset();
  };
  
  const getStatusLabel = () => {
    switch (status) {
      case 'ready': return 'Ready';
      case 'running': return 'Running';
      case 'paused': return 'Paused';
      case 'completed': return 'Completed';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };
  
  return (
    <ControlsContainer>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Simulation Controls</Typography>
        <StatusChip 
          label={getStatusLabel()} 
          status={status}
          size="medium"
        />
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Simulation Progress
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ height: 10, borderRadius: 5 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {progress.toFixed(1)}% Complete
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {status === 'completed' ? 'Simulation complete' : ''}
          </Typography>
        </Box>
      </Box>
      
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Tooltip title="Elapsed Time">
          <Chip
            icon={<AccessTimeIcon />}
            label={`Elapsed: ${formatTime(elapsedTime)}`}
            variant="outlined"
            size="small"
          />
        </Tooltip>
        
        {estimatedTimeRemaining !== null && status === 'running' && (
          <Tooltip title="Estimated Time Remaining">
            <Chip
              icon={<TimerIcon />}
              label={`Remaining: ${formatTime(estimatedTimeRemaining)}`}
              variant="outlined"
              size="small"
            />
          </Tooltip>
        )}
      </Stack>
      
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        {status === 'ready' || status === 'completed' || status === 'error' ? (
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrowIcon />}
            onClick={startSimulation}
            disabled={!parameters}
          >
            Start Simulation
          </Button>
        ) : status === 'running' ? (
          <Button
            variant="contained"
            color="warning"
            startIcon={<PauseIcon />}
            onClick={pauseSimulation}
          >
            Pause
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrowIcon />}
            onClick={resumeSimulation}
          >
            Resume
          </Button>
        )}
        
        <Button
          variant="outlined"
          color="error"
          startIcon={<StopIcon />}
          onClick={stopSimulation}
          disabled={status === 'ready'}
        >
          Stop
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<RestartAltIcon />}
          onClick={resetSimulation}
          disabled={status === 'ready'}
        >
          Reset
        </Button>
        
        <Tooltip title="Advanced Settings">
          <IconButton color="default" size="large">
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </ControlsContainer>
  );
};

export default SimulationControls; 