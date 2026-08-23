/**
 * Open Questions Virtual Lab — when/how under named conditions and data.
 */
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import MechanismPathDiagram from './MechanismPathDiagram';
import OpenQuestionsCharts from './OpenQuestionsCharts';
import PredictionReadoutPanel from './PredictionReadoutPanel';

export const LOCAL_FALLBACK_OPEN_QUESTIONS = {
  schema: 'lenr-open-questions-v1',
  route_mode: 'local_fallback',
  rate_mode: 'two_body',
  determination: {
    status: 'INCONCLUSIVE',
    oracle_a: { note: 'local_fallback: Oracle A not evaluated.' },
    oracle_b: { note: 'UNAVAILABLE on local_fallback' },
    oracle_emp: { evaluated: false },
  },
  occurrence: { anchored: false, emp_gates: [] },
  when: {},
  how: {},
  emp_chips: [],
  lenr_proved: false,
};

function copyText(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text);
  }
}

function LeanId({ id }) {
  const onCopy = useCallback(() => copyText(id), [id]);
  return (
    <Tooltip title="Copy Lean / IR id">
      <Chip label={id} size="small" variant="outlined" onClick={onCopy} sx={{ fontFamily: 'monospace' }} />
    </Tooltip>
  );
}

function OracleBPanel({ oracleB, mechanismPaths, viewMode }) {
  if (!oracleB?.hypotheses?.length) return null;

  if (viewMode === 'diagram') {
    const paths = mechanismPaths?.length
      ? mechanismPaths
      : oracleB.hypotheses.map((row) => ({ id: row.id, posterior: row.posterior }));
    return (
      <Box sx={{ mb: 2 }} data-testid="oracle-b-diagrams">
        <Typography variant="subtitle2" gutterBottom>Oracle B — mechanism path diagrams</Typography>
        <Stack spacing={2}>
          {paths.map((row) => (
            <MechanismPathDiagram
              key={row.id}
              pathId={row.id}
              diagramSpec={row.diagram_spec}
              posterior={row.posterior ?? 0}
            />
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 2 }} data-testid="oracle-b-panel">
      <Typography variant="subtitle2" gutterBottom>Oracle B — mechanism paths</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        Priors: {oracleB.priors_source || 'default_skeptical'}
        {oracleB.occurrence_anchored ? ' · occurrence anchored' : ''}
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Hypothesis</TableCell>
            <TableCell align="right">Posterior</TableCell>
            <TableCell align="right">log10 BF vs two_body</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {oracleB.hypotheses.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.id}</TableCell>
              <TableCell align="right">{(row.posterior * 100).toFixed(1)}%</TableCell>
              <TableCell align="right">{Number(row.log10_bayes_vs_two_body).toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

export default function OpenQuestionsVirtualLab({ simulationData }) {
  const [oracleView, setOracleView] = useState('table');
  const oq = simulationData?.open_questions;
  if (!oq || oq.route_mode === 'local_fallback') return null;

  const determination = oq.determination || {};
  const oracleA = determination.oracle_a || {};
  const status = determination.status || 'INCONCLUSIVE';

  return (
    <Paper sx={{ p: 2, mb: 2 }} variant="outlined" data-testid="open-questions-virtual-lab">
      <Typography variant="h6" gutterBottom>Open questions virtual lab</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
        When and how under named conditions and data. Not a nature theorem. Not LENR_PROVED.
      </Typography>

      <PredictionReadoutPanel prediction={simulationData?.peak_conditions?.enhancement_breakdown?.prediction} />

      {oracleA.two_body_budget_closes === false && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Oracle A / B status: RATE BUDGET DOES NOT CLOSE.
          {oracleA.log10_n_events_two_body != null && (
            <> Two-body rate budget does not close (log10 N_events = {oracleA.log10_n_events_two_body}).</>
          )}
        </Alert>
      )}

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Chip label={`Status: ${status}`} size="small" color={status === 'INCONCLUSIVE' ? 'warning' : 'default'} />
        {oq.how?.best_mechanism_path && (
          <Chip label={`path: ${oq.how.best_mechanism_path}`} size="small" />
        )}
        {(oq.how?.lean_theorems || []).map((id) => <LeanId key={id} id={id} />)}
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ mb: 2 }}>
        <Tabs value={oracleView} onChange={(_, value) => setOracleView(value)} sx={{ mb: 1 }}>
          <Tab label="Table" value="table" data-testid="oracle-b-tab-table" />
          <Tab label="Diagram" value="diagram" data-testid="oracle-b-tab-diagram" />
        </Tabs>
        <OracleBPanel
          oracleB={determination.oracle_b}
          mechanismPaths={oq.how?.mechanism_paths}
          viewMode={oracleView}
        />
      </Box>

      <OpenQuestionsCharts openQuestions={oq} />
    </Paper>
  );
}
