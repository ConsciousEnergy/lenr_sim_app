/**
 * Mandatory pre-download honesty gate for UMLENR exports / benchmark packs.
 * Simulation model output ≠ laboratory proof; EQ-OPEN stay OPEN.
 */
import React from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Typography,
  Chip,
} from '@mui/material';

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {() => void} props.onConfirm
 * @param {string} [props.title]
 * @param {string} [props.confirmLabel]
 * @param {string} [props.testIdPrefix]
 * @param {boolean} [props.confirming]
 */
export default function ExportHonestyModal({
  open,
  onClose,
  onConfirm,
  title = 'Download honesty acknowledgment',
  confirmLabel = 'Download',
  testIdPrefix = 'export-honesty',
  confirming = false,
}) {
  const [acknowledged, setAcknowledged] = React.useState(false);

  React.useEffect(() => {
    if (!open) setAcknowledged(false);
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={confirming ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      data-testid={`${testIdPrefix}-dialog`}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          <Typography variant="body2">
            This download is <strong>simulation model output</strong>, not a
            laboratory measurement or LENR proof.
          </Typography>
          <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
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
            <Chip size="small" variant="outlined" label="model ≠ lab" />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            All five <code>EQ-OPEN-*</code> obligations stay <strong>OPEN</strong>.
            Unavailable experimental series (e.g. Bao 2023, Kasagi 2002 raw) are
            stubbed explicitly — never fabricated. Pack provenance records app
            version and honesty class.
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                data-testid={`${testIdPrefix}-ack`}
                disabled={confirming}
              />
            }
            label="I understand this is model output, not laboratory proof, and EQ-OPEN stay OPEN."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={confirming} data-testid={`${testIdPrefix}-cancel`}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={!acknowledged || confirming}
          data-testid={`${testIdPrefix}-confirm`}
        >
          {confirming ? 'Preparing…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
