import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, AlertTitle, Box, Button, Collapse, Link, Typography } from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { useApiHealth } from '../hooks/useApiHealth';
import { APP_VERSION } from '../config/version';

const DISMISS_KEY = 'lenr-beta-notice-dismissed';
const FEEDBACK_URL = 'https://github.com/ConsciousEnergy/lenr_sim_app/issues/new?labels=beta-feedback&template=beta_feedback.yml';

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch (_) {
    return false;
  }
}

/**
 * Site-wide public-beta chrome.
 *
 * - A dismissible "research preview" banner so no visitor mistakes model
 *   output for a laboratory measurement (scientific-rigor-provenance rule).
 * - A non-dismissible "API unreachable" alert driven by useApiHealth. Several
 *   simulation pages fall back to schematic local calculations when the
 *   backend is down; this makes that state impossible to miss.
 */
export default function BetaNotice({ monitorApi = true }) {
  const [dismissed, setDismissed] = useState(readDismissed);
  const { isOnline, consecutiveFailures } = useApiHealth({ autoMonitor: monitorApi });

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch (_) {
      // localStorage unavailable (private mode) - banner simply re-appears next visit.
    }
  };

  const apiDown = monitorApi && !isOnline;

  return (
    <Box data-testid="beta-notice" sx={{ mb: 2 }}>
      {apiDown && (
        <Alert
          severity="error"
          icon={<CloudOffIcon fontSize="inherit" />}
          data-testid="api-unreachable-alert"
          sx={{ mb: 1 }}
        >
          <AlertTitle>Simulation API unreachable</AlertTitle>
          The backend has not answered {consecutiveFailures || 'recent'} health checks. Pages
          may show <strong>schematic placeholder values</strong> until it recovers; do not cite
          anything computed while this notice is visible.
        </Alert>
      )}
      <Collapse in={!dismissed} unmountOnExit>
        <Alert
          severity="info"
          icon={<ScienceIcon fontSize="inherit" />}
          data-testid="beta-banner"
          action={
            <Button color="inherit" size="small" onClick={dismiss} aria-label="Dismiss beta notice">
              Got it
            </Button>
          }
        >
          <AlertTitle>Public beta {APP_VERSION} - research preview</AlertTitle>
          <Typography variant="body2" component="span">
            Every number here is a <strong>model output</strong>, not a laboratory measurement.
            Engine maturity chips (Beta / Approximate / Speculative) mark incomplete proofs — see{' '}
            <Link component={RouterLink} to="/theory?tab=methods">Theory Methods</Link>.
            LENR is still an experimental inquiry; open questions and claim tiers are on the{' '}
            <Link component={RouterLink} to="/about">About</Link> page. Found a problem?{' '}
            <Link href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">
              Send beta feedback
            </Link>{' '}
            or email <Link href="mailto:diadon@conscious.energy">diadon@conscious.energy</Link>.{' '}
            <Link component={RouterLink} to="/privacy">Privacy</Link>
          </Typography>
        </Alert>
      </Collapse>
    </Box>
  );
}
