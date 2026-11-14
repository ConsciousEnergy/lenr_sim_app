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
import SchoolIcon from '@mui/icons-material/School';
import PublicIcon from '@mui/icons-material/Public';
import BusinessIcon from '@mui/icons-material/Business';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GitHubIcon from '@mui/icons-material/GitHub';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { APP_VERSION } from '../config/version';
import {
  CONSCIOUS_ENERGY_SITE,
  DONATIONS_URL,
  FEEDBACK_EMAIL,
  PUBLIC_GITHUB_MAIN,
  PUBLIC_GITHUB_REPO_LABEL,
} from '../config/publicLinks';

/** Manuscript chip on Theory Paper — aligned to live app train for public visitors. */
const MANUSCRIPT_REVISION_LABEL = `v${APP_VERSION} (revised 2026-11-11)`;

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
            The LENR Simulation App is a <strong>public research preview</strong> comparative scientific
            workbench developed by <Link href="https://www.conscious.energy" target="_blank" rel="noopener noreferrer">Conscious Energy</Link>.
            LENR/CMNS refers to a class of reported anomalous thermal, nuclear and isotopic observations
            in hydrogen-loaded condensed-matter systems. The interpretation, reproducibility and
            underlying mechanism of these observations remain disputed.
          </Typography>
          <Typography variant="body1" paragraph>
            LENR-Sim helps researchers instantiate competing theories under shared experiment conditions, compare predicted signatures against Model&nbsp;0 established-physics baselines, and inspect falsifiers — rather than asserting that any single mechanism is proven. Potential energy applications have been proposed if reported effects can be demonstrated reproducibly and engineered reliably.
          </Typography>
          <Typography variant="body1" paragraph>
            Crawler-readable model pages (no JavaScript required) are published at <Link href="/models/">/models/</Link>.
            The intended license is <strong>GNU GPL-3.0</strong> (read in-app at{' '}
            <Link href="/license">/license</Link>).             Source is public on GitHub (
            <Link href={PUBLIC_GITHUB_MAIN} target="_blank" rel="noopener noreferrer">
              {PUBLIC_GITHUB_REPO_LABEL}
            </Link>
            , <strong>main</strong>). Send product feedback to{' '}
            <Link href={FEEDBACK_EMAIL}>diadon@conscious.energy</Link>.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Version map: hosted app build <strong>{APP_VERSION}</strong>; companion manuscript revision
            label is <strong>{MANUSCRIPT_REVISION_LABEL}</strong> on the Theory Paper page.
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

        <Box sx={{ mb: 4 }} data-testid="about-known-limitations">
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <InfoOutlinedIcon color="info" sx={{ mr: 1 }} />
            Known limitations (invited beta)
          </Typography>
          <Typography variant="body2" component="div">
            <List dense>
              <ListItem sx={{ alignItems: 'flex-start', py: 0.5 }}>
                <ListItemText
                  primary="10⁵ enhancement"
                  secondary="Displayed peaks that hit 10⁵ reflect the governance saturation ceiling, not a verified laboratory tunneling factor. Abstract ranges that mention 10³–10⁵ are modeled bands under stated assumptions."
                />
              </ListItem>
              <ListItem sx={{ alignItems: 'flex-start', py: 0.5 }}>
                <ListItemText
                  primary="Heat–helium correlation"
                  secondary="Reported heat–helium correlations are treated as empirical (EMP) associations. They are not nuclear confirmation of mechanism or proof that LENR occurs."
                />
              </ListItem>
              <ListItem sx={{ alignItems: 'flex-start', py: 0.5 }}>
                <ListItemText
                  primary="Theory Paper §4.2 “Typical Results”"
                  secondary="Figures such as anomalous heat up to 1 kW are literature reports from the corpus, not outputs validated by this simulator."
                />
              </ListItem>
              <ListItem sx={{ alignItems: 'flex-start', py: 0.5 }}>
                <ListItemText
                  primary="Dashboard model count"
                  secondary="The number of enabled theory entries (including null/control and phenomenological models) is not a count of validated mechanisms."
                />
              </ListItem>
            </List>
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
          <Box
            data-testid="about-conscious-energy-actions"
            sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}
          >
            <Button 
              variant="outlined" 
              startIcon={<PublicIcon />} 
              component={Link}
              href={CONSCIOUS_ENERGY_SITE}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit Website
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<GitHubIcon />}
              component={Link}
              href={PUBLIC_GITHUB_MAIN}
              target="_blank"
              rel="noopener noreferrer"
            >
              Source on GitHub
            </Button>
            <Button 
              variant="outlined" 
              component={Link}
              href={FEEDBACK_EMAIL}
            >
              Email feedback
            </Button>
            <Button
              variant="outlined"
              startIcon={<FavoriteBorderIcon />}
              component={Link}
              href={DONATIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Donations
            </Button>
          </Box>

          {/* Immediately after Visit Website / Email action bar */}
          <Divider sx={{ my: 4 }} />

          <Box data-testid="about-special-thanks">
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Special Thanks
            </Typography>
            <Typography variant="body1" paragraph>
              Special thanks goes to the{' '}
              <Link
                href="https://www.lenr-forum.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                LENR-Forum.com
              </Link>
              {' '}team for their support, the countless researchers who have made this field their
              life&apos;s work, and to all of those who have supported my research at Conscious Energies
              over the last decade. This work is in loving memory of Alan Smith, Melvin Miles, and
              Michael McKubre.
            </Typography>
            <Typography
              variant="body1"
              component="blockquote"
              sx={{
                m: 0,
                pl: 2,
                borderLeft: 2,
                borderColor: 'divider',
                fontStyle: 'italic',
                color: 'text.secondary',
              }}
            >
              &ldquo;Abiit autem non sum oblitus&rdquo;
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default AboutPage;
