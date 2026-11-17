/**
 * Read-only campaign JSON pack manifest index (GET /api/docs/campaign-packs).
 * Honesty chips only — never implies EQ-OPEN closed or lenr_proved.
 */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Chip,
  CircularProgress,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { apiClient } from '../../api/client';

/**
 * @param {Object} props
 * @param {string} [props.testIdPrefix]
 */
export default function CampaignPackManifestIndex({
  testIdPrefix = 'campaign-pack-index',
}) {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .get('/api/docs/campaign-packs')
      .then((res) => {
        if (cancelled) return;
        const data = res?.data;
        if (data?.lenr_proved === true) {
          throw new Error('Refusing index with lenr_proved true');
        }
        setPayload(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err?.message ||
              (err instanceof Error ? err.message : 'Failed to load pack index')
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        py={2}
        data-testid={`${testIdPrefix}-loading`}
      >
        <CircularProgress size={28} thickness={4} />
      </Box>
    );
  }

  if (error || !payload) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }} data-testid={`${testIdPrefix}-error`}>
        <AlertTitle>Campaign pack index unavailable</AlertTitle>
        {error ?? 'No payload'} — packs remain on disk under{' '}
        <code>datasets/reviewer_packs/</code>. See{' '}
        <MuiLink component={RouterLink} to="/docs/researcher-review-pack">
          Researcher review pack
        </MuiLink>{' '}
        for CLI hydrate.
      </Alert>
    );
  }

  const packs = Array.isArray(payload.packs) ? payload.packs : [];

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, mb: 2 }}
      data-testid={`${testIdPrefix}-panel`}
    >
      <Typography variant="h6" gutterBottom>
        Campaign JSON packs (read-only index)
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {payload.disclaimer}
      </Typography>
      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
        <Chip
          size="small"
          color="default"
          label="lenr_proved: false"
          data-testid={`${testIdPrefix}-lenr-proved`}
        />
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label={`EQ-OPEN: ${payload.eq_open_status || 'OPEN'}`}
          data-testid={`${testIdPrefix}-eq-open`}
        />
        <Chip
          size="small"
          variant="outlined"
          label={`n_packs: ${payload.n_packs ?? packs.length}`}
        />
        <Chip size="small" variant="outlined" label="model output ≠ lab proof" />
      </Stack>
      <Stack spacing={1.25} data-testid={`${testIdPrefix}-list`}>
        {packs.map((pack) => (
          <Box
            key={pack.pack_id}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              pb: 1,
            }}
            data-testid={`${testIdPrefix}-row-${pack.pack_id}`}
          >
            <Stack
              direction="row"
              spacing={0.5}
              useFlexGap
              flexWrap="wrap"
              alignItems="center"
              sx={{ mb: 0.5 }}
            >
              <Typography variant="subtitle2" component="span">
                <code>{pack.pack_id}</code>
              </Typography>
              <Chip size="small" label={pack.role || 'campaign'} />
              {pack.fixture ? (
                <Chip
                  size="small"
                  color="secondary"
                  variant="outlined"
                  label="test fixture — not external review pack"
                  data-testid={`${testIdPrefix}-fixture-${pack.pack_id}`}
                />
              ) : null}
              <Chip
                size="small"
                label={`N=${pack.n_experiments}/${pack.n_theory_runs}`}
              />
              <Chip size="small" label="lenr_proved: false" />
              <Chip
                size="small"
                color="warning"
                variant="outlined"
                label={
                  pack.open_ids_all_present
                    ? 'EQ-OPEN ×5 OPEN'
                    : 'EQ-OPEN incomplete'
                }
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block">
              preset=<code>{pack.preset}</code> · path{' '}
              <code>{pack.pack_path}</code>
            </Typography>
          </Box>
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
        Hydrate via CLI — see{' '}
        <MuiLink component={RouterLink} to="/docs/researcher-review-pack">
          Researcher review pack
        </MuiLink>
        . Pack N / UQ densification is not ≥5σ discovery or EQ-OPEN discharge.
      </Typography>
    </Paper>
  );
}
