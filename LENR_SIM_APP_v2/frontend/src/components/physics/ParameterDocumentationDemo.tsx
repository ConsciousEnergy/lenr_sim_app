import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Divider,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  Chip
} from '@mui/material';
import ParameterHelpButton from './ParameterHelpButton';
import { ParameterDocumentationData } from './ParameterDocumentation';
import { thermalParameters, latticeParameters } from './PhysicsParameterSets';

/**
 * Demo component that showcases the parameter documentation and help features
 */
const ParameterDocumentationDemo: React.FC = () => {
  // Sample documentation data for a few parameters
  const paramDocumentation: Record<string, ParameterDocumentationData> = {
    temperature: {
      name: 'temperature',
      label: 'Temperature',
      formula: 'KE = (3/2) × k_B × T',
      formulaDescription: 'Average kinetic energy of particles is proportional to temperature',
      physicalMeaning: 'Temperature is a measure of the average kinetic energy of particles in a material. In LENR experiments, it affects both the thermal behavior of the lattice and the probability of quantum tunneling through the Coulomb barrier.',
      typicalRange: {
        min: 293,
        max: 1073,
        unit: 'K'
      },
      considerations: [
        'Higher temperatures increase atomic vibrations, which can both help and hinder fusion reactions',
        'Temperature gradients can create non-equilibrium conditions favorable for LENR',
        'Operating temperatures must account for material constraints such as melting points and phase changes'
      ],
      references: [
        {
          title: 'Temperature Effects in LENR Systems',
          url: 'https://example.com/temperature-effects',
          description: 'Comprehensive analysis of how temperature impacts LENR phenomena'
        },
        {
          title: 'Thermal Gradients and Nuclear Active Environments',
          description: 'Research paper on the role of thermal gradients in creating conditions conducive to LENR'
        }
      ],
      relatedParameters: ['pressure', 'heatCapacity', 'activationEnergy'],
      equations: [
        {
          formula: 'E_thermal = k_B × T',
          description: 'Thermal energy per degree of freedom, where k_B is the Boltzmann constant and T is temperature in Kelvin'
        },
        {
          formula: 'P_tunneling ∝ exp(-√(m) × d × √(V_b - E_thermal))',
          description: 'Simplified tunneling probability expression showing the relationship with thermal energy'
        }
      ],
      examples: [
        {
          value: 298,
          unit: 'K',
          description: 'Room temperature (25°C) - baseline condition for many experiments'
        },
        {
          value: 373,
          unit: 'K',
          description: 'Boiling point of water (100°C) - often used in electrolytic LENR experiments'
        },
        {
          value: 873,
          unit: 'K',
          description: 'High temperature (600°C) - used in gas-loading LENR experiments with nickel'
        }
      ],
      cautions: [
        'Exceeding temperature thresholds can cause irreversible damage to equipment',
        'Temperature fluctuations can introduce artifacts in measurements'
      ],
      tips: [
        'Implement gradual temperature ramps to minimize thermal stress',
        'Consider using temperature cycling to create dynamic loading/unloading conditions',
        'Measure temperature at multiple points to detect anomalous heat generation'
      ]
    },
    latticeConstant: {
      name: 'latticeConstant',
      label: 'Lattice Constant',
      formula: 'd_{hkl} = a/√(h² + k² + l²)',
      formulaDescription: 'For cubic lattices, the interplanar spacing (d) is related to the lattice constant (a) and Miller indices (hkl)',
      physicalMeaning: 'The lattice constant represents the spacing between unit cells in a crystalline material. In LENR research, it determines the proximity of atoms and influences the electron screening and quantum tunneling effects.',
      typicalRange: {
        min: 3.5,
        max: 4.2,
        unit: 'Å'
      },
      considerations: [
        'Lattice constants vary with temperature and pressure (thermal expansion/contraction)',
        'Loading with hydrogen/deuterium causes expansion of the host lattice',
        'Defects and impurities can locally alter the lattice constant'
      ],
      references: [
        {
          title: 'Crystallography and LENR',
          url: 'https://example.com/crystallography-lenr',
          description: 'Analysis of lattice structures in LENR-active materials'
        }
      ],
      relatedParameters: ['defectConcentration', 'deuteriumLoading'],
      equations: [
        {
          formula: 'a(T) = a₀(1 + α × ΔT)',
          description: 'Change in lattice constant with temperature, where α is the thermal expansion coefficient'
        }
      ],
      examples: [
        {
          value: 3.89,
          unit: 'Å',
          description: 'Palladium (FCC lattice) at room temperature'
        },
        {
          value: 3.52,
          unit: 'Å',
          description: 'Nickel (FCC lattice) at room temperature'
        }
      ],
      cautions: [
        'Different crystal structures (FCC, BCC, HCP) have different relationships between lattice constant and atomic spacing'
      ],
      tips: [
        'Use X-ray diffraction to verify the actual lattice constant in your material',
        'Consider the loading-dependent lattice expansion in calculations'
      ]
    }
  };

  // Render a parameter card with documentation
  const renderParameterCard = (parameter: any) => {
    const hasDocumentation = !!paramDocumentation[parameter.name];
    const hasWarnings = hasDocumentation && !!paramDocumentation[parameter.name].cautions?.length;

    return (
      <Card key={parameter.name} variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">
              {parameter.label}
              <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 1 }}>
                ({parameter.unit})
              </Typography>
            </Typography>
            <ParameterHelpButton
              parameter={parameter}
              documentation={paramDocumentation[parameter.name]}
              hasDocumentation={hasDocumentation}
              hasWarnings={hasWarnings}
            />
          </Box>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            {parameter.description}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`Min: ${parameter.min} ${parameter.unit}`} size="small" />
            <Chip label={`Max: ${parameter.max} ${parameter.unit}`} size="small" />
            <Chip label={`Default: ${parameter.value} ${parameter.unit}`} size="small" color="primary" />
          </Box>
        </CardContent>
        
        <CardActions>
          <TextField
            type="number"
            size="small"
            label="Value"
            defaultValue={parameter.value}
            InputProps={{ endAdornment: parameter.unit }}
            sx={{ width: 150 }}
          />
          <Button size="small" variant="outlined">Apply</Button>
        </CardActions>
      </Card>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Parameter Documentation Demo
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        This demo showcases the contextual help and documentation features for physics parameters.
        Click on the help icons to view detailed parameter documentation.
      </Typography>

      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Available Parameter Documentation
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <List dense>
          <ListItem>
            <ListItemText
              primary="Temperature"
              secondary="Comprehensive documentation with examples, formulas, and tips"
            />
            <ListItemSecondaryAction>
              <ParameterHelpButton
                parameter={thermalParameters[0]}
                documentation={paramDocumentation.temperature}
                hasDocumentation={true}
                hasWarnings={true}
              />
            </ListItemSecondaryAction>
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Lattice Constant"
              secondary="Documentation with crystallographic information"
            />
            <ListItemSecondaryAction>
              <ParameterHelpButton
                parameter={latticeParameters[0]}
                documentation={paramDocumentation.latticeConstant}
                hasDocumentation={true}
              />
            </ListItemSecondaryAction>
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Pressure"
              secondary="Basic help information only"
            />
            <ListItemSecondaryAction>
              <ParameterHelpButton
                parameter={thermalParameters[1]}
                hasDocumentation={false}
              />
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Thermal Parameters
          </Typography>
          {thermalParameters.slice(0, 2).map(renderParameterCard)}
        </Box>
        <Box>
          <Typography variant="h6" gutterBottom>
            Lattice Parameters
          </Typography>
          {latticeParameters.slice(0, 2).map(renderParameterCard)}
        </Box>
      </Box>
      
      <Paper elevation={1} sx={{ p: 3, mt: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          Integration Notes:
        </Typography>
        <Typography variant="body2" paragraph>
          • The ParameterHelpButton can be added to any component that displays physics parameters
        </Typography>
        <Typography variant="body2" paragraph>
          • Documentation data can be loaded from a central repository or database
        </Typography>
        <Typography variant="body2" paragraph>
          • The help system supports markdown formatting for complex content including formulas
        </Typography>
        <Typography variant="body2" paragraph>
          • Help content can be contextualized based on the current simulation settings
        </Typography>
      </Paper>
    </Container>
  );
};

export default ParameterDocumentationDemo; 