import React from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  Divider, 
  Tooltip, 
  IconButton, 
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import { PhysicsParameter, PhysicsParameterInput } from './PhysicsParameterInput';
import ParameterHelpButton from './ParameterHelpButton';
import { ParameterDocumentationData } from './ParameterDocumentation';

export interface PhysicsParameterGroupProps {
  title: string;
  description?: string;
  parameters: PhysicsParameter[];
  onChange: (name: string, value: number) => void;
  documentation?: ParameterDocumentationData;
  defaultExpanded?: boolean;
  layout?: 'grid' | 'stacked';
}

/**
 * Enhanced group of related physics parameters with documentation support
 */
const PhysicsParameterGroup: React.FC<PhysicsParameterGroupProps> = ({
  title,
  description,
  parameters,
  onChange,
  documentation,
  defaultExpanded = true,
  layout = 'stacked'
}) => {
  return (
    <Accordion defaultExpanded={defaultExpanded} sx={{ mb: 2 }}>
      <AccordionSummary 
        expandIcon={<ExpandMoreIcon />}
        sx={{ 
          borderBottom: '1px solid',
          borderColor: 'divider',
          '&.Mui-expanded': { minHeight: 'auto' }
        }}
      >
        <Box display="flex" alignItems="center" width="100%">
          <Typography variant="h6">{title}</Typography>
          
          {documentation && (
            <Box sx={{ ml: 1 }}>
              <ParameterHelpButton
                documentation={documentation}
                hasDocumentation={true}
                size="small"
              />
            </Box>
          )}
          
          {!documentation && description && (
            <Tooltip title={description}>
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </AccordionSummary>
      
      <AccordionDetails sx={{ pt: 2 }}>
        {description && !documentation && (
          <>
            <Typography variant="body2" color="text.secondary" paragraph>
              {description}
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </>
        )}
        
        {layout === 'grid' ? (
          <Grid container spacing={2}>
            {parameters.map((param) => (
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }} key={param.name}>
                <PhysicsParameterInput
                  parameter={param}
                  onChange={onChange}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box>
            {parameters.map((param) => (
              <PhysicsParameterInput
                key={param.name}
                parameter={param}
                onChange={onChange}
              />
            ))}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default PhysicsParameterGroup; 