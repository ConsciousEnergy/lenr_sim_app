import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography, Container, Select, MenuItem, FormControl, InputLabel, Paper, Button, Alert, SelectChangeEvent } from '@mui/material';
import { RealTimeDataDashboard } from '../components/visualizations';
import { simulationApi } from '../api/simulation';

/**
 * Real-Time Visualization Page
 * 
 * Displays real-time data visualization for a selected simulation.
 */
const RealTimeVisualizationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [simulationId, setSimulationId] = useState<string | null>(searchParams.get('id'));
  const [simulations, setSimulations] = useState<Array<{id: string; name?: string; status: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available simulations
  useEffect(() => {
    const fetchSimulations = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await simulationApi.listSimulations();
        const rows: Array<{ id?: string; simulation_id?: string; status?: string }> =
          Array.isArray(response)
            ? response
            : Array.isArray((response as { items?: unknown } | null)?.items)
              ? ((response as { items: Array<{ id?: string; simulation_id?: string; status?: string }> }).items)
              : [];
        setSimulations(
          rows
            .map((sim) => {
              const id = String(sim.id || sim.simulation_id || '');
              return {
                id,
                name: id ? `Simulation ${id.slice(0, 8)}` : 'Simulation',
                status: sim.status || 'unknown',
              };
            })
            .filter((sim) => Boolean(sim.id))
        );
      } catch (err) {
        setError('Failed to load simulations. Please try again.');
        console.error('Error fetching simulations:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSimulations();
  }, []);

  // Handle simulation selection
  const handleSimulationChange = (event: SelectChangeEvent<string>) => {
    const newId = event.target.value;
    setSimulationId(newId);
    setSearchParams({ id: newId });
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Real-Time Data Visualization
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="simulation-select-label">Simulation</InputLabel>
              <Select
                labelId="simulation-select-label"
                value={simulationId || ''}
                label="Simulation"
                onChange={handleSimulationChange}
                disabled={loading || simulations.length === 0}
              >
                {loading ? (
                  <MenuItem value="" disabled>Loading...</MenuItem>
                ) : simulations.length === 0 ? (
                  <MenuItem value="" disabled>No simulations available</MenuItem>
                ) : (
                  simulations.map(sim => (
                    <MenuItem 
                      key={sim.id} 
                      value={sim.id}
                      disabled={sim.status !== 'running' && sim.status !== 'completed'}
                    >
                      {sim.name} ({sim.status})
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            
            <Button 
              variant="contained" 
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('id');
                setSearchParams(newParams);
                setSimulationId(null);
              }}
              disabled={!simulationId}
            >
              Clear Selection
            </Button>
          </Box>
        </Paper>
        
        {!simulationId ? (
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Please select a simulation to view real-time data.
            </Typography>
          </Paper>
        ) : (
          <RealTimeDataDashboard 
            simulationId={simulationId}
            title={`Real-Time Data: ${simulations.find(s => s.id === simulationId)?.name || simulationId}`}
          />
        )}
      </Box>
    </Container>
  );
};

export default RealTimeVisualizationPage; 