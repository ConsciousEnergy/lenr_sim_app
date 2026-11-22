/**
 * Scrubbable dual-clock timeline controls for UBLV (VIZ-01).
 * Mirrors Fusion scrub UX: play/pause, restart, step, scrub slider.
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
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import { formatDualClockAtFraction, formatCycleTimeChip } from '../../utils/bubblePhaseSchedule';

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
  const dual = formatDualClockAtFraction(frequencyKhz, cycleFraction);
  const scrubDisabled = streamLocked;

  return (
    <Paper sx={{ mt: 1, p: 1.5 }} data-testid="bubble-lattice-timeline-controls">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <IconButton
          onClick={onPlayPause}
          disabled={streamLocked}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          data-testid="ublv-play-pause"
        >
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        <IconButton onClick={onRestart} aria-label="Restart" data-testid="ublv-restart">
          <RestartAltIcon />
        </IconButton>
        <IconButton
          onClick={onStepBackward}
          disabled={streamLocked}
          aria-label="Step backward"
          data-testid="ublv-step-back"
        >
          <SkipPreviousIcon />
        </IconButton>
        <IconButton
          onClick={onStepForward}
          disabled={streamLocked}
          aria-label="Step forward"
          data-testid="ublv-step-forward"
        >
          <SkipNextIcon />
        </IconButton>

        <Box sx={{ flex: 1, minWidth: 180, mx: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Scrub cycle ({(cycleFraction * 100).toFixed(0)}%)
            </Typography>
            <Tooltip title="Physical acoustic time · remapped visual time">
              <Chip
                size="small"
                label={dual.label}
                data-testid="ublv-dual-clock"
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
          <Slider
            value={cycleFraction}
            onChange={(_, val) => onScrub(val)}
            min={0}
            max={1}
            step={0.001}
            size="small"
            disabled={scrubDisabled}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${(v * 100).toFixed(1)}%`}
            aria-label="Cycle fraction scrubber"
            data-testid="ublv-scrubber"
          />
        </Box>

        <Box sx={{ width: 160 }}>
          <Typography variant="caption" color="text.secondary">
            Speed ({(animationSpeed * 100).toFixed(0)}%)
          </Typography>
          <Slider
            value={animationSpeed}
            onChange={(_, val) => onSpeedChange(val)}
            min={0.05}
            max={1.0}
            step={0.01}
            marks={[
              { value: 0.1, label: '0.1x' },
              { value: 0.45, label: '0.45x' },
              { value: 1.0, label: '1x' },
            ]}
            size="small"
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v}x`}
            disabled={streamLocked}
            data-testid="ublv-speed"
          />
        </Box>

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
