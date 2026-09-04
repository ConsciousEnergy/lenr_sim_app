/**
 * Energy partition flow for Q1 MeV gap (phonon → gamma → recoil → OPEN remainder).
 */
import React from 'react';
import { Box, Typography } from '@mui/material';

const OPEN_COLOR = '#c62828';
const REF_COLOR = '#1565c0';

export default function EnergyPartitionFlow({ partition }) {
  const part = partition || {};
  const phonon = Number(part.phonon) || 0;
  const gamma = Number(part.gamma) || 0;
  const recoil = Number(part.recoil) || 0;
  const openRemainder = Number(part.open_remainder) || 23.8;
  const total = phonon + gamma + recoil + openRemainder;
  const scale = 100 / Math.max(total, 1);

  const stages = [
    { key: 'phonon', label: 'Phonon', mev: phonon, color: REF_COLOR },
    { key: 'gamma', label: 'Gamma', mev: gamma, color: REF_COLOR },
    { key: 'recoil', label: 'Recoil', mev: recoil, color: REF_COLOR },
    { key: 'open', label: 'OPEN remainder', mev: openRemainder, color: OPEN_COLOR },
  ];

  let cursor = 0;
  const bands = stages.map((stage) => {
    const width = stage.mev * scale;
    const band = { ...stage, left: cursor, width };
    cursor += width;
    return band;
  });

  return (
    <Box data-testid="energy-partition-flow" sx={{ width: '100%' }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        Q1 energy partition (MeV) — OPEN remainder required
      </Typography>
      <Box sx={{ display: 'flex', height: 36, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        {bands.map((band) => (
          <Box
            key={band.key}
            sx={{
              width: `${band.width}%`,
              bgcolor: band.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: band.key === 'open' ? 0.85 : 1,
              borderRight: band.key !== 'open' ? '1px solid rgba(255,255,255,0.2)' : 'none',
            }}
            title={`${band.label}: ${band.mev.toFixed(2)} MeV`}
          >
            {band.width > 8 && (
              <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.65rem' }}>
                {band.label}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
        {bands.map((band) => (
          <Typography key={band.key} variant="caption" color={band.key === 'open' ? 'error.main' : 'text.secondary'}>
            {band.label}: {band.mev.toFixed(2)} MeV
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
