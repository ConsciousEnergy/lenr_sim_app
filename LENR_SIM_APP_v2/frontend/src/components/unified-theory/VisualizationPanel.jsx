import React, { Suspense, lazy, useMemo } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ErrorBoundary from '../ErrorBoundary';
import {
  isCompactVisualViewport,
  MOBILE_VISUAL_MAX_WIDTH_PX,
} from '../controls/TouchControls';

const UnifiedBubbleLatticeVisualization = lazy(() =>
  import('../visualizations/UnifiedBubbleLatticeVisualization')
);

const DESKTOP_CANVAS_HEIGHT = 550;

function resolveCanvasHeight(isCompact) {
  if (typeof window === 'undefined') {
    return isCompact ? 360 : DESKTOP_CANVAS_HEIGHT;
  }
  if (!isCompact) return DESKTOP_CANVAS_HEIGHT;
  const vhBudget = Math.round(window.innerHeight * 0.5);
  return Math.max(280, Math.min(vhBudget, 420));
}

/**
 * 3D visualization tab. Optionally overlays the latest live-stream frame so
 * the unused bubble-lattice WebSocket finally has a consumer.
 *
 * The bubble-lattice Three.js module is lazy-loaded so the Unified Theory
 * shell (presets, Run, tabs) can paint before the `three` chunk arrives.
 */
export default function VisualizationPanel({
  parameters,
  simulationData,
  streamLatest = null,
  streamStatus = 'idle',
  onPhaseChange,
  onCollapseEvent,
}) {
  const theme = useTheme();
  const isCompact =
    useMediaQuery(`(max-width:${MOBILE_VISUAL_MAX_WIDTH_PX}px)`) || isCompactVisualViewport();
  const canvasHeight = useMemo(() => resolveCanvasHeight(isCompact), [isCompact]);

  const liveChips =
    streamStatus === 'streaming' && streamLatest ? (
      <>
        <Chip size="small" color="secondary" label="Live stream" />
        <Chip size="small" label={`Phase: ${streamLatest.phase || '—'}`} />
        <Chip
          size="small"
          label={`Enhancement: ${
            typeof streamLatest.enhancement === 'number'
              ? streamLatest.enhancement.toExponential(2)
              : '—'
          }`}
        />
        <Chip
          size="small"
          label={`R: ${
            typeof streamLatest.radius_um === 'number'
              ? `${streamLatest.radius_um.toFixed(2)} μm`
              : '—'
          }`}
        />
      </>
    ) : null;

  const electrolyteChips = simulationData?.electrolyte_diagnostics ? (
    <>
      <Chip
        size="small"
        color="info"
        label={`Electrolyte multiplier: ${(simulationData.electrolyte_diagnostics.activity_multiplier || 1).toFixed(3)}x`}
      />
      <Chip
        size="small"
        color="default"
        label={`Species-family consistent: ${simulationData.electrolyte_diagnostics.species_family_consistent ? 'yes' : 'no'}`}
      />
    </>
  ) : null;

  const diagnosticChips = (liveChips || electrolyteChips) && (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {liveChips}
      {electrolyteChips}
    </Stack>
  );

  return (
    <ErrorBoundary
      fallback={
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="h6">Visualization Error</Typography>
          <Typography variant="body2">
            An error occurred while rendering the 3D visualization.
            Please try refreshing the page or adjusting the parameters.
          </Typography>
        </Alert>
      }
    >
      <Box
        sx={{
          width: '100%',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {diagnosticChips &&
          (isCompact ? (
            <Accordion
              disableGutters
              elevation={0}
              sx={{
                mb: 1,
                '&:before': { display: 'none' },
                bgcolor: theme.palette.action.hover,
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="viz-diagnostics-content">
                <Typography variant="caption" color="text.secondary">
                  Stream & electrolyte diagnostics
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>{diagnosticChips}</AccordionDetails>
            </Accordion>
          ) : (
            <Box sx={{ mb: 1 }}>{diagnosticChips}</Box>
          ))}

        <Box
          sx={{
            width: '100%',
            minWidth: 0,
            minHeight: canvasHeight,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Suspense
            fallback={
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: canvasHeight,
                }}
              >
                <CircularProgress aria-label="Loading 3D visualization" />
              </Box>
            }
          >
            <UnifiedBubbleLatticeVisualization
              parameters={parameters}
              simulationData={simulationData}
              streamLatest={streamLatest}
              streamStatus={streamStatus}
              onPhaseChange={onPhaseChange}
              onCollapseEvent={onCollapseEvent}
              height={canvasHeight}
            />
          </Suspense>
        </Box>
      </Box>
    </ErrorBoundary>
  );
}