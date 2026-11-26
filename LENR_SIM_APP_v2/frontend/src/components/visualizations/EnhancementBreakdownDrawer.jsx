/**
 * Enhancement Breakdown drawer — claim-tier channel stack (engine-bound).
 * Primary radar/stack: screening · phonon · loading live bars from
 * enhancement_breakdown (speculative / exploratory — not LENR proof).
 */
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Chip,
  Collapse,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  buildEnhancementBreakdownChannels,
  resolveHudReadout,
} from '../../utils/vizChannelBindings';
import {
  ENHANCEMENT_BARS_CLAIM_TAG,
  buildPrimaryEnhancementBars,
  enhancementRadarPolygonPoints,
  enhancementRadarVertices,
} from '../../utils/enhancementBreakdownBars';

const MECHANISM_COLORS = {
  'enhancement.screening': '#00ffff',
  'enhancement.qed': '#ffff00',
  'enhancement.casimir': '#ff8800',
  'enhancement.rydberg': '#ff00ff',
  'enhancement.compression': '#00ff88',
  'enhancement.phonon': '#c0a060',
  'enhancement.loading': '#88aaff',
};

const ENGINE_SOURCES = new Set(['solver', 'interpolated']);

function PrimaryEnhancementRadarStack({ bars }) {
  const vertices = useMemo(
    () => enhancementRadarVertices(bars, { cx: 50, cy: 50, r: 36 }),
    [bars],
  );
  const polygon = useMemo(
    () => enhancementRadarPolygonPoints(vertices),
    [vertices],
  );

  return (
    <Box
      data-testid="ublv-enhancement-primary-stack"
      sx={{ mb: 0.75 }}
    >
      <Tooltip title={`${ENHANCEMENT_BARS_CLAIM_TAG}. Log₁₀ bar fill from enhancement_breakdown — not MD / not LENR proof; EQ-OPEN / lenr_proved untouched.`}>
        <Typography
          variant="caption"
          color="rgba(255,255,255,0.7)"
          sx={{ fontSize: '0.58rem', display: 'block', mb: 0.35 }}
          data-testid="ublv-enhancement-primary-label"
        >
          Primary · screening · phonon · loading
        </Typography>
      </Tooltip>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box
          component="svg"
          viewBox="0 0 100 100"
          width={72}
          height={72}
          data-testid="ublv-enhancement-radar"
          aria-hidden
          sx={{ flexShrink: 0 }}
        >
          {/* Axis guide triangle */}
          <polygon
            points={enhancementRadarPolygonPoints(
              enhancementRadarVertices(
                bars.map((b) => ({ ...b, norm: 1 })),
                { cx: 50, cy: 50, r: 36 },
              ),
            )}
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
          />
          <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <circle cx="50" cy="50" r="24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          {vertices.map((v) => (
            <line
              key={`axis-${v.key}`}
              x1="50"
              y1="50"
              x2={v.axisX}
              y2={v.axisY}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
            />
          ))}
          {polygon && (
            <polygon
              points={polygon}
              fill="rgba(100, 160, 220, 0.28)"
              stroke="rgba(160, 200, 255, 0.85)"
              strokeWidth="1.5"
              data-testid="ublv-enhancement-radar-fill"
            />
          )}
          {vertices.map((v) => (
            <circle
              key={`pt-${v.key}`}
              cx={v.x}
              cy={v.y}
              r="2.5"
              fill={v.color}
              data-testid={`ublv-enhancement-radar-pt-${v.key}`}
            />
          ))}
        </Box>
        <Stack spacing={0.35} sx={{ flex: 1, minWidth: 0 }} data-testid="ublv-enhancement-bar-stack">
          {bars.map((bar) => (
            <Tooltip
              key={bar.key}
              title={`${bar.label}: ${bar.missing ? 'gap' : bar.value?.toExponential?.(2) ?? bar.value} · log₁₀ fill ${Math.round(bar.norm * 100)}% · ${bar.claimTag}`}
            >
              <Box data-testid={`ublv-enhancement-bar-${bar.key}`}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.15 }}>
                  <Typography variant="caption" color="white" sx={{ fontSize: '0.58rem' }}>
                    {bar.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontSize: '0.55rem', color: bar.color }}
                    data-testid={`ublv-enhancement-bar-value-${bar.key}`}
                  >
                    {bar.missing ? '—' : (bar.value >= 100 ? bar.value.toExponential(1) : Number(bar.value).toPrecision(3))}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    height: 5,
                    borderRadius: 1,
                    bgcolor: 'rgba(255,255,255,0.12)',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    data-testid={`ublv-enhancement-bar-fill-${bar.key}`}
                    data-norm={bar.norm.toFixed(3)}
                    sx={{
                      height: '100%',
                      width: `${Math.round(bar.norm * 100)}%`,
                      bgcolor: bar.color,
                      opacity: bar.missing ? 0.35 : 0.9,
                      transition: 'width 0.25s ease',
                    }}
                  />
                </Box>
              </Box>
            </Tooltip>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

PrimaryEnhancementRadarStack.propTypes = {
  bars: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default function EnhancementBreakdownDrawer({
  breakdown,
  sampleSource = 'local_fallback',
  collapsed,
  onToggle,
}) {
  const readouts = useMemo(() => {
    const channels = buildEnhancementBreakdownChannels(breakdown, {
      sampleSource,
    });
    return channels.map((ch) => resolveHudReadout(ch)).filter(Boolean);
  }, [breakdown, sampleSource]);

  const primaryBars = useMemo(
    () => buildPrimaryEnhancementBars(breakdown, { sampleSource }),
    [breakdown, sampleSource],
  );

  const isEngine = ENGINE_SOURCES.has(sampleSource);

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 10,
        right: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        zIndex: 5,
        minWidth: collapsed ? 160 : 200,
        // Narrow viewports: stack above metrics strip (avoids ~70px overlap).
        '@media (max-width: 480px)': {
          right: 10,
          left: 10,
          bottom: 56,
          alignItems: 'stretch',
          minWidth: 0,
        },
      }}
      data-testid="ublv-enhancement-drawer"
      data-sample-source={sampleSource}
    >
      <Collapse in={!collapsed} timeout={280}>
        <Paper
          elevation={3}
          id="ublv-enhancement-panel"
          data-testid="ublv-enhancement-panel"
          sx={{
            bgcolor: 'rgba(20, 20, 40, 0.9)',
            borderRadius: '8px 8px 0 0',
            p: 1,
            minWidth: 200,
            '@media (max-width: 480px)': { minWidth: 0 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
            <Typography
              variant="caption"
              color="white"
              sx={{ fontWeight: 'bold', display: 'block' }}
            >
              Enhancement Breakdown
            </Typography>
            <Tooltip
              title={
                isEngine
                  ? 'Mechanism factors from engine / API samples (prefer over Local Calc).'
                  : 'Local Calc schematic — Run bubble-lattice (or prefer-engine bootstrap) to bind engine factors.'
              }
            >
              <Chip
                label={isEngine ? 'engine' : 'Local Calc'}
                size="small"
                data-testid="ublv-enhancement-source-chip"
                sx={{
                  fontSize: '0.55rem',
                  height: 18,
                  bgcolor: isEngine
                    ? 'rgba(46, 125, 50, 0.85)'
                    : 'rgba(237, 108, 2, 0.85)',
                  color: 'white',
                }}
              />
            </Tooltip>
          </Box>
          <PrimaryEnhancementRadarStack bars={primaryBars} />
          <Stack spacing={0.4} data-testid="ublv-enhancement-channel-stack">
            {readouts.map((r) => (
              <Tooltip
                key={r.channel_id}
                title={`${r.label} · ${r.kind === 'value' ? r.fidelity : 'gap'} · ${r.claim_tier}${r.source ? ` · ${r.source}` : ''}`}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                  data-testid={`ublv-enhancement-row-${r.channel_id}`}
                >
                  <Typography
                    variant="caption"
                    color="white"
                    sx={{ fontSize: '0.65rem' }}
                  >
                    {r.label}:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {r.kind === 'value' ? (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.65rem',
                          color: MECHANISM_COLORS[r.channel_id] || '#ffffff',
                        }}
                        data-testid={`ublv-enhancement-value-${r.channel_id}`}
                        data-source={r.source}
                      >
                        {r.display}
                      </Typography>
                    ) : (
                      <Typography
                        variant="caption"
                        color="rgba(255,255,255,0.55)"
                        sx={{ fontSize: '0.6rem' }}
                      >
                        {r.message}
                      </Typography>
                    )}
                    {r.kind === 'value' && (
                      <Chip
                        label={r.claim_tier_label}
                        size="small"
                        variant="outlined"
                        data-testid={`ublv-enhancement-tier-${r.channel_id}`}
                        data-claim-tier={r.claim_tier}
                        sx={{
                          fontSize: '0.55rem',
                          height: 16,
                          color: 'white',
                          borderColor: 'rgba(255,255,255,0.35)',
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </Tooltip>
            ))}
          </Stack>
        </Paper>
      </Collapse>
      <Tooltip
        title={collapsed ? 'Expand enhancement breakdown' : 'Collapse enhancement breakdown'}
        placement="top"
      >
        <Paper
          elevation={3}
          component="button"
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls="ublv-enhancement-panel"
          aria-label={
            collapsed
              ? 'Expand Enhancement Breakdown panel'
              : 'Collapse Enhancement Breakdown panel'
          }
          data-testid="ublv-enhancement-toggle"
          sx={{
            bgcolor: 'rgba(20, 20, 40, 0.95)',
            color: 'white',
            cursor: 'pointer',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            px: 1.5,
            py: 0.5,
            borderRadius: collapsed ? 1 : '0 0 8px 8px',
            minWidth: 160,
            '&:hover': { bgcolor: 'rgba(30, 30, 55, 1)' },
            transition: 'background-color 0.2s ease',
            '@media (max-width: 480px)': { minWidth: 0, width: '100%' },
          }}
        >
          {collapsed ? (
            <>
              <ExpandLessIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>
                Enhancement
              </Typography>
              <ExpandLessIcon sx={{ fontSize: 16 }} />
            </>
          ) : (
            <ExpandMoreIcon sx={{ fontSize: 18 }} />
          )}
        </Paper>
      </Tooltip>
    </Box>
  );
}

EnhancementBreakdownDrawer.propTypes = {
  breakdown: PropTypes.object,
  sampleSource: PropTypes.oneOf([
    'solver',
    'interpolated',
    'schematic',
    'local_fallback',
  ]),
  collapsed: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};
