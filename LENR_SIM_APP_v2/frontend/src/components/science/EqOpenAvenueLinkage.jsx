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
                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.25 }}>
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
