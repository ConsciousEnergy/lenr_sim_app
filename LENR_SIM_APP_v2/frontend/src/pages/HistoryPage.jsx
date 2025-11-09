import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  CircularProgress,
  LinearProgress,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import AppLayout from '../components/layout/AppLayout';
import { usePhysics } from '../contexts/PhysicsContext';

const HistoryPage = () => {
  const { 
    simulationHistory, 
    fetchSimulationHistory, 
    loadSimulation,
    error 
  } = usePhysics();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch simulation history when component mounts
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        await fetchSimulationHistory();
      } catch (err) {
        console.error('Failed to load simulation history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [fetchSimulationHistory]);

  const handleLoadSimulation = async (id) => {
    setIsLoading(true);
    try {
      await loadSimulation(id);
      navigate('/simulation');
    } catch (err) {
      console.error('Failed to load simulation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success.main';
      case 'failed':
        return 'error.main';
      case 'running':
        return 'info.main';
      default:
        return 'text.secondary';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (err) {
      return dateString;
    }
  };

  return (
    <AppLayout>
      <Box sx={{ width: '100%', mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Simulation History
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          View and load your previous simulation runs
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : simulationHistory && simulationHistory.length > 0 ? (
          <TableContainer component={Paper} sx={{ mt: 3 }}>
            <Table sx={{ minWidth: 650 }} aria-label="simulation history table">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Parameters</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {simulationHistory.map((sim) => (
                  <TableRow
                    key={sim.id}
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      backgroundColor: sim.status === 'running' ? 'rgba(33, 150, 243, 0.08)' : 'inherit'
                    }}
                  >
                    <TableCell component="th" scope="row">
                      {formatDate(sim.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {sim.parameters?.latticeType || sim.parameters?.material || 'Unknown'} lattice
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {sim.parameters?.temperature || 'N/A'}°C, {sim.parameters?.pressure || 'N/A'} atm
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: getStatusColor(sim.status),
                          textTransform: 'capitalize'
                        }}
                      >
                        {sim.status}
                      </Typography>
                      {sim.status === 'running' && (
                        <Box sx={{ width: '100%', mt: 1 }}>
                          <LinearProgress variant="determinate" value={(sim.progress || 0) * 100} />
                          <Typography variant="caption" color="text.secondary">
                            {Math.round((sim.progress || 0) * 100)}%
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleLoadSimulation(sim.id)}
                        disabled={isLoading}
                      >
                        Load
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center', mt: 3 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Simulations Found
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              You haven't run any simulations yet. Go to the Simulation page to start.
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => navigate('/simulation')}
            >
              Run a Simulation
            </Button>
          </Paper>
        )}
      </Box>
    </AppLayout>
  );
};

export default HistoryPage; 