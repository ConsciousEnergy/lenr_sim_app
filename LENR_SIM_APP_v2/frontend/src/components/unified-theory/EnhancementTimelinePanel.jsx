import React from 'react';
import { Alert, Box, Typography } from '@mui/material';
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
import {
  ENHANCEMENT_THRESHOLDS,
  getCollapseTrajectoryData,
  getEnhancementChartData,
} from '../../utils/unifiedTheoryCharts';

export default function EnhancementTimelinePanel({ simulationData, parameters }) {
  const chartData = getEnhancementChartData(simulationData, parameters);
  const saturatedPoints = chartData.filter((point) => point.isSaturated).length;
  const trajectory = getCollapseTrajectoryData(simulationData);
  const minRadius = trajectory.length
    ? Math.min(...trajectory.map((p) => p.radiusUm))
    : null;

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Enhancement Factor During Collapse Cycle (log10 scale)
      </Typography>
      {saturatedPoints > 0 && (
        <Alert severity="info" sx={{ mb: 1, py: 0 }}>
          <Typography variant="caption">
            {saturatedPoints} of {chartData.length} samples exceed the{' '}
            {ENHANCEMENT_THRESHOLDS.observable.toExponential(0)} display ceiling.
            The solid line is the uncapped model magnitude; the dashed line is
            the reported (clamped) value, which is flat where it saturates.
          </Typography>
        </Alert>
      )}
      {/* Explicit pixel height: percentage heights under minHeight-only parents
          collapse Recharts to zero height. */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis yAxisId="left" label={{ value: 'log10(Enhancement)', angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" label={{ value: 'Radius %', angle: 90, position: 'insideRight' }} />
          <YAxis yAxisId="right2" orientation="right" hide domain={[0.7, 1.2]} />
          <RechartsTooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="enhancement" stroke="#8884d8" name="Enhancement (uncapped log10)" strokeWidth={2} dot={false} />
          <Line yAxisId="left" type="monotone" dataKey="enhancementCapped" stroke="#ce93d8" name="Enhancement (reported, clamped)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="radius" stroke="#82ca9d" name="Bubble Radius %" dot={false} />
          <Line yAxisId="right2" type="monotone" dataKey="electrolyteMultiplier" stroke="#ff9800" name="Electrolyte Multiplier" strokeDasharray="5 4" dot={false} />
        </LineChart>
      </ResponsiveContainer>
      {trajectory.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle2" gutterBottom>
            Integrated Collapse Trajectory (Rayleigh-Plesset)
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Solved R(t) behind the reported peak conditions. Minimum radius{' '}
            {minRadius.toExponential(2)} μm
            {simulationData.collapse_trajectory?.sample_count
              ? ` from ${simulationData.collapse_trajectory.sample_count} samples`
              : ''}
            .
          </Typography>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trajectory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timeUs"
                label={{ value: 'Time (μs)', position: 'insideBottom', offset: -4 }}
              />
              <YAxis
                yAxisId="radius"
                label={{ value: 'Radius (μm)', angle: -90, position: 'insideLeft' }}
              />
              <YAxis yAxisId="velocity" orientation="right" hide />
              <RechartsTooltip />
              <Legend />
              <Line yAxisId="radius" type="monotone" dataKey="radiusUm" stroke="#29b6f6" name="Radius (μm)" strokeWidth={2} dot={false} />
              <Line yAxisId="velocity" type="monotone" dataKey="wallVelocity" stroke="#ef5350" name="Wall velocity (m/s)" strokeWidth={1} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
}
