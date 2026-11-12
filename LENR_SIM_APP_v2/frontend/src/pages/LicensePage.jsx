/**
 * In-app GNU GPL-3.0 license page for public beta visitors.
 * Footer and About link to /license; raw text remains at /LICENSE.
 */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Link as MuiLink,
  Typography,
} from '@mui/material';

export default function LicensePage() {
  const [licenseText, setLicenseText] = useState('');
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadLicense = async () => {
      try {
        const response = await fetch('/LICENSE');
        if (!response.ok) {
          throw new Error(`Failed to load license (${response.status})`);
        }
        const text = await response.text();
        if (isMounted) {
          setLicenseText(text);
          setLoadError(null);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load license');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadLicense();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }} data-testid="license-page">
      <Typography variant="h4" gutterBottom>
        License
      </Typography>
      <Typography variant="body1" paragraph>
        The LENR Simulation App is licensed under the{' '}
        <strong>GNU General Public License v3.0</strong> (GPL-3.0). This is a
        copyleft free-software license: you may run, study, share, and modify the
        software, provided derivative works remain under GPL-3.0.
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Contact:{' '}
        <MuiLink href="mailto:diadon@conscious.energy">diadon@conscious.energy</MuiLink>
        {' · '}
        Raw license text also at{' '}
        <MuiLink href="/LICENSE">/LICENSE</MuiLink>.
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading license text" />
        </Box>
      )}

      {loadError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Could not load the full license text ({loadError}). Open{' '}
          <MuiLink href="/LICENSE">/LICENSE</MuiLink> for the complete GNU GPL-3.0
          text.
        </Alert>
      )}

      {!isLoading && !loadError && licenseText && (
        <Box
          component="pre"
          data-testid="license-full-text"
          sx={{
            p: 2,
            borderRadius: 1,
            bgcolor: 'action.hover',
            overflow: 'auto',
            maxHeight: '70vh',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '0.75rem',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {licenseText}
        </Box>
      )}
    </Container>
  );
}
