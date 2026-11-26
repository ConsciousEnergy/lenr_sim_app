/**
 * Enhancement Breakdown drawer — claim-tier channel stack (engine-bound).
 * Replaces bare numeric factors with resolveHudReadout provenance chips.
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
