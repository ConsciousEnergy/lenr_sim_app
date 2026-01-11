import React, { useState } from 'react';
import {
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Box,
  Chip,
  Paper,
  Grid,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  HelpOutline,
  Info,
  Lightbulb,
  Check
} from '@mui/icons-material';
import { getHelpContent, HelpContent, TooltipContent } from './AdvancedControlHelpers';

export interface AdvancedControlHelpButtonProps {
  controlType: 'physicsModel' | 'speed' | 'ensemble' | 'snapshot';
  size?: 'small' | 'medium';
  color?: string;
  buttonVariant?: 'icon' | 'text' | 'chip';
}

/**
 * A button component that displays detailed help about advanced simulation controls
 */
const AdvancedControlHelpButton: React.FC<AdvancedControlHelpButtonProps> = ({
  controlType,
  size = 'small',
  color,
  buttonVariant = 'icon'
}) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Get the documentation content for this control type
  const helpContent = getHelpContent(controlType);
  
  const handleOpen = () => {
    setOpen(true);
  };
  
  const handleClose = () => {
    setOpen(false);
  };
  
  // Render the help button based on the variant
  const renderHelpButton = () => {
    switch (buttonVariant) {
      case 'icon':
        return (
          <Tooltip title={`Help: ${helpContent.title}`}>
            <IconButton 
              onClick={handleOpen} 
              size={size}
              color={color as any || "info"}
            >
              <HelpOutline />
            </IconButton>
          </Tooltip>
        );
      
      case 'text':
        return (
          <Button
            onClick={handleOpen}
            startIcon={<HelpOutline />}
            size={size}
            color={color as any || "info"}
            variant="text"
          >
            Help
          </Button>
        );
      
      case 'chip':
        return (
          <Chip
            icon={<HelpOutline />}
            label="Help"
            onClick={handleOpen}
            color={color as any || "info"}
            size={size}
            variant="outlined"
          />
        );
      
      default:
        return (
          <IconButton onClick={handleOpen} size={size} color={color as any || "info"}>
            <HelpOutline />
          </IconButton>
        );
    }
  };
  
  // Render the dialog with help content
  return (
    <>
      {renderHelpButton()}
      
      <Dialog
        open={open}
        onClose={handleClose}
        fullScreen={fullScreen}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {helpContent.title}
        </DialogTitle>
        
        <DialogContent dividers>
          {/* Description */}
          <Typography variant="subtitle1" gutterBottom>
            {helpContent.description}
          </Typography>
          
          {/* Tips Section */}
          {helpContent.tips && helpContent.tips.length > 0 && (
            <Paper
              variant="outlined"
              sx={{ 
                p: 2,
                mt: 2,
                mb: 3,
                bgcolor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'rgba(0, 0, 0, 0.02)'
              }}
            >
              <Box display="flex" alignItems="center" mb={1}>
                <Lightbulb color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Tips
                </Typography>
              </Box>
              
              <List dense>
                {helpContent.tips.map((tip, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={tip} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
          
          {/* Content Sections */}
          <Grid container spacing={3}>
            {helpContent.sections.map((section, index) => (
              <Grid key={index} sx={{ gridColumn: 'span 12' }}>
                <Typography variant="h6" gutterBottom>
                  {section.title}
                </Typography>
                
                <Typography paragraph>
                  {section.content}
                </Typography>
                
                {section.examples && section.examples.length > 0 && (
                  <Box pl={2} mb={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Examples:
                    </Typography>
                    
                    <List dense>
                      {section.examples.map((example, exIndex) => (
                        <ListItem key={exIndex}>
                          <Check color="success" fontSize="small" sx={{ mr: 1 }} />
                          <ListItemText primary={example} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
                
                {index < helpContent.sections.length - 1 && (
                  <Divider sx={{ my: 2 }} />
                )}
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} autoFocus>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AdvancedControlHelpButton; 