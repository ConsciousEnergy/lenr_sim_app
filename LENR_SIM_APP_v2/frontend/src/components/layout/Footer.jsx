import React from 'react';
import { Box, Container, Typography, Link, Divider } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import LanguageIcon from '@mui/icons-material/Language';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <Box 
      component="footer" 
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: (theme) => theme.palette.mode === 'light' 
          ? theme.palette.grey[200] 
          : theme.palette.grey[800],
        position: 'relative',
        zIndex: 10,
        marginTop: 3
      }}
    >
      <Container maxWidth="lg">
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" align="center">
            © {currentYear} Conscious Energy | LENR Simulation App
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mt: { xs: 2, md: 0 } }}>
            <Link href="https://www.conscious.energy" target="_blank" rel="noopener" color="text.secondary" underline="hover" sx={{ display: 'flex', alignItems: 'center' }}>
              <LanguageIcon fontSize="small" sx={{ mr: 0.5 }} />
              Website
            </Link>
            <Link href="https://github.com/ConsciousEnergy/lenr_sim_app" target="_blank" rel="noopener" color="text.secondary" underline="hover" sx={{ display: 'flex', alignItems: 'center' }}>
              <GitHubIcon fontSize="small" sx={{ mr: 0.5 }} />
              GitHub
            </Link>
            <Link href="#" color="text.secondary" underline="hover">
              Documentation
            </Link>
          </Box>
          
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: { xs: 2, md: 0 } }}>
            Version 2.0.0
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer; 