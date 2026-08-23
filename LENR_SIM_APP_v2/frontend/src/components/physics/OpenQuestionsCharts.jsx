/**
 * Open-questions virtual lab charts (Recharts). Values from API when/how blocks.
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const OPEN_COLOR = '#c62828';
const SPEC_COLOR = '#ef6c00';
const REF_COLOR = '#1565c0';

function ChartFrame({ title, children }) {
  return (
    <Box sx={{ width: '100%', height: 220, mb: 2 }}>
      <Typography variant="caption" color="text.secondary">{title}</Typography>
      <ResponsiveContainer width="100%" height="90%">
        {children}
      </ResponsiveContainer>
    </Box>
  );
}

export default function OpenQuestionsCharts({ openQuestions }) {
  const oq = openQuestions || {};
  if (oq.route_mode === 'local_fallback') return null;

  const part = oq.q_mev_gap?.energy_partition_mev || {};
  const energyData = [
    { name: 'phonon', mev: Number(part.phonon) || 0 },
    { name: 'gamma', mev: Number(part.gamma) || 0 },
    { name: 'recoil', mev: Number(part.recoil) || 0 },
    { name: 'OPEN remainder', mev: Number(part.open_remainder) || 23.8 },
  ];

  const branch = oq.q_radiation?.assumed_branching || { he4: 1, n: 1e-11, gamma: 0 };
  const ulLog10 = oq.q_radiation?.detector_ul_log10;
  const radData = [
    { name: 'vacuum D+D n', log10: -0.3, fill: REF_COLOR },
    { name: 'scenario n', log10: Math.log10(Math.max(branch.n || 1e-11, 1e-30)), fill: SPEC_COLOR },
    { name: 'scenario gamma', log10: Math.log10(Math.max(branch.gamma || 1e-12, 1e-30)), fill: SPEC_COLOR },
  ];
  if (ulLog10 != null && Number.isFinite(ulLog10)) {
    radData.push({ name: 'detector UL', log10: ulLog10, fill: OPEN_COLOR });
  } else {
    radData.push({ name: 'detector UL (no ingest)', log10: -6, fill: OPEN_COLOR });
  }

  const n2 = Number(oq.q_statistical?.n_events_log10_two_body);
  const when = oq.when || {};
  const trappedLog10 = when.trapped_state_log10_n;
  const threeBodyLog10 = when.three_body_log10_n;
  const activeLog10 = when.active_mode_log10_n;
  const rateData = [
    { name: 'two_body', log10: Number.isFinite(n2) ? n2 : -40, fill: REF_COLOR },
    { name: '1-event', log10: 0, fill: OPEN_COLOR },
  ];
  if (trappedLog10 != null && Number.isFinite(trappedLog10)) {
    rateData.push({ name: 'trapped_state', log10: trappedLog10, fill: SPEC_COLOR });
  }
  if (threeBodyLog10 != null && Number.isFinite(threeBodyLog10)) {
    rateData.push({ name: 'three_body', log10: threeBodyLog10, fill: SPEC_COLOR });
  } else if (oq.rate_mode === 'trapped_state' && activeLog10 != null) {
    rateData.push({ name: 'trapped_state (active)', log10: activeLog10, fill: SPEC_COLOR });
  }

  const comp = oq.composition || {};
  const engines = [
    { name: 'pipeline', value: Number(comp.pipeline_combined_enhancement) || 0 },
    { name: 'bubble', value: Number(comp.bubble_peak_enhancement) || 0 },
    { name: 'legacy', value: Number(comp.legacy_geometric_mean) || 0 },
    { name: 'illegal product', value: Number(comp.illegal_product) || 0 },
  ].filter((row) => row.value > 0);

  const mhdData = [
    { name: 'bubble/surface', valid: 1, invalid: 0 },
    { name: 'nuclear fm', valid: 0, invalid: 1 },
  ];

  return (
    <Box>
      <ChartFrame title="Q1 energy partition (MeV) — OPEN remainder required">
        <BarChart data={energyData} layout="vertical" margin={{ left: 90 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" />
          <Tooltip />
          <Bar dataKey="mev">
            {energyData.map((row) => (
              <Cell key={row.name} fill={row.name.startsWith('OPEN') ? OPEN_COLOR : REF_COLOR} />
            ))}
          </Bar>
        </BarChart>
      </ChartFrame>

      <ChartFrame title="Q2 log10 branching (assumed / scenario — not a derived Gamma)">
        <BarChart data={radData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" hide />
          <YAxis />
          <Tooltip />
          <Bar dataKey="log10">
            {radData.map((row) => (
              <Cell key={row.name} fill={row.fill} />
            ))}
          </Bar>
        </BarChart>
      </ChartFrame>

      <ChartFrame title="Q3 log10 N_events vs 1-event (modes replace, not a product)">
        <BarChart data={rateData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" hide />
          <YAxis />
          <Tooltip />
          <Bar dataKey="log10">
            {rateData.map((row) => (
              <Cell key={row.name} fill={row.fill} />
            ))}
          </Bar>
        </BarChart>
      </ChartFrame>

      {engines.length > 0 && (
        <ChartFrame title="Composition engines (illegal product is pedagogy only)">
          <BarChart data={engines}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis scale="log" domain={['auto', 'auto']} />
            <Tooltip />
            <Bar dataKey="value">
              {engines.map((row) => (
                <Cell
                  key={row.name}
                  fill={row.name === 'illegal product' ? OPEN_COLOR : REF_COLOR}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartFrame>
      )}

      <ChartFrame title="MHD continuum ladder (Ha not claimed at fm)">
        <BarChart data={mhdData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis hide />
          <Legend />
          <Bar dataKey="valid" stackId="a" fill={REF_COLOR} />
          <Bar dataKey="invalid" stackId="a" fill={OPEN_COLOR} />
        </BarChart>
      </ChartFrame>

      <Typography variant="caption" color="text.secondary">
        Sobol intervals are not calorimetry SNR. 3D gamma sprites are not measured rates.
      </Typography>
    </Box>
  );
}
