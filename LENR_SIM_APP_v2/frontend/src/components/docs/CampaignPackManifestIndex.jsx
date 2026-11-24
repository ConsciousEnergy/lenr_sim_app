/**
 * Read-only campaign JSON pack manifest index (GET /api/docs/campaign-packs)
 * plus honesty-gated zip download. Never implies EQ-OPEN closed or lenr_proved.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { Link as RouterLink } from 'react-router-dom';
import { apiClient } from '../../api/client';
import ExportHonestyModal from '../ExportHonestyModal';
import { downloadBlob } from '../../utils/downloadBlob';
import { track } from '../../analytics/events';
import {
  BENCHMARK_PACK_DOWNLOAD_PATH,
  BENCHMARK_PACK_ID,
} from '../../utils/unifiedExportPayload';

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
  const [honestyOpen, setHonestyOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState(null);
  const [downloading, setDownloading] = useState(false);

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

  const requestDownload = useCallback((kind, packId) => {
    setPendingDownload({ kind, packId });
    setHonestyOpen(true);
  }, []);

  const runDownload = useCallback(async () => {
    if (!pendingDownload) return;
    setDownloading(true);
    try {
      const { kind, packId } = pendingDownload;
      const path =
        kind === 'benchmark'
          ? BENCHMARK_PACK_DOWNLOAD_PATH
          : `/api/docs/campaign-packs/${encodeURIComponent(packId)}/download`;
      const res = await apiClient.get(path, {
        responseType: 'blob',
        timeout: 60000,
      });
      const filename =
        kind === 'benchmark'
          ? `${BENCHMARK_PACK_ID}.zip`
          : `${packId}.zip`;
      downloadBlob(res.data, filename, 'application/zip');
      track.exportDownloaded({
        schema_version:
          kind === 'benchmark'
            ? 'umlenr-benchmark-pack-v1'
            : 'lenr-reviewer-pack-v1',
        format: 'zip',
        pack_id: packId,
        success: true,
      });
      setHonestyOpen(false);
      setPendingDownload(null);
    } catch (err) {
      track.exportDownloaded({
        schema_version: 'pack-download',
        format: 'zip',
        success: false,
      });
      setError(
        err?.message ||
          (err instanceof Error ? err.message : 'Pack download failed')
      );
      setHonestyOpen(false);
    } finally {
      setDownloading(false);
    }
  }, [pendingDownload]);

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
    <>
      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 2 }}
        data-testid={`${testIdPrefix}-panel`}
      >
        <Typography variant="h6" gutterBottom>
          Campaign JSON packs + UMLENR benchmark download
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

        <Box sx={{ mb: 2 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => requestDownload('benchmark', BENCHMARK_PACK_ID)}
            data-testid={`${testIdPrefix}-benchmark-download`}
          >
            Download P1–P6 benchmark pack (zip)
          </Button>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
            Schema <code>umlenr-benchmark-pack-v1</code> — PROVENANCE + inventory +
            explicit unavailable stubs. Honesty modal required.
          </Typography>
        </Box>

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
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => requestDownload('campaign', pack.pack_id)}
                  data-testid={`${testIdPrefix}-download-${pack.pack_id}`}
                >
                  Zip
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block">
                preset=<code>{pack.preset}</code> · path{' '}
                <code>{pack.pack_path}</code>
              </Typography>
            </Box>
          ))}
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
          Downloads are honesty-gated. CLI hydrate remains available — see{' '}
          <MuiLink component={RouterLink} to="/docs/researcher-review-pack">
            Researcher review pack
          </MuiLink>
          . Pack N / UQ densification is not ≥5σ discovery or EQ-OPEN discharge.
        </Typography>
      </Paper>

      <ExportHonestyModal
        open={honestyOpen}
        onClose={() => {
          if (!downloading) {
            setHonestyOpen(false);
            setPendingDownload(null);
          }
        }}
        onConfirm={runDownload}
        confirming={downloading}
        title={
          pendingDownload?.kind === 'benchmark'
            ? 'Download UMLENR P1–P6 benchmark pack'
            : `Download campaign pack ${pendingDownload?.packId || ''}`
        }
        confirmLabel="Download zip"
        testIdPrefix={`${testIdPrefix}-honesty`}
      />
    </>
  );
}
