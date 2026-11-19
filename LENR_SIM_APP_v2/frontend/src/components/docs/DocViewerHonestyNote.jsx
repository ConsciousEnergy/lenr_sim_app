/**
 * Soft honesty note for DocViewer governance surfaces.
 * Math/print UX must never read as EQ-OPEN discharge or ≥5σ discovery.
 */
import React from 'react';
import { Alert, AlertTitle, Typography } from '@mui/material';
import {
  CORPUS_MOE_COVERAGE,
  SCIENCE_EVIDENCE_HONESTY,
} from '../../config/unifiedTheoryScienceEvidence';

const OPEN_IDS = SCIENCE_EVIDENCE_HONESTY.open_ids;

/**
 * @param {Object} props
 * @param {string} [props.testIdPrefix]
 * @param {string} [props.slug]
 */
export default function DocViewerHonestyNote({
  testIdPrefix = 'doc-viewer-honesty',
  slug = '',
}) {
  const eligible = CORPUS_MOE_COVERAGE.discovery_grade_eligible_count;
  const nRecords = CORPUS_MOE_COVERAGE.n_records;

  return (
    <Alert
      severity="warning"
      sx={{ mb: 2 }}
      data-testid={`${testIdPrefix}-note`}
      className="doc-viewer-honesty-note"
    >
      <AlertTitle>Honesty locks (unchanged by DocViewer math/print)</AlertTitle>
      <Typography
        variant="body2"
        component="div"
        data-testid={`${testIdPrefix}-lenr-proved`}
      >
        <code>lenr_proved: {String(SCIENCE_EVIDENCE_HONESTY.lenr_proved)}</code>
      </Typography>
      <Typography
        variant="body2"
        component="div"
        data-testid={`${testIdPrefix}-eq-open`}
      >
        All five <code>EQ-OPEN-*</code> stay <strong>OPEN</strong>:{' '}
        {OPEN_IDS.join(', ')}.
      </Typography>
      <Typography
        variant="body2"
        component="div"
        data-testid={`${testIdPrefix}-discovery`}
      >
        Discovery-grade corpus stays {eligible}/{nRecords} (Kasagi NiCu + Ni
        only). Soft chip language: <code>analytics_gates_clear</code> — never
        “≥5σ met” as discharge.
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        Rendering LaTeX for{slug ? ` “${slug}”` : ' this doc'} or printing the
        page does not raise claim tier, invent σ_Q, or close open obligations.
      </Typography>
    </Alert>
  );
}
