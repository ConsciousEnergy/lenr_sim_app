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
  Chip,
  Stack,
} from '@mui/material';
import { CAMPAIGN_EVIDENCE, OPEN_EQ_IDS } from '../config/unifiedTheoryScienceEvidence';

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
      <Stack
        direction="row"
        spacing={0.5}
        useFlexGap
        flexWrap="wrap"
        sx={{ mb: 1.5 }}
        data-testid="open-challenges-honesty-chips"
      >
        <Chip
          label="lenr_proved: false"
          size="small"
          color="warning"
          variant="outlined"
          sx={{ fontSize: '0.65rem', height: 20 }}
        />
        <Chip
          label="avenue ranking ≠ proof"
          size="small"
          variant="outlined"
          sx={{ fontSize: '0.65rem', height: 20 }}
        />
        <Chip
          label="closure runway: criteria only"
          size="small"
          variant="outlined"
          sx={{ fontSize: '0.65rem', height: 20 }}
        />
        {OPEN_EQ_IDS.map((id) => (
          <Chip
            key={id}
            label={`${id}: OPEN`}
            size="small"
            color="warning"
            variant="outlined"
            sx={{ fontFamily: 'monospace', fontSize: '0.6rem', height: 20 }}
          />
        ))}
      </Stack>
    <List dense data-testid="open-challenges-rows">
      <ListItem>
        <ListItemText
          primary="MeV energy gap (how)"
          secondary="Mechanism for distributing 23.8 MeV into lattice/electronic modes without single gamma emission remains debated. Tier: speculative / exploratory."
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary="Radiation suppression (how)"
          secondary="Detector UL and Γ_ph/Γ_γ open targets; assumed branching is scenario input, not derived. Tier: speculative / exploratory."
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary="Statistical feasibility (when)"
          secondary="Whether the active FGR rate crosses the calorimetric floor under the selected hypothesis. Two-body reference (log10 N = −40) is a negative determination (BUDGET_DOES_NOT_CLOSE), not closure; other modes are speculative / exploratory."
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary="Electron-capture energy path (how)"
          secondary="No derived condensed-matter source reaches 0.782 MeV; the stated 0.1 eV double-layer budget is ~10^7 short (EQ-OPEN-EC-DEFICIT-01). A 0 MeV deficit under an assumed m*/mₑ is scenario bookkeeping. Tier: speculative / exploratory."
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary="Integrated heat–helium yield (when)"
          secondary="Instantaneous Miles 24±4 MeV/He band is an empirical correlation; integrated yields remain 10^2–10^4× low without time-resolved retention accounting. Tier: empirical LENR correlation."
        />
      </ListItem>
    </List>
    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
      Cavitation–collapse enhancement is {CAMPAIGN_EVIDENCE.hydro_label}; it does not close any
      of these questions.
    </Typography>
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
        Campaign / avenue-ranking / Lean / EQ-OPEN runway pointers live in Theory
        Paper section <strong>5B. Science Evidence</strong> (still{' '}
        <code>lenr_proved: false</code>; all <code>EQ-OPEN-*</code> OPEN).
      </Typography>
    </Alert>
  </Wrapper>
  );
};

export default OpenChallengesSection;
