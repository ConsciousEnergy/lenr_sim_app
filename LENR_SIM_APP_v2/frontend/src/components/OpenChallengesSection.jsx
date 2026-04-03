/**
 * OpenChallengesSection.jsx
 *
 * Section 5A: Open Theoretical Challenges in LENR.
 * MeV energy gap, radiation suppression, statistical feasibility.
 * Links to ISSUE_LEDGER, TESTABLE_PREDICTIONS, REVIEWER_PACKETS.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Alert,
  AlertTitle,
  Link as MuiLink,
} from '@mui/material';

/**
 * @param {Object} props
 * @param {boolean} [props.embedded] - When true, omits the section title (for use inside Accordion where title is in summary).
 */
const OpenChallengesSection = ({ embedded = false }) => {
  const Wrapper = embedded ? Box : Paper;
  const wrapperSx = embedded ? { mb: 2 } : { p: 3, mb: 2 };
  const wrapperProps = embedded ? {} : { elevation: 1 };
  return (
  <Wrapper {...wrapperProps} sx={wrapperSx}>
    {!embedded && (
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
        5A. Open Theoretical Challenges
      </Typography>
    )}
    <Typography variant="body2" paragraph>
      Key open questions in LENR theory:
    </Typography>
    <List dense>
      <ListItem>
        <ListItemText
          primary="MeV energy gap"
          secondary="Mechanism for distributing 23.8 MeV into lattice/electronic modes without single gamma emission remains debated."
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary="Radiation suppression"
          secondary="How LENR systems suppress dangerous radiation while releasing nuclear-scale energy."
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary="Statistical feasibility"
          secondary="Whether observed excess heat and transmutations are statistically distinguishable from background."
        />
      </ListItem>
    </List>
    <Alert severity="info" sx={{ mt: 2 }}>
      <AlertTitle>Companion Documents</AlertTitle>
      <Typography variant="body2" component="span">
        See{' '}
        <MuiLink href="/docs/issue-ledger" component={Link} to="/docs/issue-ledger">
          ISSUE_LEDGER
        </MuiLink>
        ,{' '}
        <MuiLink href="/docs/testable-predictions" component={Link} to="/docs/testable-predictions">
          TESTABLE_PREDICTIONS
        </MuiLink>
        , and{' '}
        <MuiLink href="/docs/reviewer-packets" component={Link} to="/docs/reviewer-packets">
          REVIEWER_PACKETS
        </MuiLink>
        {' '}for the full mathematical audit and verification framework.
      </Typography>
    </Alert>
  </Wrapper>
  );
};

export default OpenChallengesSection;