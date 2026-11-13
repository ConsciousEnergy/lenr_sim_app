import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  Button,
  Chip,
  Stack,
  Link as MuiLink,
  useTheme,
  alpha
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useNavigate } from 'react-router-dom';
import { APP_VERSION } from '../config/version';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CodeIcon from '@mui/icons-material/Code';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SecurityIcon from '@mui/icons-material/Security';
import ApiIcon from '@mui/icons-material/Api';
import StorageIcon from '@mui/icons-material/Storage';
import SettingsIcon from '@mui/icons-material/Settings';
import BugReportIcon from '@mui/icons-material/BugReport';
import SchoolIcon from '@mui/icons-material/School';
import PublicIcon from '@mui/icons-material/Public';
import GitHubIcon from '@mui/icons-material/GitHub';
import EmailIcon from '@mui/icons-material/Email';
import { track } from '../analytics/events';
import {
  CONSCIOUS_ENERGY_SITE,
  FEEDBACK_EMAIL,
  PUBLIC_GITHUB_ISSUES,
  PUBLIC_GITHUB_MAIN,
  PUBLIC_GITHUB_README,
  PUBLIC_GITHUB_REPO,
} from '../config/publicLinks';

const DocumentationPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState('getting-started');

  useEffect(() => {
    track.docsViewed({ slug: 'documentation', source: 'documentation-hub' });
  }, []);
  
  // Refs for scrolling to accordion sections
  const gettingStartedRef = useRef(null);
  const apiRef = useRef(null);
  const troubleshootingRef = useRef(null);

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };
  
  // Scroll to accordion and expand it
  const scrollToSection = (sectionId, ref) => {
    if (ref && ref.current) {
      setExpanded(sectionId);
      setTimeout(() => {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };
  
  // Handle card clicks
  const handleQuickStartClick = () => {
    scrollToSection('getting-started', gettingStartedRef);
  };
  
  const handleApiReferenceClick = () => {
    scrollToSection('api', apiRef);
  };
  
  const handleDebuggingClick = () => {
    scrollToSection('troubleshooting', troubleshootingRef);
  };

  const handleTheoryClick = () => {
    navigate('/theory-paper');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography 
            variant="h3" 
            gutterBottom 
            sx={{ 
              fontWeight: 'bold',
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Documentation
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Complete guide to the LENR Simulation Platform
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ mt: 3 }}>
            <Button
              variant="outlined"
              startIcon={<EmailIcon />}
              component={MuiLink}
              href={FEEDBACK_EMAIL}
            >
              Email feedback
            </Button>
            <Button
              variant="outlined"
              startIcon={<GitHubIcon />}
              component={MuiLink}
              href={PUBLIC_GITHUB_MAIN}
              target="_blank"
              rel="noopener noreferrer"
            >
              Source on GitHub
            </Button>
            <Button
              variant="outlined"
              startIcon={<PublicIcon />}
              component={MuiLink}
              href={CONSCIOUS_ENERGY_SITE}
              target="_blank"
              rel="noopener noreferrer"
            >
              Conscious Energy
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Quick Links */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card 
              sx={{ 
                height: '100%', 
                background: alpha(theme.palette.primary.main, 0.05),
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                  background: alpha(theme.palette.primary.main, 0.1)
                }
              }}
              onClick={handleQuickStartClick}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <RocketLaunchIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>Quick Start</Typography>
                <Typography variant="body2" color="text.secondary">
                  Get up and running in minutes
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card 
              sx={{ 
                height: '100%', 
                background: alpha(theme.palette.secondary.main, 0.05),
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                '&:hover': { 
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                  background: alpha(theme.palette.secondary.main, 0.1)
                }
              }}
              onClick={handleApiReferenceClick}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <ApiIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>API Reference</Typography>
                <Typography variant="body2" color="text.secondary">
                  Core endpoints documented below
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card 
              sx={{ 
                height: '100%', 
                background: alpha(theme.palette.success.main, 0.15),
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                  background: alpha(theme.palette.success.main, 0.2)
                }
              }}
              onClick={handleTheoryClick}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <SchoolIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>Theory</Typography>
                <Typography variant="body2" color="text.secondary">
                  Unified LENR framework
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Full paper with corrections
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card 
              sx={{ 
                height: '100%', 
                background: alpha(theme.palette.info.main, 0.05),
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                  background: alpha(theme.palette.info.main, 0.1)
                }
              }}
              onClick={handleDebuggingClick}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <BugReportIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>Debugging</Typography>
                <Typography variant="body2" color="text.secondary">
                  Troubleshooting guide
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Scientific governance documents.
            These are served as markdown by GET /api/docs/{slug} and rendered by
            DocViewerPage, but nothing linked to them, so the route was
            unreachable without typing the URL. */}
        <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <SchoolIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Scientific Governance Documents
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Rendered in-app from the repository. These record open issues, the
            falsifiable predictions the model commits to, and the packets prepared
            for external reviewers.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            {[
              { slug: 'issue-ledger', label: 'Issue Ledger' },
              { slug: 'testable-predictions', label: 'Testable Predictions' },
              { slug: 'reviewer-packets', label: 'Reviewer Packets' },
              { slug: 'researcher-review-pack', label: 'Researcher Review Pack' },
            ].map((doc) => (
              <Button
                key={doc.slug}
                variant="outlined"
                size="small"
                fullWidth
                startIcon={<CodeIcon />}
                onClick={() => {
                  track.docsViewed({ slug: doc.slug, surface: 'documentation_page' });
                  navigate(`/docs/${doc.slug}`);
                }}
              >
                {doc.label}
              </Button>
            ))}
          </Stack>
        </Paper>

        {/* Main Documentation Sections */}
        
        {/* Getting Started */}
        <div ref={gettingStartedRef} />
        <Accordion expanded={expanded === 'getting-started'} onChange={handleChange('getting-started')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RocketLaunchIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Getting Started
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
              Prerequisites
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                <ListItemText primary="Node.js 16+ and npm" />
              </ListItem>
              <ListItem>
                <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                <ListItemText primary="Python 3.9+" />
              </ListItem>
              <ListItem>
                <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                <ListItemText primary="Git for version control" />
              </ListItem>
            </List>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 3 }}>
              Installation
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle><strong>Public source on GitHub</strong></AlertTitle>
              Clone from the public repository on the{' '}
              <MuiLink href={PUBLIC_GITHUB_MAIN} target="_blank" rel="noopener noreferrer">
                main
              </MuiLink>
              {' '}branch:{' '}
              <MuiLink href={PUBLIC_GITHUB_REPO} target="_blank" rel="noopener noreferrer">
                {PUBLIC_GITHUB_REPO}
              </MuiLink>
              . See the{' '}
              <MuiLink href={PUBLIC_GITHUB_README} target="_blank" rel="noopener noreferrer">
                README
              </MuiLink>
              {' '}for setup notes. Send product feedback to{' '}
              <MuiLink href={FEEDBACK_EMAIL}>diadon@conscious.energy</MuiLink>.
            </Alert>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, fontFamily: 'monospace' }}>
              <Typography variant="body2" component="pre" sx={{ m: 0 }}>
{`git clone ${PUBLIC_GITHUB_REPO}.git
cd lenr_sim_app/LENR_SIM_APP_v2

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
pip install -r requirements.txt

# Start the application
npm run dev  # Frontend
python -m uvicorn app.main:app --reload  # Backend`}
              </Typography>
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              <AlertTitle><strong>Quick Tip</strong></AlertTitle>
              Use the provided <code>start_app.bat</code> script to launch both frontend and backend simultaneously!
            </Alert>
          </AccordionDetails>
        </Accordion>

        {/* Architecture */}
        <Accordion expanded={expanded === 'architecture'} onChange={handleChange('architecture')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SettingsIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Architecture Overview
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      Frontend
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><CodeIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary="React 18.2" secondary="Modern UI framework" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CodeIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary="Material-UI v7" secondary="Component library" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CodeIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary="Three.js" secondary="3D visualizations" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CodeIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary="React Router" secondary="Navigation" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                      Backend
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><CodeIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary="FastAPI" secondary="High-performance API" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CodeIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary="NumPy / SciPy" secondary="Scientific computing" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CodeIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary="SymPy" secondary="Symbolic mathematics" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CodeIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary="PyVista" secondary="3D data processing" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 3 }}>
              Project Structure
            </Typography>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, fontFamily: 'monospace' }}>
              <Typography variant="body2" component="pre" sx={{ m: 0 }}>
{`lenr_sim_app/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Application pages
│   │   ├── contexts/         # React contexts
│   │   ├── utils/            # Utility functions
│   │   └── api/              # API client
│   └── public/               # Static assets
│
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── api/routes/       # Public API endpoints (unified, physics, docs)
│   │   ├── core/             # Core config & logic
│   │   ├── services/         # Business logic
│   │   └── physics_engine/   # Physics modules (theories, unified model)
│   └── tests/                # Backend tests
│
├── docs/                     # Documentation
└── scripts/                  # Utility scripts`}
              </Typography>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* API Reference */}
        <div ref={apiRef} />
        <Accordion expanded={expanded === 'api'} onChange={handleChange('api')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ApiIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                API Reference
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Base URL
            </Typography>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mb: 2 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                http://localhost:8010
              </Typography>
            </Box>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 3 }}>
              Core Endpoints
            </Typography>
            
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Chip label="GET" color="primary" size="small" />
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    /api/health
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Service health, version, and physics-engine readiness
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Chip label="POST" color="success" size="small" />
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    /api/unified/simulate
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Run a unified multi-theory enhancement calculation
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Chip label="POST" color="success" size="small" />
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    /api/unified/bubble-lattice
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Cavitation bubble-lattice run; returns the additive reaction-rate
                  engine block (rate, optional UQ credible interval, KG-RP diagnostics)
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Chip label="POST" color="success" size="small" />
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    /api/unified/export
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Reproducibility export envelope (lenr-run-export-v1)
                </Typography>
              </CardContent>
            </Card>

            <Alert severity="info" sx={{ mt: 2 }}>
              <AlertTitle><strong>In-app API &amp; governance docs</strong></AlertTitle>
              <Typography variant="body2" paragraph>
                Use the Core Endpoints list above for the public simulation API surface.
                Scientific governance markdown (issue ledger, testable predictions, reviewer
                packets) is linked from Scientific Governance Documents on this page and
                rendered in-app at <code>/docs/{'{slug}'}</code>.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Local backend default is port 8010. OpenAPI/Swagger UI is not exposed on the
                public beta hosts.
              </Typography>
            </Alert>
          </AccordionDetails>
        </Accordion>

        {/* Configuration */}
        <Accordion expanded={expanded === 'configuration'} onChange={handleChange('configuration')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StorageIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Configuration
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Environment Variables
            </Typography>
            <Typography variant="body2" paragraph>
              Create a <code>.env</code> file in the frontend directory (the app uses Vite,
              so <code>VITE_</code>-prefixed variables are canonical; the legacy
              <code>REACT_APP_</code> name is still honored for backward compatibility):
            </Typography>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mb: 3 }}>
              <Typography variant="body2" component="pre" sx={{ m: 0 }}>
{`# Frontend (Vite) Environment Variables
VITE_API_URL=http://localhost:8010
# Legacy CRA-style alias (optional, same value):
REACT_APP_API_URL=http://localhost:8010`}
              </Typography>
            </Box>

            <Typography variant="body2" paragraph>
              Backend configuration (<code>backend/.env</code>):
            </Typography>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" component="pre" sx={{ m: 0 }}>
{`# Backend Environment Variables
DATABASE_URL=sqlite:///./lenr_simulations.db
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=info`}
              </Typography>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* License & Contributing */}
        <Accordion expanded={expanded === 'license'} onChange={handleChange('license')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                License & Contributing
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Alert severity="success" sx={{ mb: 3 }}>
              <AlertTitle><strong>Open Source License</strong></AlertTitle>
              This project is licensed under the <strong>GNU General Public License v3.0</strong>
            </Alert>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              License Summary
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                <ListItemText 
                  primary="Freedom to Use" 
                  secondary="Use the software for any purpose" 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                <ListItemText 
                  primary="Freedom to Study" 
                  secondary="Study how the software works and modify it" 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                <ListItemText 
                  primary="Freedom to Share" 
                  secondary="Distribute copies to help others" 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                <ListItemText 
                  primary="Freedom to Improve" 
                  secondary="Distribute modified versions under GPL-3.0" 
                />
              </ListItem>
            </List>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 3 }}>
              Contributing
            </Typography>
            <Typography variant="body2" paragraph>
              Contributions are welcome via the public GitHub repository. Prefer PRs against
              the project&apos;s integration branch after reading CONTRIBUTING.md on{' '}
              <MuiLink href={PUBLIC_GITHUB_MAIN} target="_blank" rel="noopener noreferrer">
                main
              </MuiLink>
              . Product feedback can still go to{' '}
              <MuiLink href={FEEDBACK_EMAIL}>diadon@conscious.energy</MuiLink>.
            </Typography>
            <List>
              <ListItem>
                <ListItemText 
                  primary="1. Clone the public repository" 
                  secondary={PUBLIC_GITHUB_REPO}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="2. Create a feature branch" 
                  secondary="git checkout -b feature/amazing-feature" 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="3. Commit your changes" 
                  secondary="git commit -m 'Add amazing feature'" 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="4. Push to your branch" 
                  secondary="git push origin feature/amazing-feature" 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="5. Open a Pull Request" 
                  secondary="Submit your PR for review on GitHub" 
                />
              </ListItem>
            </List>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
              <Button
                variant="contained"
                startIcon={<GitHubIcon />}
                component={MuiLink}
                href={PUBLIC_GITHUB_MAIN}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open GitHub (main)
              </Button>
              <Button
                variant="outlined"
                startIcon={<EmailIcon />}
                component={MuiLink}
                href={FEEDBACK_EMAIL}
              >
                Email feedback
              </Button>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Troubleshooting */}
        <div ref={troubleshootingRef} />
        <Accordion expanded={expanded === 'troubleshooting'} onChange={handleChange('troubleshooting')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BugReportIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Troubleshooting
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Common Issues
            </Typography>

            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} gutterBottom>
                  Port Already in Use
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  If ports 3000 or 8010 are already in use:
                </Typography>
                <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    # macOS / Linux<br />
                    lsof -ti:3000 | xargs kill -9  # Frontend<br />
                    lsof -ti:8010 | xargs kill -9  # Backend<br />
                    # Windows (PowerShell)<br />
                    taskkill /F /IM node.exe; taskkill /F /IM python.exe
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} gutterBottom>
                  Module Not Found Errors
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Clear cache and reinstall dependencies:
                </Typography>
                <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    rm -rf node_modules package-lock.json<br />
                    npm install
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} gutterBottom>
                  Visualization Not Rendering
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Check browser console for WebGL errors and ensure hardware acceleration is enabled.
                </Typography>
              </CardContent>
            </Card>

            <Alert severity="info" sx={{ mt: 3 }}>
              <AlertTitle><strong>Need More Help?</strong></AlertTitle>
              Email feedback to{' '}
              <MuiLink href={FEEDBACK_EMAIL}>diadon@conscious.energy</MuiLink>
              {' '}or open an issue on the{' '}
              <MuiLink href={PUBLIC_GITHUB_ISSUES} target="_blank" rel="noopener noreferrer">
                public GitHub repository
              </MuiLink>
              .
            </Alert>
          </AccordionDetails>
        </Accordion>

        {/* Footer */}
        <Divider sx={{ my: 4 }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" paragraph>
            <strong>LENR Simulation Platform</strong> - v{APP_VERSION}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Developed by <MuiLink href="https://www.conscious.energy" target="_blank" rel="noopener noreferrer">
            Conscious Energy</MuiLink>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Licensed under GNU GPL-3.0 — <MuiLink href="/LICENSE">/LICENSE</MuiLink>
            {' · '}
            <MuiLink href={FEEDBACK_EMAIL}>email feedback</MuiLink>
            {' · '}
            <MuiLink href={PUBLIC_GITHUB_MAIN} target="_blank" rel="noopener noreferrer">
              source on GitHub
            </MuiLink>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default DocumentationPage;

