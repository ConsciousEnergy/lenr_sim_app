import React, { useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Chip,
  Link,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import CalculateIcon from '@mui/icons-material/Calculate';
import ScienceIcon from '@mui/icons-material/Science';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SchoolIcon from '@mui/icons-material/School';
import FormulaIcon from '@mui/icons-material/Functions';
import WarningIcon from '@mui/icons-material/Warning';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import { PhysicsParameter } from './PhysicsParameterInput';
import PhysicsUnitConverter from './PhysicsUnitConverter';

/**
 * Type for parameter documentation data
 */
export interface ParameterDocumentationData {
  name: string;
  label: string;
  formula?: string;
  formulaDescription?: string;
  physicalMeaning: string;
  typicalRange: {
    min: number;
    max: number;
    unit: string;
  };
  considerations: string[];
  references?: Array<{
    title: string;
    url?: string;
    description?: string;
  }>;
  relatedParameters?: string[];
  equations?: Array<{
    formula: string;
    description: string;
  }>;
  examples?: Array<{
    value: number;
    unit: string;
    description: string;
  }>;
  cautions?: string[];
  tips?: string[];
}

export interface ParameterDocumentationProps {
  parameter?: PhysicsParameter;
  documentation?: ParameterDocumentationData;
  open: boolean;
  onClose: () => void;
}

// Helper function to format range values for display
const formatRangeValue = (value: number, unit: string): string => {
  if (Math.abs(value) < 0.001 || Math.abs(value) >= 10000) {
    return `${value.toExponential(3)} ${unit}`;
  }
  const precision = Math.abs(value) < 1 ? 3 : 2;
  return `${value.toFixed(precision)} ${unit}`;
};

/**
 * Component that displays detailed documentation about a physics parameter
 * with contextual help, formulas, tips, and references
 */
const ParameterDocumentation: React.FC<ParameterDocumentationProps> = ({
  parameter,
  documentation,
  open,
  onClose
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  // Return early if no parameter or documentation is provided
  if (!parameter && !documentation) {
    return null;
  }

  // Use provided documentation or a placeholder if none exists
  const doc = documentation || {
    name: parameter?.name || 'Unknown',
    label: parameter?.label || 'Unknown Parameter',
    physicalMeaning: 'No detailed documentation available for this parameter.',
    typicalRange: {
      min: parameter?.min || 0,
      max: parameter?.max || 1,
      unit: parameter?.unit || ''
    },
    considerations: [
      'No specific considerations documented for this parameter.'
    ]
  };

  // Handle tab changes
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Get a user-friendly name for the parameter's unit
  const unitName = PhysicsUnitConverter.getUnitName(doc.typicalRange.unit);

  // Get the parameter family (temperature, pressure, etc.) if available
  const unitFamily = PhysicsUnitConverter.getUnitFamily(doc.typicalRange.unit);
  
  // Get available unit conversions if applicable
  const unitConversions = unitFamily 
    ? PhysicsUnitConverter.getAvailableUnits(unitFamily)
        .filter(u => u !== doc.typicalRange.unit)
        .map(unit => ({
          unit,
          name: PhysicsUnitConverter.getUnitName(unit),
          min: PhysicsUnitConverter.convertUnit(doc.typicalRange.min, doc.typicalRange.unit, unit),
          max: PhysicsUnitConverter.convertUnit(doc.typicalRange.max, doc.typicalRange.unit, unit)
        }))
    : [];

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      aria-labelledby="parameter-documentation-title"
    >
      <DialogTitle id="parameter-documentation-title" sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h5" component="div">
            {doc.label}
            <Typography 
              variant="subtitle1" 
              component="span" 
              color="text.secondary"
              sx={{ ml: 1 }}
            >
              ({doc.name})
            </Typography>
          </Typography>
          <IconButton
            aria-label="close"
            onClick={onClose}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <Divider />
      
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        aria-label="parameter documentation tabs"
        variant="scrollable"
        scrollButtons="auto"
        sx={{ 
          px: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: theme.palette.background.default
        }}
      >
        <Tab icon={<InfoIcon />} label="Overview" iconPosition="start" />
        <Tab icon={<CalculateIcon />} label="Technical" iconPosition="start" />
        <Tab icon={<FormulaIcon />} label="Formulas" iconPosition="start" />
        <Tab icon={<SchoolIcon />} label="References" iconPosition="start" />
        <Tab icon={<TipsAndUpdatesIcon />} label="Tips" iconPosition="start" />
      </Tabs>
      
      <DialogContent dividers sx={{ p: 3 }}>
        {/* Overview Tab */}
        {activeTab === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Physical Meaning
            </Typography>
            <Typography variant="body1" paragraph>
              {doc.physicalMeaning}
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent sx={{ pb: '16px !important' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Typical Range
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body1">
                    {formatRangeValue(doc.typicalRange.min, doc.typicalRange.unit)} to {formatRangeValue(doc.typicalRange.max, doc.typicalRange.unit)}
                  </Typography>
                  <Chip 
                    label={unitName} 
                    size="small" 
                    color="primary" 
                    variant="outlined" 
                  />
                </Box>
                
                {unitConversions.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Equivalent in other units:
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 150 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Unit</TableCell>
                            <TableCell>Min</TableCell>
                            <TableCell>Max</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {unitConversions.map((conversion) => (
                            <TableRow key={conversion.unit}>
                              <TableCell component="th" scope="row">
                                {conversion.name} ({conversion.unit})
                              </TableCell>
                              <TableCell>{formatRangeValue(conversion.min, conversion.unit)}</TableCell>
                              <TableCell>{formatRangeValue(conversion.max, conversion.unit)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </CardContent>
            </Card>
            
            {doc.examples && doc.examples.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Examples
                </Typography>
                <List sx={{ bgcolor: 'background.paper' }} disablePadding>
                  {doc.examples.map((example, index) => (
                    <ListItem key={index} divider={index < doc.examples!.length - 1}>
                      <ListItemText
                        primary={
                          <Typography variant="body1">
                            {formatRangeValue(example.value, example.unit)}
                          </Typography>
                        }
                        secondary={example.description}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
            
            {doc.considerations && doc.considerations.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Key Considerations
                </Typography>
                <List>
                  {doc.considerations.map((consideration, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={consideration} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
            
            {doc.relatedParameters && doc.relatedParameters.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Related Parameters
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {doc.relatedParameters.map((param) => (
                    <Chip
                      key={param}
                      label={param}
                      onClick={() => {}}
                      variant="outlined"
                      color="secondary"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
        
        {/* Technical Tab */}
        {activeTab === 1 && (
          <Box>
            {doc.formula && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Formula Representation
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    fontFamily: 'monospace',
                    fontSize: '1.2rem',
                    textAlign: 'center',
                    bgcolor: theme.palette.background.default
                  }}
                >
                  {doc.formula}
                </Paper>
                {doc.formulaDescription && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {doc.formulaDescription}
                  </Typography>
                )}
              </Box>
            )}
            
            {doc.cautions && doc.cautions.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <WarningIcon color="warning" sx={{ mr: 1 }} />
                  Important Cautions
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                  <List disablePadding dense>
                    {doc.cautions.map((caution, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={caution} />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Box>
            )}
            
            {parameter && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Technical Details
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell component="th" scope="row" sx={{ width: '30%' }}>
                          Parameter Name
                        </TableCell>
                        <TableCell>
                          <code>{parameter.name}</code>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          Display Label
                        </TableCell>
                        <TableCell>{parameter.label}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          Unit
                        </TableCell>
                        <TableCell>{parameter.unit} ({unitName})</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          Valid Range
                        </TableCell>
                        <TableCell>
                          {formatRangeValue(parameter.min, parameter.unit)} to {formatRangeValue(parameter.max, parameter.unit)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          Increment Step
                        </TableCell>
                        <TableCell>{formatRangeValue(parameter.step, parameter.unit)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          Default Value
                        </TableCell>
                        <TableCell>{formatRangeValue(parameter.value, parameter.unit)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}
        
        {/* Formulas Tab */}
        {activeTab === 2 && (
          <Box>
            {doc.equations && doc.equations.length > 0 ? (
              <>
                <Typography variant="h6" gutterBottom>
                  Related Equations
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {doc.equations.map((equation, index) => (
                    <Accordion key={index} disableGutters defaultExpanded={index === 0}>
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          bgcolor: theme.palette.background.default,
                          borderLeft: 4,
                          borderColor: 'primary.main'
                        }}
                      >
                        <Typography variant="subtitle1">
                          Equation {index + 1}: {equation.formula}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2">
                          {equation.description}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  p: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  color: 'text.secondary'
                }}
              >
                <ScienceIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
                <Typography variant="h6">
                  No Equations Available
                </Typography>
                <Typography variant="body2">
                  There are no detailed equations documented for this parameter yet.
                </Typography>
              </Box>
            )}
          </Box>
        )}
        
        {/* References Tab */}
        {activeTab === 3 && (
          <Box>
            {doc.references && doc.references.length > 0 ? (
              <>
                <Typography variant="h6" gutterBottom>
                  References & Further Reading
                </Typography>
                <List>
                  {doc.references.map((reference, index) => (
                    <ListItem key={index} divider={index < doc.references!.length - 1}>
                      <ListItemText
                        primary={
                          reference.url ? (
                            <Link
                              href={reference.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              underline="hover"
                            >
                              {reference.title}
                            </Link>
                          ) : (
                            reference.title
                          )
                        }
                        secondary={reference.description}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            ) : (
              <Box
                sx={{
                  p: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  color: 'text.secondary'
                }}
              >
                <MenuBookIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
                <Typography variant="h6">
                  No References Available
                </Typography>
                <Typography variant="body2">
                  There are no references documented for this parameter yet.
                </Typography>
              </Box>
            )}
          </Box>
        )}
        
        {/* Tips Tab */}
        {activeTab === 4 && (
          <Box>
            {doc.tips && doc.tips.length > 0 ? (
              <>
                <Typography variant="h6" gutterBottom>
                  Tips & Best Practices
                </Typography>
                <List>
                  {doc.tips.map((tip, index) => (
                    <ListItem key={index} sx={{ py: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <TipsAndUpdatesIcon color="info" sx={{ mr: 2, mt: 0.5 }} />
                        <ListItemText primary={tip} />
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </>
            ) : (
              <Box
                sx={{
                  p: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  color: 'text.secondary'
                }}
              >
                <TipsAndUpdatesIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
                <Typography variant="h6">
                  No Tips Available
                </Typography>
                <Typography variant="body2">
                  There are no tips or best practices documented for this parameter yet.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ParameterDocumentation; 