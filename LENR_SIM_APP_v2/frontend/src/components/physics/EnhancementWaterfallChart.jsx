/**
 * Log-contribution waterfall for enhancement mechanism breakdown.
 */
import React, { useState } from 'react';
import {
  Box,
  Chip,
  Collapse,
  Divider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { getEnhancementWaterfallData } from '../../utils/unifiedTheoryCharts';

const GROUP_COLORS = {
  barrier_screening: '#4caf50',
  collapse_geometry: '#00bcd4',
  field_coupling: '#ff9800',
  lattice_coupling: '#2196f3',
  material_loading: '#795548',
  electrolyte: '#607d8b',
};

function formatLog10(value) {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(2);
}

export default function EnhancementWaterfallChart({ breakdown, screeningProvenance }) {
  const [showSensitivity, setShowSensitivity] = useState(false);
  const data = getEnhancementWaterfallData(breakdown);
  if (!data.segments.length) return null;

  const maxLog = Math.max(
    data.claimTierLog10 + 0.5,
    ...data.segments.map((segment) => segment.endLog10),
    1,
  );

  return (
    <Box data-testid="enhancement-waterfall">
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Chip
          label={`Physics governed: 10^${formatLog10(data.governedLog10)}`}
          color="primary"
          size="small"
        />
        <Chip
          label={`Claim-tier display: ${data.claimTierTotal.toExponential(1)}`}
          size="small"
          variant="outlined"
        />
        <Chip
          label={showSensitivity ? 'Hide sensitivity model' : 'Show sensitivity model'}
          size="small"
          onClick={() => setShowSensitivity((open) => !open)}
          clickable
        />
      </Stack>

      <Box sx={{ position: 'relative', height: 36 + data.segments.length * 28, mb: 1 }}>
        {data.segments.map((segment, index) => {
          const left = (segment.startLog10 / maxLog) * 100;
          const width = Math.max(((segment.endLog10 - segment.startLog10) / maxLog) * 100, 0.5);
          const color = GROUP_COLORS[segment.group] || '#888';
          const tooltipSuffix = segment.id === 'barrier_screening'
            && screeningProvenance?.log10_enhancement_raw != null
            && segment.isSaturated
            ? ` (true log₁₀ raw: ${formatLog10(screeningProvenance.log10_enhancement_raw)})`
            : '';
          return (
            <Tooltip
              key={segment.id}
              title={`${segment.label}: 10^${formatLog10(segment.log10Value)}${
                segment.isSaturated ? ' (reporting limit)' : ''
              }${tooltipSuffix}`}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: index * 28,
                  left: `${left}%`,
                  width: `${width}%`,
                  height: 22,
                  bgcolor: color,
                  borderRadius: 0.5,
                  opacity: segment.isSaturated ? 0.55 : 0.9,
                  border: segment.isSaturated ? '1px dashed' : 'none',
                  borderColor: 'warning.main',
                  display: 'flex',
                  alignItems: 'center',
                  px: 0.5,
                }}
              >
                <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                  {segment.label}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
        <Box
          sx={{
            position: 'absolute',
            left: `${(data.claimTierLog10 / maxLog) * 100}%`,
            top: 0,
            bottom: 0,
            width: 2,
            borderLeft: '2px dashed',
            borderColor: 'warning.main',
          }}
        />
      </Box>

      <Typography variant="caption" color="text.secondary" display="block">
        Stacked log₁₀ contributions by composition group; dashed line = claim-tier ceiling (10⁵).
      </Typography>

      <Collapse in={showSensitivity}>
        <Divider sx={{ my: 1 }} />
        <Typography variant="caption" color="text.secondary">
          Sensitivity model (exploratory upper bound): 10^{formatLog10(data.sensitivityLog10)}
        </Typography>
      </Collapse>
    </Box>
  );
}
