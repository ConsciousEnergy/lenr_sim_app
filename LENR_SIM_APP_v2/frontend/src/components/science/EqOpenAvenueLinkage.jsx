/**
 * Analytics ↔ AVENUE_RANKING ↔ EQ_OPEN_CLOSURE_RUNWAY cross-links.
 * Read-only; every EQ-OPEN row stays OPEN; never claims ≥5σ discovery.
 * BDS-354 / gap-map P3: inline Affirmative / Falsification / Does-not-count
 * excerpts beside OPEN chips (criteria documented, not met).
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
  DAQ_SAMPLE_PROVENANCE,
  EQ_OPEN_RUNWAY,
  NEXT_LAB_MOE_TARGETS,
} from '../../config/unifiedTheoryScienceEvidence';

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
      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" alignItems="center">
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label="EQ-OPEN status: OPEN"
          sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
          data-testid={`${testIdPrefix}-status-open`}
        />
        <Chip
          size="small"
          variant="outlined"
          label="criteria documented · not met"
          sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
          data-testid={`${testIdPrefix}-criteria-not-met`}
        />
      </Stack>
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
          to={CLOSURE_SURFACE_LINKS.docs_eq_open_runway}
          variant="body2"
          data-testid={`${testIdPrefix}-runway-doc`}
        >
          EQ-OPEN closure runway
        </MuiLink>
        <MuiLink
          component={RouterLink}
          to={CLOSURE_SURFACE_LINKS.docs_reviewer_packets}
          variant="body2"
          data-testid={`${testIdPrefix}-reviewer-packets`}
        >
          Reviewer packets (+ crosswalk)
        </MuiLink>
        <MuiLink
          component={RouterLink}
          to={CLOSURE_SURFACE_LINKS.docs_issue_ledger}
          variant="body2"
          data-testid={`${testIdPrefix}-issue-ledger`}
        >
          Issue ledger
        </MuiLink>
        {CLOSURE_SURFACE_LINKS.docs_testable_predictions ? (
          <MuiLink
            component={RouterLink}
            to={CLOSURE_SURFACE_LINKS.docs_testable_predictions}
            variant="body2"
            data-testid={`${testIdPrefix}-testable-predictions`}
          >
            Testable predictions
          </MuiLink>
        ) : null}
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block">
        Avenue doc: <code>{CLOSURE_SURFACE_LINKS.avenue_doc_path}</code>
        <br />
        Runway doc: <code>{CLOSURE_SURFACE_LINKS.runway_doc_path}</code>
        {' · '}
        in-app:{' '}
        <MuiLink
          component={RouterLink}
          to={CLOSURE_SURFACE_LINKS.docs_eq_open_runway}
          variant="caption"
        >
          {CLOSURE_SURFACE_LINKS.docs_eq_open_runway}
        </MuiLink>
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
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      data-testid={`${testIdPrefix}-affirmative-${row.id}`}
                    >
                      Affirmative: {row.affirmative}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      data-testid={`${testIdPrefix}-falsification-${row.id}`}
                    >
                      Falsification: {row.falsification}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      data-testid={`${testIdPrefix}-does-not-count-${row.id}`}
                    >
                      Does not count: {row.does_not_count}
                    </Typography>
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
                              Next lab MoE:
                            </Typography>
                            <Chip
                              size="small"
                              color="warning"
                              variant="outlined"
                              label={target.status || 'blocked_awaiting_lab'}
                              data-testid={`${testIdPrefix}-lab-status-${row.id}-${target.id}`}
                              sx={{
                                fontFamily: 'monospace',
                                fontSize: '0.55rem',
                                height: 18,
                              }}
                            />
                          </Stack>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            {target.target}
                          </Typography>
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
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            data-testid={`${testIdPrefix}-lab-daq-${row.id}-${target.id}`}
                          >
                            DAQ:{' '}
                            <code>
                              {target.daq_schema || DAQ_SAMPLE_PROVENANCE.schema_id}
                            </code>
                            {' · '}
                            {Array.isArray(target.daq_observables) &&
                            target.daq_observables.length > 0
                              ? target.daq_observables.join(', ')
                              : 'no sample-v1 observables'}
                            {target.daq_gap_note ? ` · ${target.daq_gap_note}` : ''}
                          </Typography>
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
