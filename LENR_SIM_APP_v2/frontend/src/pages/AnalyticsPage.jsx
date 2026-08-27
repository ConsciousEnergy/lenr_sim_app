import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
  Chip,
  Card,
  CardContent,
  Tooltip,
  Alert,
  AlertTitle,
  Divider,
  Stack,
  LinearProgress,
  Checkbox,
  useTheme,
  alpha,
  Snackbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Compare as CompareIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Science as ScienceIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  CloudOff as CloudOffIcon,
  Storage as StorageIcon,
  Hub as HubIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { analyticsApi } from '../services/analyticsApi';
import RelevanceMap from '../components/analytics/RelevanceMap';
import ReviewerAnalyticsPanels from '../components/analytics/ReviewerAnalyticsPanels';

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Stat Card Component
const StatCard = ({ title, value, unit, icon: Icon, color, trend }) => {
  const theme = useTheme();
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 600 }}>
              {value}
              {unit && <Typography component="span" variant="body1" color="text.secondary"> {unit}</Typography>}
            </Typography>
            {trend && (
              <Chip
                size="small"
                icon={<TrendingUpIcon />}
                label={trend}
                color="success"
                sx={{ mt: 1 }}
              />
            )}
          </Box>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(color || theme.palette.primary.main, 0.1),
            }}
          >
            <Icon sx={{ color: color || theme.palette.primary.main, fontSize: 28 }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const SOURCE_CHIP = {
  simulation_campaign: { label: 'Campaign', color: 'info', variant: 'outlined' },
  auto_persist: { label: 'Auto', color: 'secondary', variant: 'outlined' },
};

function experimentSourceChip(row) {
  if (row.isBaseline) {
    return { label: 'Baseline', color: 'primary', variant: 'filled', title: row.source || 'Published Research' };
  }
  const mapped = SOURCE_CHIP[row.source];
  if (mapped) {
    return { ...mapped, title: row.source };
  }
  return { label: 'User', color: 'default', variant: 'outlined', title: row.source || 'User Simulation' };
}

function ExperimentSourceChip({ row }) {
  const chip = experimentSourceChip(row);
  return (
    <Tooltip title={chip.title}>
      <Chip size="small" label={chip.label} color={chip.color} variant={chip.variant} />
    </Tooltip>
  );
}

function scoresFromOverlay(overlay) {
  const scores = {};
  Object.entries(overlay?.per_theory || {}).forEach(([tid, rec]) => {
    const finalScore = rec.mean_final_score ?? rec.mean_score ?? 0;
    scores[tid] = {
      final_score: finalScore,
      physical_consistency: rec.mean_physical_consistency ?? 0,
      experimental_agreement: rec.mean_experimental_agreement ?? 0,
      parameter_sensitivity: rec.mean_parameter_sensitivity ?? 0,
      cross_theory_agreement: rec.mean_cross_theory_agreement ?? 0,
      observables_completeness: rec.mean_observables_completeness ?? 0,
      n: rec.n ?? rec.n_runs,
      ci_lo: rec.ci_lo,
      ci_hi: rec.ci_hi,
      ci_method: rec.ci_method,
      score_formula: rec.score_formula || overlay.score_formula,
    };
  });
  return scores;
}

function formatCi(lo, hi) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return `${(lo * 100).toFixed(0)}–${(hi * 100).toFixed(0)}%`;
}

function SqlChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload || {};
  return (
    <Paper sx={{ p: 1.25 }} elevation={3} data-testid="sql-chart-tooltip">
      <Typography variant="caption" display="block">{label}</Typography>
      <Typography variant="caption" display="block" sx={{ fontWeight: 600 }}>
        {row.name}
      </Typography>
      {row.sourceClass && (
        <Typography variant="caption" display="block">{row.sourceClass}</Typography>
      )}
      {payload.map((entry) => (
        <Typography key={entry.dataKey} variant="caption" display="block">
          {entry.name}: {Number(entry.value).toFixed(2)}
        </Typography>
      ))}
    </Paper>
  );
}

const AnalyticsPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedSimulations, setSelectedSimulations] = useState([]);
  const [simulationHistory, setSimulationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [pieData, setPieData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [temperatureData, setTemperatureData] = useState([]);
  const [totalExperiments, setTotalExperiments] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Relevance Map state
  const [graphData, setGraphData] = useState(null);
  const [theoryScores, setTheoryScores] = useState(null);
  const [campaignOverlay, setCampaignOverlay] = useState(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProperty, setSelectedProperty] = useState('');
  const [minScoreFilter, setMinScoreFilter] = useState(0);
  const [propertiesTaxonomy, setPropertiesTaxonomy] = useState({});
  const [includeBaseline, setIncludeBaseline] = useState(true);
  const [sourcePieData, setSourcePieData] = useState([]);
  const [scoreMode, setScoreMode] = useState('live');
  const [literatureScoreMode, setLiteratureScoreMode] = useState('five_factor');
  
  // Load data from API with localStorage fallback
  const loadData = useCallback(async () => {
    setLoading(true);
    const queryOpts = { includeBaseline };
    try {
      // Fetch all data in parallel
      const [statsData, typeDistData, timelineData, experimentsData, tempDistData, sourceDistData] = await Promise.all([
        analyticsApi.getStats(queryOpts),
        analyticsApi.getTypeDistribution(queryOpts),
        analyticsApi.getTimeline({ limit: 30, ...queryOpts }),
        analyticsApi.getExperiments({ limit: rowsPerPage, offset: page * rowsPerPage, ...queryOpts }),
        analyticsApi.getTemperatureDistribution(10, queryOpts),
        analyticsApi.getSourceDistribution(queryOpts),
      ]);
      
      // Update state with fetched data
      setStats({
        totalSimulations: statsData.totalSimulations || 0,
        successRate: statsData.successRate?.toFixed(1) || '0.0',
        completionRate: (statsData.completionRate ?? statsData.successRate)?.toFixed(1) || '0.0',
        scientificPositiveRate: statsData.scientificPositiveRate?.toFixed(1) || '0.0',
        avgEnhancement: statsData.avgEnhancement?.toFixed(2) || '0.00',
        totalEnergy: statsData.totalEnergy?.toFixed(2) || '0.00',
        maxEnhancement: statsData.maxEnhancement?.toFixed(2) || '0.00',
        outcomeCounts: statsData.outcomeCounts || {},
        claimTierCounts: statsData.claimTierCounts || {},
        openQuestionCounts: statsData.openQuestionCounts || {},
        openQuestionCountsCampaign: statsData.openQuestionCountsCampaign || {},
        sourceClassCounts: statsData.sourceClassCounts || {},
      });
      
      setPieData(typeDistData || []);
      setSourcePieData(sourceDistData || []);
      
      // Transform timeline data for charts — date on X, full name in tooltip
      setChartData((timelineData || []).map((item, i) => ({
        name: item.name || `Sim ${i + 1}`,
        enhancement: item.enhancementFactor || 0,
        energy: item.energyOutput || 0,
        date: item.date,
        isBaseline: item.is_baseline || false,
        source: item.source,
        sourceClass: item.sourceClass,
      })));
      
      // Transform temperature distribution for bar chart
      setTemperatureData(tempDistData || []);
      
      // Transform experiments for table display
      const transformedExperiments = (experimentsData.experiments || []).map(exp => ({
        id: exp.id,
        name: exp.name || 'Unnamed',
        type: exp.type || exp.experiment_type || 'Unknown',
        status: exp.status || 'completed',
        material: exp.material ? exp.material.charAt(0).toUpperCase() + exp.material.slice(1) : 'Unknown',
        temperature: exp.temperature_k || 300,
        pressure: exp.pressure_bar || 1,
        enhancementFactor: exp.enhancement_factor || 0,
        fusionRate: exp.fusion_rate || 0,
        energyOutput: exp.energy_output_kev || 0,
        timestamp: exp.created_at,
        isBaseline: exp.is_baseline || false,
        source: exp.source || 'User Simulation',
        parameters: exp.parameters || {},
      }));
      
      setSimulationHistory(transformedExperiments);
      setTotalExperiments(experimentsData.total || transformedExperiments.length);
      setIsOffline(false);
      
    } catch (error) {
      console.warn('API unavailable, using local fallback:', error);
      setIsOffline(true);
      
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem('lenr_simulation_history');
        if (stored) {
          const localData = JSON.parse(stored);
          setSimulationHistory(localData);
          setTotalExperiments(localData.length);
          
          if (localData.length > 0) {
            const localStats = typeof analyticsApi.getLocalStats === 'function'
              ? analyticsApi.getLocalStats()
              : null;
            const completed = localData.filter(s => s.status === 'completed');
            setStats({
              totalSimulations: localStats?.totalSimulations ?? localData.length,
              successRate: Number(localStats?.successRate ?? ((completed.length / localData.length) * 100)).toFixed(1),
              completionRate: Number(localStats?.completionRate ?? ((completed.length / localData.length) * 100)).toFixed(1),
              scientificPositiveRate: Number(localStats?.scientificPositiveRate ?? 0).toFixed(1),
              avgEnhancement: localStats
                ? Number(localStats.avgEnhancement || 0).toFixed(2)
                : (completed.length > 0
                  ? (completed.reduce((acc, s) => acc + (s.enhancementFactor || 0), 0) / completed.length).toFixed(2)
                  : '0.00'),
              totalEnergy: localStats
                ? Number(localStats.totalEnergy || 0).toFixed(2)
                : completed.reduce((acc, s) => acc + (s.energyOutput || 0), 0).toFixed(2),
              outcomeCounts: localStats?.outcomeCounts || {},
              claimTierCounts: localStats?.claimTierCounts || {},
              openQuestionCounts: localStats?.openQuestionCounts || {},
              openQuestionCountsCampaign: localStats?.openQuestionCountsCampaign || {},
              sourceClassCounts: localStats?.sourceClassCounts || {},
            });
            
            // Build pie data from local
            const typeCounts = {};
            localData.forEach(exp => {
              const type = exp.type || 'Unknown';
              typeCounts[type] = (typeCounts[type] || 0) + 1;
            });
            setPieData(Object.entries(typeCounts).map(([name, value]) => ({ name, value })));
            
            // Build chart data from local
            setChartData(localData.slice(0, 20).reverse().map((s, i) => ({
              name: `Sim ${i + 1}`,
              enhancement: s.enhancementFactor || 0,
              energy: s.energyOutput || 0,
            })));
          }
        }
      } catch (localError) {
        console.error('Local storage error:', localError);
      }
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, includeBaseline]);
  
  // Load data on mount and when pagination changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load theory graph data when Relevance Map tab is selected
  const loadTheoryGraph = useCallback(async () => {
    setGraphLoading(true);
    setGraphError(null);
    try {
      const [graph, propsResult, historyResult] = await Promise.all([
        analyticsApi.getTheoryGraph(),
        analyticsApi.getTheoryProperties(),
        analyticsApi.getTheoryRunHistory().catch(() => null),
      ]);
      setGraphData(graph);
      setPropertiesTaxonomy(propsResult?.properties || {});
      setCampaignOverlay(historyResult);
      if (historyResult?.n_runs > 0) {
        setScoreMode('persisted_mean');
        setTheoryScores(scoresFromOverlay(historyResult));
      } else {
        const scoresResult = await analyticsApi.computeTheoryScores();
        setScoreMode('live');
        setTheoryScores(scoresResult?.scores || null);
      }
    } catch (err) {
      console.error('Failed to load theory graph:', err);
      setGraphError('Failed to load theory network. Is the backend running?');
    } finally {
      setGraphLoading(false);
    }
  }, []);

  const handleRunScores = useCallback(async (conditions) => {
    setGraphLoading(true);
    try {
      const result = await analyticsApi.computeTheoryScores({
        ...(conditions || {}),
        score_mode: literatureScoreMode,
      });
      setScoreMode('live');
      setTheoryScores(result?.scores || null);
    } catch (err) {
      console.error('Failed to compute scores:', err);
    } finally {
      setGraphLoading(false);
    }
  }, [literatureScoreMode]);

  // When tab changes to Relevance Map (index 3), load graph data
  useEffect(() => {
    if (activeTab === 3) {
      loadTheoryGraph();
    }
  }, [activeTab, loadTheoryGraph]);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    // Data will reload via useEffect when page changes
  };
  
  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    // Data will reload via useEffect when rowsPerPage changes
  };
  
  const handleSelectSimulation = (id) => {
    setSelectedSimulations(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };
  
  const handleExportCSV = async () => {
    try {
      const blob = await analyticsApi.exportCSV();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lenr_experiments_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: 'CSV exported successfully', severity: 'success' });
    } catch (error) {
      console.error('CSV export error:', error);
      // Fallback to local export
      const headers = ['ID', 'Name', 'Type', 'Status', 'Material', 'Temperature (K)', 'Pressure (bar)', 'Enhancement Factor', 'Energy Output (keV)', 'Timestamp'];
      const rows = simulationHistory.map(s => [
        s.id,
        s.name || '',
        s.type,
        s.status,
        s.material,
        s.temperature?.toFixed(2) || '',
        s.pressure?.toFixed(2) || '',
        s.enhancementFactor?.toFixed(4) || '',
        s.energyOutput?.toFixed(4) || '',
        s.timestamp || ''
      ]);
      
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lenr_simulations_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: 'CSV exported (local data)', severity: 'info' });
    }
  };
  
  const handleExportJSON = async () => {
    try {
      const data = await analyticsApi.exportJSON();
      const dataToExport = selectedSimulations.length > 0
        ? data.filter(s => selectedSimulations.includes(s.id))
        : data;
      
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lenr_experiments_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: 'JSON exported successfully', severity: 'success' });
    } catch (error) {
      console.error('JSON export error:', error);
      // Fallback to local data
      const dataToExport = selectedSimulations.length > 0
        ? simulationHistory.filter(s => selectedSimulations.includes(s.id))
        : simulationHistory;
      
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lenr_simulations_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: 'JSON exported (local data)', severity: 'info' });
    }
  };
  
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all simulation history?')) {
      try {
        localStorage.removeItem('lenr_simulation_history');
        setSimulationHistory([]);
        setSelectedSimulations([]); // Reset selected simulations when clearing history
      } catch (error) {
        console.error('Failed to clear simulation history:', error);
        alert('Failed to clear history. Please try again.');
      }
    }
  };
  
  const handleRefresh = () => {
    loadData();
    setSnackbar({ open: true, message: 'Data refreshed', severity: 'info' });
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  const handleDeleteExperiment = async (experimentId) => {
    if (!window.confirm('Delete this experiment?')) return;
    
    try {
      await analyticsApi.deleteExperiment(experimentId);
      setSimulationHistory(prev => prev.filter(s => s.id !== experimentId));
      setSelectedSimulations(prev => prev.filter(id => id !== experimentId));
      setSnackbar({ open: true, message: 'Experiment deleted', severity: 'success' });
    } catch (error) {
      console.error('Delete error:', error);
      setSnackbar({ open: true, message: 'Failed to delete experiment', severity: 'error' });
    }
  };

  const handleViewDetails = useCallback((experiment) => {
    if (!experiment?.id) {
      setSnackbar({ open: true, message: 'Missing simulation id for details view', severity: 'warning' });
      return;
    }
    navigate(`/simulation/${experiment.id}`, {
      state: { simulationPreview: experiment },
    });
  }, [navigate]);
  
  if (loading && !stats) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>Loading analytics...</Typography>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Analytics Dashboard
          </Typography>
          {isOffline ? (
            <Chip 
              icon={<CloudOffIcon />} 
              label="Offline Mode" 
              color="warning" 
              size="small"
            />
          ) : (
            <Chip 
              icon={<StorageIcon />} 
              label="Connected to Database" 
              color="success" 
              size="small"
            />
          )}
        </Box>
        <Typography variant="body1" color="text.secondary">
          Analyze simulation results, compare experiments, and export data.
          Charts plot SQL <code>experiments</code> fields. Auto-saved runs are model outputs.
        </Typography>
        <FormControlLabel
          sx={{ mt: 1 }}
          control={
            <Switch
              checked={includeBaseline}
              onChange={(event) => {
                setIncludeBaseline(event.target.checked);
                setPage(0);
              }}
              inputProps={{ 'aria-label': 'Include published literature baselines' }}
              data-testid="include-baseline-toggle"
            />
          }
          label="Include published literature baselines"
        />
        <Typography variant="caption" color="text.secondary" display="block">
          Off hides literature seeds only. Campaign and auto-persist model outputs stay visible.
        </Typography>
      </Box>
      
      {!simulationHistory.length && (
        <Alert severity="info" sx={{ mb: 3 }} data-testid="analytics-empty-state">
          <AlertTitle>No rows in this SQL filter</AlertTitle>
          Turn published baselines on, run the Theory Testbed, or start a campaign to persist model-output rows.
        </Alert>
      )}
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="Total Records"
            value={stats?.totalSimulations || 0}
            icon={ScienceIcon}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="Completion Rate"
            value={stats?.completionRate || stats?.successRate || 0}
            unit="%"
            icon={TrendingUpIcon}
            color={theme.palette.info.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="Scientific-positive"
            value={stats?.scientificPositiveRate || 0}
            unit="%"
            icon={AssessmentIcon}
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 6 }}>
          <StatCard
            title="Avg Enhancement"
            value={stats?.avgEnhancement || 0}
            unit="×"
            icon={AssessmentIcon}
            color={theme.palette.warning.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 6 }}>
          <StatCard
            title="Total Energy Output"
            value={stats?.totalEnergy || 0}
            unit="keV"
            icon={TimelineIcon}
            color={theme.palette.secondary.main}
          />
        </Grid>
      </Grid>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mb: 3 }}
        data-testid="completion-vs-scientific-note"
      >
        Completion rate is SQL/HTTP status (completed ÷ total). Scientific-positive is
        excess heat &gt; 0 W only. Enhancement-only rows and the Google/ARPA-E null
        seed count as null, not success. Neither card validates LENR.
        Total records is the SQL row count (baseline + session + shared). Total energy
        sums estimated <code>energy_output_kev</code> and is not a conserved physical total.
        {stats?.outcomeCounts && Object.keys(stats.outcomeCounts).length > 0 && (
          <> Outcome mix: positive {stats.outcomeCounts.positive || 0}, null {stats.outcomeCounts.null || 0}, inapplicable {stats.outcomeCounts.inapplicable || 0}, failed {stats.outcomeCounts.failed || 0}.</>
        )}
        {stats?.claimTierCounts && Object.keys(stats.claimTierCounts).length > 0 && (
          <>
            {' '}
            Claim-tier histogram (popularity is not validation):{' '}
            {Object.entries(stats.claimTierCounts)
              .map(([tier, count]) => `${tier} ${count}`)
              .join(', ')}.
          </>
        )}
        {stats?.openQuestionCounts && Object.keys(stats.openQuestionCounts).length > 0 && (
          <>
            {' '}
            {Number(stats?.sourceClassCounts?.Campaign || 0) > 0
              ? 'Open-question N on persisted rows (model rows, not closure)'
              : 'Open-question tags on literature seeds (not a hydrated campaign)'}
            {': '}
            {Object.entries(stats.openQuestionCounts)
              .map(([qid, count]) => `${qid} ${count}`)
              .join(', ')}.
          </>
        )}
        {stats?.openQuestionCountsCampaign && Object.keys(stats.openQuestionCountsCampaign).length > 0 && (
          <>
            {' '}
            Campaign-only N:{' '}
            {Object.entries(stats.openQuestionCountsCampaign)
              .map(([qid, count]) => `${qid} ${count}`)
              .join(', ')}.
          </>
        )}
      </Typography>
      {stats?.openQuestionCounts && Object.keys(stats.openQuestionCounts).length > 0 && (
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}
          data-testid="open-question-n-chips"
        >
          {Object.entries(stats.openQuestionCounts).map(([qid, count]) => (
            <Chip
              key={qid}
              size="small"
              variant="outlined"
              label={`${qid} N=${count}`}
            />
          ))}
        </Stack>
      )}
      
      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="Overview" />
          <Tab label="Simulation History" />
          <Tab label="Comparison" />
          <Tab icon={<HubIcon />} iconPosition="start" label="Relevance Map" />
          <Tab label="Export" />
        </Tabs>
      </Paper>
      
      {/* Overview Tab */}
      <TabPanel value={activeTab} index={0}>
        <Alert severity="info" sx={{ mb: 2 }} data-testid="model-output-disclaimer">
          Auto-saved runs are <strong>model outputs</strong>, not laboratory experiments.
          More simulations do not raise empirical claim tiers or close EQ-OPEN questions.
        </Alert>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={2}>
              <Paper sx={{ p: 3, height: 280 }} data-testid="enhancement-sql-chart">
                <Typography variant="h6" gutterBottom>Enhancement factor (SQL)</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  X-axis is created_at date. Experiment name is in the tooltip. Scale is enhancement ×, not keV.
                </Typography>
                <ResponsiveContainer width="100%" height="75%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" interval="preserveStartEnd" tick={{ fontSize: 11 }} />
                    <YAxis
                      label={{ value: 'Enhancement (×)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                    />
                    <RechartsTooltip content={<SqlChartTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="enhancement" stroke="#8884d8" name="Enhancement Factor" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
              <Paper sx={{ p: 3, height: 280 }} data-testid="energy-sql-chart">
                <Typography variant="h6" gutterBottom>Energy output (SQL keV)</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Separate scale from enhancement. A 2500 keV Taleyarkhan row must not flatten 5–85× factors.
                </Typography>
                <ResponsiveContainer width="100%" height="75%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" interval="preserveStartEnd" tick={{ fontSize: 11 }} />
                    <YAxis
                      label={{ value: 'Energy (keV)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                    />
                    <RechartsTooltip content={<SqlChartTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="energy" stroke="#82ca9d" name="Energy Output (keV)" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Stack>
          </Grid>
          
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={2}>
              <Paper sx={{ p: 3, height: 280 }} data-testid="experiment-type-pie">
                <Typography variant="h6" gutterBottom>Stored experiment type</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  SQL <code>experiment_type</code> enum, not experiment identity.
                </Typography>
                <ResponsiveContainer width="100%" height="70%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value, name) => [`${value} rows`, name]} />
                    <Legend 
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ paddingTop: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
              <Paper sx={{ p: 3, height: 280 }} data-testid="source-class-pie">
                <Typography variant="h6" gutterBottom>Source class</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Baseline / Campaign / Auto / User from SQL source flags.
                </Typography>
                <ResponsiveContainer width="100%" height="70%">
                  <PieChart>
                    <Pie
                      data={sourcePieData}
                      cx="50%"
                      cy="45%"
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                    >
                      {sourcePieData.map((entry, index) => (
                        <Cell key={`source-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value, name) => [`${value} rows`, name]} />
                    <Legend 
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Stack>
          </Grid>
          
          <Grid size={12}>
            <Paper sx={{ p: 3, height: 350 }}>
              <Typography variant="h6" gutterBottom>Temperature Distribution</Typography>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={temperatureData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" name="Experiment Count" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* Simulation History Tab */}
      <TabPanel value={activeTab} index={1}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Simulation History</Typography>
            <Stack direction="row" spacing={1}>
              <Button startIcon={<RefreshIcon />} onClick={handleRefresh}>
                Refresh
              </Button>
              <Button startIcon={<DeleteIcon />} color="error" onClick={handleClearHistory}>
                Clear History
              </Button>
            </Stack>
          </Box>
          
          <TableContainer>
            <Table size="small">
                <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedSimulations.length > 0 && selectedSimulations.length < simulationHistory.length}
                      checked={simulationHistory.length > 0 && selectedSimulations.length === simulationHistory.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSimulations(simulationHistory.map(s => s.id));
                        } else {
                          setSelectedSimulations([]);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Material</TableCell>
                  <TableCell align="right">Temp (K)</TableCell>
                  <TableCell align="right">Enhancement</TableCell>
                  <TableCell align="right">Energy (keV)</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {simulationHistory.map((row) => (
                    <TableRow key={row.id} hover selected={selectedSimulations.includes(row.id)}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedSimulations.includes(row.id)}
                          onChange={() => handleSelectSimulation(row.id)}
                        />
                      </TableCell>
                      <TableCell>{row.name || 'Unnamed'}</TableCell>
                      <TableCell>{row.type}</TableCell>
                      <TableCell>
                        <ExperimentSourceChip row={row} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={row.status}
                          color={row.status === 'completed' ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>{row.material}</TableCell>
                      <TableCell align="right">{row.temperature?.toFixed(1) || 'N/A'}</TableCell>
                      <TableCell align="right">{row.enhancementFactor?.toFixed(2) || '0.00'}×</TableCell>
                      <TableCell align="right">{row.energyOutput?.toFixed(3) || '0.000'}</TableCell>
                      <TableCell>{row.timestamp ? new Date(row.timestamp).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => handleViewDetails(row)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {!row.isBaseline && (
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDeleteExperiment(row.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={totalExperiments}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </TabPanel>
      
      {/* Comparison Tab */}
      <TabPanel value={activeTab} index={2}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Select 2 or more simulations from the History tab to compare them side by side.
        </Alert>
        
        {selectedSimulations.length >= 2 ? (
          <Grid container spacing={3}>
            {selectedSimulations.slice(0, 4).map(id => {
              const sim = simulationHistory.find(s => s.id === id);
              if (!sim) return null;
              
              return (
                <Grid size={{ xs: 12, md: 6, lg: 3 }} key={id}>
                  <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      {sim.name || sim.type}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Material:</Typography>
                        <Typography variant="body2">{sim.material}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Temperature:</Typography>
                        <Typography variant="body2">{sim.temperature.toFixed(1)} K</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Pressure:</Typography>
                        <Typography variant="body2">{sim.pressure.toFixed(2)} bar</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Enhancement:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {sim.enhancementFactor.toFixed(2)}×
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Energy Output:</Typography>
                        <Typography variant="body2">{sim.energyOutput.toFixed(3)} keV</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Fusion Rate:</Typography>
                        <Typography variant="body2">{sim.fusionRate.toExponential(2)}</Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CompareIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Select simulations to compare
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Go to the History tab and check at least 2 simulations
            </Typography>
          </Paper>
        )}
      </TabPanel>
      
      {/* Relevance Map Tab */}
      <TabPanel value={activeTab} index={3}>
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', lg: 'row' } }}>
          {/* Main graph area — 75% width with integrated detail panel */}
          <Box sx={{ flex: 3, minWidth: 0 }}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
              {/* Controls row */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6">Theory Relevance Network</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={selectedCategory}
                      label="Category"
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="mechanism">Mechanism</MenuItem>
                      <MenuItem value="measurement">Measurement</MenuItem>
                      <MenuItem value="engineering">Engineering</MenuItem>
                      <MenuItem value="triggering">Triggering</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Property</InputLabel>
                    <Select
                      value={selectedProperty}
                      label="Property"
                      onChange={(e) => setSelectedProperty(e.target.value)}
                    >
                      <MenuItem value="">All Properties</MenuItem>
                      {Object.entries(propertiesTaxonomy).map(([key, _desc]) => (
                        <MenuItem key={key} value={key}>{key.replace(/_/g, ' ')}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      Min: {minScoreFilter}%
                    </Typography>
                    <Slider
                      value={minScoreFilter}
                      onChange={(e, v) => setMinScoreFilter(v)}
                      min={0}
                      max={100}
                      size="small"
                      sx={{ width: 100 }}
                    />
                  </Box>
                  <Button
                    variant={scoreMode === 'live' ? 'contained' : 'outlined'}
                    size="small"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => handleRunScores()}
                    disabled={graphLoading}
                    data-testid="run-live-scores"
                  >
                    Run live scores
                  </Button>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={literatureScoreMode === 'five_factor_plus_literature'}
                        onChange={(event) => {
                          setLiteratureScoreMode(
                            event.target.checked
                              ? 'five_factor_plus_literature'
                              : 'five_factor'
                          );
                        }}
                        inputProps={{ 'aria-label': 'Literature likelihood' }}
                      />
                    }
                    label="Literature likelihood"
                  />
                  <Button
                    variant={scoreMode === 'persisted_mean' ? 'contained' : 'outlined'}
                    size="small"
                    disabled={graphLoading || !(campaignOverlay?.n_runs > 0)}
                    onClick={() => {
                      if (campaignOverlay?.n_runs > 0) {
                        setScoreMode('persisted_mean');
                        setTheoryScores(scoresFromOverlay(campaignOverlay));
                      }
                    }}
                    data-testid="use-persisted-scores"
                  >
                    Use SQL means
                  </Button>
                </Stack>
              </Box>
              {/* Graph with integrated search, stats, detail panel */}
              {campaignOverlay?.n_runs > 0 && (
                <Alert severity="info" sx={{ mb: 1 }} data-testid="campaign-overlay-disclaimer">
                  {scoreMode === 'persisted_mean'
                    ? `Node size uses mean final_score from ${campaignOverlay.n_runs} persisted theory_runs (SQL).`
                    : 'Live five-factor scores at stated conditions. SQL means are available via Use SQL means.'}
                  {' '}This is model-output association, not empirical confidence. Curated
                  edge strength is unchanged. SQL mean is not experimental confirmation.
                </Alert>
              )}
              <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                {campaignOverlay?.score_formula && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={campaignOverlay.score_formula}
                    data-testid="score-formula-chip"
                  />
                )}
                <Chip
                  size="small"
                  variant="outlined"
                  label="persisted sensitivity = 0.5 unless live"
                  data-testid="sensitivity-note-chip"
                />
                {campaignOverlay?.n_runs > 0 && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`N=${campaignOverlay.n_runs}`}
                    data-testid="overlay-n-chip"
                  />
                )}
              </Stack>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <RelevanceMap
                  graphData={graphData}
                  scores={theoryScores}
                  campaignOverlay={campaignOverlay}
                  scoreMode={scoreMode}
                  loading={graphLoading}
                  error={graphError}
                  onNodeClick={(node) => {
                    setSnackbar({
                      open: true,
                      message: `Selected: ${node.theory_name} — ${node.researcher} (${node.year})`,
                      severity: 'info',
                    });
                  }}
                  onRunScores={handleRunScores}
                  selectedProperty={selectedProperty || null}
                  selectedCategory={selectedCategory || null}
                  minScore={minScoreFilter}
                />
              </Box>
            </Paper>
          </Box>

          {/* Right sidebar: Score cards (25%) */}
          <Box sx={{ flex: 1, minWidth: 260 }}>
            <Paper sx={{ p: 2, maxHeight: 720, overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                Theory Scores
                <Chip
                  size="small"
                  sx={{ ml: 1 }}
                  label={scoreMode === 'persisted_mean' ? 'SQL mean' : 'Live'}
                  data-testid="score-mode-chip"
                />
                <Chip
                  size="small"
                  sx={{ ml: 1 }}
                  variant="outlined"
                  label={literatureScoreMode}
                  data-testid="live-score-mode-chip"
                />
              </Typography>
              {theoryScores ? (
                Object.entries(theoryScores)
                  .sort(([, a], [, b]) => (b.final_score || 0) - (a.final_score || 0))
                  .map(([tid, s]) => (
                    <Card key={tid} variant="outlined" sx={{ mb: 1 }}>
                      <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                            {tid.replace(/_/g, ' ')}
                          </Typography>
                          <Chip
                            label={`${(s.final_score * 100).toFixed(0)}%`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              bgcolor:
                                s.final_score > 0.7 ? '#4CAF50' :
                                s.final_score > 0.4 ? '#FF9800' : '#F44336',
                              color: '#fff',
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>
                        <Stack direction="row" spacing={0.3} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.3 }}>
                          <Chip label={`Phys: ${(s.physical_consistency * 100).toFixed(0)}%`} size="small" variant="outlined" sx={{ fontSize: '0.6rem' }} />
                          <Chip label={`Exp: ${(s.experimental_agreement * 100).toFixed(0)}%`} size="small" variant="outlined" sx={{ fontSize: '0.6rem' }} />
                          <Chip label={`Sens: ${(s.parameter_sensitivity * 100).toFixed(0)}%`} size="small" variant="outlined" sx={{ fontSize: '0.6rem' }} />
                          {Number.isFinite(s.n) && (
                            <Chip
                              label={`N=${s.n}`}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.6rem' }}
                              data-testid={`score-n-${tid}`}
                            />
                          )}
                          {formatCi(s.ci_lo, s.ci_hi) && (
                            <Chip
                              label={`CI ${formatCi(s.ci_lo, s.ci_hi)}`}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.6rem' }}
                              data-testid={`score-ci-${tid}`}
                            />
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {graphLoading ? 'Computing scores...' : 'Persisted SQL means appear after Theory Testbed or campaign runs. Click "Run live scores" for the heuristic at default conditions.'}
                </Typography>
              )}
            </Paper>
            <ReviewerAnalyticsPanels />
          </Box>
        </Box>
      </TabPanel>

      {/* Export Tab */}
      <TabPanel value={activeTab} index={4}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Export as CSV</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Export all simulation data as a comma-separated values file for use in spreadsheet applications.
              </Typography>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleExportCSV}
              >
                Download CSV
              </Button>
            </Paper>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Export as JSON</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Export simulation data as JSON with full parameter details.
                {selectedSimulations.length > 0 && ` (${selectedSimulations.length} selected)`}
              </Typography>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleExportJSON}
              >
                Download JSON
              </Button>
            </Paper>
          </Grid>
          
          <Grid size={12}>
            <Alert severity="info">
              <AlertTitle>Tip</AlertTitle>
              Select specific simulations from the History tab to export only those results.
              Otherwise, all simulation data will be exported.
            </Alert>
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AnalyticsPage;

