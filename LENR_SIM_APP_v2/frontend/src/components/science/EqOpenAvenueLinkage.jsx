/**
 * Analytics ↔ AVENUE_RANKING ↔ EQ_OPEN_CLOSURE_RUNWAY cross-links.
 * Read-only; every EQ-OPEN row stays OPEN; never claims ≥5σ discovery.
 */
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Chip,
  Link as MuiLink,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import {
  AVENUE_RANKING_SUMMARY,
  CLOSURE_SURFACE_LINKS,
  EQ_OPEN_RUNWAY,
  NEXT_LAB_MOE_TARGETS,
} from '../../config/unifiedTheoryScienceEvidence';
import { CLAIM_TIERS } from '../../utils/theoryGovernance';

/** Claim-tier chip beside numeric lab-target captions (optics only). */
function ClaimTierChip({ tier, testId }) {
  if (!tier) return null;
  const info = CLAIM_TIERS[tier];
  return (
    <Chip
      label={info?.label || String(tier).replace(/_/g, ' ')}
      title={info?.description || tier}
      color={info?.color || 'default'}
      size="small"
      variant="outlined"
      data-testid={testId}
      data-claim-tier={tier}
      sx={{ fontSize: '0.65rem', height: 18 }}
    />
  );
}

/**
 * @param {Object} props
 * @param {string} [props.testIdPrefix]
 * @param {'compact'|'full'} [props.density]
 */
export default function EqOpenAvenueLinkage({
  testIdPrefix = 'closure-linkage',
  density = 'full',
}) {
  const isCompact = density === 'compact';
  return (
    <Stack spacing={1} data-testid={`${testIdPrefix}-panel`}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
        {CLOSURE_SURFACE_LINKS.title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {CLOSURE_SURFACE_LINKS.note}
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <MuiLink
          component={RouterLink}
          to={CLOSURE_SURFACE_LINKS.analytics_route}
          variant="body2"
          data-testid={`${testIdPrefix}-analytics`}
        >
          Analytics
        </MuiLink>
        <MuiLink
          component={RouterLink}
          to={CLOSURE_SURFACE_LINKS.theory_paper_route}
          variant="body2"
          data-testid={`${testIdPrefix}-theory-paper`}
        >
          Theory Paper §5B
        </MuiLink>
        <MuiLink
          component={RouterLink}
          to={CLOSURE_SURFACE_LINKS.docs_reviewer_packets}
          variant="body2"
        >
          Reviewer packets
        </MuiLink>
        <MuiLink
          component={RouterLink}
          to={CLOSURE_SURFACE_LINKS.docs_issue_ledger}
          variant="body2"
        >
          Issue ledger
        </MuiLink>
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block">
        Avenue doc: <code>{CLOSURE_SURFACE_LINKS.avenue_doc_path}</code>
        <br />
        Runway doc: <code>{CLOSURE_SURFACE_LINKS.runway_doc_path}</code>
      </Typography>

      <List dense disablePadding data-testid={`${testIdPrefix}-rows`}>
        {EQ_OPEN_RUNWAY.criteria.map((row) => {
          const avenues = AVENUE_RANKING_SUMMARY.avenues.filter((avenue) =>
            (row.related_avenues || []).includes(avenue.id),
          );
          const labTargets = NEXT_LAB_MOE_TARGETS.filter((target) =>
            (target.eq_open_ids || []).includes(row.id),
          );
          return (
            <ListItem key={row.id} alignItems="flex-start" sx={{ px: 0, py: 0.5 }}>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" alignItems="center">
                    <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
                      {row.id}
                    </Typography>
                    <Chip
                      size="small"
                      color="warning"
                      variant="outlined"
                      label="OPEN"
                      sx={{ fontFamily: 'monospace', fontSize: '0.6rem', height: 18 }}
                      data-testid={`${testIdPrefix}-open-${row.id}`}
                    />
                    {!isCompact && row.five_sigma_relevance && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={row.five_sigma_relevance}
                        sx={{ fontFamily: 'monospace', fontSize: '0.55rem', height: 18 }}
                        data-testid={`${testIdPrefix}-5sigma-${row.id}`}
                      />
                    )}
                  </Stack>
                }
                secondary={
                  <Stack spacing={0.25} sx={{ mt: 0.25 }}>
                    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                      {avenues.map((avenue) => (
                        <Chip
                          key={avenue.id}
                          size="small"
                          variant="outlined"
                          label={avenue.id}
                          title={`${avenue.label} · ${avenue.five_sigma_role || ''}`}
                          sx={{ fontFamily: 'monospace', fontSize: '0.55rem', height: 18 }}
                          data-testid={`${testIdPrefix}-avenue-${row.id}-${avenue.id}`}
                        />
                      ))}
                    </Stack>
                    {!isCompact &&
                      labTargets.map((target) => (
                        <Stack
                          key={target.id}
                          spacing={0.1}
                          data-testid={`${testIdPrefix}-lab-target-${row.id}-${target.id}`}
                        >
                          <Stack
                            direction="row"
                            spacing={0.5}
                            useFlexGap
                            flexWrap="wrap"
                            alignItems="center"
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              component="span"
                            >
                              Next lab MoE: {target.target}
                            </Typography>
                            <ClaimTierChip
                              tier={target.claim_tier || 'speculative_exploratory'}
                              testId={`${testIdPrefix}-lab-tier-${row.id}-${target.id}`}
                            />
                          </Stack>
                          {target.lab_acceptance ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              data-testid={`${testIdPrefix}-lab-accept-${row.id}-${target.id}`}
                            >
                              Accept: {target.lab_acceptance}
                            </Typography>
                          ) : null}
                          {target.corpus_gap_now ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              data-testid={`${testIdPrefix}-lab-gap-${row.id}-${target.id}`}
                            >
                              Gap now: {target.corpus_gap_now}
                            </Typography>
                          ) : null}
                          {target.still_does_not_discharge ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              data-testid={`${testIdPrefix}-lab-still-${row.id}-${target.id}`}
                            >
                              Ask met ≠ discharge: {target.still_does_not_discharge}
                            </Typography>
                          ) : null}
                        </Stack>
                      ))}
                  </Stack>
                }
                secondaryTypographyProps={{ component: 'div' }}
              />
            </ListItem>
          );
        })}
      </List>
    </Stack>
  );
}
