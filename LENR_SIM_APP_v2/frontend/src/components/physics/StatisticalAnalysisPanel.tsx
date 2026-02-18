/**
 * StatisticalAnalysisPanel Component
 */
import React from 'react';
import { Box, Typography, Paper, Chip, Stack, Divider } from '@mui/material';

interface StatisticalMetrics {
  mean: number;
  stdDev: number;
  variance: number;
  skewness: number;
  kurtosis: number;
}

interface StatisticalAnalysisPanelProps {
  reactionRateStats?: StatisticalMetrics;
  energyStats?: StatisticalMetrics;
  sampleCount?: number;
  confidenceLevel?: number;
  isLoading?: boolean;
}

const defaultStats: StatisticalMetrics = {
  mean: 0,
  stdDev: 0,
  variance: 0,
  skewness: 0,
  kurtosis: 0
};

const StatisticalAnalysisPanel: React.FC<StatisticalAnalysisPanelProps> = ({
  reactionRateStats = defaultStats,
  energyStats = defaultStats,
  sampleCount = 0,
  confidenceLevel = 0.95,
  isLoading: _isLoading = false
}) => {
  const formatStat = (value: number) => {
    if (Math.abs(value) < 0.001 || Math.abs(value) > 1000) {
      return value.toExponential(2);
    }
    return value.toFixed(3);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Statistical Analysis</Typography>
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1}>
          <Chip label={"Samples: " + sampleCount} size="small" />
          <Chip label={"CI: " + (confidenceLevel * 100).toFixed(0) + "%"} size="small" color="primary" />
        </Stack>
      </Box>
      <Typography variant="subtitle2" gutterBottom>Reaction Rate Statistics</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption">Mean:</Typography>
          <Typography variant="caption">{formatStat(reactionRateStats.mean)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption">Std Dev:</Typography>
          <Typography variant="caption">{formatStat(reactionRateStats.stdDev)}</Typography>
        </Box>
      </Box>
      <Divider sx={{ my: 1 }} />
      <Typography variant="subtitle2" gutterBottom>Energy Statistics</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption">Mean:</Typography>
          <Typography variant="caption">{formatStat(energyStats.mean)} eV</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption">Std Dev:</Typography>
          <Typography variant="caption">{formatStat(energyStats.stdDev)} eV</Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default StatisticalAnalysisPanel;
