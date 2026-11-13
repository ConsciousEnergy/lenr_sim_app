import React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  Avatar,
  Chip,
  Stack,
  Divider,
  Button,
  Link,
  useTheme,
  alpha
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { APP_VERSION } from '../config/version';
import {
  Email as EmailIcon,
  Language as WebsiteIcon,
  Science as ScienceIcon,
  Code as CodeIcon,
  School as SchoolIcon,
  GitHub as GitHubIcon,
  FavoriteBorder as FavoriteBorderIcon
} from '@mui/icons-material';

import {
  DONATIONS_URL,
  FEEDBACK_EMAIL,
  PUBLIC_GITHUB_MAIN,
} from '../config/publicLinks';

// Team member data
const teamMembers = [
  {
    name: 'LENR Research Team',
    role: 'Core Development',
    avatar: null,
    bio: 'Our team is dedicated to advancing Low Energy Nuclear Reaction research through computational simulation and theoretical modeling.',
    expertise: ['Physics Simulation', 'Quantum Mechanics', 'Condensed Matter'],
    links: {
      email: FEEDBACK_EMAIL,
      website: 'https://conscious.energy'
    }
  }
];

// Contributor data
const contributors = [
  { name: 'Diadon Acs with Conscious Energy', contributions: 'Project Lead & Development', avatar: 'CE' },
  { name: 'Physics Contributors', contributions: 'Theoretical Framework', avatar: 'PC' },
  { name: 'Research Community', contributions: 'Bug Reports & Features', avatar: 'RC' }
];

// Project info
const projectInfo = {
  name: 'LENR Simulation Platform',
  version: APP_VERSION,
  license: 'GPL-3.0',
  feedback: FEEDBACK_EMAIL,
  website: 'https://conscious.energy',
  source: PUBLIC_GITHUB_MAIN,
  donations: DONATIONS_URL,
};

const TeamPage = () => {
  const theme = useTheme();
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          About the Team
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto' }}>
          Meet the researchers and developers behind the LENR Simulation Platform
        </Typography>
      </Box>
      
      {/* Mission Statement */}
      <Paper 
        sx={{ 
          p: 4, 
          mb: 6, 
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
          borderLeft: `4px solid ${theme.palette.primary.main}`
        }}
      >
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          Our Mission
        </Typography>
        <Typography variant="body1" paragraph>
          We are building computational research tools to advance the understanding and research
          of Low Energy Nuclear Reactions (LENR). This public research preview provides scientists
          and researchers with simulation capabilities based on the Unified LENR Theory framework;
          source is public under GPL-3.0 on GitHub.
        </Typography>
        <Typography variant="body1">
          By combining quantum mechanical modeling, condensed matter physics, and nuclear interaction 
          simulations, we aim to create a comprehensive research tool that accelerates discovery in 
          this exciting field.
        </Typography>
      </Paper>
      
      {/* Team Members */}
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Development Team
      </Typography>
      
      <Grid container spacing={4} sx={{ mb: 6 }}>
        {teamMembers.map((member, index) => (
          <Grid size={{ xs: 12, md: 6 }} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar 
                    sx={{ 
                      width: 80, 
                      height: 80, 
                      bgcolor: theme.palette.primary.main,
                      fontSize: '2rem'
                    }}
                  >
                    <ScienceIcon sx={{ fontSize: 40 }} />
                  </Avatar>
                  <Box sx={{ ml: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {member.name}
                    </Typography>
                    <Typography variant="subtitle1" color="primary">
                      {member.role}
                    </Typography>
                  </Box>
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {member.bio}
                </Typography>
                
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                  {member.expertise.map((skill, i) => (
                    <Chip 
                      key={i} 
                      label={skill} 
                      size="small" 
                      variant="outlined"
                      icon={<SchoolIcon />}
                    />
                  ))}
                </Stack>
                
                <Stack direction="row" spacing={1}>
                  {member.links.email && (
                    <Button
                      size="small"
                      startIcon={<EmailIcon />}
                      href={member.links.email}
                    >
                      Email
                    </Button>
                  )}
                  {member.links.website && (
                    <Button 
                      size="small" 
                      startIcon={<WebsiteIcon />}
                      href={member.links.website}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Website
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Contributors */}
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Contributors
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 6 }}>
        {contributors.map((contributor, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Avatar 
                sx={{ 
                  width: 60, 
                  height: 60, 
                  mx: 'auto', 
                  mb: 2,
                  bgcolor: theme.palette.secondary.main
                }}
              >
                {contributor.avatar}
              </Avatar>
              <Typography variant="h6" gutterBottom>
                {contributor.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {contributor.contributions}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
      
      {/* Project Info */}
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          Project Information
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CodeIcon sx={{ mr: 2, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">Version</Typography>
                  <Typography variant="body1">{projectInfo.version}</Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SchoolIcon sx={{ mr: 2, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">License</Typography>
                  <Typography variant="body1">{projectInfo.license}</Typography>
                </Box>
              </Box>
            </Stack>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={2}>
              <Button
                variant="outlined"
                startIcon={<GitHubIcon />}
                href={projectInfo.source}
                target="_blank"
                rel="noopener noreferrer"
                fullWidth
              >
                Source on GitHub
              </Button>

              <Button
                variant="outlined"
                startIcon={<EmailIcon />}
                href={projectInfo.feedback}
                fullWidth
              >
                Email feedback
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<WebsiteIcon />}
                href={projectInfo.website}
                target="_blank"
                rel="noopener noreferrer"
                fullWidth
              >
                Visit Website
              </Button>

              <Button
                variant="outlined"
                startIcon={<FavoriteBorderIcon />}
                href={projectInfo.donations}
                target="_blank"
                rel="noopener noreferrer"
                fullWidth
              >
                Donations
              </Button>
            </Stack>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Want to contribute? Clone the public repository on{' '}
            <Link href={PUBLIC_GITHUB_MAIN} target="_blank" rel="noopener noreferrer">
              GitHub main
            </Link>
            {' '}and open a PR, or email feedback anytime.
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="center"
            sx={{ mt: 2 }}
          >
            <Button
              variant="contained"
              startIcon={<GitHubIcon />}
              href={PUBLIC_GITHUB_MAIN}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open GitHub
            </Button>
            <Button
              variant="outlined"
              startIcon={<EmailIcon />}
              href={FEEDBACK_EMAIL}
            >
              Contact Us
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
};

export default TeamPage;

