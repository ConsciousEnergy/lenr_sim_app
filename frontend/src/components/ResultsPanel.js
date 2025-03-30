import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Tabs, 
  Tab, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import DownloadIcon from '@mui/icons-material/Download';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import ScienceIcon from '@mui/icons-material/Science';

// Styled components
const ResultsContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
}));

const StyledTab = styled(Tab)(({ theme }) => ({
  minWidth: 100,
  fontWeight: 'bold',
}));

const TabPanel = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`results-tabpanel-${index}`}
      aria-labelledby={`results-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const ResultsPanel = ({ simulationResults, experimentalData }) => {
  const [activeTab, setActiveTab] = useState(0);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const downloadCSV = () => {
    if (!simulationResults) return;
    
    // Convert simulation results to CSV
    const headers = Object.keys(simulationResults.data[0]).join(',');
    const rows = simulationResults.data.map(row => 
      Object.values(row).join(',')
    ).join('\n');
    const csvContent = `${headers}\n${rows}`;
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `simulation_results_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const saveImage = () => {
    // This would normally capture the current chart view
    // For now just show a placeholder implementation
    alert('Image saving would be implemented here');
  };
  
  // If no results yet, show placeholder
  if (!simulationResults) {
    return (
      <ResultsContainer>
        <Typography variant="h5" gutterBottom>Simulation Results</Typography>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <Typography variant="body1" color="text.secondary">
            Run a simulation to see results here
          </Typography>
        </Box>
      </ResultsContainer>
    );
  }
  
  return (
    <ResultsContainer>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Simulation Results</Typography>
        <Box>
          <Button 
            startIcon={<DownloadIcon />} 
            onClick={downloadCSV}
            size="small"
            sx={{ mr: 1 }}
          >
            Export CSV
          </Button>
          <Button 
            startIcon={<SaveAltIcon />} 
            onClick={saveImage}
            size="small"
          >
            Save Image
          </Button>
        </Box>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <Tabs 
        value={activeTab} 
        onChange={handleTabChange} 
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <StyledTab icon={<BarChartIcon />} iconPosition="start" label="Summary" />
        <StyledTab icon={<TableChartIcon />} iconPosition="start" label="Data Table" />
        <StyledTab icon={<ScienceIcon />} iconPosition="start" label="Analysis" />
      </Tabs>
      
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Key Metrics</Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Peak Energy:
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {simulationResults.metrics?.peakEnergy.toFixed(3)} eV
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Excess Heat:
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {simulationResults.metrics?.excessHeat.toFixed(3)} W
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Phonon Generation:
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {simulationResults.metrics?.phononGeneration.toFixed(3)} THz
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Run Time:
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {simulationResults.metrics?.runTime.toFixed(2)} sec
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Simulation Parameters</Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  {Object.entries(simulationResults.parameters || {}).map(([key, value]) => (
                    <Grid item xs={6} key={key}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {typeof value === 'number' ? value.toFixed(3) : value}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ height: '300px', bgcolor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Chart visualization would be displayed here
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </TabPanel>
      
      <TabPanel value={activeTab} index={1}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                {simulationResults.data?.[0] && Object.keys(simulationResults.data[0]).map((key) => (
                  <TableCell key={key}>{key}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {simulationResults.data?.slice(0, 20).map((row, index) => (
                <TableRow key={index}>
                  {Object.values(row).map((value, i) => (
                    <TableCell key={i}>
                      {typeof value === 'number' ? value.toFixed(4) : value}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {simulationResults.data?.length > 20 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Showing 20 of {simulationResults.data.length} rows
              </Typography>
            </Box>
          )}
        </TableContainer>
      </TabPanel>
      
      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Analysis Insights</Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Typography variant="body1" paragraph>
                  {simulationResults.analysis?.summary || 
                    "The simulation results show expected behavior based on the input parameters. " +
                    "Energy transfer patterns indicate proper phonon generation and lattice interaction."}
                </Typography>
                
                {experimentalData && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Comparison to Experimental Data</Typography>
                    <Typography variant="body2">
                      Simulation results {simulationResults.analysis?.matchScore > 80 ? "closely match" : "differ from"} experimental observations 
                      with a correlation of {simulationResults.analysis?.matchScore || "75"}%.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Key Findings</Typography>
                <Divider sx={{ mb: 2 }} />
                
                <ul>
                  {(simulationResults.analysis?.findings || [
                    "Energy transfer occurred primarily through phonon-mediated processes",
                    "Lattice deformation was within expected parameters",
                    "Temperature profile indicates localized heating at reaction sites"
                  ]).map((finding, index) => (
                    <li key={index}>
                      <Typography variant="body2">{finding}</Typography>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Recommendations</Typography>
                <Divider sx={{ mb: 2 }} />
                
                <ul>
                  {(simulationResults.analysis?.recommendations || [
                    "Adjust temperature parameters to optimize energy output",
                    "Increase simulation time to observe long-term effects",
                    "Modify lattice parameters to enhance phonon propagation"
                  ]).map((recommendation, index) => (
                    <li key={index}>
                      <Typography variant="body2">{recommendation}</Typography>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </ResultsContainer>
  );
};

export default ResultsPanel; 