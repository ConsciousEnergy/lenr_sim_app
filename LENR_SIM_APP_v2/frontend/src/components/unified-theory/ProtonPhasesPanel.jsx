import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PHASE_COLORS, getProtonPhaseChartData } from '../../utils/unifiedTheoryCharts';

export default function ProtonPhasesPanel({ simulationData }) {
  return (
    <Box sx={{ height: 450 }}>
      <Typography variant="subtitle2" gutterBottom>
        Proton Phase Distribution During Collapse
      </Typography>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={getProtonPhaseChartData(simulationData)}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis label={{ value: 'Fraction', angle: -90, position: 'insideLeft' }} />
          <RechartsTooltip />
          <Legend />
          <Line type="monotone" dataKey="FREE" stroke={PHASE_COLORS.free} name="Free (EM)" strokeWidth={2} />
          <Line type="monotone" dataKey="SCREENED" stroke={PHASE_COLORS.screened} name="Screened" strokeWidth={2} />
          <Line type="monotone" dataKey="CAPTURE_READY" stroke={PHASE_COLORS.capture_ready} name="Capture Ready" strokeWidth={2} />
          <Line type="monotone" dataKey="NUCLEAR" stroke={PHASE_COLORS.nuclear} name="Model nuclear-active phase" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
