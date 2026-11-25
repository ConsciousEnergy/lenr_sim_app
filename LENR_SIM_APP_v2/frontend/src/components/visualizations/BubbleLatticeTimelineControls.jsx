/**
 * Scrubbable dual-clock timeline controls for UBLV (VIZ-01).
 * Mirrors Fusion scrub UX: play/pause, restart, step, scrub slider.
 * #409 M4: compact viewports get stacked, thumb-reachable scrubber layout.
 */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  IconButton,
  Paper,
  Slider,
  Stack,
  Typography,
  Chip,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import { formatDualClockAtFraction, formatCycleTimeChip } from '../../utils/bubblePhaseSchedule';
import {
  isCompactVisualViewport,
  MOBILE_VISUAL_MAX_WIDTH_PX,
} from '../controls/TouchControls';

/** Larger hit target for phone thumbs (MUI default thumb is ~13px). */
const COMPACT_SCRUBBER_SX = {
  height: 36,
  py: 1,
  touchAction: 'none',
  '& .MuiSlider-rail': { height: 6, borderRadius: 3 },
  '& .MuiSlider-track': { height: 6, borderRadius: 3 },
  '& .MuiSlider-thumb': {
    width: 28,
    height: 28,
    '&:hover, &.Mui-focusVisible, &.Mui-active': {
      boxShadow: '0 0 0 10px rgba(25, 118, 210, 0.16)',
    },
  },
};

/**
 * @param {object} props
 */
export default function BubbleLatticeTimelineControls({
  isPlaying,
  onPlayPause,
  onRestart,
  onStepForward,
  onStepBackward,
  cycleFraction,
  onScrub,
  animationSpeed,
  onSpeedChange,
  frequencyKhz,
  streamLocked = false,
  bufferSampleCount = 0,
  children,
}) {
  const isCompact =
    useMediaQuery(`(max-width:${MOBILE_VISUAL_MAX_WIDTH_PX}px)`) || isCompactVisualViewport();
  const dual = formatDualClockAtFraction(frequencyKhz, cycleFraction);
  const scrubDisabled = streamLocked;

  const transportButtons = (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      flexShrink={0}
      data-testid="ublv-transport"
    >
      <IconButton
        onClick={onPlayPause}
        disabled={streamLocked}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        data-testid="ublv-play-pause"
        size={isCompact ? 'large' : 'medium'}
      >
        {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
      </IconButton>
      <IconButton
        onClick={onRestart}
        aria-label="Restart"
        data-testid="ublv-restart"
        size={isCompact ? 'large' : 'medium'}
      >
        <RestartAltIcon />
      </IconButton>
      <IconButton
        onClick={onStepBackward}
        disabled={streamLocked}
        aria-label="Step backward"
        data-testid="ublv-step-back"
        size={isCompact ? 'large' : 'medium'}
      >
        <SkipPreviousIcon />
      </IconButton>
      <IconButton
        onClick={onStepForward}
        disabled={streamLocked}
        aria-label="Step forward"
        data-testid="ublv-step-forward"
        size={isCompact ? 'large' : 'medium'}
      >
        <SkipNextIcon />
      </IconButton>
    </Stack>
  );

  const clockChips = (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      flexWrap="wrap"
      useFlexGap
      sx={{ mb: isCompact ? 0.5 : 0.5 }}
    >
      <Typography variant="caption" color="text.secondary">
        Scrub cycle ({(cycleFraction * 100).toFixed(0)}%)
      </Typography>
      <Tooltip title="t_phys: acoustic period fraction (collapse flash ≪ period). t_visual: remapped scrub via VISUAL_CYCLE_SCALE — never real-time collapse.">
        <Chip
          size="small"
          label={`t_phys ${dual.label.split(' · ')[0]}`}
          data-testid="ublv-t-phys"
          sx={{ fontSize: '0.65rem', height: 20 }}
        />
      </Tooltip>
      <Tooltip title="Remapped visual clock for human-readable scrub. Torus/jet dwell is a flash fraction — not a sustained burn.">
        <Chip
          size="small"
          label={`t_visual ${dual.label.split(' · ')[1] || dual.label}`}
          data-testid="ublv-t-visual"
          sx={{ fontSize: '0.65rem', height: 20 }}
        />
      </Tooltip>
      <Chip
        size="small"
        variant="outlined"
        label={formatCycleTimeChip(frequencyKhz)}
        data-testid="ublv-period-chip"
        sx={{ fontSize: '0.6rem', height: 20 }}
      />
      <Chip
        size="small"
        label={dual.label}
        data-testid="ublv-dual-clock"
        sx={{ display: 'none' }}
      />
      {bufferSampleCount > 0 && (
        <Chip
          size="small"
          color="primary"
          variant="outlined"
          label={`${bufferSampleCount} engine samples`}
          data-testid="ublv-sample-count"
          sx={{ fontSize: '0.6rem', height: 20 }}
        />
      )}
      {streamLocked && (
        <Chip
          size="small"
          color="warning"
          label="live stream"
          sx={{ fontSize: '0.6rem', height: 20 }}
        />
      )}
    </Stack>
  );

  const scrubber = (
    <Slider
      value={cycleFraction}
      onChange={(_, val) => onScrub(val)}
      min={0}
      max={1}
      step={0.001}
      size={isCompact ? 'medium' : 'small'}
      disabled={scrubDisabled}
      valueLabelDisplay="auto"
      valueLabelFormat={(v) => `${(v * 100).toFixed(1)}%`}
      aria-label="Cycle fraction scrubber"
      data-testid="ublv-scrubber"
      sx={isCompact ? COMPACT_SCRUBBER_SX : undefined}
    />
  );

  const speedControl = (
    <Box sx={{ width: isCompact ? '100%' : 160, minWidth: isCompact ? 0 : 140 }}>
      <Typography variant="caption" color="text.secondary">
        Speed ({(animationSpeed * 100).toFixed(0)}%)
      </Typography>
      <Slider
        value={animationSpeed}
        onChange={(_, val) => onSpeedChange(val)}
        min={0.05}
        max={1.0}
        step={0.01}
        marks={
          isCompact
            ? undefined
            : [
                { value: 0.1, label: '0.1x' },
                { value: 0.45, label: '0.45x' },
                { value: 1.0, label: '1x' },
              ]
        }
        size={isCompact ? 'medium' : 'small'}
        valueLabelDisplay="auto"
        valueLabelFormat={(v) => `${v}x`}
        disabled={streamLocked}
        data-testid="ublv-speed"
        sx={isCompact ? { touchAction: 'none', py: 0.5 } : undefined}
      />
    </Box>
  );

  if (isCompact) {
    return (
      <Paper
        sx={{
          mt: 1,
          p: 1.5,
          pb: 'max(12px, env(safe-area-inset-bottom, 0px))',
          position: 'sticky',
          bottom: 0,
          zIndex: 4,
          // Clear AppLayout fixed FAB (back-to-top) on the right edge.
          pr: 7,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
        }}
        data-testid="bubble-lattice-timeline-controls"
        data-compact="true"
      >
        <Stack spacing={1.25}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
            {transportButtons}
          </Stack>
          <Box sx={{ width: '100%', minWidth: 0 }} data-testid="ublv-scrubber-row">
            {clockChips}
            {scrubber}
          </Box>
          {speedControl}
          {children ? (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {children}
            </Stack>
          ) : null}
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper sx={{ mt: 1, p: 1.5 }} data-testid="bubble-lattice-timeline-controls" data-compact="false">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {transportButtons}

        <Box sx={{ flex: 1, minWidth: 180, mx: 1 }}>
          {clockChips}
          {scrubber}
        </Box>

        {speedControl}

        {children}
      </Box>
    </Paper>
  );
}

BubbleLatticeTimelineControls.propTypes = {
  isPlaying: PropTypes.bool.isRequired,
  onPlayPause: PropTypes.func.isRequired,
  onRestart: PropTypes.func.isRequired,
  onStepForward: PropTypes.func.isRequired,
  onStepBackward: PropTypes.func.isRequired,
  cycleFraction: PropTypes.number.isRequired,
  onScrub: PropTypes.func.isRequired,
  animationSpeed: PropTypes.number.isRequired,
  onSpeedChange: PropTypes.func.isRequired,
  frequencyKhz: PropTypes.number.isRequired,
  streamLocked: PropTypes.bool,
  bufferSampleCount: PropTypes.number,
  children: PropTypes.node,
};
