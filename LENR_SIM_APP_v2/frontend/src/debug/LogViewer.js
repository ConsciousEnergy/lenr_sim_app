import { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  Chip, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Grid, 
  IconButton 
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import FilterListIcon from '@mui/icons-material/FilterList';

/**
 * LogViewer component for viewing application logs
 */
const LogViewer = () => {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sample log data for demonstration
  const sampleLogs = [
    { id: 1, timestamp: '2023-06-15T12:34:56', level: 'info', message: 'Application started', source: 'system' },
    { id: 2, timestamp: '2023-06-15T12:35:12', level: 'info', message: 'User authentication successful', source: 'auth' },
    { id: 3, timestamp: '2023-06-15T12:36:45', level: 'warning', message: 'Low memory warning', source: 'system' },
    { id: 4, timestamp: '2023-06-15T12:37:01', level: 'error', message: 'API request failed: Network error', source: 'api' },
    { id: 5, timestamp: '2023-06-15T12:38:13', level: 'info', message: 'Simulation started with parameters: T=300K, P=1atm', source: 'simulation' },
    { id: 6, timestamp: '2023-06-15T12:39:22', level: 'debug', message: 'Rendering frame 120 with 2500 particles', source: 'renderer' },
    { id: 7, timestamp: '2023-06-15T12:40:05', level: 'warning', message: 'Simulation performance degraded', source: 'simulation' },
    { id: 8, timestamp: '2023-06-15T12:41:30', level: 'info', message: 'Calculation completed in 1.23s', source: 'calculation' },
    { id: 9, timestamp: '2023-06-15T12:42:15', level: 'debug', message: 'Cache hit ratio: 78.5%', source: 'system' },
    { id: 10, timestamp: '2023-06-15T12:43:40', level: 'error', message: 'Failed to save results: Permission denied', source: 'storage' }
  ];
  
  // Apply filters to logs
  const filteredLogs = sampleLogs.filter(log => {
    // Filter by level
    if (filter !== 'all' && log.level !== filter) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });
  
  const handleRefresh = () => {
    // In a real app, this would fetch fresh logs
    console.log('Refreshing logs...');
  };
  
  const handleClearLogs = () => {
    // In a real app, this would clear logs
    console.log('Clearing logs...');
  };
  
  const handleDownloadLogs = () => {
    // In a real app, this would download logs
    console.log('Downloading logs...');
  };
  
  const getLevelColor = (level) => {
    switch (level) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      case 'debug':
        return 'default';
      default:
        return 'default';
    }
  };
  
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };
  
  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Log Viewer
      </Typography>
      <Typography variant="body1" paragraph>
        View and filter application logs.
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <TextField
            label="Search Logs"
            variant="outlined"
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by message content..."
            InputProps={{
              startAdornment: <FilterListIcon sx={{ mr: 1, color: 'action.active' }} />
            }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel id="log-level-filter-label">Log Level</InputLabel>
            <Select
              labelId="log-level-filter-label"
              value={filter}
              label="Log Level"
              onChange={(e) => setFilter(e.target.value)}
            >
              <MenuItem value="all">All Levels</MenuItem>
              <MenuItem value="error">Errors</MenuItem>
              <MenuItem value="warning">Warnings</MenuItem>
              <MenuItem value="info">Info</MenuItem>
              <MenuItem value="debug">Debug</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={5}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />} 
              onClick={handleRefresh}
            >
              Refresh
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<DeleteIcon />} 
              onClick={handleClearLogs}
              color="warning"
            >
              Clear
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<SaveIcon />} 
              onClick={handleDownloadLogs}
            >
              Download
            </Button>
          </Box>
        </Grid>
      </Grid>
      
      <Paper elevation={2} sx={{ p: 0 }}>
        <List sx={{ width: '100%', bgcolor: 'background.paper', maxHeight: '60vh', overflow: 'auto' }}>
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <ListItem 
                key={log.id}
                divider
                sx={{ 
                  borderLeft: `4px solid ${getLevelColor(log.level) === 'default' ? '#999' : ''}`,
                  borderLeftColor: getLevelColor(log.level) !== 'default' ? 
                    `${getLevelColor(log.level)}.main` : undefined,
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {formatTimestamp(log.timestamp)}
                      </Typography>
                      <Chip 
                        label={log.level.toUpperCase()} 
                        color={getLevelColor(log.level)}
                        size="small"
                        sx={{ textTransform: 'uppercase' }}
                      />
                      <Chip 
                        label={log.source} 
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  }
                  secondary={log.message}
                  secondaryTypographyProps={{
                    sx: { 
                      whiteSpace: 'pre-wrap', 
                      mt: 0.5,
                      color: log.level === 'error' ? 'error.main' : 'text.primary'
                    }
                  }}
                />
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText 
                primary="No logs found" 
                secondary="Try changing your search criteria or log level filter" 
                sx={{ textAlign: 'center', py: 4 }}
              />
            </ListItem>
          )}
        </List>
      </Paper>
      
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredLogs.length} of {sampleLogs.length} logs
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          Last refreshed: {new Date().toLocaleTimeString()}
        </Typography>
      </Box>
    </Box>
  );
};

export default LogViewer; 