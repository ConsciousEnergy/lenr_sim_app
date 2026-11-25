/**
 * Claim-tier HUD readouts for UnifiedBubbleLatticeVisualization (VIZ-03 / VIZ-05).
 * Prefers engine/API-bound fields; gates "Speculative / exploratory" tier chips
 * unless the channel is truly exploratory or Local Calc has no sample.
 * VIZ-05: optional ceiling / KM-auto badges for collapse observables.
 */
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { resolveHudReadout, listGapChannels } from '../../utils/vizChannelBindings';

const ENGINE_SOURCES = new Set(['solver', 'interpolated']);

/** Show Speculative tier only when binding is truly exploratory or Local Calc. */
function shouldShowTierChip(readout) {
  if (!readout || readout.kind !== 'value') return false;
  // Gap chips: message alone is enough (no Speculative spam).
  if (readout.kind === 'gap') return false;
  const isLocal = readout.source === 'local_fallback' || readout.source === 'schematic';
  const isSpeculative = readout.claim_tier === 'speculative_exploratory';
  // Local Calc banner already covers fallback honesty — suppress per-value Speculative spam.
  if (isLocal && isSpeculative) return false;
  // Engine-bound hydro quantities keep their binding tier (established / EMP / etc.).
  // Speculative channels (enhancement, E) still show the tier when engine-sourced.
  return true;
}

function TierChip({ readout }) {
  if (!shouldShowTierChip(readout)) return null;
  return (
    <Chip
      label={readout.claim_tier_label}
      size="small"
      color={readout.kind === 'value' ? (readout.claim_tier_color || 'default') : 'warning'}
      variant="outlined"
      data-testid={`viz-hud-tier-${readout.channel_id}`}
      data-claim-tier={readout.claim_tier}
      sx={{ fontSize: '0.6rem', height: 18, color: 'white', borderColor: 'rgba(255,255,255,0.35)' }}
    />
  );
}

TierChip.propTypes = {
  readout: PropTypes.object,
};

function SourceChip({ source }) {
  if (!ENGINE_SOURCES.has(source)) return null;
  const label = source === 'interpolated' ? 'API · interp' : 'engine';
  return (
    <Chip
      label={label}
      size="small"
      data-testid="viz-hud-source-engine"
      sx={{
        fontSize: '0.55rem',
        height: 18,
        bgcolor: 'rgba(46, 125, 50, 0.75)',
        color: 'white',
      }}
    />
  );
}

SourceChip.propTypes = {
  source: PropTypes.string,
};

/**
 * @param {object} props
 * @param {Array<{ channel_id: string, value: number|string|null, source?: string }>} props.channels
 * @param {boolean} [props.showHeldGaps]
 * @param {{ temperature_at_ceiling?: boolean, temperature_ceiling_k?: number|null, temperature_value_raw?: number|null, km_auto_selected?: boolean, compressibility_regime?: string|null }} [props.collapseMeta]
 */
export default function VizHudReadouts({ channels, showHeldGaps = true, collapseMeta = null }) {
  const readouts = useMemo(
    () => (channels || [])
      .map((ch) => resolveHudReadout(ch))
      .filter(Boolean),
    [channels],
  );

  const gaps = showHeldGaps
    ? listGapChannels().map((binding) =>
      resolveHudReadout({ channel_id: binding.channel_id, value: null }),
    ).filter(Boolean)
    : [];

  const hasLocalFallback = readouts.some(
    (r) => r.kind === 'value' && (r.source === 'local_fallback' || r.source === 'schematic'),
  );
  const hasEngine = readouts.some(
    (r) => r.kind === 'value' && ENGINE_SOURCES.has(r.source),
  );

  if (readouts.length === 0 && gaps.length === 0) return null;

  const ceilingTooltip = collapseMeta?.temperature_at_ceiling
    ? `Clamped to the ${
      collapseMeta.temperature_ceiling_k != null
        ? Number(collapseMeta.temperature_ceiling_k).toExponential(1)
        : 'regime'
    } K reporting ceiling${
      collapseMeta.temperature_value_raw != null
        ? `; adiabatic closed form gives ${Number(collapseMeta.temperature_value_raw).toExponential(1)} K`
        : ''
    }. Honesty label only — not a claim-tier raise.`
    : '';

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      flexWrap="wrap"
      alignItems="center"
      data-testid="viz-hud-readouts"
    >
      {hasEngine && (
        <Tooltip title="Values bound to engine / API timeline samples (prefer over Local Calc).">
          <span>
            <SourceChip source="solver" />
          </span>
        </Tooltip>
      )}
      {hasLocalFallback && !hasEngine && (
        <Tooltip title="No engine sample for these fields — Local Calc schematic only. Run bubble-lattice to bind R/T/E/Mach.">
          <Chip
            label="Local Calc · schematic"
            size="small"
            data-testid="viz-hud-local-schematic-banner"
            sx={{
              fontSize: '0.6rem',
              height: 18,
              bgcolor: 'rgba(237, 108, 2, 0.85)',
              color: 'white',
            }}
          />
        </Tooltip>
      )}
      {readouts.map((r) => (
        <Tooltip
          key={r.channel_id}
          title={`${r.label} · ${r.kind === 'value' ? r.fidelity : 'gap'} · ${r.claim_tier}${r.source ? ` · ${r.source}` : ''}`}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {r.kind === 'value' ? (
              <Chip
                label={`${r.label}: ${r.display}`}
                size="small"
                data-testid={`viz-hud-value-${r.channel_id}`}
                data-fidelity={r.fidelity}
                data-source={r.source}
                sx={{ bgcolor: 'rgba(25, 118, 210, 0.75)', color: 'white', fontSize: '0.65rem' }}
              />
            ) : (
              <Chip
                label={`${r.label}: ${r.message}`}
                size="small"
                data-testid={`viz-hud-gap-${r.channel_id}`}
                sx={{ bgcolor: 'rgba(120, 120, 40, 0.85)', color: 'white', fontSize: '0.65rem' }}
              />
            )}
            <TierChip readout={r} />
            {r.channel_id === 'collapse.temperature_k' && collapseMeta?.temperature_at_ceiling && (
              <Tooltip title={ceilingTooltip}>
                <Chip
                  label="AT CEILING"
                  size="small"
                  color="warning"
                  data-testid="viz-hud-temp-ceiling"
                  sx={{ fontSize: '0.55rem', height: 18 }}
                />
              </Tooltip>
            )}
            {r.channel_id === 'collapse.solver' && collapseMeta?.km_auto_selected && (
              <Chip
                label="KM auto"
                size="small"
                color="info"
                variant="outlined"
                data-testid="viz-hud-km-auto"
                sx={{ fontSize: '0.55rem', height: 18, color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}
              />
            )}
            {r.channel_id === 'collapse.peak_mach' && collapseMeta?.compressibility_regime && (
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.55rem' }}
                data-testid="viz-hud-mach-regime"
              >
                {collapseMeta.compressibility_regime}
              </Typography>
            )}
          </Box>
        </Tooltip>
      ))}
      {gaps.map((g) => (
        <Tooltip
          key={`gap-${g.channel_id}`}
          title="Liquid-phase TheoryModules pending — gap chip; not inventing f_L / P_*"
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              label={`${g.label}: gap`}
              size="small"
              data-testid={`viz-hud-held-gap-${g.channel_id}`}
              sx={{ bgcolor: 'rgba(80, 80, 80, 0.85)', color: 'white', fontSize: '0.6rem' }}
            />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.55rem' }}>
              gap
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Stack>
  );
}

VizHudReadouts.propTypes = {
  channels: PropTypes.arrayOf(PropTypes.shape({
    channel_id: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    source: PropTypes.string,
  })),
  showHeldGaps: PropTypes.bool,
  collapseMeta: PropTypes.shape({
    temperature_at_ceiling: PropTypes.bool,
    temperature_ceiling_k: PropTypes.number,
    temperature_value_raw: PropTypes.number,
    km_auto_selected: PropTypes.bool,
    compressibility_regime: PropTypes.string,
  }),
};

export { shouldShowTierChip };
