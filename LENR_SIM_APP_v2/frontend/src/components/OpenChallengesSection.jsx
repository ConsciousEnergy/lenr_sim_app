/**
 * OpenChallengesSection.jsx
 *
 * Section 5A: when/how LENR occurs under named conditions (static fallback).
 * Live virtual lab on Unified Results carries occurrence/when/how blocks.
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
 * @param {boolean} [props.embedded] - When true, omits the section title.
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
        Occurrence under Miles-class conditions is empirically anchored in parts of the
        corpus; the open questions are <strong>how</strong> MeV energy partitions,
        <strong> how</strong> γ is suppressed, and <strong>when</strong> the rate budget
        closes under a named mechanism path. See the live Open Questions Virtual Lab on
        Unified Results for Oracle A/B determinations. Formal IDs{' '}
        <code>EQ-OPEN-MEV-01</code>, <code>EQ-OPEN-RAD-01</code>,{' '}
        <code>EQ-OPEN-RATE-01</code>, <code>EQ-OPEN-EC-01</code>, and{' '}
        <code>EQ-OPEN-YIELD-01</code> remain <strong>OPEN</strong>.
        Working hypothesis <code>WH-ENP-01</code> (Lean <code>WorkingHypothesis</code>)
        is a coupled Hagelstein/TSC ledger with derived remainders; it does not
        discharge those obligations. Lean <code>OpenQuestionBounds</code> lemmas are
        would-close-if only.
      </Typography>
    <List dense>
      <ListItem>
        <ListItemText
          primary="MeV energy gap (how)"
          secondary="Mechanism for distributing 23.8 MeV into lattice/electronic modes without single gamma emission remains debated."
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary="Radiation suppression (how)"
          secondary="Detector UL and Γ_ph/Γ_γ open targets; assumed branching is scenario input, not derived."
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary="Statistical feasibility (when)"
          secondary="Whether the active FGR rate crosses the calorimetric floor under the selected hypothesis."
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
        ,{' '}
        <MuiLink
          href="/docs/researcher-review-pack"
          component={Link}
          to="/docs/researcher-review-pack"
        >
          researcher review pack
        </MuiLink>
        , and application datasets{' '}
        <code>LENR_SIM_APP_v2/datasets/</code>
        {' '}for the full mathematical audit and verification framework. Extra
        simulations are model outputs; they do not close these questions.
      </Typography>
    </Alert>
  </Wrapper>
  );
};

export default OpenChallengesSection;
