import PropTypes from 'prop-types';
import { Chip, Stack, Tooltip, Typography } from '@mui/material';
import {
  ENGINE_MATURITY,
  MATURITY_CHIP,
} from '../config/engineMaturity';

/**
 * Compact maturity chip for beta testers.
 * Driven by docs/v0.3.7-beta physics maturity ledger ids.
 */
export default function EngineMaturityBadge({
  engineId,
  showDescription = false,
  size = 'small',
  sx,
}) {
  const entry = ENGINE_MATURITY[engineId];
  if (!entry) return null;
  const chip = MATURITY_CHIP[entry.label] || MATURITY_CHIP.beta;

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      flexWrap="wrap"
      useFlexGap
      data-testid={`engine-maturity-${engineId}`}
      sx={sx}
    >
      <Tooltip title={entry.description} arrow>
        <Chip
          size={size}
          color={chip.color}
          variant="outlined"
          label={`${chip.label}: ${entry.shortTitle}`}
          data-testid={`engine-maturity-chip-${engineId}`}
        />
      </Tooltip>
      {showDescription && (
        <Typography variant="caption" color="text.secondary" component="span">
          {entry.description}
        </Typography>
      )}
    </Stack>
  );
}

EngineMaturityBadge.propTypes = {
  engineId: PropTypes.string.isRequired,
  showDescription: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium']),
  sx: PropTypes.object,
};
