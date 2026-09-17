/**
 * TheoryTestbedCard
 *
 * Compact Theory Testbed for the main dashboard. The full TheoryTogglePanel is
 * a tall side panel built for the Unified Theory workspace; this card exposes
 * the same pipeline run (POST /api/physics/theories/run via PhysicsContext) in
 * a hub-sized surface so a run can be started without navigating first.
 *
 * Results are written to the shared, persisted `theoryResult`, so Advanced
 * Analysis and the full testbed both pick them up with no re-run.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AssessmentIcon from '@mui/icons-material/Assessment';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Link as RouterLink } from 'react-router-dom';
import { usePhysics } from '../../contexts/PhysicsContext';
import { track } from '../../analytics/events';
import { buildTheoryConditions } from '../../utils/theoryConditions';
import { claimTierMultiplier, CLAIM_TIERS } from '../../utils/theoryGovernance';
import TheoryFidelityHonestySummary from './TheoryFidelityHonestySummary';

/** How many contributions to list before deferring to the full testbed. */
const TOP_CONTRIBUTION_COUNT = 5;

const formatFactor = (value) => {
  if (value == null || Number.isNaN(Number(value))) return 'N/A';
  return `${Number(value).toExponential(2)}x`;
};

function TheoryTestbedCard({ parameters }) {
  const {
    availableTheories,
    enabledTheories,
    theoryResult,
    isLoadingTheories,
    setEnabledTheories,
    fetchTheories,
    runTheories,
  } = usePhysics();

  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState(null);

  useEffect(() => {
    if (availableTheories.length === 0) {
      fetchTheories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const conditions = useMemo(
    () => buildTheoryConditions({ parameters }),
    [parameters],
  );

  const handleToggle = useCallback(
    (theoryId) => {
      const enabled = !enabledTheories.includes(theoryId);
      track.theoryToggled({ theory_id: theoryId, enabled, surface: 'dashboard_card' });
      setEnabledTheories(
        enabled
          ? [...enabledTheories, theoryId]
          : enabledTheories.filter((id) => id !== theoryId),
      );
    },
    [enabledTheories, setEnabledTheories],
  );

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setRunError(null);
    try {
      const result = await runTheories(conditions);
      if (!result) setRunError('Theory run failed. Check that the backend is reachable.');
    } finally {
      setIsRunning(false);
    }
  }, [conditions, runTheories]);

  const topContributions = useMemo(() => {
    const perTheory = theoryResult?.per_theory || [];
    return [...perTheory]
      .filter((c) => c.is_applicable)
      .sort(
        (a, b) =>
          b.enhancement_factor * claimTierMultiplier(b.claim_tier) -
          a.enhancement_factor * claimTierMultiplier(a.claim_tier),
      )
      .slice(0, TOP_CONTRIBUTION_COUNT);
  }, [theoryResult]);

  if (isLoadingTheories && availableTheories.length === 0) {
    return (
      <Paper elevation={1} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2">Loading theory modules...</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <ScienceIcon fontSize="small" color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Theory Testbed
        </Typography>
        {availableTheories.length > 0 && (
          <Chip
            label={`${enabledTheories.length}/${availableTheories.length} enabled`}
            size="small"
            variant="outlined"
          />
        )}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Run the theory pipeline against reference Pd-D conditions without leaving the
        dashboard. Results feed Advanced Analysis directly.
      </Typography>

      {/* Stack labelling: this number comes from the theory pipeline, which composes
          group winners. It is not the bubble-lattice peak enhancement and the two
          must not be multiplied together. */}
      <Alert severity="info" icon={false} sx={{ mb: 2, py: 0.5 }}>
        <Typography variant="caption">
          Theory-pipeline result (grouped composition). Separate from the bubble-lattice
          simulation&apos;s peak enhancement; the two are not combinable.
        </Typography>
      </Alert>

      {availableTheories.length === 0 ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No theory modules available. Confirm the backend is running.
        </Alert>
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
              Select theories
            </Typography>
            <Button
              size="small"
              onClick={() => setEnabledTheories(availableTheories.map((t) => t.theory_id))}
              sx={{ fontSize: '0.7rem', minWidth: 0 }}
            >
              All
            </Button>
            <Button
              size="small"
              onClick={() => setEnabledTheories([])}
              sx={{ fontSize: '0.7rem', minWidth: 0 }}
            >
              None
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
            {availableTheories.map((theory) => {
              const enabled = enabledTheories.includes(theory.theory_id);
              return (
                // describeChild keeps the theory name as the chip's accessible
                // name; without it MUI promotes the tooltip text to aria-label
                // and the control loses its name entirely.
                <Tooltip
                  key={theory.theory_id}
                  title={theory.description || theory.theory_name}
                  describeChild
                >
                  <Chip
                    label={theory.theory_name}
                    size="small"
                    color={enabled ? 'primary' : 'default'}
                    variant={enabled ? 'filled' : 'outlined'}
                    onClick={() => handleToggle(theory.theory_id)}
                    aria-pressed={enabled}
                    sx={{ fontSize: '0.68rem' }}
                  />
                </Tooltip>
              );
            })}
          </Box>

          <Button
            variant="contained"
            size="small"
            fullWidth
            startIcon={isRunning ? <CircularProgress size={14} color="inherit" /> : <PlayArrowIcon />}
            onClick={handleRun}
            disabled={isRunning || enabledTheories.length === 0}
            sx={{ mb: 1 }}
          >
            {isRunning ? 'Running pipeline...' : 'Run Selected Theories'}
          </Button>
        </>
      )}

      {runError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {runError}
        </Alert>
      )}

      {theoryResult && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="caption" color="text.secondary">
            Combined enhancement
          </Typography>
          <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
            {formatFactor(theoryResult.combined_enhancement)}
          </Typography>
          <TheoryFidelityHonestySummary theoryResult={theoryResult} />

          {topContributions.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Top contributions (claim-tier weighted)
              </Typography>
              {topContributions.map((contribution) => {
                const multiplier = claimTierMultiplier(contribution.claim_tier);
                const tier = CLAIM_TIERS[contribution.claim_tier];
                // Bar length is log-scaled against the display ceiling, so it is a
                // relative magnitude indicator rather than a physical fraction.
                const logFraction = Math.min(
                  100,
                  (Math.log10(Math.max(contribution.enhancement_factor, 1)) / 5) * 100,
                );
                return (
                  <Box key={contribution.theory_id} sx={{ mb: 0.75 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ flex: 1 }} noWrap>
                        {contribution.theory_name}
                      </Typography>
                      {tier && (
                        <Tooltip title={tier.description}>
                          <Chip
                            label={`${multiplier.toFixed(2)}x`}
                            size="small"
                            color={tier.color}
                            variant="outlined"
                            sx={{ height: 16, fontSize: '0.6rem' }}
                          />
                        </Tooltip>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {formatFactor(contribution.enhancement_factor)}
                      </Typography>
                    </Box>
                    <Tooltip title="Log10 magnitude relative to the 1e5 display ceiling, not a percentage of any total">
                      <LinearProgress
                        variant="determinate"
                        value={logFraction}
                        sx={{ height: 4, borderRadius: 2 }}
                      />
                    </Tooltip>
                  </Box>
                );
              })}
            </Box>
          )}
        </>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        {!!theoryResult?.per_theory?.length && (
          <Button
            component={RouterLink}
            to="/advanced-analysis"
            variant="outlined"
            size="small"
            fullWidth
            startIcon={<AssessmentIcon />}
          >
            View in Advanced Analysis
          </Button>
        )}
        <Button
          component={RouterLink}
          to="/unified-theory?tab=testbed"
          variant="text"
          size="small"
          fullWidth
          startIcon={<OpenInNewIcon />}
        >
          Full testbed
        </Button>
      </Stack>
    </Paper>
  );
}

export default TheoryTestbedCard;
