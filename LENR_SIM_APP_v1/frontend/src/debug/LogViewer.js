import React, { useState, useEffect, useCallback } from 'react';
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
  TablePagination,
  Tabs,
  Tab,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Grid
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useLogger } from '../contexts/LogContext';
import api from '../utils/api';

const LOG_LEVELS = {
  DEBUG: { color: 'info', textColor: 'info.main' },
  INFO: { color: 'success', textColor: 'success.main' },
  WARNING: { color: 'warning', textColor: 'warning.main' },
  ERROR: { color: 'error', textColor: 'error.main' },
  FATAL: { color: 'error', textColor: 'error.dark' }
};

const LogViewer = () => {
  const logger = useLogger();
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedLogName, setSelectedLogName] = useState('');
  const [loading, setLoading] = useState(false);
  const [logEntries, setLogEntries] = useState([]);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [levelFilter, setLevelFilter] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [healthInfo, setHealthInfo] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const timeoutValue = 15000; // Default 15s timeout

  // Add a helper function to load remaining entries
  const loadRemainingEntries = useCallback(async (initialBatchSize) => {
    try {
      const remainingUrl = `/diagnostics/logs/${selectedLogName}?limit=${rowsPerPage - initialBatchSize}&skip=${page * rowsPerPage + initialBatchSize}${levelFilter ? `&level=${levelFilter}` : ''}`;
      const remainingData = await api.get(remainingUrl, {}, timeoutValue);
      
      if (remainingData.entries && remainingData.entries.length > 0) {
        // Process entries to minimize memory usage
        const processedEntries = remainingData.entries.map(entry => ({
          timestamp: entry.timestamp,
          level: entry.level,
          message: entry.message?.substring(0, 500) || '', // Limit message length
          source: entry.source
        }));
        
        setLogEntries(currentEntries => [...currentEntries, ...processedEntries]);
        setHasMore(remainingData.has_more || false);
        
        logger.debug('Remaining log entries fetched successfully', { 
          count: processedEntries.length
        });
      }
    } catch (error) {
      logger.warn('Error fetching remaining log entries', error);
      // Don't update error state as this is a background operation
    }
  }, [logger, page, rowsPerPage, selectedLogName, levelFilter, timeoutValue]);

  const fetchHealthInfo = useCallback(async () => {
    try {
      const data = await api.get('/diagnostics/health/detailed', {}, timeoutValue);
      setHealthInfo(data);
      
      logger.debug('Health info fetched successfully');
    } catch (error) {
      logger.error('Error fetching health info', error);
      // Don't set error state since this is secondary info
    }
  }, [logger, timeoutValue]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await api.get('/diagnostics/logs', {}, timeoutValue);
      setLogs(data.logs || []);
      
      // Set first log as selected if we don't have one yet
      if (data.logs && data.logs.length > 0 && !selectedLogName) {
        const frontendLog = data.logs.find(log => log.name === 'frontend.log');
        if (frontendLog) {
          setSelectedLogName(frontendLog.name);
        } else {
          setSelectedLogName(data.logs[0].name);
        }
      }
      
      logger.debug('Logs fetched successfully', { count: data.logs?.length || 0 });
    } catch (error) {
      logger.error('Error fetching logs', error);
      setError(`Failed to fetch logs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [logger, selectedLogName, timeoutValue]);

  const fetchLogEntries = useCallback(async () => {
    if (!selectedLogName) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Limit the initial batch size to improve load time
      const initialBatchSize = Math.min(25, rowsPerPage);
      
      const url = `/diagnostics/logs/${selectedLogName}?limit=${initialBatchSize}&skip=${page * rowsPerPage}${levelFilter ? `&level=${levelFilter}` : ''}`;
      const data = await api.get(url, {}, timeoutValue);
      
      // Process entries to minimize memory usage
      const processedEntries = data.entries?.map(entry => ({
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message?.substring(0, 500) || '', // Limit message length
        source: entry.source
      })) || [];
      
      setLogEntries(processedEntries);
      setHasMore(data.has_more || false);
      setSelectedLog(data);
      
      logger.debug('Log entries fetched successfully', { 
        log: selectedLogName,
        count: processedEntries.length || 0
      });
      
      // Load more data in the background if needed
      if (rowsPerPage > initialBatchSize && data.has_more) {
        loadRemainingEntries(initialBatchSize);
      }
    } catch (error) {
      logger.error('Error fetching log entries', error);
      setError(`Failed to fetch log entries: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [logger, page, rowsPerPage, selectedLogName, levelFilter, timeoutValue, loadRemainingEntries]);

  useEffect(() => {
    logger.info('Log viewer mounted');
    fetchLogs();
    fetchHealthInfo();
    return () => {
      logger.debug('Log viewer unmounted');
    };
  }, [logger, fetchHealthInfo, fetchLogs]);

  useEffect(() => {
    if (selectedLogName) {
      fetchLogEntries();
    }
  }, [selectedLogName, page, rowsPerPage, levelFilter, fetchLogEntries]);

  const handleLogChange = (event) => {
    setSelectedLogName(event.target.value);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleLevelFilterChange = (event) => {
    setLevelFilter(event.target.value);
    setPage(0);
  };

  const handleRefresh = () => {
    fetchLogs();
    if (selectedLogName) {
      fetchLogEntries();
    }
    fetchHealthInfo();
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getLevelColor = (level) => {
    const upperLevel = level.toUpperCase();
    return LOG_LEVELS[upperLevel]?.color || 'default';
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Add virtualization for log entries to prevent rendering too many rows
  const VirtualizedLogTable = ({ logEntries, getLevelColor, loading }) => {
    const [virtualPage, setVirtualPage] = useState(0);
    const [virtualRowsPerPage, setVirtualRowsPerPage] = useState(50);
    
    // Only render a subset of items at once
    const visibleEntries = logEntries.slice(
      virtualPage * virtualRowsPerPage, 
      (virtualPage + 1) * virtualRowsPerPage
    );
    
    const handleVirtualPageChange = (event, newPage) => {
      setVirtualPage(newPage);
    };
    
    const handleVirtualRowsPerPageChange = (event) => {
      setVirtualRowsPerPage(parseInt(event.target.value, 10));
      setVirtualPage(0);
    };
    
    return (
      <>
        <TableContainer component={Paper} sx={{ mb: 2, maxHeight: '60vh' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell width="200">Timestamp</TableCell>
                <TableCell width="100">Level</TableCell>
                <TableCell>Message</TableCell>
                <TableCell width="100">Source</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    {loading ? 'Loading...' : 'No log entries found'}
                  </TableCell>
                </TableRow>
              ) : (
                visibleEntries.map((entry, index) => (
                  <TableRow key={index} hover>
                    <TableCell>{entry.timestamp}</TableCell>
                    <TableCell>
                      <Chip 
                        label={entry.level} 
                        color={getLevelColor(entry.level)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        maxWidth: '50vw', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {entry.message}
                    </TableCell>
                    <TableCell>{entry.source || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {logEntries.length > virtualRowsPerPage && (
          <TablePagination
            component="div"
            count={logEntries.length}
            page={virtualPage}
            onPageChange={handleVirtualPageChange}
            rowsPerPage={virtualRowsPerPage}
            onRowsPerPageChange={handleVirtualRowsPerPageChange}
            rowsPerPageOptions={[25, 50, 100, 500]}
          />
        )}
      </>
    );
  };

  // Add a PerformanceMonitor component to display information that can help us diagnose freezes
  const PerformanceMonitor = () => {
    const [perfMetrics, setPerfMetrics] = useState({
      fps: 0,
      memory: null,
      cpuUsage: null,
      pendingRequests: 0,
      lastUpdate: Date.now()
    });
    
    useEffect(() => {
      let frameCount = 0;
      let lastFrameTime = performance.now();
      let rafId;
      
      // Function to calculate FPS
      const measureFPS = (timestamp) => {
        frameCount++;
        
        const elapsed = timestamp - lastFrameTime;
        if (elapsed >= 1000) { // Update every second
          const fps = Math.round((frameCount * 1000) / elapsed);
          
          setPerfMetrics(prev => ({
            ...prev,
            fps,
            lastUpdate: Date.now()
          }));
          
          frameCount = 0;
          lastFrameTime = timestamp;
        }
        
        rafId = requestAnimationFrame(measureFPS);
      };
      
      // Start FPS measurement
      rafId = requestAnimationFrame(measureFPS);
      
      // Function to get memory usage if available
      const getMemoryInfo = () => {
        if (performance.memory) {
          setPerfMetrics(prev => ({
            ...prev,
            memory: {
              usedJSHeapSize: performance.memory.usedJSHeapSize,
              totalJSHeapSize: performance.memory.totalJSHeapSize,
              jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            }
          }));
        }
      };
      
      // Poll for memory usage
      const memoryTimer = setInterval(getMemoryInfo, 2000);
      
      // Count pending network requests
      const originalFetch = window.fetch;
      let pendingRequests = 0;
      
      window.fetch = function(...args) {
        pendingRequests++;
        setPerfMetrics(prev => ({
          ...prev,
          pendingRequests
        }));
        
        const promise = originalFetch.apply(this, args);
        
        promise.finally(() => {
          pendingRequests--;
          setPerfMetrics(prev => ({
            ...prev,
            pendingRequests
          }));
        });
        
        return promise;
      };
      
      // Cleanup
      return () => {
        cancelAnimationFrame(rafId);
        clearInterval(memoryTimer);
        window.fetch = originalFetch;
      };
    }, []);
    
    const formatBytes = (bytes, decimals = 2) => {
      if (!bytes || bytes === 0) return '0 Bytes';
      
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };
    
    return (
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" gutterBottom>Performance Monitor</Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Typography variant="body2" color="text.secondary">FPS</Typography>
            <Typography variant="h5">
              {perfMetrics.fps}{' '}
              <Chip 
                size="small" 
                color={perfMetrics.fps > 30 ? 'success' : perfMetrics.fps > 15 ? 'warning' : 'error'} 
                label={perfMetrics.fps > 30 ? 'Good' : perfMetrics.fps > 15 ? 'Fair' : 'Poor'} 
              />
            </Typography>
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Typography variant="body2" color="text.secondary">Pending Requests</Typography>
            <Typography variant="h5">
              {perfMetrics.pendingRequests}{' '}
              <Chip 
                size="small" 
                color={perfMetrics.pendingRequests === 0 ? 'success' : 'warning'} 
                label={perfMetrics.pendingRequests === 0 ? 'None' : 'Active'} 
              />
            </Typography>
          </Grid>
          
          {perfMetrics.memory && (
            <>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">Used Memory</Typography>
                <Typography variant="h5">
                  {formatBytes(perfMetrics.memory.usedJSHeapSize)}
                </Typography>
                <Typography variant="caption">
                  {Math.round((perfMetrics.memory.usedJSHeapSize / perfMetrics.memory.jsHeapSizeLimit) * 100)}% of limit
                </Typography>
              </Grid>
              
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">Heap Limit</Typography>
                <Typography variant="h5">
                  {formatBytes(perfMetrics.memory.jsHeapSizeLimit)}
                </Typography>
              </Grid>
            </>
          )}
        </Grid>
        
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Last updated: {new Date(perfMetrics.lastUpdate).toLocaleTimeString()}
        </Typography>
      </Paper>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Log Viewer
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Logs" />
          <Tab label="System Health" />
        </Tabs>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
        
        {loading && <CircularProgress size={24} />}
      </Box>
      
      {activeTab === 0 && (
        <Box>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Select Log File</InputLabel>
                <Select
                  value={selectedLogName}
                  onChange={handleLogChange}
                  label="Select Log File"
                >
                  {logs.map((log) => (
                    <MenuItem key={log.name} value={log.name}>
                      {log.name} ({log.entries_count} entries, {formatBytes(log.size)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Log Level</InputLabel>
                <Select
                  value={levelFilter}
                  onChange={handleLevelFilterChange}
                  label="Log Level"
                >
                  <MenuItem value="">All Levels</MenuItem>
                  <MenuItem value="debug">Debug</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                </Select>
              </FormControl>
              
              {selectedLog && (
                <Typography variant="body2" color="text.secondary">
                  Showing {logEntries.length} of {selectedLog.count} entries
                </Typography>
              )}
            </Box>
          </Paper>
          
          <VirtualizedLogTable logEntries={logEntries} getLevelColor={getLevelColor} loading={loading} />
        </Box>
      )}
      
      {activeTab === 1 && healthInfo && (
        <Box>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>System Health</Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1">Status: {healthInfo.status}</Typography>
              <Typography variant="body2" color="text.secondary">
                Last updated: {healthInfo.timestamp}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>System Information</Typography>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>CPU Count</TableCell>
                      <TableCell>{healthInfo.system.cpu_count}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Memory Usage</TableCell>
                      <TableCell>
                        {formatBytes(healthInfo.system.memory_total - healthInfo.system.memory_available)} / {formatBytes(healthInfo.system.memory_total)} ({healthInfo.system.memory_percent}%)
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Disk Usage</TableCell>
                      <TableCell>
                        {formatBytes(healthInfo.system.disk_total - healthInfo.system.disk_free)} / {formatBytes(healthInfo.system.disk_total)} ({healthInfo.system.disk_percent}%)
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Platform</TableCell>
                      <TableCell>{healthInfo.system.platform}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Python Version</TableCell>
                      <TableCell>{healthInfo.python.version}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Module Versions</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Module</TableCell>
                      <TableCell>Version</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(healthInfo.modules).map(([name, version]) => (
                      <TableRow key={name}>
                        <TableCell>{name}</TableCell>
                        <TableCell>{version}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
            
            <Box>
              <Typography variant="subtitle1" gutterBottom>Logs</Typography>
              <Typography variant="body2">
                Total logs: {healthInfo.logs.count} files ({formatBytes(healthInfo.logs.total_size)})
              </Typography>
            </Box>
          </Paper>
        </Box>
      )}
      
      <PerformanceMonitor />
    </Box>
  );
};

export default LogViewer; 