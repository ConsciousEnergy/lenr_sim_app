import React from 'react';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import UnifiedBubbleLatticeVisualization from '../visualizations/UnifiedBubbleLatticeVisualization';
import ErrorBoundary from '../ErrorBoundary';

/**
 * 3D visualization tab. Optionally overlays the latest live-stream frame so
 * the unused bubble-lattice WebSocket finally has a consumer.
 */
export default function VisualizationPanel({
  parameters,
  simulationData,
  streamLatest = null,
  streamStatus = 'idle',
  onPhaseChange,
  onCollapseEvent,
}) {
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
      {streamStatus === 'streaming' && streamLatest && (
        <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
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
        </Stack>
      )}
      {simulationData?.electrolyte_diagnostics && (
        <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
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
        </Stack>
      )}
      <Box>
        <UnifiedBubbleLatticeVisualization
          parameters={parameters}
          simulationData={simulationData}
          onPhaseChange={onPhaseChange}
          onCollapseEvent={onCollapseEvent}
          height={550}
        />
      </Box>
    </ErrorBoundary>
  );
}
