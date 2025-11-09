import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  useTheme,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Speed,
  Science,
  BatchPrediction,
  History,
  HelpOutline,
  ChevronRight,
  Info,
  Close
} from '@mui/icons-material';

import { 
  physicsModelSelectionDocs,
  simulationSpeedDocs,
  ensembleRunDocs,
  snapshotSystemDocs
} from './AdvancedControlHelpers';
import AdvancedControlHelpButton from './AdvancedControlHelpButton';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

/**
 * A tabbed panel component for the help content
 */
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`control-help-tabpanel-${index}`}
      aria-labelledby={`control-help-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `control-help-tab-${index}`,
    'aria-controls': `control-help-tabpanel-${index}`,
  };
}

/**
 * Topics for the side navigation
 */
const helpTopics = [
  { 
    id: 'overview', 
    title: 'Overview', 
    icon: <Info /> 
  },
  { 
    id: 'physics-model', 
    title: 'Physics Model Selection', 
    icon: <Science />,
    controlType: 'physicsModel'
  },
  { 
    id: 'speed', 
    title: 'Simulation Speed Controls', 
    icon: <Speed />,
    controlType: 'speed'
  },
  { 
    id: 'ensemble', 
    title: 'Ensemble Run Configuration', 
    icon: <BatchPrediction />,
    controlType: 'ensemble'
  },
  { 
    id: 'snapshot', 
    title: 'Simulation Snapshot System', 
    icon: <History />,
    controlType: 'snapshot'
  }
];

/**
 * Main Advanced Control Help component
 * 
 * This component provides access to all advanced control documentation
 * through multiple navigation methods: tabs, sidebar, and content links.
 */
const AdvancedControlHelp: React.FC<{
  isDialog?: boolean;
  onClose?: () => void;
}> = ({ isDialog = false, onClose }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [activeTopic, setActiveTopic] = useState('overview');

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    // Map tab index to topic ID
    setActiveTopic(helpTopics[newValue].id);
  };

  // Handle topic selection from sidebar
  const handleTopicSelect = (topicId: string) => {
    setActiveTopic(topicId);
    // Find the index of the topic to set the active tab
    const tabIndex = helpTopics.findIndex(topic => topic.id === topicId);
    if (tabIndex >= 0) {
      setActiveTab(tabIndex);
    }
  };

  // Render content for a specific topic
  const renderTopicContent = (topicId: string) => {
    switch (topicId) {
      case 'overview':
        return (
          <Box>
            <Typography variant="h5" gutterBottom>
              Advanced Simulation Controls
            </Typography>
            <Typography variant="body1" paragraph>
              This documentation provides detailed information about the advanced controls
              available in the LENR Simulation application. Use the tabs or sidebar to 
              navigate between different topics.
            </Typography>
            
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Available Control Systems
            </Typography>
            
            <List>
              {helpTopics.slice(1).map(topic => (
                <ListItem 
                  key={topic.id}
                  onClick={() => handleTopicSelect(topic.id)}
                  sx={{ 
                    borderRadius: 1,
                    mb: 1,
                    cursor: 'pointer',
                    '&:hover': { 
                      bgcolor: theme.palette.mode === 'dark' 
                        ? 'rgba(255,255,255,0.08)' 
                        : 'rgba(0,0,0,0.04)' 
                    } 
                  }}
                >
                  <ListItemIcon>{topic.icon}</ListItemIcon>
                  <ListItemText 
                    primary={topic.title}
                  />
                  <ChevronRight />
                </ListItem>
              ))}
            </List>
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h6" gutterBottom>
              Accessing Help From Controls
            </Typography>
            <Typography variant="body1" paragraph>
              Each advanced control section includes help buttons that provide context-specific 
              documentation. Look for the <HelpOutline fontSize="small" /> icon in the interface 
              for immediate assistance with specific controls.
            </Typography>
          </Box>
        );
      case 'physics-model':
      case 'speed':
      case 'ensemble':
      case 'snapshot':
        // Find the topic object
        const topic = helpTopics.find(t => t.id === topicId);
        if (topic?.controlType) {
          // Get the docs content based on controlType
          let helpContent;
          switch (topic.controlType) {
            case 'physicsModel':
              helpContent = physicsModelSelectionDocs;
              break;
            case 'speed':
              helpContent = simulationSpeedDocs;
              break;
            case 'ensemble':
              helpContent = ensembleRunDocs;
              break;
            case 'snapshot':
              helpContent = snapshotSystemDocs;
              break;
          }

          if (helpContent) {
            return (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ mr: 2 }}>{topic.icon}</Box>
                  <Typography variant="h5">{helpContent.title}</Typography>
                </Box>
                
                <Typography variant="subtitle1" paragraph>
                  {helpContent.description}
                </Typography>
                
                {/* Tips Section */}
                {helpContent.tips && helpContent.tips.length > 0 && (
                  <Paper
                    variant="outlined"
                    sx={{ 
                      p: 2,
                      my: 2,
                      bgcolor: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.05)' 
                        : 'rgba(0, 0, 0, 0.02)'
                    }}
                  >
                    <Typography variant="h6" gutterBottom>Tips</Typography>
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
                {helpContent.sections.map((section, index) => (
                  <Box key={index} sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      {section.title}
                    </Typography>
                    
                    <Typography paragraph>
                      {section.content}
                    </Typography>
                    
                    {section.examples && section.examples.length > 0 && (
                      <Box sx={{ ml: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Examples:
                        </Typography>
                        
                        <List dense>
                          {section.examples.map((example, exIndex) => (
                            <ListItem key={exIndex}>
                              <ListItemText primary={example} />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            );
          }
        }
        return <Typography>No content available for this topic.</Typography>;
      default:
        return <Typography>Select a topic from the sidebar.</Typography>;
    }
  };

  const content = (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' },
        height: isDialog ? '70vh' : '100%',
        overflow: 'hidden'
      }}
    >
      {/* Side Navigation for larger screens */}
      <Box 
        sx={{ 
          width: { xs: '100%', md: 250 }, 
          display: { xs: 'none', md: 'block' },
          borderRight: `1px solid ${theme.palette.divider}`,
          overflowY: 'auto'
        }}
      >
        <List component="nav">
          {helpTopics.map((topic) => (
            <ListItem 
              key={topic.id}
              onClick={() => handleTopicSelect(topic.id)}
              sx={{ 
                borderRadius: 0,
                cursor: 'pointer',
                borderLeft: activeTopic === topic.id 
                  ? `4px solid ${theme.palette.primary.main}` 
                  : '4px solid transparent',
                bgcolor: activeTopic === topic.id 
                  ? theme.palette.action.selected 
                  : 'transparent'
              }}
            >
              <ListItemIcon>{topic.icon}</ListItemIcon>
              <ListItemText primary={topic.title} />
            </ListItem>
          ))}
        </List>
      </Box>
      
      {/* Main Content Area */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Tabs for small screens */}
        <Box sx={{ display: { xs: 'block', md: 'none' }, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="help documentation tabs"
          >
            {helpTopics.map((topic, index) => (
              <Tab 
                key={topic.id}
                icon={topic.icon} 
                label={topic.title} 
                {...a11yProps(index)} 
              />
            ))}
          </Tabs>
        </Box>
        
        {/* Content Area */}
        <Box 
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto',
            px: { xs: 2, md: 4 },
            py: 3
          }}
        >
          {renderTopicContent(activeTopic)}
        </Box>
      </Box>
    </Box>
  );

  if (isDialog) {
    return (
      <Dialog
        open={true}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        sx={{ '& .MuiDialog-paper': { height: '80vh' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            <HelpOutline fontSize="small" sx={{ mr: 1, verticalAlign: 'text-top' }} />
            Advanced Simulation Controls Help
          </Typography>
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {content}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return content;
};

/**
 * A button that opens the advanced control help in a dialog
 */
export const AdvancedControlHelpDialog: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="View complete documentation for advanced controls">
        <Button 
          startIcon={<HelpOutline />} 
          variant="outlined" 
          onClick={() => setOpen(true)}
        >
          Advanced Controls Help
        </Button>
      </Tooltip>
      
      {open && (
        <AdvancedControlHelp 
          isDialog={true} 
          onClose={() => setOpen(false)} 
        />
      )}
    </>
  );
};

export { AdvancedControlHelpButton };
export default AdvancedControlHelp; 