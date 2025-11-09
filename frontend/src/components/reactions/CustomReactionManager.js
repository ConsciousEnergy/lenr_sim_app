import React from 'react';
import { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, List, ListItem, ListItemText, 
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, FormControl, InputLabel, MenuItem, Select,
  Divider, Tooltip, CircularProgress, Snackbar, Alert
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Edit as EditIcon,
  Science as ScienceIcon,
  Refresh as RefreshIcon,
  ContentCopy as CloneIcon
} from '@mui/icons-material';

import { reactionsService, formatReactionEquation } from '../../services';

const CustomReactionManager = () => {
  // State management
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentReaction, setCurrentReaction] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  
  // Load reactions on component mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
    loadReactions();
  }, []);
  
  // Load reactions from backend
  const loadReactions = async () => {
    setLoading(true);
    try {
      const customReactions = await reactionsService.getCustomReactions();
      setReactions(customReactions);
      setError(null);
    } catch (err) {
      console.error('Failed to load reactions:', err);
      setError('Failed to load custom reactions');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle dialog close
  const handleClose = () => {
    setOpenDialog(false);
    setCurrentReaction(null);
    setIsEditing(false);
    setSelectedTemplate('');
  };
  
  // Open dialog for creating a new reaction
  const handleOpenCreate = () => {
    setCurrentReaction(reactionsService.createTemplate());
    setIsEditing(false);
    setOpenDialog(true);
  };
  
  // Open dialog for editing an existing reaction
  const handleOpenEdit = (reaction) => {
    setCurrentReaction(reaction);
    setIsEditing(true);
    setOpenDialog(true);
  };
  
  // Clone an existing reaction
  const handleClone = (reaction) => {
    const clonedReaction = { 
      ...reaction,
      name: `${reaction.name} (Clone)`,
      products: [...reaction.products] 
    };
    setCurrentReaction(clonedReaction);
    setIsEditing(false);
    setOpenDialog(true);
  };
  
  // Delete a reaction
  const handleDelete = async (reactionName) => {
    if (!window.confirm(`Are you sure you want to delete the reaction "${reactionName}"?`)) {
      return;
    }
    
    setLoading(true);
    try {
      await reactionsService.deleteReaction(reactionName);
      setReactions(reactions.filter(r => r.name !== reactionName));
      showNotification('Reaction deleted successfully', 'success');
    } catch (err) {
      console.error('Failed to delete reaction:', err);
      showNotification('Failed to delete reaction', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle input change for reaction form
  const handleInputChange = (field, value) => {
    setCurrentReaction(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle product change
  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...currentReaction.products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: value
    };
    
    setCurrentReaction(prev => ({
      ...prev,
      products: updatedProducts
    }));
  };
  
  // Add a new product
  const handleAddProduct = () => {
    const newProduct = { name: '', z: 0, a: 1, branch_ratio: 1.0 };
    setCurrentReaction(prev => ({
      ...prev,
      products: [...prev.products, newProduct]
    }));
  };
  
  // Remove a product
  const handleRemoveProduct = (index) => {
    const updatedProducts = [...currentReaction.products];
    updatedProducts.splice(index, 1);
    
    setCurrentReaction(prev => ({
      ...prev,
      products: updatedProducts
    }));
  };
  
  // Apply template to current reaction
  const handleApplyTemplate = (templateName) => {
    if (!templateName) return;
    
    const template = reactionsService.getTemplate(templateName);
    setCurrentReaction(template);
    setSelectedTemplate('');
  };
  
  // Save reaction
  const handleSave = async () => {
    // Validate reaction
    const { isValid, errors } = reactionsService.validateReaction(currentReaction);
    
    if (!isValid) {
      showNotification(`Validation failed: ${errors.join(', ')}`, 'error');
      return;
    }
    
    setLoading(true);
    try {
      const savedReaction = await reactionsService.createReaction(currentReaction);
      
      if (isEditing) {
        setReactions(reactions.map(r => r.name === savedReaction.name ? savedReaction : r));
        showNotification('Reaction updated successfully', 'success');
      } else {
        setReactions([...reactions, savedReaction]);
        showNotification('Reaction created successfully', 'success');
      }
      
      handleClose();
    } catch (err) {
      console.error('Failed to save reaction:', err);
      showNotification(`Failed to save reaction: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
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
    setNotification(prev => ({
      ...prev,
      open: false
    }));
  };
  
  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Custom Fusion Reactions</Typography>
        <Box>
          <Tooltip title="Refresh reactions">
            <IconButton onClick={loadReactions} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleOpenCreate}
            disabled={loading}
          >
            Create Reaction
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : reactions.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <ScienceIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            No custom reactions found. Create your first custom reaction!
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <List>
            {reactions.map((reaction, index) => (
              <React.Fragment key={reaction.name}>
                {index > 0 && <Divider />}
                <ListItem
                  secondaryAction={
                    <Box>
                      <Tooltip title="Clone reaction">
                        <IconButton edge="end" onClick={() => handleClone(reaction)}>
                          <CloneIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit reaction">
                        <IconButton edge="end" onClick={() => handleOpenEdit(reaction)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete reaction">
                        <IconButton edge="end" onClick={() => handleDelete(reaction.name)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={reaction.name}
                    secondary={formatReactionEquation(reaction)}
                    secondaryTypographyProps={{ fontFamily: 'monospace' }}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
      
      {/* Reaction dialog */}
      <Dialog open={openDialog} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? `Edit Reaction: ${currentReaction?.name}` : 'Create New Reaction'}
        </DialogTitle>
        <DialogContent dividers>
          {currentReaction && (
            <Box component="form" noValidate sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                {/* Templates dropdown */}
                {!isEditing && (
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Apply Template</InputLabel>
                      <Select
                        value={selectedTemplate}
                        onChange={(e) => {
                          setSelectedTemplate(e.target.value);
                          handleApplyTemplate(e.target.value);
                        }}
                        label="Apply Template"
                      >
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        <MenuItem value="deuteriumDeuterium">D-D Fusion</MenuItem>
                        <MenuItem value="deuteriumTritium">D-T Fusion</MenuItem>
                        <MenuItem value="protonBoron">p-B11 Fusion</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                
                {/* Reaction name */}
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    label="Reaction Name"
                    value={currentReaction.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </Grid>
                
                {/* Reactants */}
                <Grid item xs={12}>
                  <Typography variant="h6">Reactants</Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        required
                        fullWidth
                        type="number"
                        label="Reactant 1 Z"
                        value={currentReaction.reactant1_z}
                        onChange={(e) => handleInputChange('reactant1_z', parseInt(e.target.value, 10))}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        required
                        fullWidth
                        type="number"
                        label="Reactant 1 A"
                        value={currentReaction.reactant1_a}
                        onChange={(e) => handleInputChange('reactant1_a', parseInt(e.target.value, 10))}
                        inputProps={{ min: 1 }}
                      />
                    </Grid>
                  </Grid>
                </Grid>
                
                <Grid item xs={6}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        required
                        fullWidth
                        type="number"
                        label="Reactant 2 Z"
                        value={currentReaction.reactant2_z}
                        onChange={(e) => handleInputChange('reactant2_z', parseInt(e.target.value, 10))}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        required
                        fullWidth
                        type="number"
                        label="Reactant 2 A"
                        value={currentReaction.reactant2_a}
                        onChange={(e) => handleInputChange('reactant2_a', parseInt(e.target.value, 10))}
                        inputProps={{ min: 1 }}
                      />
                    </Grid>
                  </Grid>
                </Grid>
                
                {/* Q-value */}
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    type="number"
                    label="Q-Value (MeV)"
                    value={currentReaction.q_value}
                    onChange={(e) => handleInputChange('q_value', parseFloat(e.target.value))}
                    inputProps={{ min: 0.1, step: 0.1 }}
                  />
                </Grid>
                
                {/* Products */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Products</Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleAddProduct}
                      size="small"
                    >
                      Add Product
                    </Button>
                  </Box>
                </Grid>
                
                {currentReaction.products.map((product, index) => (
                  <Grid item xs={12} key={index}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={3}>
                          <TextField
                            required
                            fullWidth
                            label="Name"
                            value={product.name}
                            onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={2}>
                          <TextField
                            required
                            fullWidth
                            type="number"
                            label="Z"
                            value={product.z}
                            onChange={(e) => handleProductChange(index, 'z', parseInt(e.target.value, 10))}
                            inputProps={{ min: 0 }}
                          />
                        </Grid>
                        <Grid item xs={2}>
                          <TextField
                            required
                            fullWidth
                            type="number"
                            label="A"
                            value={product.a}
                            onChange={(e) => handleProductChange(index, 'a', parseInt(e.target.value, 10))}
                            inputProps={{ min: 1 }}
                          />
                        </Grid>
                        <Grid item xs={3}>
                          <TextField
                            required
                            fullWidth
                            type="number"
                            label="Branch Ratio"
                            value={product.branch_ratio}
                            onChange={(e) => handleProductChange(index, 'branch_ratio', parseFloat(e.target.value))}
                            inputProps={{ min: 0.01, max: 1, step: 0.01 }}
                          />
                        </Grid>
                        <Grid item xs={2} sx={{ textAlign: 'right' }}>
                          <IconButton onClick={() => handleRemoveProduct(index)} color="error">
                            <DeleteIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                ))}
                
                {/* Reaction equation preview */}
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Reaction Preview:</Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="body1" fontFamily="monospace">
                      {formatReactionEquation(currentReaction)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : (isEditing ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CustomReactionManager; 