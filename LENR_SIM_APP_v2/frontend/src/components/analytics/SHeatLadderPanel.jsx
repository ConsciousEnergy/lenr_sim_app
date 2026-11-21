/**
 * HIP-02 S_heat / σ ladder UI + ENG-HS-08 ranked-regime hygiene.
 *
 * Shows ≥5σ analytics bar, claim-tier chips, high-success (literature_reported)
 * ranks, exploratory demotions, and seed-scale exclusions. Never invents σ_Q.
 */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { CLAIM_TIERS } from '../../utils/theoryGovernance';
import { fetchSHeatLadder } from './fetchSHeatLadder';
import { S_HEAT_LADDER_FREEZE } from './sHeatLadderFreeze';

function ClaimTierChip({ tier, testId }) {
  if (!tier) return null;
  const info = CLAIM_TIERS[tier];
  return (
    <Chip
      label={info?.label || String(tier).replace(/_/g, ' ')}
      title={info?.description || tier}
      color={info?.color || 'default'}
      size="small"
      variant="outlined"
      data-testid={testId}
      data-claim-tier={tier}
      sx={{ fontSize: '0.65rem', height: 18 }}
    />
  );
}

function bandChipColor(band) {
  if (band === 'discovery_analytics_clear') return 'success';
  if (band === 'exploratory_gates_blocked') return 'warning';
  if (band === 'demoted_seed_scale') return 'error';
  return 'default';
}

function formatS(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
}

function LadderBar({ row, threshold, displayMax, testIdPrefix }) {
  const s = row.display_s_heat ?? row.s_heat;
  const max = displayMax || 30;
  const pct =
    s != null && Number.isFinite(Number(s))
      ? Math.max(0, Math.min(100, (Number(s) / max) * 100))
      : 0;
  const barPct = Math.max(0, Math.min(100, (threshold / max) * 100));
  const isDemoted = row.band === 'demoted_seed_scale' || !row.high_success_rankable;
  return (
    <Box sx={{ position: 'relative', width: '100%', minWidth: 120 }} data-testid={testIdPrefix}>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={isDemoted ? 'inherit' : row.band === 'discovery_analytics_clear' ? 'success' : 'warning'}
        sx={{
          height: 10,
          borderRadius: 1,
          opacity: row.band === 'demoted_seed_scale' ? 0.45 : 1,
          bgcolor: 'action.hover',
        }}
      />
      <Box
        title={`≥${threshold}σ analytics bar`}
        data-testid={`${testIdPrefix}-5sigma-mark`}
        sx={{
          position: 'absolute',
          left: `${barPct}%`,
          top: -2,
          bottom: -2,
          width: 2,
          bgcolor: 'error.main',
          opacity: 0.85,
        }}
      />
    </Box>
  );
}

function RegimeTable({ title, rows, threshold, displayMax, testId, emptyHint }) {
  return (
    <Box sx={{ mb: 2 }} data-testid={testId}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
        {title}
      </Typography>
      {!rows?.length ? (
        <Typography variant="caption" color="text.secondary">
          {emptyHint || 'None'}
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Regime</TableCell>
              <TableCell align="right">S_heat</TableCell>
              <TableCell sx={{ minWidth: 140 }}>vs ≥5σ</TableCell>
              <TableCell>band</TableCell>
              <TableCell>claim_tier</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.literature_id}
                data-testid={`${testId}-row-${row.literature_id}`}
              >
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {row.high_success_rank != null ? `#${row.high_success_rank} ` : ''}
                    {row.literature_id}
                  </Typography>
                  {row.demotion_reason ? (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {row.demotion_reason}
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell align="right">
                  <code>{formatS(row.s_heat)}</code>
                  {row.display_s_heat == null && row.s_heat != null ? (
                    <Chip
                      size="small"
                      label="off-scale"
                      sx={{ ml: 0.5, height: 16, fontSize: '0.6rem' }}
                    />
                  ) : null}
                </TableCell>
                <TableCell>
                  <LadderBar
                    row={row}
                    threshold={threshold}
                    displayMax={displayMax}
                    testIdPrefix={`${testId}-bar-${row.literature_id}`}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={bandChipColor(row.band)}
                    variant="outlined"
                    label={row.band}
                    sx={{ fontFamily: 'monospace', fontSize: '0.55rem', height: 18 }}
                  />
                </TableCell>
                <TableCell>
                  <ClaimTierChip
                    tier={row.claim_tier}
                    testId={`${testId}-claim-tier-${row.literature_id}`}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}

export default function SHeatLadderPanel() {
  const [ladder, setLadder] = useState(S_HEAT_LADDER_FREEZE);
  const [source, setSource] = useState('spa_freeze');

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    fetchSHeatLadder({ signal: controller.signal }).then((live) => {
      if (cancelled || !live) return;
      setLadder({
        ...S_HEAT_LADDER_FREEZE,
        ...live,
        closes_eq_open: false,
        lenr_proved: false,
      });
      setSource('live_api');
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const threshold = ladder.discovery_grade_threshold_sigma || 5;
  const displayMax = ladder.ladder_display_max_s || 30;

  return (
    <Paper sx={{ p: 2, mb: 2 }} data-testid="s-heat-ladder-panel">
      <Typography variant="h6" gutterBottom>
        S_heat / σ ladder (HIP-02)
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Literature calorimetry significance <code>S_heat = Q / σ_Q</code> vs the ≥
        {threshold}σ analytics bar. High-success ranking applies ENG-HS-08 hygiene:
        seed-scale Q and non-<code>literature_reported</code> MoE are demoted so raw S_heat
        cannot outrank cite-gated Kasagi. Soft language stays{' '}
        <code>analytics_gates_clear</code> — never “≥{threshold}σ met” as discovery closure.
      </Typography>

      <Alert severity="warning" sx={{ mb: 1.5 }} data-testid="s-heat-ladder-honesty">
        <AlertTitle>
          Honesty — <code>lenr_proved: false</code>
        </AlertTitle>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {ladder.honesty || S_HEAT_LADDER_FREEZE.honesty}
        </Typography>
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
          <Chip label="lenr_proved: false" size="small" color="warning" variant="outlined" />
          <Chip
            label={`≥${threshold}σ bar`}
            size="small"
            color="error"
            variant="outlined"
            data-testid="s-heat-ladder-5sigma-bar"
          />
          <Chip
            size="small"
            variant="outlined"
            color={source === 'live_api' ? 'success' : 'default'}
            label={`source: ${source}`}
            data-testid="s-heat-ladder-source"
            sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
          />
          <Chip
            size="small"
            variant="outlined"
            label={`high-success n=${ladder.n_high_success_rankable ?? 0}`}
            data-testid="s-heat-ladder-high-success-n"
          />
          {ladder.eng_hs_08?.raw_s_heat_would_lie ? (
            <Chip
              size="small"
              color="warning"
              variant="outlined"
              label="raw S_heat would lie — hygiene on"
              data-testid="s-heat-ladder-eng-hs-08"
            />
          ) : null}
        </Stack>
      </Alert>

      <RegimeTable
        title="High-success ranks (literature_reported only)"
        rows={ladder.ranked_high_success || []}
        threshold={threshold}
        displayMax={displayMax}
        testId="s-heat-ladder-high-success"
        emptyHint="No cite-gated literature_reported MoE rows."
      />
      <RegimeTable
        title="Exploratory band (demoted from high-success)"
        rows={ladder.exploratory_band || []}
        threshold={threshold}
        displayMax={displayMax}
        testId="s-heat-ladder-exploratory"
      />
      <RegimeTable
        title="Seed-scale demotions (ENG-HS-08)"
        rows={ladder.demoted_seed_scale || []}
        threshold={threshold}
        displayMax={displayMax}
        testId="s-heat-ladder-demoted-seed"
      />

      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        data-testid="s-heat-ladder-honest-order"
      >
        Honest high-success order:{' '}
        {(ladder.honest_high_success_order_ids || []).join(' → ') || '—'}
        . Raw S_heat order would start with{' '}
        <code>{(ladder.raw_s_heat_order_ids || [])[0] || '—'}</code> — excluded by hygiene.
        closes_eq_open=<code>false</code>; refuse fabricated σ_Q.
      </Typography>
    </Paper>
  );
}
