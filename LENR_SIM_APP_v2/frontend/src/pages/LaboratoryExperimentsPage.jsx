/**
 * HIP-03 Laboratory Experiments hub (LAB-01…05).
 * First-class experimental path + corpus honesty hub.
 * Ask met ≠ EQ-OPEN discharge; no fabricated σ_Q; markers stay 0.3.9-beta.
 */
import React, { useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
  Box,
  Chip,
  Container,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import {
  CLOSURE_SURFACE_LINKS,
  CORPUS_MOE_COVERAGE,
  EQ_OPEN_RUNWAY,
  OPEN_EQ_IDS,
} from '../config/unifiedTheoryScienceEvidence';
import { track } from '../analytics/events';
import NextLabChecklist from '../components/science/NextLabChecklist';
import DischargeWalkthrough from '../components/science/DischargeWalkthrough';
import PositiveResultsOperatorPath from '../components/science/PositiveResultsOperatorPath';

export default function LaboratoryExperimentsPage() {
  useEffect(() => {
    track.docsViewed({ slug: 'lab-experiments', source: 'laboratory-experiments-hub' });
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 4 }} data-testid="lab-experiments-page">
      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <ScienceIcon color="primary" />
          <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="lab-experiments-title">
            Laboratory Experiments
          </Typography>
        </Stack>
        <Typography variant="body1" color="text.secondary" paragraph>
          First-class experimental path for resolving open questions or producing governed positive
          results — without closing EQ-OPEN-* or flipping <code>lenr_proved</code>. Soft analytics
          clear ≠ discovery. Lab Ask met ≠ EQ-OPEN discharge.
        </Typography>

        <Stack
          direction="row"
          spacing={0.5}
          useFlexGap
          flexWrap="wrap"
          sx={{ mb: 2 }}
          data-testid="lab-experiments-honesty-chips"
        >
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            label="lenr_proved: false"
            sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
          />
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            label="EQ-OPEN: OPEN"
            sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
          />
          <Chip
            size="small"
            variant="outlined"
            label="ask met ≠ discharge"
            sx={{ fontSize: '0.65rem' }}
          />
          <Chip
            size="small"
            variant="outlined"
            label="refuse fabricated σ_Q"
            sx={{ fontSize: '0.65rem' }}
          />
          {OPEN_EQ_IDS.map((id) => (
            <Chip
              key={id}
              size="small"
              color="warning"
              variant="outlined"
              label={`${id}: OPEN`}
              sx={{ fontFamily: 'monospace', fontSize: '0.55rem', height: 20 }}
            />
          ))}
        </Stack>

        <Alert severity="info" sx={{ mb: 2 }} data-testid="lab-experiments-corpus-hub">
          <AlertTitle>Corpus honesty hub</AlertTitle>
          <Typography variant="body2">
            Cite-gated discovery stays Kasagi{' '}
            <code>
              {CORPUS_MOE_COVERAGE.with_moe_pairing_verified ?? 2}/
              {CORPUS_MOE_COVERAGE.n_records ?? 26}
            </code>
            . Miles / Celani / De Ninno stay exploratory. Iwamura / Mizuno / Arata / Celani discovery
            σ stay refused. Runway status: <code>{EQ_OPEN_RUNWAY.status}</code>.
          </Typography>
        </Alert>

        <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
          <MuiLink
            component={RouterLink}
            to={CLOSURE_SURFACE_LINKS.virtual_lab_route}
            variant="body2"
            data-testid="lab-experiments-virtual-lab-link"
          >
            Open Questions Virtual Lab
          </MuiLink>
          <MuiLink
            component={RouterLink}
            to={CLOSURE_SURFACE_LINKS.analytics_route}
            variant="body2"
            data-testid="lab-experiments-analytics-link"
          >
            Analytics §5B / σ ladder
          </MuiLink>
          <MuiLink
            component={RouterLink}
            to={CLOSURE_SURFACE_LINKS.docs_eq_open_runway}
            variant="body2"
            data-testid="lab-experiments-runway-link"
          >
            EQ-OPEN closure runway
          </MuiLink>
          <MuiLink
            component={RouterLink}
            to={CLOSURE_SURFACE_LINKS.docs_testable_predictions}
            variant="body2"
            data-testid="lab-experiments-predictions-link"
          >
            Testable predictions
          </MuiLink>
          <MuiLink
            component={RouterLink}
            to={CLOSURE_SURFACE_LINKS.theory_paper_route}
            variant="body2"
            data-testid="lab-experiments-theory-paper-link"
          >
            Theory Paper §5
          </MuiLink>
        </Stack>
      </Paper>

      <Box id="next-lab" sx={{ scrollMarginTop: 96, mb: 3 }}>
        <NextLabChecklist testIdPrefix="lab-hub-next-lab" />
      </Box>

      <Box id="discharge" sx={{ scrollMarginTop: 96, mb: 3 }}>
        <DischargeWalkthrough testIdPrefix="lab-hub-discharge" />
      </Box>

      <Box id="positive-results" sx={{ scrollMarginTop: 96, mb: 3 }}>
        <PositiveResultsOperatorPath testIdPrefix="lab-hub-positive" />
      </Box>
    </Container>
  );
}
