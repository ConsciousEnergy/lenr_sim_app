/**
 * VIZ-07 — Heating-mode gap glyphs (P_joule / P_resistive / P_photonic).
 * Locks the UX trinity without inventing melt or power values.
 */
import React from 'react';
import PropTypes from 'prop-types';
import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import {
  HEATING_MODE_GLYPHS,
  resolveHostMeltMeta,
} from '../../utils/liquidPhaseViz';
import { resolveHudReadout } from '../../utils/vizChannelBindings';

/**
 * @param {object} props
 * @param {string} [props.hostMaterial]
 * @param {{ P_joule?: number|null, P_resistive?: number|null, P_photonic?: number|null }} [props.heat]
 * @param {number|null} [props.phaseFractionLiquid]
 * @param {boolean} [props.compact]
 */
export default function HeatingModeGapGlyphs({
  hostMaterial = 'palladium',
  heat = null,
  phaseFractionLiquid = null,
  compact = false,
}) {
  const meltMeta = resolveHostMeltMeta(hostMaterial);
  const heatMap = heat || {};

  const heatReadouts = HEATING_MODE_GLYPHS.map((glyph) => {
    const value = heatMap[glyph.mode];
    return {
      glyph,
      readout: resolveHudReadout({
        channel_id: glyph.channel_id,
        value: value == null ? null : value,
        source: value == null ? undefined : 'solver',
      }),
    };
  });

  const fractionReadout = resolveHudReadout({
    channel_id: 'host.phase_fraction_liquid',
    value: phaseFractionLiquid,
    source: phaseFractionLiquid == null ? undefined : 'solver',
  });

  return (
    <Box data-testid="heating-mode-gap-glyphs" sx={{ mb: compact ? 1 : 2 }}>
      <Typography
        variant="subtitle2"
        gutterBottom
        sx={{ fontWeight: 'bold', fontSize: compact ? '0.75rem' : undefined }}
      >
        Heating modes · host melt
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ mb: 1, fontSize: '0.65rem' }}
      >
        Three source terms forever — never one joule knob. Excess heat ≠ melt switch.
        TheoryModules pending; gap chips refuse invented values.
      </Typography>

      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
        <Tooltip title={meltMeta.citeNote}>
          <Chip
            size="small"
            variant="outlined"
            color={meltMeta.exclusive ? 'info' : 'default'}
            label={
              meltMeta.meltingPointK != null
                ? `${meltMeta.displayName} T_m ${meltMeta.meltingPointK} K`
                : `${meltMeta.displayName}: melt viz N/A`
            }
            data-testid="liquid-phase-host-tm-chip"
            data-host-key={meltMeta.hostKey}
            sx={{ height: 22, fontSize: '0.65rem' }}
          />
        </Tooltip>
        {fractionReadout && (
          <Tooltip title={`${fractionReadout.label} · ${fractionReadout.claim_tier}`}>
            <Chip
              size="small"
              label={
                fractionReadout.kind === 'value'
                  ? `f_L: ${fractionReadout.display}`
                  : 'f_L: gap'
              }
              data-testid="liquid-phase-fl-chip"
              data-kind={fractionReadout.kind}
              sx={{
                height: 22,
                fontSize: '0.65rem',
                bgcolor:
                  fractionReadout.kind === 'value'
                    ? 'rgba(25, 118, 210, 0.15)'
                    : 'rgba(120, 120, 40, 0.2)',
              }}
            />
          </Tooltip>
        )}
      </Stack>

      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
        {heatReadouts.map(({ glyph, readout }) => {
          if (!readout) return null;
          const isGap = readout.kind === 'gap';
          return (
            <Tooltip
              key={glyph.channel_id}
              title={`${glyph.reactorClass}: ${glyph.description} · ${readout.claim_tier}`}
            >
              <Chip
                size="small"
                variant={isGap ? 'outlined' : 'filled'}
                label={
                  isGap
                    ? `${glyph.label}: gap`
                    : `${glyph.label}: ${readout.display}`
                }
                data-testid={`heating-mode-glyph-${glyph.mode}`}
                data-kind={readout.kind}
                data-heating-mode={glyph.mode}
                sx={{
                  height: 22,
                  fontSize: '0.65rem',
                  ...(isGap
                    ? { borderColor: 'rgba(0,0,0,0.25)' }
                    : { bgcolor: 'rgba(237, 108, 2, 0.2)' }),
                }}
              />
            </Tooltip>
          );
        })}
      </Stack>
    </Box>
  );
}

HeatingModeGapGlyphs.propTypes = {
  hostMaterial: PropTypes.string,
  heat: PropTypes.shape({
    P_joule: PropTypes.number,
    P_resistive: PropTypes.number,
    P_photonic: PropTypes.number,
  }),
  phaseFractionLiquid: PropTypes.number,
  compact: PropTypes.bool,
};
