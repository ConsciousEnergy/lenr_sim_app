/**
 * Disambiguate paper Packet A–E vs campaign JSON packs vs researcher hydrate doc.
 * Honesty: none of these surfaces prove LENR or close EQ-OPEN-*.
 */
import React from 'react';
import { Alert, AlertTitle, Link as MuiLink, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

/**
 * @param {Object} props
 * @param {'reviewer-packets'|'researcher-review-pack'|string} [props.activeSlug]
 * @param {string} [props.testIdPrefix]
 */
export default function DocsSurfacesBanner({
  activeSlug = '',
  testIdPrefix = 'docs-surfaces',
}) {
  return (
    <Alert
      severity="info"
      sx={{ mb: 2 }}
      data-testid={`${testIdPrefix}-banner`}
    >
      <AlertTitle>Three different “reviewer pack” surfaces</AlertTitle>
      <Stack spacing={0.75}>
        <Typography variant="body2">
          <strong>Paper packets A–E</strong>
          {activeSlug === 'reviewer-packets' ? ' (this page)' : ''} — markdown
          checklists for parallel review of the Unified Theory paper:{' '}
          <MuiLink
            component={RouterLink}
            to="/docs/reviewer-packets"
            data-testid={`${testIdPrefix}-paper-link`}
          >
            /docs/reviewer-packets
          </MuiLink>
          .
        </Typography>
        <Typography variant="body2">
          <strong>Campaign JSON packs</strong> —{' '}
          <code>lenr-reviewer-pack-v1</code> model-output SQL hydrate/export under{' '}
          <code>datasets/reviewer_packs/</code> (index below on the paper-packets
          page). CLI import/export only; not paper checklists.
        </Typography>
        <Typography variant="body2">
          <strong>Researcher review pack</strong>
          {activeSlug === 'researcher-review-pack' ? ' (this page)' : ''} — operator
          how-to for seed / hydrate / export:{' '}
          <MuiLink
            component={RouterLink}
            to="/docs/researcher-review-pack"
            data-testid={`${testIdPrefix}-researcher-link`}
          >
            /docs/researcher-review-pack
          </MuiLink>
          .
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          Honesty: <code>lenr_proved: false</code>; all five <code>EQ-OPEN-*</code>{' '}
          stay <strong>OPEN</strong>. Extra simulations and pack N do not prove LENR
          or discharge open obligations.
        </Typography>
      </Stack>
    </Alert>
  );
}
