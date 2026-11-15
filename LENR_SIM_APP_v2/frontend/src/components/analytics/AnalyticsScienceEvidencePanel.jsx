/**
 * Analytics Overview → Unified Theory §5B science-evidence summary.
 * Read-only honesty panel; never claims LENR proof, EQ-OPEN closure, or ≥5σ discovery.
 */
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
  Chip,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  AVENUE_RANKING_SUMMARY,
  CAMPAIGN_EVIDENCE,
  DISCOVERY_GRADE_BAR,
  EQ_OPEN_RUNWAY,
  FORMALIZATION_STATUS,
  OPEN_EQ_IDS,
  SCIENCE_EVIDENCE_HONESTY,
} from '../../config/unifiedTheoryScienceEvidence';

export default function AnalyticsScienceEvidencePanel() {
  return (
    <Paper sx={{ p: 2, mb: 2 }} data-testid="analytics-science-evidence-panel">
      <Typography variant="h6" gutterBottom>
        Unified Theory §5B — science evidence
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Research pointers for campaign packs, avenue ranking, Lean formalization, and the
        EQ-OPEN closure runway. This panel summarizes Theory Paper section 5B for Analytics
        reviewers; it does not hydrate live SQL or prove LENR.
      </Typography>

      <Alert severity="warning" sx={{ mb: 1.5 }} data-testid="analytics-5b-honesty">
        <AlertTitle>
          Honesty — <code>lenr_proved: false</code>
        </AlertTitle>
        <Typography variant="body2">{SCIENCE_EVIDENCE_HONESTY.disclaimer}</Typography>
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
          <Chip label="lenr_proved: false" size="small" color="warning" variant="outlined" />
          <Chip
            label={SCIENCE_EVIDENCE_HONESTY.kind}
            size="small"
            variant="outlined"
            sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
          />
          <Chip
            label={`≥${DISCOVERY_GRADE_BAR.sigma_threshold}σ discovery: ${DISCOVERY_GRADE_BAR.status}`}
            size="small"
            color="warning"
            variant="outlined"
            data-testid="analytics-5b-5sigma"
          />
        </Stack>
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
          {OPEN_EQ_IDS.map((id) => (
            <Chip
              key={id}
              label={`${id}: OPEN`}
              size="small"
              color="warning"
              variant="outlined"
              sx={{ fontFamily: 'monospace', fontSize: '0.6rem', height: 18 }}
            />
          ))}
        </Stack>
      </Alert>

      <Stack spacing={1} sx={{ mb: 1.5 }}>
        <Typography variant="body2">
          <strong>Campaign pack</strong> <code>{CAMPAIGN_EVIDENCE.preset}</code>:{' '}
          {CAMPAIGN_EVIDENCE.n_experiments} experiments / {CAMPAIGN_EVIDENCE.n_theory_runs}{' '}
          theory runs ({CAMPAIGN_EVIDENCE.hydro_label}). Literature:{' '}
          {CAMPAIGN_EVIDENCE.literature_anchor}.
        </Typography>
        <Typography variant="body2">
          <strong>Avenue ranking</strong>: <code>{AVENUE_RANKING_SUMMARY.kind}</code>,{' '}
          {AVENUE_RANKING_SUMMARY.avenues.length} stress avenues, claim tier{' '}
          <code>{AVENUE_RANKING_SUMMARY.claim_tier}</code> — lab-design aid, not a posterior.
        </Typography>
        <Typography variant="body2">
          <strong>Lean / formalization</strong>: {FORMALIZATION_STATUS.summary}
        </Typography>
        <Typography variant="body2">
          <strong>EQ-OPEN runway</strong>: status <code>{EQ_OPEN_RUNWAY.status}</code> —{' '}
          {EQ_OPEN_RUNWAY.note}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ≥5σ heat criterion <code>{DISCOVERY_GRADE_BAR.heat_formula}</code> (BDS-302). Campaign
          History rows and Relevance Map overlays are model outputs; they do not satisfy
          discovery-grade closure.
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <MuiLink
          component={RouterLink}
          to="/theory-paper"
          variant="body2"
          data-testid="analytics-5b-theory-paper-link"
        >
          Theory Paper §5B
        </MuiLink>
        <MuiLink component={RouterLink} to="/unified-theory?tab=results" variant="body2">
          Open Questions Virtual Lab
        </MuiLink>
        <MuiLink component={RouterLink} to="/docs/issue-ledger" variant="body2">
          Issue ledger
        </MuiLink>
        <MuiLink component={RouterLink} to="/docs/testable-predictions" variant="body2">
          Testable predictions
        </MuiLink>
        <MuiLink component={RouterLink} to="/docs/reviewer-packets" variant="body2">
          Reviewer packets
        </MuiLink>
      </Stack>
    </Paper>
  );
}
