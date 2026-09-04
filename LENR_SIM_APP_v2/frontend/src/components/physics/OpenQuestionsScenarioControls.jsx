/**
 * OpenQuestionsScenarioControls — discrete scenario explorer over the API
 * grids attached to WH-ENP-01. Nothing is computed client-side: every readout
 * is a lookup into coupling_scan.rows, franck_condon.s_grid/log10_p_n and
 * closure_demand.grid.log10_ratio exactly as supplied by the backend.
 */
import React, { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CLAIM_TIERS } from '../../utils/theoryGovernance';
import { formatCompact as fmt } from '../../utils/formatCompact';

const UNLICENSED_LEAN_ID = 'EQ-WH-DICKE-N-01';

function distinctSorted(values) {
  return Array.from(new Set(values.filter((v) => Number.isFinite(Number(v))).map(Number)))
    .sort((a, b) => a - b);
}

function DiscreteSelect({ id, label, value, options, onChange }) {
  return (
    <TextField
      select
      size="small"
      id={id}
      label={label}
      value={value == null ? '' : String(value)}
      onChange={(event) => onChange(Number(event.target.value))}
      slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
      sx={{ minWidth: 120 }}
    >
      {options.map((option) => (
        <option key={option} value={String(option)}>{fmt(option)}</option>
      ))}
    </TextField>
  );
}

export function lookupCouplingRow(rows, g, nCoh) {
  return (rows || []).find((row) => Number(row.g) === g && Number(row.n_coh) === nCoh) || null;
}

export function lookupClosureCell(grid, thetaIdx, tauIdx, fIdx) {
  const value = grid?.log10_ratio?.[thetaIdx]?.[tauIdx]?.[fIdx];
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

export default function OpenQuestionsScenarioControls({ q1, q2, q3, dicke }) {
  const scan = q1?.coupling_scan;
  const fc = q2?.franck_condon;
  const demand = q3?.closure_demand;
  const grid = demand?.grid;

  const gOptions = useMemo(() => distinctSorted((scan?.rows || []).map((r) => r.g)), [scan]);
  const nOptions = useMemo(() => distinctSorted((scan?.rows || []).map((r) => r.n_coh)), [scan]);
  const sOptions = useMemo(() => distinctSorted(fc?.s_grid || []), [fc]);
  const thetaOptions = useMemo(() => (grid?.theta || []).map(Number), [grid]);
  const tauOptions = useMemo(() => (grid?.tau_s || []).map(Number), [grid]);
  const fOptions = useMemo(() => (grid?.f_nuc || []).map(Number), [grid]);

  const citedRow = (scan?.rows || []).find((row) => row.kind === 'cited') || scan?.rows?.[0];
  const [g, setG] = useState(() => (citedRow ? Number(citedRow.g) : gOptions[0]));
  const [nCoh, setNCoh] = useState(() => (citedRow ? Number(citedRow.n_coh) : nOptions[0]));
  const [sIdx, setSIdx] = useState(0);
  const [thetaIdx, setThetaIdx] = useState(0);
  const [tauIdx, setTauIdx] = useState(0);
  const [fIdx, setFIdx] = useState(0);

  const hasAnyGrid = Boolean(scan?.rows?.length || sOptions.length || grid?.log10_ratio);
  if (!hasAnyGrid) {
    return (
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ mb: 2 }}
        data-testid="wh-scenario-controls"
      >
        Scenario explorer: coupling / Franck–Condon / closure grids not supplied by this API response.
      </Typography>
    );
  }

  const tier = CLAIM_TIERS.speculative_exploratory;
  const licensedMax = Number(dicke?.n_coh_licensed_max);
  const unlicensed = Number.isFinite(licensedMax) && Number.isFinite(nCoh) && nCoh > licensedMax;

  const row = lookupCouplingRow(scan?.rows, g, nCoh);
  const q1Remainder = row ? row.remainder_mev : q1?.open_remainder_mev;
  const q1Derived = row ? row.derived_mev : scan?.default_derived_mev;

  const sValue = sOptions[sIdx];
  const fcIdx = (fc?.s_grid || []).findIndex((s) => Number(s) === sValue);
  const log10Pn = fcIdx >= 0 ? Number(fc.log10_p_n?.[fcIdx]) : NaN;
  const target = Number(fc?.target_log10);
  const fcMeets = Number.isFinite(log10Pn) && Number.isFinite(target) && log10Pn >= target;

  const cell = lookupClosureCell(grid, thetaIdx, tauIdx, fIdx);
  const crosses = cell != null && cell >= 0;

  return (
    <Box sx={{ mb: 2 }} data-testid="wh-scenario-controls">
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
        <Typography variant="subtitle2">
          Scenario explorer (lookup of API grids; not a posterior; EQ-OPEN-* remain OPEN)
        </Typography>
        <Chip label={tier.label} color={tier.color} size="small" variant="outlined" title={tier.description} />
      </Stack>
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mb: 1 }}>
        {gOptions.length > 0 && (
          <DiscreteSelect id="wh-scenario-g" label="g (coupling)" value={g} options={gOptions} onChange={setG} />
        )}
        {nOptions.length > 0 && (
          <DiscreteSelect id="wh-scenario-ncoh" label="n_coh" value={nCoh} options={nOptions} onChange={setNCoh} />
        )}
        {unlicensed && (
          <Chip
            label={`unlicensed by ${UNLICENSED_LEAN_ID}`}
            color="warning"
            size="small"
            data-testid="wh-ncoh-unlicensed-chip"
          />
        )}
        {sOptions.length > 0 && (
          <DiscreteSelect
            id="wh-scenario-s"
            label="Huang–Rhys S"
            value={sValue}
            options={sOptions}
            onChange={(value) => setSIdx(Math.max(0, sOptions.indexOf(value)))}
          />
        )}
        {thetaOptions.length > 0 && (
          <DiscreteSelect
            id="wh-scenario-theta"
            label="θ (loading)"
            value={thetaOptions[thetaIdx]}
            options={thetaOptions}
            onChange={(value) => setThetaIdx(Math.max(0, thetaOptions.indexOf(value)))}
          />
        )}
        {tauOptions.length > 0 && (
          <DiscreteSelect
            id="wh-scenario-tau"
            label="τ (s)"
            value={tauOptions[tauIdx]}
            options={tauOptions}
            onChange={(value) => setTauIdx(Math.max(0, tauOptions.indexOf(value)))}
          />
        )}
        {fOptions.length > 0 && (
          <DiscreteSelect
            id="wh-scenario-fnuc"
            label="f_nuc"
            value={fOptions[fIdx]}
            options={fOptions}
            onChange={(value) => setFIdx(Math.max(0, fOptions.indexOf(value)))}
          />
        )}
      </Stack>
      <Box data-testid="wh-remainder-vector" sx={{ pl: 1 }}>
        <Typography variant="caption" color="text.secondary" display="block">
          Remainder vector (live lookup)
        </Typography>
        {scan?.rows?.length > 0 && (
          <Typography variant="body2" data-testid="wh-remainder-q1">
            Q1 remainder {fmt(q1Remainder)} MeV OPEN · derived {fmt(q1Derived)} MeV
            {' '}for g={fmt(g)}, n_coh={fmt(nCoh)}
            {row ? ` (${row.kind} row)` : ' (no row for this pair; default_derived_mev shown)'}
          </Typography>
        )}
        {sOptions.length > 0 && (
          <Typography variant="body2" data-testid="wh-remainder-q2">
            Q2 log10 P_N = {fmt(log10Pn)} at S={fmt(sValue)} vs target {fmt(target)}:
            {' '}{fcMeets ? 'meets target' : 'below target'}
            {fc?.s_min_for_target != null ? ` · S_min for target ${fmt(fc.s_min_for_target)}` : ''}
            {fc?.phonon_order_N != null ? ` · N = ${fmt(fc.phonon_order_N)}` : ''}
          </Typography>
        )}
        {grid?.log10_ratio && (
          <Typography variant="body2" data-testid="wh-remainder-q3">
            Q3 log10(R_mode/R_obs) = {fmt(cell)} at θ={fmt(thetaOptions[thetaIdx])},
            {' '}τ={fmt(tauOptions[tauIdx])} s, f_nuc={fmt(fOptions[fIdx])}:
            {' '}{cell == null ? 'cell not supplied' : crosses ? 'crosses R_obs' : 'below R_obs'}
            {' '}· required product {fmt(demand?.required_product)}
            {demand?.R_obs_per_m3_s != null ? ` · R_obs ${fmt(demand.R_obs_per_m3_s)} m⁻³ s⁻¹` : ''}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" display="block">
          Scenario table, not a posterior; two-body reference untouched. EQ-OPEN-MEV-01 / RAD-01 / RATE-01 remain OPEN.
        </Typography>
      </Box>
    </Box>
  );
}
