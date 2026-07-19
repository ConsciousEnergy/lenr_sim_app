import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Tabs,
  Tab,
  Divider,
  Stack,
  Button,
  Box,
  Paper,
  Table,
  TableBody,
  TableContainer,
  TableRow,
  TableCell
} from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisualizationStream from '../components/VisualizationStream';
import ParameterControls from '../components/ParameterControls';
import SimulationResults from '../components/SimulationResults';
import { simulationApi } from '../api/simulationApi';

const getStatusTag = (status) => {
  const statusMap = {
    'pending': { color: 'default', text: 'Pending' },
    'running': { color: 'info', text: 'Running' },
    'paused': { color: 'warning', text: 'Paused' },
    'completed': { color: 'success', text: 'Completed' },
    'error': { color: 'error', text: 'Error' }
  };
  
  const config = statusMap[status] || statusMap.pending;
  return <Chip size="small" color={config.color} label={config.text} />;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString();
};

// Small helper mirroring antd's bordered Descriptions using an MUI table
const DescriptionTable = ({ title, rows }) => (
  <Box>
    <Typography variant="subtitle1" gutterBottom>{title}</Typography>
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableBody>
          {rows.map(({ label, value }) => (
            <TableRow key={label}>
              <TableCell component="th" sx={{ fontWeight: 600, width: '40%', bgcolor: 'action.hover' }}>{label}</TableCell>
              <TableCell>{value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);

function SimulationDetail() {
  const { simulationId } = useParams();
  const location = useLocation();
  const preview = location.state?.simulationPreview || null;
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('live');

  const buildSimulationFromPreview = useCallback((snapshot) => ({
    id: snapshot.id ?? simulationId,
    name: snapshot.name ?? `${snapshot.type || 'Simulation'} (${snapshot.id || simulationId})`,
    description: `Loaded from analytics history snapshot (${snapshot.source || 'unknown source'})`,
    status: snapshot.status || 'completed',
    progress: snapshot.status === 'completed' ? 100 : 0,
    createdAt: snapshot.timestamp || new Date().toISOString(),
    estimatedCompletion: null,
    parameters: snapshot.parameters || {},
    resources: {
      cpuCores: 4,
      gpuEnabled: false,
      memory: 'N/A',
      estimatedRuntime: 'N/A',
    },
  }), [simulationId]);

  const fetchSimulation = useCallback(async () => {
    if (!simulationId) return;
    setLoading(true);
    setError(null);

    try {
      // Use the real API client (falls back to mock internally when backend is unreachable)
      const data = await simulationApi.getSimulationStatus(simulationId);

      // Normalise field names -- the API may return snake_case or camelCase
      setSimulation({
        id: data.id ?? data.simulation_id ?? simulationId,
        name: data.name ?? data.simulation_name ?? `Simulation ${simulationId}`,
        description: data.description ?? '',
        status: data.status ?? 'pending',
        progress: data.progress ?? 0,
        createdAt: data.createdAt ?? data.created_at ?? new Date().toISOString(),
        estimatedCompletion: data.estimatedCompletion ?? data.estimated_completion ?? null,
        parameters: data.parameters ?? {},
        resources: data.resources ?? {
          cpuCores: data.cpu_cores ?? 4,
          gpuEnabled: data.gpu_enabled ?? false,
          memory: data.memory ?? '8GB',
          estimatedRuntime: data.estimated_runtime ?? 'N/A',
        },
      });
      setNotice('');
    } catch (err) {
      console.error('Failed to fetch simulation:', err);
      if (preview) {
        setSimulation(buildSimulationFromPreview(preview));
        setNotice(`Live details unavailable for ${simulationId}. Showing stored history snapshot.`);
        setError(null);
      } else {
        setError(`Unable to load simulation ${simulationId}. ${err.message ?? ''}`);
      }
    } finally {
      setLoading(false);
    }
  }, [simulationId, preview, buildSimulationFromPreview]);

  useEffect(() => {
    fetchSimulation();
  }, [fetchSimulation]);
  
  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', p: 3 }}>
        <Typography variant="h5" component="h3">Loading simulation details...</Typography>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ textAlign: 'center', p: 3 }}>
        <Typography variant="h5" component="h3">Error</Typography>
        <Typography color="error">{error}</Typography>
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchSimulation}>
            Retry
          </Button>
        </Box>
      </Box>
    );
  }
  
  if (!simulation) {
    return null;
  }
  
  return (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          {notice ? (
            <Card sx={{ mb: 2, background: '#fffbe6', borderColor: '#ffe58f' }} variant="outlined">
              <CardContent>
                <Typography>{notice}</Typography>
              </CardContent>
            </Card>
          ) : null}
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography variant="h4" component="h2">{simulation.name}</Typography>
              <Typography>{simulation.description}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: 'right' }}>
              <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
                {simulation.status === 'running' && (
                  <Button variant="outlined" startIcon={<PauseCircleOutlineIcon />}>
                    Pause
                  </Button>
                )}
                
                {simulation.status === 'paused' && (
                  <Button variant="contained" startIcon={<PlayCircleOutlineIcon />}>
                    Resume
                  </Button>
                )}
                
                {simulation.status === 'error' && (
                  <Button variant="contained" color="error" startIcon={<RefreshIcon />}>
                    Retry
                  </Button>
                )}
                
                {simulation.status === 'completed' && (
                  <Button variant="contained" startIcon={<DownloadIcon />}>
                    Download Results
                  </Button>
                )}
                
                <Button variant="outlined" startIcon={<VisibilityIcon />}>
                  View Data
                </Button>
              </Stack>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <DescriptionTable
                title="Simulation Status"
                rows={[
                  { label: 'Status', value: getStatusTag(simulation.status) },
                  {
                    label: 'Progress',
                    value: (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.max(0, Math.min(100, simulation.progress || 0))}
                            color={simulation.status === 'error' ? 'error' : 'primary'}
                          />
                        </Box>
                        <Typography variant="body2">{`${Math.round(simulation.progress || 0)}%`}</Typography>
                      </Box>
                    )
                  },
                  { label: 'Created', value: formatDate(simulation.createdAt) },
                  ...(simulation.estimatedCompletion
                    ? [{ label: 'Est. Completion', value: formatDate(simulation.estimatedCompletion) }]
                    : [])
                ]}
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <DescriptionTable
                title="Resources"
                rows={[
                  { label: 'CPU Cores', value: simulation.resources.cpuCores },
                  { label: 'GPU Enabled', value: simulation.resources.gpuEnabled ? 'Yes' : 'No' },
                  { label: 'Memory', value: simulation.resources.memory },
                  { label: 'Est. Runtime', value: simulation.resources.estimatedRuntime }
                ]}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      <Box sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Live Updates" value="live" />
          <Tab label="Parameters" value="parameters" />
          <Tab label="Results" value="results" />
        </Tabs>

        {tab === 'live' && (
          <VisualizationStream 
            simulationId={simulationId}
            apiBaseUrl="/api"
            autoConnect={simulation.status === 'running'}
            maxEvents={50}
          />
        )}
        
        {tab === 'parameters' && (
          <ParameterControls
            initialParameters={simulation.parameters}
            onParametersChange={(params) => console.log('Parameters changed:', params)}
            onStartSimulation={(params) => console.log('Start simulation with:', params)}
            disabled={simulation.status === 'running'}
            mode="basic"
          />
        )}
        
        {tab === 'results' && (
          simulation.status === 'completed' || simulation.status === 'running' ? (
            <SimulationResults 
              simulationId={simulationId}
              apiBaseUrl="/api"
              autoUpdate={simulation.status === 'running'}
              updateInterval={5000}
            />
          ) : (
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center', p: 5 }}>
                  <Typography variant="h6" component="h4" gutterBottom>Results will be available once the simulation starts</Typography>
                  <Typography component="span">Current status: {getStatusTag(simulation.status)}</Typography>
                </Box>
              </CardContent>
            </Card>
          )
        )}
      </Box>
    </Box>
  );
}

export default SimulationDetail;
