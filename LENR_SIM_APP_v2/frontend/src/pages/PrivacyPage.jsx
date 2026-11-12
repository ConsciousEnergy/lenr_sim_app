/**
 * Public privacy notice for the LENR Simulation SPA.
 * Product analytics (PostHog) is off unless a build-time key is set.
 */
import React, { useState } from 'react';
import { Alert, Box, Button, Container, Link as MuiLink, Typography } from '@mui/material';
import {
  isAnalyticsOptedOut,
  isProductAnalyticsConfigured,
  setAnalyticsOptOut,
} from '../analytics/posthog';

export default function PrivacyPage() {
  const [optedOut, setOptedOut] = useState(() => isAnalyticsOptedOut());
  const productAnalyticsConfigured = isProductAnalyticsConfigured();

  const handleOptOut = () => {
    setAnalyticsOptOut(true);
    setOptedOut(true);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Privacy</Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        This page describes what the public simulation app stores. It is not a
        substitute for legal counsel.
      </Typography>

      <Typography variant="h6" gutterBottom>Model outputs, not experiments</Typography>
      <Typography variant="body2" paragraph>
        Simulation results are theoretical model outputs. They are not laboratory
        measurements and do not prove that LENR occurs. Shared Analytics History on
        the public API is operator-hydrated model output when present.
      </Typography>

      <Typography variant="h6" gutterBottom>API logs</Typography>
      <Typography variant="body2" paragraph>
        The production API may record request metadata (time, path, status, client IP,
        user-agent) for operations, rate limiting, and abuse detection. Physics payloads
        are not sent to product-analytics vendors.
      </Typography>

      <Typography variant="h6" gutterBottom>Product analytics (PostHog)</Typography>
      {productAnalyticsConfigured ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          This production build has product analytics configured. Events are dimensional
          (which page, which control) and must not include raw physics numbers or PII.
          Do-Not-Track is honored. Persistence uses localStorage and a cookie when enabled.
        </Alert>
      ) : (
        <Typography variant="body2" paragraph>
          Product analytics is <strong>not enabled</strong> in this build (no PostHog key).
          No product-analytics cookie is set.
        </Typography>
      )}
      {productAnalyticsConfigured && (
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            disabled={optedOut}
            onClick={handleOptOut}
          >
            {optedOut ? 'Product analytics opted out' : 'Opt out of product analytics'}
          </Button>
        </Box>
      )}

      <Typography variant="h6" gutterBottom>Local storage</Typography>
      <Typography variant="body2" paragraph>
        The browser may keep a local session id and a last-run cache so the UI can reload.
        Clearing site data removes them.
      </Typography>

      <Typography variant="h6" gutterBottom>License</Typography>
      <Typography variant="body2" paragraph>
        The application is licensed under{' '}
        <MuiLink href="/license">
          GNU GPL-3.0
        </MuiLink>
        . Contact:{' '}
        <MuiLink href="mailto:diadon@conscious.energy">diadon@conscious.energy</MuiLink>.
      </Typography>
    </Container>
  );
}
