import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Save as SaveIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  ContentCopy as CopyIcon,
  Edit as EditIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  MoreVert as MoreVertIcon,
  SyncAlt as SyncAltIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon
} from '@mui/icons-material';

import { reactionsService, formatReactionEquation } from '../../services';

/**
 * Reaction Configuration Manager
 * 
 * Provides a user interface for managing saved reaction configurations,
 * including importing, exporting, and sharing.
 * 
 * @returns {JSX.Element} The reaction configuration manager component
 */
const ReactionConfigurationManager = () => {
  // State for saved configurations
  const [configurations, setConfigurations] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Dialog states
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Selected configuration
  const [selectedConfig, setSelectedConfig] = useState(null);
  
  // Menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [menuConfigId, setMenuConfigId] = useState(null);
  
  // Form state
  const [configName, setConfigName] = useState('');
  const [configDescription, setConfigDescription] = useState('');
  const [configTags, setConfigTags] = useState('');
  const [importData, setImportData] = useState('');
  
  // Notification state
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Mock data for demo purposes
  const mockConfigurations = [
    {
      id: 'config-1',
      name: 'D-D Baseline',
      description: 'Standard D-D fusion with default parameters',
      reaction: {
        name: 'D-D Fusion',
        reactant1_z: 1,
        reactant1_a: 2,
        reactant2_z: 1,
        reactant2_a: 2,
        q_value: 3.27,
        products: [
          { name: 'He-3', z: 2, a: 3, branch_ratio: 0.5 },
          { name: 'n', z: 0, a: 1, branch_ratio: 0.5 },
          { name: 'H-3', z: 1, a: 3, branch_ratio: 0.5 },
          { name: 'p', z: 1, a: 1, branch_ratio: 0.5 }
        ]
      },
      parameters: {
        temperature: 15,
        density: 1.0e14,
        duration: 1.0,
        confinementTime: 0.1,
        magneticField: 5.0
      },
      createdAt: '2025-03-15T14:32:10Z',
      updatedAt: '2025-03-15T14:32:10Z',
      starred: true,
      tags: ['baseline', 'deuterium']
    },
    {
      id: 'config-2',
      name: 'D-T High Temperature',
      description: 'D-T fusion optimized for high temperature plasma',
      reaction: {
        name: 'D-T Fusion',
        reactant1_z: 1,
        reactant1_a: 2,
        reactant2_z: 1,
        reactant2_a: 3,
        q_value: 17.6,
        products: [
          { name: 'He-4', z: 2, a: 4, branch_ratio: 1.0 },
          { name: 'n', z: 0, a: 1, branch_ratio: 1.0 }
        ]
      },
      parameters: {
        temperature: 25,
        density: 5.0e14,
        duration: 2.0,
        confinementTime: 0.2,
        magneticField: 8.0
      },
      createdAt: '2025-03-17T09:45:22Z',
      updatedAt: '2025-04-02T11:13:05Z',
      starred: false,
      tags: ['high-temp', 'deuterium', 'tritium']
    },
    {
      id: 'config-3',
      name: 'p-B11 Aneutronic',
      description: 'Proton-Boron fusion optimized for aneutronic energy production',
      reaction: {
        name: 'p-B11 Fusion',
        reactant1_z: 1,
        reactant1_a: 1,
        reactant2_z: 5,
        reactant2_a: 11,
        q_value: 8.7,
        products: [
          { name: 'He-4', z: 2, a: 4, branch_ratio: 1.0 }
        ]
      },
      parameters: {
        temperature: 200,
        density: 1.0e15,
        duration: 0.5,
        confinementTime: 0.05,
        magneticField: 15.0
      },
      createdAt: '2025-03-22T16:08:47Z',
      updatedAt: '2025-03-22T16:08:47Z',
      starred: true,
      tags: ['aneutronic', 'proton', 'boron']
    }
  ];
  
  // Load configurations on component mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
    loadConfigurations();
  }, []);
  
  // Load configurations
  const loadConfigurations = async () => {
    setLoading(true);
    
    try {
      // In a real app, this would be an API call
      // const response = await api.getReactionConfigurations();
      // setConfigurations(response.data);
      
      // For demo, use mock data
      setTimeout(() => {
        setConfigurations(mockConfigurations);
        setLoading(false);
      }, 500);
    } catch (err) {
      console.error('Failed to load configurations:', err);
      setError('Failed to load reaction configurations. Please try again.');
      setLoading(false);
    }
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Open configuration menu
  const handleMenuOpen = (event, configId) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuConfigId(configId);
  };
  
  // Close configuration menu
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuConfigId(null);
  };
  
  // Toggle star status
  const handleToggleStar = (configId) => {
    const updatedConfigs = configurations.map(config => 
      config.id === configId ? { ...config, starred: !config.starred } : config
    );
    setConfigurations(updatedConfigs);
    
    // Close menu if opened from there
    handleMenuClose();
  };
  
  // Open save dialog
  const handleOpenSaveDialog = (config = null) => {
    if (config) {
      setSelectedConfig(config);
      setConfigName(config.name);
      setConfigDescription(config.description);
      setConfigTags(config.tags.join(', '));
    } else {
      setSelectedConfig(null);
      setConfigName('');
      setConfigDescription('');
      setConfigTags('');
    }
    
    setSaveDialogOpen(true);
    handleMenuClose();
  };
  
  // Open delete dialog
  const handleOpenDeleteDialog = (config) => {
    setSelectedConfig(config);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };
  
  // Handle save configuration
  const handleSaveConfiguration = () => {
    // Validate inputs
    if (!configName.trim()) {
      showNotification('Configuration name is required', 'error');
      return;
    }
    
    // Process tags
    const processedTags = configTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag !== '');
    
    if (selectedConfig) {
      // Update existing configuration
      const updatedConfigs = configurations.map(config => 
        config.id === selectedConfig.id ? {
          ...config,
          name: configName,
          description: configDescription,
          tags: processedTags,
          updatedAt: new Date().toISOString()
        } : config
      );
      
      setConfigurations(updatedConfigs);
      showNotification('Configuration updated successfully', 'success');
    } else {
      // Create new configuration
      // In a real app, this would be an API call to create a new configuration
      const newConfig = {
        id: `config-${Date.now()}`,
        name: configName,
        description: configDescription,
        reaction: {
          // This would be the current reaction in the app
          name: 'New Reaction',
          reactant1_z: 1,
          reactant1_a: 1,
          reactant2_z: 1,
          reactant2_a: 1,
          q_value: 1.0,
          products: []
        },
        parameters: {
          // This would be the current parameters in the app
          temperature: 10,
          density: 1.0e14,
          duration: 1.0,
          confinementTime: 0.1,
          magneticField: 5.0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        starred: false,
        tags: processedTags
      };
      
      setConfigurations([...configurations, newConfig]);
      showNotification('Configuration saved successfully', 'success');
    }
    
    setSaveDialogOpen(false);
  };
  
  // Handle delete configuration
  const handleDeleteConfiguration = () => {
    if (!selectedConfig) return;
    
    const updatedConfigs = configurations.filter(config => config.id !== selectedConfig.id);
    setConfigurations(updatedConfigs);
    
    showNotification('Configuration deleted successfully', 'success');
    setDeleteDialogOpen(false);
  };
  
  // Open export dialog
  const handleOpenExportDialog = (config) => {
    setSelectedConfig(config);
    setExportDialogOpen(true);
    handleMenuClose();
  };
  
  // Handle export configuration
  const handleExportConfiguration = () => {
    if (!selectedConfig) return;
    
    const exportData = JSON.stringify(selectedConfig, null, 2);
    
    // Create and trigger download
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedConfig.name.replace(/\s+/g, '_')}_config.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    setExportDialogOpen(false);
    showNotification('Configuration exported successfully', 'success');
  };
  
  // Open import dialog
  const handleOpenImportDialog = () => {
    setImportData('');
    setImportDialogOpen(true);
  };
  
  // Handle import configuration
  const handleImportConfiguration = () => {
    try {
      if (!importData.trim()) {
        showNotification('Import data is required', 'error');
        return;
      }
      
      const importedConfig = JSON.parse(importData);
      
      // Validate imported data
      if (!importedConfig.name || !importedConfig.reaction) {
        showNotification('Invalid configuration format', 'error');
        return;
      }
      
      // Check for duplicate ID
      const isDuplicate = configurations.some(config => config.id === importedConfig.id);
      
      if (isDuplicate) {
        // Generate a new ID
        importedConfig.id = `config-${Date.now()}`;
      }
      
      // Update timestamps
      importedConfig.updatedAt = new Date().toISOString();
      
      // Add to configurations
      setConfigurations([...configurations, importedConfig]);
      setImportDialogOpen(false);
      showNotification('Configuration imported successfully', 'success');
    } catch (err) {
      console.error('Import error:', err);
      showNotification('Failed to import configuration. Invalid format.', 'error');
    }
  };
  
  // Open share dialog
  const handleOpenShareDialog = (config) => {
    setSelectedConfig(config);
    setShareDialogOpen(true);
    handleMenuClose();
  };
  
  // Handle share configuration
  const handleShareConfiguration = () => {
    // In a real app, this would generate a shareable link or code
    
    // For demo, just copy the configuration to clipboard
    const shareData = JSON.stringify(selectedConfig, null, 2);
    navigator.clipboard.writeText(shareData)
      .then(() => {
        showNotification('Configuration copied to clipboard. You can now share it with others.', 'success');
        setShareDialogOpen(false);
      })
      .catch(err => {
        console.error('Failed to copy to clipboard:', err);
        showNotification('Failed to copy configuration to clipboard', 'error');
      });
  };
  
  // Handle file import
  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImportData(e.target.result);
    };
    reader.readAsText(file);
  };
  
  // Show notification
  const showNotification = (message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };
  
  // Close notification
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  // Render tag chips
  const renderTags = (tags) => {
    return tags.map((tag, index) => (
      <Chip 
        key={index} 
        label={tag} 
        size="small" 
        sx={{ mr: 0.5, mb: 0.5 }} 
      />
    ));
  };
  
  // Filter configurations based on active tab
  const filteredConfigurations = () => {
    switch (activeTab) {
      case 0: // All
        return configurations;
      case 1: // Starred
        return configurations.filter(config => config.starred);
      case 2: // Recent
        return [...configurations].sort((a, b) => 
          new Date(b.updatedAt) - new Date(a.updatedAt)
        ).slice(0, 5);
      default:
        return configurations;
    }
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Reaction Configurations</Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<UploadIcon />} 
            onClick={handleOpenImportDialog}
            sx={{ mr: 1 }}
          >
            Import
          </Button>
          <Button 
            variant="contained" 
            startIcon={<SaveIcon />} 
            onClick={() => handleOpenSaveDialog()}
          >
            Save Current
          </Button>
        </Box>
      </Box>
      
      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        <Tab label="All" />
        <Tab label="Starred" />
        <Tab label="Recent" />
      </Tabs>
      
      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Loading indicator */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredConfigurations().length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <FolderOpenIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6">No configurations found</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {activeTab === 0 ? 
              'Save your current reaction configuration to get started.' :
              activeTab === 1 ? 
                'Star configurations to find them quickly later.' :
                'Recently updated configurations will appear here.'}
          </Typography>
          {activeTab === 0 && (
            <Button 
              variant="outlined" 
              startIcon={<SaveIcon />} 
              onClick={() => handleOpenSaveDialog()}
            >
              Save Current Configuration
            </Button>
          )}
        </Paper>
      ) : (
        <List component={Paper}>
          {filteredConfigurations().map((config) => (
            <React.Fragment key={config.id}>
              <ListItem 
                alignItems="flex-start"
                secondaryAction={
                  <>
                    <IconButton
                      edge="end"
                      onClick={() => handleToggleStar(config.id)}
                      color={config.starred ? 'primary' : 'default'}
                    >
                      {config.starred ? <StarIcon /> : <StarBorderIcon />}
                    </IconButton>
                    <IconButton edge="end" onClick={(e) => handleMenuOpen(e, config.id)}>
                      <MoreVertIcon />
                    </IconButton>
                  </>
                }
              >
                <ListItemIcon>
                  <FolderIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="subtitle1" component="span">
                        {config.name}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.primary" sx={{ mt: 0.5 }}>
                        {formatReactionEquation(config.reaction)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {config.description}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        {renderTags(config.tags)}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Last updated: {formatDate(config.updatedAt)}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      )}
      
      {/* Configuration Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          const config = configurations.find(c => c.id === menuConfigId);
          handleToggleStar(menuConfigId);
        }}>
          {configurations.find(c => c.id === menuConfigId)?.starred ? (
            <>
              <ListItemIcon>
                <StarBorderIcon fontSize="small" />
              </ListItemIcon>
              Unstar
            </>
          ) : (
            <>
              <ListItemIcon>
                <StarIcon fontSize="small" />
              </ListItemIcon>
              Star
            </>
          )}
        </MenuItem>
        <MenuItem onClick={() => {
          const config = configurations.find(c => c.id === menuConfigId);
          handleOpenSaveDialog(config);
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit
        </MenuItem>
        <MenuItem onClick={() => {
          const config = configurations.find(c => c.id === menuConfigId);
          handleOpenExportDialog(config);
        }}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          Export
        </MenuItem>
        <MenuItem onClick={() => {
          const config = configurations.find(c => c.id === menuConfigId);
          handleOpenShareDialog(config);
        }}>
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          Share
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          const config = configurations.find(c => c.id === menuConfigId);
          handleOpenDeleteDialog(config);
        }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <Typography color="error">Delete</Typography>
        </MenuItem>
      </Menu>
      
      {/* Save/Edit Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedConfig ? 'Edit Configuration' : 'Save Configuration'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Configuration Name"
            type="text"
            fullWidth
            variant="outlined"
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="description"
            label="Description"
            type="text"
            fullWidth
            variant="outlined"
            value={configDescription}
            onChange={(e) => setConfigDescription(e.target.value)}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="tags"
            label="Tags (comma separated)"
            type="text"
            fullWidth
            variant="outlined"
            value={configTags}
            onChange={(e) => setConfigTags(e.target.value)}
            helperText="e.g. deuterium, high-temp, experiment"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveConfiguration} variant="contained">
            {selectedConfig ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the configuration "{selectedConfig?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfiguration} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Export Configuration</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Export "{selectedConfig?.name}" as a JSON file that can be imported later or shared with others.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleExportConfiguration} 
            variant="contained" 
            startIcon={<DownloadIcon />}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Configuration</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Import a configuration by pasting JSON data or uploading a file.
          </Typography>
          
          <Box sx={{ mt: 2, mb: 3 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              fullWidth
            >
              Upload JSON File
              <input
                type="file"
                hidden
                accept=".json,application/json"
                onChange={handleFileImport}
              />
            </Button>
          </Box>
          
          <Divider sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">OR</Typography>
          </Divider>
          
          <TextField
            multiline
            rows={10}
            fullWidth
            variant="outlined"
            placeholder="Paste configuration JSON here..."
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleImportConfiguration} 
            variant="contained" 
            disabled={!importData.trim()}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)}>
        <DialogTitle>Share Configuration</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Share the "{selectedConfig?.name}" configuration with others.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The configuration data will be copied to your clipboard, which you can then paste and send to others.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleShareConfiguration} 
            variant="contained" 
            startIcon={<ShareIcon />}
          >
            Copy to Clipboard
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReactionConfigurationManager; 