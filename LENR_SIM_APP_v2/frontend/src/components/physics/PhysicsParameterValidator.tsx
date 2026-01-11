import React, { useEffect, useState } from 'react';
import { 
  Alert, 
  AlertTitle, 
  Box, 
  Chip, 
  Collapse, 
  IconButton, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Paper, 
  Tooltip, 
  Typography
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PhysicsConstraints, { ValidationResult } from './PhysicsConstraints';

export interface PhysicsParameterValidatorProps {
  parameters: Record<string, number | string>;
  showSuccessMessages?: boolean;
}

/**
 * Component that validates physics parameters against constraints and provides
 * user-friendly feedback about validation errors
 */
const PhysicsParameterValidator: React.FC<PhysicsParameterValidatorProps> = ({
  parameters,
  showSuccessMessages = false
}) => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  // Validate parameters whenever they change
  useEffect(() => {
    if (Object.keys(parameters).length > 0) {
      const results = PhysicsConstraints.validateParameterSet(parameters);
      setValidationResults(results);
      
      // Auto-expand if there are errors
      const hasErrors = results.some(result => !result.isValid);
      if (hasErrors) {
        setExpanded(true);
        setDismissed(false);
      }
    }
  }, [parameters]);

  // Get lists of valid and invalid results
  const invalidResults = validationResults.filter(r => !r.isValid);
  const validResults = validationResults.filter(r => r.isValid);

  // If all validations pass and we don't want to show success messages, render nothing
  if (invalidResults.length === 0 && !showSuccessMessages) {
    return null;
  }

  // If user dismissed and there are no errors, don't show anything
  if (dismissed && invalidResults.length === 0) {
    return null;
  }

  // Group validation results by category
  const groupedResults: Record<string, ValidationResult[]> = {};
  
  validationResults.forEach(result => {
    const group = (result as any).parameterGroup || 'general';
    if (!groupedResults[group]) {
      groupedResults[group] = [];
    }
    groupedResults[group].push(result);
  });

  // Helper function to get validation category label
  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'temperature-activation': return 'Temperature & Activation Energy';
      case 'lattice': return 'Lattice Parameters';
      case 'loading': return 'Deuterium Loading';
      case 'screening': return 'Electron Screening';
      case 'quantum': return 'Quantum Effects';
      case 'energy': return 'Energy Balance';
      default: return category.charAt(0).toUpperCase() + category.slice(1);
    }
  };

  // Determine overall validation status
  const hasErrors = invalidResults.length > 0;
  const severity = hasErrors ? 'error' : 'success';
  const statusText = hasErrors 
    ? `${invalidResults.length} parameter constraint${invalidResults.length === 1 ? '' : 's'} violated` 
    : 'All parameters satisfy physical constraints';

  return (
    <Paper 
      elevation={hasErrors ? 2 : 1} 
      sx={{ 
        mt: 3,
        mb: 3,
        p: 0,
        border: hasErrors ? '1px solid rgba(211, 47, 47, 0.5)' : '1px solid rgba(46, 125, 50, 0.5)',
        borderRadius: 1,
        overflow: 'hidden'
      }}
    >
      <Alert 
        severity={severity} 
        sx={{ 
          alignItems: 'center',
          px: 2,
          py: 1
        }}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              aria-label={expanded ? 'collapse' : 'expand'}
              color="inherit"
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ mr: 0.5 }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            {!hasErrors && (
              <IconButton
                aria-label="dismiss"
                color="inherit"
                size="small"
                onClick={() => setDismissed(true)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        }
      >
        <AlertTitle>{hasErrors ? 'Physical Constraint Violations' : 'Parameters Valid'}</AlertTitle>
        {statusText}
      </Alert>
      
      <Collapse in={expanded}>
        <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
          {Object.entries(groupedResults).map(([category, results]) => {
            // Skip empty categories
            if (results.length === 0) return null;
            
            // Only show categories with errors if there are any errors overall
            const categoryHasErrors = results.some(r => !r.isValid);
            if (hasErrors && !categoryHasErrors) return null;
            
            return (
              <Box key={category} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                  {getCategoryLabel(category)}
                  <Chip 
                    size="small" 
                    color={categoryHasErrors ? 'error' : 'success'} 
                    label={categoryHasErrors ? 'Issues' : 'Valid'} 
                    sx={{ ml: 1, height: 20 }}
                  />
                </Typography>
                
                <List dense disablePadding>
                  {results.map((result, idx) => (
                    <ListItem key={idx} dense disableGutters>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {result.isValid ? (
                          <CheckCircleIcon color="success" fontSize="small" />
                        ) : (
                          <ErrorIcon color="error" fontSize="small" />
                        )}
                      </ListItemIcon>
                      <ListItemText 
                        primary={result.message || (result.isValid ? 'Valid' : 'Invalid')} 
                        primaryTypographyProps={{ 
                          variant: 'body2',
                          color: result.isValid ? 'text.secondary' : 'error'
                        }}
                      />
                      {result.message && (
                        <Tooltip title="This validation rule checks if parameter values follow established physical laws and reasonable bounds">
                          <InfoIcon fontSize="small" color="action" sx={{ ml: 1 }} />
                        </Tooltip>
                      )}
                    </ListItem>
                  ))}
                </List>
              </Box>
            );
          })}
          
          {validResults.length > 0 && invalidResults.length === 0 && (
            <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
              All physics constraints are satisfied. These parameters represent a physically realistic scenario.
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default PhysicsParameterValidator; 