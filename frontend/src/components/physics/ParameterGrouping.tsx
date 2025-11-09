import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Chip,
  Stack
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { PhysicsParameter } from './PhysicsParameterInput';
import UnitConverterField from './UnitConverterField';

export type ParameterGroupLayout = 'grid' | 'stack' | 'compact';

export interface ParameterGroup {
  id: string;
  title: string;
  description?: string;
  parameters: PhysicsParameter[];
  expanded?: boolean;
  layout?: ParameterGroupLayout;
  tags?: string[];
}

export interface ParameterGroupingProps {
  groups: ParameterGroup[];
  onParameterChange?: (groupId: string, paramName: string, value: number, unit?: string) => void;
  onGroupToggle?: (groupId: string, expanded: boolean) => void;
  onLayoutChange?: (groupId: string, layout: ParameterGroupLayout) => void;
  defaultLayout?: ParameterGroupLayout;
  elevation?: number;
  isDraggable?: boolean;
  showTags?: boolean;
}

/**
 * Component for grouping parameters into collapsible, themed sections
 * with various layout options
 */
const ParameterGrouping: React.FC<ParameterGroupingProps> = ({
  groups,
  onParameterChange,
  onGroupToggle,
  onLayoutChange,
  defaultLayout = 'grid',
  elevation = 1,
  isDraggable = false,
  showTags = true
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.map(group => [group.id, group.expanded !== false]))
  );

  const [groupLayouts, setGroupLayouts] = useState<Record<string, ParameterGroupLayout>>(
    Object.fromEntries(groups.map(group => [group.id, group.layout || defaultLayout]))
  );

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // Handle accordion toggle
  const handleToggle = (groupId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: isExpanded
    }));
    
    if (onGroupToggle) {
      onGroupToggle(groupId, isExpanded);
    }
  };

  // Handle parameter value change
  const handleParamChange = (groupId: string, paramName: string) => (value: number, unit?: string) => {
    if (onParameterChange) {
      onParameterChange(groupId, paramName, value, unit);
    }
  };

  // Handle menu opening
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, groupId: string) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setActiveGroupId(groupId);
  };

  // Handle menu closing
  const handleMenuClose = () => {
    setMenuAnchor(null);
    setActiveGroupId(null);
  };

  // Handle layout change
  const handleLayoutChange = (layout: ParameterGroupLayout) => {
    if (activeGroupId) {
      setGroupLayouts(prev => ({
        ...prev,
        [activeGroupId]: layout
      }));
      
      if (onLayoutChange) {
        onLayoutChange(activeGroupId, layout);
      }
    }
    handleMenuClose();
  };

  // Render parameters according to chosen layout
  const renderParameters = (parameters: PhysicsParameter[], groupId: string, layout: ParameterGroupLayout) => {
    switch (layout) {
      case 'grid':
        return (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
            {parameters.map(param => (
              <Box key={param.name}>
                <UnitConverterField
                  label={param.label}
                  value={param.value}
                  unit={param.unit}
                  onChange={handleParamChange(groupId, param.name)}
                  helperText={param.description}
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  fullWidth
                />
              </Box>
            ))}
          </Box>
        );
      
      case 'stack':
        return (
          <Stack spacing={2}>
            {parameters.map(param => (
              <UnitConverterField
                key={param.name}
                label={param.label}
                value={param.value}
                unit={param.unit}
                onChange={handleParamChange(groupId, param.name)}
                helperText={param.description}
                min={param.min}
                max={param.max}
                step={param.step}
                fullWidth
              />
            ))}
          </Stack>
        );
      
      case 'compact':
        return (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 1 }}>
            {parameters.map(param => (
              <Box key={param.name}>
                <UnitConverterField
                  label={param.label}
                  value={param.value}
                  unit={param.unit}
                  onChange={handleParamChange(groupId, param.name)}
                  helperText={param.description}
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  size="small"
                  fullWidth
                />
              </Box>
            ))}
          </Box>
        );
        
      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {groups.map(group => (
        <Accordion
          key={group.id}
          expanded={expandedGroups[group.id] ?? true}
          onChange={handleToggle(group.id)}
          TransitionProps={{ unmountOnExit: true }}
          elevation={elevation}
          sx={{ mb: 2 }}
        >
          <AccordionSummary 
            expandIcon={<ExpandMoreIcon />}
            sx={{ 
              borderLeft: 4, 
              borderColor: 'primary.main',
              '&.Mui-expanded': {
                borderBottom: '1px solid',
                borderColor: 'divider',
              }
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              width: '100%',
              mr: 2
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {isDraggable && (
                  <DragIndicatorIcon 
                    sx={{ 
                      cursor: 'grab', 
                      mr: 1,
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'text.primary'
                      }
                    }} 
                  />
                )}
                <Typography variant="subtitle1" component="div">
                  {group.title}
                </Typography>
                
                {group.description && (
                  <Tooltip title={group.description}>
                    <InfoIcon fontSize="small" sx={{ ml: 1, color: 'action.active' }} />
                  </Tooltip>
                )}
              </Box>
              
              <Box>
                {showTags && group.tags && group.tags.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, mr: 2 }}>
                    {group.tags.map(tag => (
                      <Chip 
                        key={tag} 
                        label={tag} 
                        size="small" 
                        variant="outlined"
                        sx={{ height: 20 }} 
                      />
                    ))}
                  </Box>
                )}
                
                <IconButton 
                  size="small" 
                  onClick={(e) => handleMenuOpen(e, group.id)}
                  sx={{ ml: 'auto' }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </AccordionSummary>
          
          <AccordionDetails sx={{ pt: 3 }}>
            {renderParameters(group.parameters, group.id, groupLayouts[group.id] || defaultLayout)}
          </AccordionDetails>
        </Accordion>
      ))}
      
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem disabled>
          <Typography variant="body2" color="text.secondary">
            Layout Options
          </Typography>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleLayoutChange('grid')}>
          Grid Layout (Default)
        </MenuItem>
        <MenuItem onClick={() => handleLayoutChange('stack')}>
          Stack Layout (Vertical)
        </MenuItem>
        <MenuItem onClick={() => handleLayoutChange('compact')}>
          Compact Layout
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ParameterGrouping; 