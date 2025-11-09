import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Divider,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch
} from '@mui/material';
import ParameterGrouping, { ParameterGroup, ParameterGroupLayout } from './ParameterGrouping';
import { 
  thermalParameters, 
  latticeParameters, 
  quantumParameters, 
  energyParameters 
} from './PhysicsParameterSets';

/**
 * Demonstrates the parameter grouping component with different layout options
 */
const ParameterGroupingDemo: React.FC = () => {
  // Defines parameter groups
  const [groups, setGroups] = useState<ParameterGroup[]>([
    {
      id: 'thermal',
      title: 'Thermal Parameters',
      description: 'Parameters related to temperature and heat transfer',
      parameters: [...thermalParameters],
      expanded: true,
      tags: ['Core', 'Physical']
    },
    {
      id: 'lattice',
      title: 'Lattice Structure',
      description: 'Crystalline lattice parameters for the metal substrate',
      parameters: [...latticeParameters],
      expanded: true,
      tags: ['Material', 'Structure']
    },
    {
      id: 'quantum',
      title: 'Quantum Effects',
      description: 'Parameters governing quantum mechanical behavior',
      parameters: [...quantumParameters],
      expanded: false,
      tags: ['Advanced', 'Quantum']
    },
    {
      id: 'energy',
      title: 'Energy Parameters',
      description: 'Energy-related parameters for reactions',
      parameters: [...energyParameters],
      expanded: false,
      tags: ['Core', 'Energy']
    }
  ]);

  // UI control state
  const [defaultLayout, setDefaultLayout] = useState<ParameterGroupLayout>('grid');
  const [isDraggable, setIsDraggable] = useState<boolean>(false);
  const [showTags, setShowTags] = useState<boolean>(true);
  const [elevation, setElevation] = useState<number>(1);

  // Handle parameter changes
  const handleParameterChange = (groupId: string, paramName: string, value: number, unit?: string) => {
    setGroups(prev => 
      prev.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            parameters: group.parameters.map(param => {
              if (param.name === paramName) {
                return {
                  ...param,
                  value,
                  unit: unit || param.unit
                };
              }
              return param;
            })
          };
        }
        return group;
      })
    );
  };

  // Handle group expansion toggle
  const handleGroupToggle = (groupId: string, expanded: boolean) => {
    setGroups(prev => 
      prev.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            expanded
          };
        }
        return group;
      })
    );
  };

  // Handle group layout change
  const handleLayoutChange = (groupId: string, layout: ParameterGroupLayout) => {
    setGroups(prev => 
      prev.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            layout
          };
        }
        return group;
      })
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Parameter Grouping Demo
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        This demo showcases the flexible parameter grouping component with different layout options.
        Each group can be expanded/collapsed and parameters can be displayed in different layouts.
      </Typography>

      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Display Options
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Default Layout</FormLabel>
            <RadioGroup
              row
              value={defaultLayout}
              onChange={(e) => setDefaultLayout(e.target.value as ParameterGroupLayout)}
            >
              <FormControlLabel 
                value="grid" 
                control={<Radio />} 
                label="Grid" 
              />
              <FormControlLabel 
                value="stack" 
                control={<Radio />} 
                label="Stack" 
              />
              <FormControlLabel 
                value="compact" 
                control={<Radio />} 
                label="Compact" 
              />
            </RadioGroup>
          </FormControl>

          <Box>
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <FormLabel component="legend">Options</FormLabel>
              <Box sx={{ display: 'flex', flexDirection: 'column', mt: 1 }}>
                <FormControlLabel 
                  control={
                    <Switch 
                      checked={isDraggable} 
                      onChange={(e) => setIsDraggable(e.target.checked)} 
                    />
                  } 
                  label="Show Drag Handles" 
                />
                <FormControlLabel 
                  control={
                    <Switch 
                      checked={showTags} 
                      onChange={(e) => setShowTags(e.target.checked)} 
                    />
                  } 
                  label="Show Tags" 
                />
              </Box>
            </FormControl>
          </Box>

          <FormControl component="fieldset">
            <FormLabel component="legend">Elevation</FormLabel>
            <RadioGroup
              row
              value={elevation.toString()}
              onChange={(e) => setElevation(parseInt(e.target.value))}
            >
              <FormControlLabel 
                value="0" 
                control={<Radio />} 
                label="None" 
              />
              <FormControlLabel 
                value="1" 
                control={<Radio />} 
                label="Low" 
              />
              <FormControlLabel 
                value="3" 
                control={<Radio />} 
                label="Medium" 
              />
              <FormControlLabel 
                value="6" 
                control={<Radio />} 
                label="High" 
              />
            </RadioGroup>
          </FormControl>
        </Box>
      </Paper>

      <Box sx={{ mt: 4 }}>
        <ParameterGrouping
          groups={groups}
          onParameterChange={handleParameterChange}
          onGroupToggle={handleGroupToggle}
          onLayoutChange={handleLayoutChange}
          defaultLayout={defaultLayout}
          elevation={elevation}
          isDraggable={isDraggable}
          showTags={showTags}
        />
      </Box>

      <Paper elevation={1} sx={{ p: 3, mt: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          Usage Notes:
        </Typography>
        <Typography variant="body2" paragraph>
          • Click on the panel headers to expand/collapse groups
        </Typography>
        <Typography variant="body2" paragraph>
          • Click the menu icon (⋮) in the top-right of each group to change its layout
        </Typography>
        <Typography variant="body2" paragraph>
          • Change values in the input fields to see how they update
        </Typography>
        <Typography variant="body2" paragraph>
          • Try changing the units for parameters that support unit conversion
        </Typography>
      </Paper>
    </Container>
  );
};

export default ParameterGroupingDemo; 