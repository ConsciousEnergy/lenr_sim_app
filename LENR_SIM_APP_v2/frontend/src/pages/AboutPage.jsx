import React from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Divider, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Link, 
  Button 
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import CodeIcon from '@mui/icons-material/Code';
import WarningIcon from '@mui/icons-material/Warning';
import GitHubIcon from '@mui/icons-material/GitHub';
import SchoolIcon from '@mui/icons-material/School';
import PublicIcon from '@mui/icons-material/Public';
import BusinessIcon from '@mui/icons-material/Business';

const AboutPage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          borderRadius: 2
        }}
      >
        <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold', mb: 3 }}>
          About LENR Simulation App
        </Typography>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            Overview
          </Typography>
          <Typography variant="body1" paragraph>
            The LENR Simulation App is an open-source comparative scientific workbench developed by <Link href="https://www.conscious.energy" target="_blank" rel="noopener noreferrer">Conscious Energy</Link>. LENR/CMNS refers to a class of reported anomalous thermal, nuclear and isotopic observations in hydrogen-loaded condensed-matter systems. The interpretation, reproducibility and underlying mechanism of these observations remain disputed.
          </Typography>
          <Typography variant="body1" paragraph>
            LENR-Sim helps researchers instantiate competing theories under shared experiment conditions, compare predicted signatures against Model&nbsp;0 established-physics baselines, and inspect falsifiers — rather than asserting that any single mechanism is proven. Potential energy applications have been proposed if reported effects can be demonstrated reproducibly and engineered reliably.
          </Typography>
          <Typography variant="body1" paragraph>
            Crawler-readable model pages (no JavaScript required) are published at <Link href="/models/">/models/</Link>. Licensed under <strong>GNU GPL-3.0</strong>, this project is freely available for anyone to use, study, modify, and distribute.
          </Typography>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            Project Features
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <ScienceIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Interactive Simulations" 
                secondary="Run detailed simulations of various LENR phenomena with adjustable parameters to explore different conditions and outcomes."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CodeIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Modern Technology Stack" 
                secondary="Built with React, Python, FastAPI, and scientific computing libraries to provide a responsive and powerful simulation environment."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SchoolIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Educational Resources" 
                secondary="Access educational materials and references to understand the theoretical foundations of LENR phenomena."
              />
            </ListItem>
          </List>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            Technology Stack
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Frontend:</Typography>
              <Typography variant="body2">React, Material-UI, Three.js</Typography>
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Backend:</Typography>
              <Typography variant="body2">Python, FastAPI, NumPy, SciPy, SymPy, PyVista</Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <WarningIcon color="warning" sx={{ mr: 1 }} />
            Disclaimer
          </Typography>
          <Typography variant="body2" paragraph>
            This software is for educational and research use. Numbers in the app are
            <strong> model outputs</strong>, not laboratory measurements. They do not prove
            that LENR occurs. Miles-style heat–helium correlation is claim-tier EMP, not nuclear
            confirmation. <code>lenr_proved</code> remains false. The five open obligations
            (EQ-OPEN-MEV-01, RAD-01, RATE-01, EC-01, YIELD-01) stay OPEN. Enhancement values
            at 10⁵ are a governance ceiling, not a measured tunneling factor.
          </Typography>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <BusinessIcon color="primary" sx={{ mr: 1 }} />
            About Conscious Energy
          </Typography>
          <Typography variant="body1" paragraph>
            Conscious Energy is dedicated to researching and developing innovative solutions in the field of advanced energy technologies. We focus on exploring and advancing breakthrough energy concepts, including Low Energy Nuclear Reactions (LENR).
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button 
              variant="outlined" 
              startIcon={<PublicIcon />} 
              component={Link}
              href="https://www.conscious.energy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit Website
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<GitHubIcon />} 
              component={Link}
              href="https://github.com/ConsciousEnergy/lenr_sim_app"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Repository
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default AboutPage; 