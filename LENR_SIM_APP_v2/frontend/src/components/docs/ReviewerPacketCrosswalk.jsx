/**
 * Read-only Packet A–E ↔ ledger / PRED / EQ-OPEN crosswalk panel.
 * Navigation aid only — never implies discharge or lenr_proved.
 */
import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Chip,
  Link as MuiLink,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  LEGACY_IL_TO_LEDGER,
  PACKET_CROSSWALK_HONESTY,
  PACKET_CROSSWALK_ROWS,
} from '../../config/reviewerPacketCrosswalk';

/**
 * @param {Object} props
 * @param {string} [props.testIdPrefix]
 * @param {boolean} [props.showLegacyTable]
 */
export default function ReviewerPacketCrosswalk({
  testIdPrefix = 'packet-crosswalk',
  showLegacyTable = true,
}) {
  const honesty = PACKET_CROSSWALK_HONESTY;

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, mb: 2 }}
      data-testid={`${testIdPrefix}-panel`}
    >
      <Typography variant="h6" gutterBottom>
        Packet A–E ↔ ledger / PRED / EQ-OPEN crosswalk
      </Typography>
      <Alert
        severity="warning"
        sx={{ mb: 1.5 }}
        data-testid={`${testIdPrefix}-honesty`}
      >
        <AlertTitle>Navigation only — obligations stay OPEN</AlertTitle>
        <Typography variant="body2">{honesty.disclaimer}</Typography>
      </Alert>
      <Stack
        direction="row"
        spacing={0.5}
        useFlexGap
        flexWrap="wrap"
        sx={{ mb: 1.5 }}
        data-testid={`${testIdPrefix}-chips`}
      >
        <Chip
          size="small"
          label="lenr_proved: false"
          data-testid={`${testIdPrefix}-lenr-proved`}
        />
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label="EQ-OPEN ×5 OPEN"
          data-testid={`${testIdPrefix}-eq-open`}
        />
        <Chip
          size="small"
          variant="outlined"
          label="mapping ≠ discharge"
          data-testid={`${testIdPrefix}-no-discharge`}
        />
        <Chip
          size="small"
          variant="outlined"
          label="no claim-tier raise"
          data-testid={`${testIdPrefix}-no-tier-raise`}
        />
        <Chip
          size="small"
          variant="outlined"
          label="paper FIXED ≠ CLOSED"
          data-testid={`${testIdPrefix}-fixed-ne-closed`}
        />
      </Stack>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
        <MuiLink
          component={RouterLink}
          to={honesty.docs_issue_ledger}
          variant="body2"
          data-testid={`${testIdPrefix}-link-ledger`}
        >
          Issue ledger (C/M/m)
        </MuiLink>
        <MuiLink
          component={RouterLink}
          to={honesty.docs_testable_predictions}
          variant="body2"
          data-testid={`${testIdPrefix}-link-preds`}
        >
          Testable predictions
        </MuiLink>
        <MuiLink
          component={RouterLink}
          to={honesty.docs_eq_open_runway}
          variant="body2"
          data-testid={`${testIdPrefix}-link-runway`}
        >
          EQ-OPEN runway
        </MuiLink>
        <MuiLink
          component={RouterLink}
          to={honesty.docs_researcher_review_pack}
          variant="body2"
          data-testid={`${testIdPrefix}-link-researcher`}
        >
          Researcher review pack
        </MuiLink>
      </Stack>

      <Box sx={{ overflowX: 'auto' }} data-testid={`${testIdPrefix}-packet-table`}>
        <Table size="small" aria-label="Packet A-E crosswalk">
          <TableHead>
            <TableRow>
              <TableCell>Packet</TableCell>
              <TableCell>Ledger (C/M/m)</TableCell>
              <TableCell>Legacy IL</TableCell>
              <TableCell>PRED</TableCell>
              <TableCell>EQ-OPEN (still OPEN)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {PACKET_CROSSWALK_ROWS.map((row) => (
              <TableRow
                key={row.packet_id}
                data-testid={`${testIdPrefix}-row-${row.packet_id}`}
              >
                <TableCell>
                  <Typography variant="subtitle2" component="span">
                    {row.packet_id} — {row.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {row.scope}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {row.note}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                    {row.ledger_ids.length === 0 ? (
                      <Typography variant="caption">—</Typography>
                    ) : (
                      row.ledger_ids.map((id) => (
                        <Chip
                          key={id}
                          size="small"
                          label={id}
                          sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
                        />
                      ))
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                    {row.legacy_il_ids.map((id) => (
                      <Chip
                        key={id}
                        size="small"
                        variant="outlined"
                        label={id}
                        sx={{ fontFamily: 'monospace', fontSize: '0.6rem' }}
                      />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                    {row.pred_ids.length === 0 ? (
                      <Typography variant="caption">—</Typography>
                    ) : (
                      row.pred_ids.map((id) => (
                        <Chip
                          key={id}
                          size="small"
                          variant="outlined"
                          label={id}
                          sx={{ fontFamily: 'monospace', fontSize: '0.6rem' }}
                        />
                      ))
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                    {row.eq_open_ids.length === 0 ? (
                      <Typography variant="caption">none primary</Typography>
                    ) : (
                      row.eq_open_ids.map((id) => (
                        <Chip
                          key={id}
                          size="small"
                          color="warning"
                          variant="outlined"
                          label={`${id} OPEN`}
                          sx={{ fontFamily: 'monospace', fontSize: '0.55rem' }}
                          data-testid={`${testIdPrefix}-open-${row.packet_id}-${id}`}
                        />
                      ))
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {showLegacyTable ? (
        <Box sx={{ mt: 2, overflowX: 'auto' }} data-testid={`${testIdPrefix}-legacy-table`}>
          <Typography variant="subtitle2" gutterBottom>
            Legacy IL-001…018 → C/M/m aliases
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Canonical in-app Issue Ledger IDs are severity tags (C/M/m). IL-* lives in{' '}
            <code>{honesty.legacy_framework_ledger_path}</code> and older merge instructions.
          </Typography>
          <Table size="small" aria-label="Legacy IL alias table">
            <TableHead>
              <TableRow>
                <TableCell>IL</TableCell>
                <TableCell>C/M/m</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>EQ-OPEN stress</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {LEGACY_IL_TO_LEDGER.map((row) => (
                <TableRow
                  key={row.il_id}
                  data-testid={`${testIdPrefix}-il-${row.il_id}`}
                >
                  <TableCell>
                    <code>{row.il_id}</code>
                  </TableCell>
                  <TableCell>
                    {row.ledger_ids.length === 0
                      ? '—'
                      : row.ledger_ids.map((id) => (
                          <Chip
                            key={id}
                            size="small"
                            label={id}
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.65rem',
                              mr: 0.25,
                            }}
                          />
                        ))}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{row.title}</Typography>
                  </TableCell>
                  <TableCell>
                    {row.eq_open_ids.length === 0
                      ? '—'
                      : row.eq_open_ids.map((id) => (
                          <Chip
                            key={id}
                            size="small"
                            color="warning"
                            variant="outlined"
                            label={`${id} OPEN`}
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.55rem',
                              mr: 0.25,
                            }}
                          />
                        ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : null}
    </Paper>
  );
}
