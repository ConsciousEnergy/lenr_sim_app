/**
 * DocViewerPage — Renders markdown documentation from GET /api/docs/{slug}.
 * Supports slugs: issue-ledger, testable-predictions, reviewer-packets,
 * researcher-review-pack, eq-open-closure-runway. Reviewer-packets also shows
 * campaign pack index + download.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  AlertTitle,
  Button,
  Stack,
} from '@mui/material';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import { API_BASE_URL } from '../config/api';
import { track } from '../analytics/events';
import DocsSurfacesBanner from '../components/docs/DocsSurfacesBanner';
import CampaignPackManifestIndex from '../components/docs/CampaignPackManifestIndex';
import ReviewerPacketCrosswalk from '../components/docs/ReviewerPacketCrosswalk';

const SLUG_TO_TITLE: Record<string, string> = {
  'issue-ledger': 'Issue Ledger',
  'testable-predictions': 'Testable Predictions',
  'reviewer-packets': 'Paper Reviewer Packets (A–E)',
  'researcher-review-pack': 'Researcher Review Pack',
  'eq-open-closure-runway': 'EQ-OPEN Closure Runway',
};

const PACKET_SURFACE_SLUGS = new Set([
  'reviewer-packets',
  'researcher-review-pack',
]);

export default function DocViewerPage() {
  const { slug } = useParams<{ slug: string }>();
  const [content, setContent] = useState<string | null>(null);
  const [contentSlug, setContentSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError('No document specified.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const requestSlug = slug;
    setLoading(true);
    setError(null);
    setContent(null);
    setContentSlug(null);
    fetch(`${API_BASE_URL}/api/docs/${requestSlug}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Document not found.');
          }
          throw new Error(`Failed to load document: ${res.status}`);
        }
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        setContent(text);
        setContentSlug(requestSlug);
        track.docsViewed({ slug: requestSlug, source: 'doc-viewer', success: true });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load document.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleDownload = useCallback(() => {
    if (!content || !slug || contentSlug !== slug) return;
    const filename = `${slug}.md`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    track.exportDownloaded({
      surface: 'doc-viewer',
      slug,
      format: 'markdown',
    });
  }, [content, contentSlug, slug]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  if (error || !content) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Error</AlertTitle>
          {error ?? 'Document not found.'}
        </Alert>
        <Button component={Link} to="/documentation" variant="contained">
          Back to Documentation
        </Button>
      </Container>
    );
  }

  const title = (slug && SLUG_TO_TITLE[slug]) ?? slug ?? 'Document';
  const showPacketSurfaces = Boolean(slug && PACKET_SURFACE_SLUGS.has(slug));
  const showPackIndex = slug === 'reviewer-packets';

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        {title}
      </Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        useFlexGap
        flexWrap="wrap"
        sx={{ mb: 2 }}
      >
        <Button component={Link} to="/documentation">
          ← Back to Documentation
        </Button>
        <Button
          variant="outlined"
          onClick={handleDownload}
          data-testid="doc-viewer-download"
        >
          Download markdown
        </Button>
      </Stack>
      {showPacketSurfaces ? (
        <DocsSurfacesBanner activeSlug={slug || ''} testIdPrefix="doc-viewer-surfaces" />
      ) : null}
      {showPackIndex ? (
        <CampaignPackManifestIndex testIdPrefix="doc-viewer-packs" />
      ) : null}
      {showPackIndex ? (
        <ReviewerPacketCrosswalk testIdPrefix="doc-viewer-crosswalk" />
      ) : null}
      <Paper
        elevation={1}
        sx={{
          p: 3,
          '& h1, & h2, & h3': { mt: 2, mb: 1 },
          '& p': { mb: 1.5 },
          '& ul, & ol': { pl: 3, mb: 1.5 },
          '& pre': { overflow: 'auto', p: 2, bgcolor: 'action.hover', borderRadius: 1 },
          '& code': { fontSize: '0.9em' },
        }}
        data-testid="doc-viewer-markdown"
      >
        <ReactMarkdown skipHtml urlTransform={defaultUrlTransform}>
          {content}
        </ReactMarkdown>
      </Paper>
    </Container>
  );
}
