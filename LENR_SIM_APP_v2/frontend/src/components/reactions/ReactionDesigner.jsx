import { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Tabs, 
  Tab, 
  Button, 
  Dialog, 
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import { 
  Save as SaveIcon,
  Close as CloseIcon, 
  Science as ScienceIcon
} from '@mui/icons-material';

import VisualReactionBuilder from './VisualReactionBuilder';
import { reactionsService } from '../../services';

/**
 * Reaction Designer Component
 * 
 * Provides an integrated environment for designing custom fusion reactions
 * with both visual tools and testing capabilities.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.initialReaction - Initial reaction data (optional)
 * @param {Function} props.onSave - Callback when reaction is saved
 * @param {Function} props.onClose - Callback when designer is closed
 * @param {boolean} props.open - Whether the designer dialog is open
 * @returns {JSX.Element} Reaction Designer component
 */
const ReactionDesigner = ({ initialReaction, onSave, onClose, open }) => {
  // Current reaction state
  const [currentReaction, setCurrentReaction] = useState(null);
  
  // Testing state
  const [isTestMode, setIsTestMode] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState(null);
  
  // UI state
  const [activeTab, setActiveTab] = useState(0);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  
  // Initialize reaction when opened
  // eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
    if (open) {
      setCurrentReaction(initialReaction || reactionsService.createReactionTemplate());
      setIsTestMode(false);
      setTestResults(null);
      setTestError(null);
      setActiveTab(0);
    }
  }, [open, initialReaction]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle reaction update from the builder
  const handleReactionUpdate = (updatedReaction) => {
    setCurrentReaction(updatedReaction);
    setTestResults(null); // Clear previous test results when reaction is modified
  };
  
  // Handle reaction save
  const handleSave = async () => {
    try {
      const savedReaction = await reactionsService.createReaction(currentReaction);
      showNotification('Reaction saved successfully!', 'success');
      setCurrentReaction(savedReaction);
      
      // Call the parent's onSave callback
      if (onSave) {
        onSave(savedReaction);
      }
    } catch (error) {
      console.error('Error saving reaction:', error);
      showNotification(`Failed to save reaction: ${error.message}`, 'error');
    }
  };
  
  // Handle reaction test
  const handleTest = async () => {
    setTestLoading(true);
    setTestResults(null);
    setTestError(null);
    setIsTestMode(true);
    
    try {
      // Here we would call a test API to evaluate the reaction
      // For now, we'll simulate a test with a timeout
      const testResults = await reactionsService.testReaction(currentReaction);
      setTestResults(testResults);
      
      // Switch to the test results tab
      setActiveTab(1);
    } catch (error) {
      console.error('Error testing reaction:', error);
      setTestError(`Failed to test reaction: ${error.message}`);
    } finally {
      setTestLoading(false);
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
  
  // Render test results view
  const renderTestResults = () => {
    if (testLoading) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6">Testing reaction...</Typography>
          <Typography variant="body2" color="textSecondary">
            Simulating reaction kinetics and energy balance
          </Typography>
        </Box>
      );
    }
    
    if (testError) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          {testError}
        </Alert>
      );
    }
    
    if (!testResults) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
          <ScienceIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6">No test results yet</Typography>
          <Typography variant="body2" color="textSecondary">
            Use the visual builder to design your reaction, then click "Test Reaction"
          </Typography>
        </Box>
      );
    }
    
    // Render actual test results once we have them
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Reaction Test Results
        </Typography>
        
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Reaction Equation:
          </Typography>
          <Typography variant="body1" fontFamily="monospace">
            {testResults.reactionEquation}
          </Typography>
        </Paper>
        
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Energy Analysis:
          </Typography>
          <Box sx={{ display: 'flex', gap: 4, mt: 2 }}>
            <Box>
              <Typography variant="body2" color="textSecondary">Q-Value:</Typography>
              <Typography variant="h6">{testResults.qValue.toFixed(3)} MeV</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">Energy Distribution:</Typography>
              <Typography variant="h6">{testResults.energyDistribution}</Typography>
            </Box>
          </Box>
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
            Schematic estimates from Q-value kinematics and barrier heuristics,
            not backend simulation output.
          </Typography>
        </Paper>
        
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Kinetics Analysis:
          </Typography>
          <Box sx={{ display: 'flex', gap: 4, mt: 2 }}>
            <Box>
              <Typography variant="body2" color="textSecondary">Coulomb Barrier:</Typography>
              <Typography variant="h6">{testResults.coulombBarrier.toFixed(2)} keV</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">Cross Section (10 keV):</Typography>
              <Typography variant="h6">{testResults.crossSection.low} barns</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">Cross Section (100 keV):</Typography>
              <Typography variant="h6">{testResults.crossSection.high} barns</Typography>
            </Box>
          </Box>
        </Paper>
        
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Radiation Analysis:
          </Typography>
          <Box sx={{ mt: 2 }}>
            {testResults.radiationProducts.map((product, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Typography variant="body1" fontWeight="bold">
                  {product.name} ({product.type})
                </Typography>
                <Typography variant="body2">
                  Energy: {product.energy} MeV | Range: {product.range} | Shielding: {product.shielding}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>
    );
  };
  
  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose}
        fullWidth
        maxWidth="lg"
        sx={{ '& .MuiDialog-paper': { height: '90vh' } }}
      >
        <DialogTitle>
          {initialReaction ? 'Edit Reaction' : 'Create New Reaction'}
        </DialogTitle>
        
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="Visual Builder" />
          <Tab label="Test Results" disabled={!isTestMode} />
        </Tabs>
        
        <DialogContent dividers>
          {activeTab === 0 && (
            <VisualReactionBuilder
              initialReaction={currentReaction}
              onSave={handleReactionUpdate}
              onTest={handleTest}
              onCancel={() => {}}
            />
          )}
          
          {activeTab === 1 && renderTestResults()}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose} startIcon={<CloseIcon />}>
            Close
          </Button>
          
          <Button 
            onClick={handleTest}
            variant="contained"
            color="secondary"
            startIcon={<ScienceIcon />}
            disabled={!currentReaction || testLoading}
          >
            Test Reaction
          </Button>
          
          <Button 
            onClick={handleSave}
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            disabled={!currentReaction}
          >
            Save Reaction
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ReactionDesigner; 