/**
 * Reviewer surfaces on Analytics Relevance Map: parameter sweep + validation.
 * These APIs already exist; extra runs remain model outputs, not LENR proof.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { analyticsApi } from '../../services/analyticsApi';

const SWEEP_THEORIES = ['electron_screening', 'takahashi_tsc', 'miles_heat_helium'];

const AXES = {
  loading_ratio: { min: 0.1, max: 1.0, steps: 8, label: 'loading' },
  temperature: { min: 280, max: 400, steps: 7, label: 'T (K)' },
};

export default function ReviewerAnalyticsPanels() {
  const [sweepAxis, setSweepAxis] = useState('loading_ratio');
  const [sweepPayload, setSweepPayload] = useState(null);
  const [sweepError, setSweepError] = useState(null);
  const [sweepLoading, setSweepLoading] = useState(false);
  const [validationReport, setValidationReport] = useState(null);
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const payload = await analyticsApi.getValidationReport();
        if (!cancelled) setValidationReport(payload);
      } catch (err) {
        if (!cancelled) {
          setValidationError(err.message || 'Validation report unavailable.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runSweep = useCallback(async () => {
    const axis = AXES[sweepAxis];
    setSweepLoading(true);
    setSweepError(null);
    try {
      const payload = await analyticsApi.parameterSweep({
        base_conditions: {
          temperature: 300.0,
          loading_ratio: 0.9,
          pressure: 101325.0,
          electron_density: 6.8e28,
        },
        sweep_param: sweepAxis,
        sweep_min: axis.min,
        sweep_max: axis.max,
        sweep_steps: Math.min(axis.steps, 100),
        enabled_theories: SWEEP_THEORIES,
      });
      setSweepPayload(payload);
    } catch (err) {
      setSweepError(err.message || 'Parameter sweep failed.');
    } finally {
      setSweepLoading(false);
    }
  }, [sweepAxis]);

  const reports = validationReport?.reports || [];
  const sweepTheories = Object.keys(sweepPayload?.results || {}).slice(0, 3);
  const sweepValues = sweepPayload?.sweep_values || [];

  return (
    <Stack spacing={2} sx={{ mt: 2 }} data-testid="reviewer-analytics-panels">
      <Paper sx={{ p: 2 }} data-testid="parameter-sweep-panel">
        <Typography variant="subtitle1" gutterBottom>
          Sweep loading / T
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Uses existing parameter-sweep (max 100 steps). Model output, not experimental confirmation.
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Axis</InputLabel>
            <Select
              value={sweepAxis}
              label="Axis"
              onChange={(event) => setSweepAxis(event.target.value)}
              data-testid="sweep-axis-select"
            >
              <MenuItem value="loading_ratio">Loading ratio</MenuItem>
              <MenuItem value="temperature">Temperature</MenuItem>
            </Select>
          </FormControl>
          <Button
            size="small"
            variant="outlined"
            onClick={runSweep}
            disabled={sweepLoading}
            data-testid="run-parameter-sweep"
          >
            {sweepLoading ? 'Sweeping…' : 'Run sweep'}
          </Button>
        </Stack>
        {sweepError && <Alert severity="warning">{sweepError}</Alert>}
        {sweepValues.length > 0 && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{AXES[sweepAxis].label}</TableCell>
                {sweepTheories.map((tid) => (
                  <TableCell key={tid}>{tid.replace(/_/g, ' ')}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sweepValues.map((value, index) => (
                <TableRow key={String(value)}>
                  <TableCell>{Number(value).toFixed(2)}</TableCell>
                  {sweepTheories.map((tid) => {
                    const row = (sweepPayload.results[tid] || [])[index] || {};
                    const score = row.final_score ?? row.score;
                    return (
                      <TableCell key={`${tid}-${index}`}>
                        {Number.isFinite(score) ? Number(score).toFixed(2) : '—'}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Paper sx={{ p: 2 }} data-testid="validation-report-panel">
        <Typography variant="subtitle1" gutterBottom>
          Theory validation checks
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Seven phenomenology checks from theory_validation. Passing a check is not LENR proof.
        </Typography>
        {validationError && <Alert severity="warning">{validationError}</Alert>}
        {reports.length > 0 && (
          <Box>
            <Chip
              size="small"
              sx={{ mb: 1 }}
              label={`${validationReport.n_theories} theories`}
              data-testid="validation-theory-count"
            />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Theory</TableCell>
                  <TableCell>Passed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.slice(0, 8).map((row) => (
                  <TableRow key={row.theory_id}>
                    <TableCell>{row.theory_name || row.theory_id}</TableCell>
                    <TableCell>{`${row.n_passed}/${row.n_total}`}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Stack>
  );
}
