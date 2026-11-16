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
import DiscoveryGradeGapChecklist from '../science/DiscoveryGradeGapChecklist';
import EqOpenAvenueLinkage from '../science/EqOpenAvenueLinkage';

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
          theory runs · UQ samples{' '}
          <code>{CAMPAIGN_EVIDENCE.uq_samples}</code> ({CAMPAIGN_EVIDENCE.hydro_label}).
          Literature: {CAMPAIGN_EVIDENCE.literature_anchor}.
        </Typography>
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 0.5 }}>
          <Chip
            size="small"
            variant="outlined"
            label={`N=${CAMPAIGN_EVIDENCE.n_experiments}`}
            data-testid="analytics-5b-campaign-n"
          />
          <Chip
            size="small"
            variant="outlined"
            label={`UQ=${CAMPAIGN_EVIDENCE.uq_samples}`}
            data-testid="analytics-5b-uq-samples"
          />
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            label={`MoE pairing: ${DISCOVERY_GRADE_BAR.moe_pairing_status}`}
            data-testid="analytics-5b-moe-pairing"
          />
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          data-testid="analytics-5b-densification-note"
        >
          {CAMPAIGN_EVIDENCE.densification_note}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          data-testid="analytics-5b-emp-histogram-note"
        >
          Theory-score EMP histogram ≠ pack evidence (spec=
          {CAMPAIGN_EVIDENCE.claim_tier_histogram?.speculative_exploratory ?? 'n/a'}, EMP=
          {CAMPAIGN_EVIDENCE.claim_tier_histogram?.empirical_lenr_correlation ?? 'n/a'}).{' '}
          {CAMPAIGN_EVIDENCE.claim_tier_histogram_note}
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
        <Typography variant="body2" color="text.secondary" data-testid="analytics-5b-discovery-gap">
          {DISCOVERY_GRADE_BAR.gap_note}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          data-testid="analytics-5b-moe-coverage"
        >
          Corpus MoE coverage:{' '}
          {DISCOVERY_GRADE_BAR.corpus_moe_coverage.with_sigma_q}/
          {DISCOVERY_GRADE_BAR.corpus_moe_coverage.n_records} σ_Q ·{' '}
          {DISCOVERY_GRADE_BAR.corpus_moe_coverage.with_literature_reported_cite_gated}/
          {DISCOVERY_GRADE_BAR.corpus_moe_coverage.n_records} literature_reported ·{' '}
          {DISCOVERY_GRADE_BAR.corpus_moe_coverage.with_moe_pairing_verified}/
          {DISCOVERY_GRADE_BAR.corpus_moe_coverage.n_records} pairing verified ·{' '}
          {DISCOVERY_GRADE_BAR.corpus_moe_coverage.discovery_grade_eligible_count}/
          {DISCOVERY_GRADE_BAR.corpus_moe_coverage.n_records} analytics discovery
          {' '}(
          {(DISCOVERY_GRADE_BAR.corpus_moe_coverage.discovery_grade_eligible_ids || []).join(
            ', ',
          )}
          ) — closes_eq_open=<code>false</code>, lenr_proved=<code>false</code>. Soft chip
          language stays <code>analytics_gates_clear</code>, never “≥5σ met”.
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          data-testid="analytics-5b-history-envelope-note"
        >
          History / export rows now carry <code>discovery_grade_gap</code> and{' '}
          <code>honest_closure</code> envelopes from the API. Row chips stay{' '}
          <code>not_met</code> for honest closure even when an analytics discovery flag clears —
          they never set <code>lenr_proved</code> or close EQ-OPEN-*.
        </Typography>
      </Stack>

      <DiscoveryGradeGapChecklist testIdPrefix="analytics-5b-gap" />

      <EqOpenAvenueLinkage testIdPrefix="analytics-5b-linkage" density="compact" />

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
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
