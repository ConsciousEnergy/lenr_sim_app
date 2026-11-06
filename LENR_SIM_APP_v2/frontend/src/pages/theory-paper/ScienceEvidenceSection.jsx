/**
 * ScienceEvidenceSection — Phase E Theory Paper surfaces for campaign,
 * avenue ranking, Lean/formalization, and EQ-OPEN runway (read-only, honest).
 */
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
  Box,
  Chip,
  Divider,
  Link as MuiLink,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  AVENUE_RANKING_SUMMARY,
  CAMPAIGN_EVIDENCE,
  EQ_OPEN_RUNWAY,
  FORMALIZATION_STATUS,
  SCIENCE_EVIDENCE_HONESTY,
} from '../../config/unifiedTheoryScienceEvidence';

function OpenIdChips({ ids }) {
  return (
    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
      {ids.map((id) => (
        <Chip
          key={id}
          label={`${id}: OPEN`}
          size="small"
          color="warning"
          variant="outlined"
          sx={{ fontFamily: 'monospace', fontSize: '0.65rem', height: 20 }}
        />
      ))}
    </Stack>
  );
}

/**
 * @param {Object} props
 * @param {boolean} [props.embedded]
 */
export default function ScienceEvidenceSection({ embedded = false }) {
  const Wrapper = embedded ? Box : Paper;
  const wrapperSx = embedded ? { mb: 2 } : { p: 3, mb: 2 };
  const wrapperProps = embedded ? {} : { elevation: 1 };

  return (
    <Wrapper
      {...wrapperProps}
      sx={wrapperSx}
      data-testid="theory-paper-science-evidence"
    >
      {!embedded && (
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          Science evidence (campaign, ranking, formalization)
        </Typography>
      )}

      <Alert severity="warning" sx={{ mb: 2 }} data-testid="science-evidence-honesty">
        <AlertTitle>
          Honesty — <code>lenr_proved: false</code>
        </AlertTitle>
        <Typography variant="body2">{SCIENCE_EVIDENCE_HONESTY.disclaimer}</Typography>
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
          <Chip
            label="lenr_proved: false"
            size="small"
            color="warning"
            variant="outlined"
            data-testid="science-evidence-lenr-proved"
          />
          <Chip
            label="scenario_table_not_posterior"
            size="small"
            variant="outlined"
            sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
          />
          <Chip
            label="EQ-OPEN-* remain OPEN"
            size="small"
            color="warning"
            variant="outlined"
          />
        </Stack>
        <OpenIdChips ids={SCIENCE_EVIDENCE_HONESTY.open_ids} />
      </Alert>

      {/* Campaign / reviewer pack */}
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} data-testid="science-evidence-campaign">
        {CAMPAIGN_EVIDENCE.title}
      </Typography>
      <Typography variant="body2" paragraph>
        Preset <code>{CAMPAIGN_EVIDENCE.preset}</code> reviewer pack (
        {CAMPAIGN_EVIDENCE.n_experiments} experiments / {CAMPAIGN_EVIDENCE.n_theory_runs}{' '}
        theory runs). Labelled <strong>{CAMPAIGN_EVIDENCE.hydro_label}</strong>; literature
        anchor: {CAMPAIGN_EVIDENCE.literature_anchor}.
      </Typography>
      <Typography variant="body2" paragraph color="text.secondary">
        {CAMPAIGN_EVIDENCE.note}
      </Typography>
      <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
        Pack: <code>{CAMPAIGN_EVIDENCE.pack_path}</code>
        <br />
        Evidence index: <code>{CAMPAIGN_EVIDENCE.simulation_evidence_path}</code>
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
        <MuiLink component={RouterLink} to="/docs/reviewer-packets" variant="body2">
          Reviewer packets guide
        </MuiLink>
        <MuiLink component={RouterLink} to="/docs/researcher-review-pack" variant="body2">
          Researcher review pack
        </MuiLink>
        <MuiLink component={RouterLink} to="/unified-theory" variant="body2">
          Unified Theory simulation
        </MuiLink>
      </Stack>

      <Divider sx={{ my: 2 }} />

      {/* Avenue ranking */}
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} data-testid="science-evidence-avenue-ranking">
        {AVENUE_RANKING_SUMMARY.title}
      </Typography>
      <Alert severity="info" sx={{ my: 1 }}>
        <Typography variant="body2">{AVENUE_RANKING_SUMMARY.non_proof}</Typography>
      </Alert>
      <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
        Kind: <code>{AVENUE_RANKING_SUMMARY.kind}</code> · claim tier:{' '}
        <code>{AVENUE_RANKING_SUMMARY.claim_tier}</code> · preferred pack:{' '}
        <code>{AVENUE_RANKING_SUMMARY.preferred_pack}</code>
        <br />
        Note: <code>{AVENUE_RANKING_SUMMARY.doc_path}</code>
      </Typography>
      <List dense data-testid="science-evidence-avenue-list">
        {AVENUE_RANKING_SUMMARY.avenues.map((avenue, index) => (
          <ListItem key={avenue.id} alignItems="flex-start" sx={{ py: 0.5 }}>
            <ListItemText
              primary={`${index + 1}. ${avenue.label}`}
              secondary={
                <Box component="span">
                  <Typography variant="caption" component="span" color="text.secondary">
                    <code>{avenue.id}</code> stresses{' '}
                  </Typography>
                  {avenue.stresses.map((oid) => (
                    <Chip
                      key={oid}
                      label={`${oid}: OPEN`}
                      size="small"
                      color="warning"
                      variant="outlined"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.6rem',
                        height: 18,
                        mr: 0.5,
                        mt: 0.25,
                      }}
                    />
                  ))}
                </Box>
              }
              secondaryTypographyProps={{ component: 'div' }}
            />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />

      {/* Formalization / Lean */}
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} data-testid="science-evidence-formalization">
        {FORMALIZATION_STATUS.title}
      </Typography>
      <Typography variant="body2" paragraph>
        {FORMALIZATION_STATUS.summary}
      </Typography>
      <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
        Status: <code>{FORMALIZATION_STATUS.status_doc}</code>
        <br />
        Collapse module: <code>{FORMALIZATION_STATUS.collapse_module}</code>
      </Typography>
      <List dense>
        {FORMALIZATION_STATUS.items.map((item) => (
          <ListItem key={item.id} sx={{ py: 0.5 }}>
            <ListItemText
              primary={
                <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" alignItems="center">
                  <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
                    {item.label}
                  </Typography>
                  <Chip
                    label={item.kind}
                    size="small"
                    variant="outlined"
                    color={item.kind === 'open' || item.kind === 'non-closure' ? 'warning' : 'default'}
                    sx={{ fontSize: '0.65rem', height: 18 }}
                  />
                  <Chip
                    label={item.id}
                    size="small"
                    variant="outlined"
                    sx={{ fontFamily: 'monospace', fontSize: '0.6rem', height: 18 }}
                  />
                </Stack>
              }
              secondary={item.note}
            />
          </ListItem>
        ))}
      </List>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <strong>Bounds ≠ empirical closure.</strong> Clamp and non-closure theorems are
        mathematical bookkeeping under stated inputs — not laboratory discharge of open
        obligations.
      </Typography>

      <Divider sx={{ my: 2 }} />

      {/* EQ-OPEN runway */}
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} data-testid="science-evidence-eq-open-runway">
        {EQ_OPEN_RUNWAY.title}
      </Typography>
      <Alert severity="warning" sx={{ my: 1 }}>
        <AlertTitle>Status: all listed obligations remain OPEN</AlertTitle>
        <Typography variant="body2">{EQ_OPEN_RUNWAY.note}</Typography>
      </Alert>
      <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
        Criteria doc: <code>{EQ_OPEN_RUNWAY.doc_path}</code>
      </Typography>
      <OpenIdChips ids={EQ_OPEN_RUNWAY.open_ids} />
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
        <MuiLink component={RouterLink} to="/docs/issue-ledger" variant="body2">
          Issue ledger
        </MuiLink>
        <MuiLink component={RouterLink} to="/docs/testable-predictions" variant="body2">
          Testable predictions
        </MuiLink>
        <MuiLink component={RouterLink} to="/unified-theory?tab=results" variant="body2">
          Open Questions Virtual Lab
        </MuiLink>
      </Stack>
    </Wrapper>
  );
}
