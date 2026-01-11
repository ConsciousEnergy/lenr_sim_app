
import { Box, Container, Paper, Typography, Breadcrumbs, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import CustomReactionManager from '../components/reactions/CustomReactionManager';

const CustomReactionsContainer = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary">Custom Reactions</Typography>
        </Breadcrumbs>
      </Paper>
      
      <Paper sx={{ p: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Custom Fusion Reactions Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create, edit, and manage your custom fusion reactions for simulation.
          </Typography>
        </Box>
        
        <CustomReactionManager />
      </Paper>
    </Container>
  );
};

export default CustomReactionsContainer; 