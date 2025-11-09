import { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper,
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  ViewList as ViewListIcon
} from '@mui/icons-material';

import ReactionDesigner from '../components/reactions/ReactionDesigner';
import CustomReactionManager from '../components/reactions/CustomReactionManager';

/**
 * Reaction Designer Container Component
 * 
 * This container provides access to both the visual reaction builder and
 * the traditional list-based reaction manager with tabs to switch between them.
 * 
 * @returns {JSX.Element} ReactionDesignerContainer component
 */
const ReactionDesignerContainer = () => {
  // UI state
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [activeView, setActiveView] = useState('visual');
  const [currentReaction, setCurrentReaction] = useState(null);
  
  // Open designer for creating a new reaction
  const handleOpenCreate = () => {
    setCurrentReaction(null);
    setIsDesignerOpen(true);
  };
  
  // Open designer for editing an existing reaction
  const handleOpenEdit = (reaction) => {
    setCurrentReaction(reaction);
    setIsDesignerOpen(true);
  };
  
  // Handle saving a reaction
  const handleSaveReaction = (savedReaction) => {
    // Here we could update a local reactions list if needed
    // For now, we'll just close the designer
    setIsDesignerOpen(false);
  };
  
  // Render a featured reaction card
  const renderFeaturedReactionCard = (title, description, imageSrc, onClick) => (
    <Card sx={{ maxWidth: 345, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardMedia
        component="img"
        height="140"
        image={imageSrc || '/assets/reaction-placeholder.jpg'}
        alt={title}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h5" component="div">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
      <CardActions>
        <Button size="small" onClick={onClick}>Use Template</Button>
      </CardActions>
    </Card>
  );
  
  // Render the visual design hero section
  const renderVisualDesignSection = () => (
    <Box sx={{ mt: 4, mb: 6 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" gutterBottom>
              Visual Reaction Builder
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Design, test, and visualize custom fusion reactions with our intuitive
              drag-and-drop interface. See real-time feedback on reaction balance,
              energy distribution, and more.
            </Typography>
            <Button 
              variant="contained" 
              size="large" 
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
              sx={{ mt: 2 }}
            >
              Create New Reaction
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<ViewListIcon />}
              onClick={() => setActiveView('list')}
              sx={{ mt: 2, ml: 2 }}
            >
              View All Reactions
            </Button>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              backgroundImage: 'linear-gradient(135deg, #1976d2 0%, #9c27b0 100%)',
              color: 'white',
              borderRadius: 2
            }}
          >
            <Typography variant="h5" gutterBottom>
              Why use the Visual Builder?
            </Typography>
            <Typography variant="body1" paragraph>
              • Intuitive drag-and-drop interface
            </Typography>
            <Typography variant="body1" paragraph>
              • Real-time validation and feedback
            </Typography>
            <Typography variant="body1" paragraph>
              • Interactive testing and visualization
            </Typography>
            <Typography variant="body1" paragraph>
              • Physics insights and educational tooltips
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
  
  // Render featured reaction templates
  const renderFeaturedReactions = () => (
    <Box sx={{ my: 6 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Featured Reaction Templates
      </Typography>
      <Grid container spacing={4}>
        <Grid item xs={12} sm={6} md={4}>
          {renderFeaturedReactionCard(
            'Deuterium-Deuterium (D-D)',
            'A common fusion reaction that powers many experimental reactors. Produces helium-3, tritium, protons and neutrons.',
            '/assets/dd-fusion.jpg',
            () => handleOpenCreate('deuteriumDeuterium')
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          {renderFeaturedReactionCard(
            'Deuterium-Tritium (D-T)',
            'The easiest fusion reaction to achieve, with the highest energy yield. Used in most major fusion experiments.',
            '/assets/dt-fusion.jpg',
            () => handleOpenCreate('deuteriumTritium')
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          {renderFeaturedReactionCard(
            'Proton-Boron (p-B11)',
            'An aneutronic fusion reaction that produces primarily alpha particles. Cleaner than D-T but requires higher temperatures.',
            '/assets/pb11-fusion.jpg',
            () => handleOpenCreate('protonBoron')
          )}
        </Grid>
      </Grid>
    </Box>
  );
  
  return (
    <Container maxWidth="xl">
      {activeView === 'visual' ? (
        <>
          {renderVisualDesignSection()}
          {renderFeaturedReactions()}
        </>
      ) : (
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4">
              Custom Reactions Manager
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => setActiveView('visual')}
              startIcon={<EditIcon />}
            >
              Switch to Visual Builder
            </Button>
          </Box>
          <CustomReactionManager />
        </Box>
      )}
      
      <ReactionDesigner
        open={isDesignerOpen}
        initialReaction={currentReaction}
        onSave={handleSaveReaction}
        onClose={() => setIsDesignerOpen(false)}
      />
    </Container>
  );
};

export default ReactionDesignerContainer; 