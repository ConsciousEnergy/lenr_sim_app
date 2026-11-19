/**
 * DocViewerPage — Renders markdown documentation from GET /api/docs/{slug}.
 * Supports slugs: issue-ledger, testable-predictions, reviewer-packets,
 * researcher-review-pack, eq-open-closure-runway. Reviewer-packets also shows
 * campaign pack index + download. Math via remark-math + rehype-katex (P2).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import './docViewerPrint.css';
import { API_BASE_URL } from '../config/api';
import { track } from '../analytics/events';
import DocsSurfacesBanner from '../components/docs/DocsSurfacesBanner';
import CampaignPackManifestIndex from '../components/docs/CampaignPackManifestIndex';
import ReviewerPacketCrosswalk from '../components/docs/ReviewerPacketCrosswalk';
import DocViewerHonestyNote from '../components/docs/DocViewerHonestyNote';
import { normalizeMarkdownMath } from '../utils/normalizeMarkdownMath';

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

const MATH_BEARING_SLUGS = new Set([
  'testable-predictions',
  'eq-open-closure-runway',
  'issue-ledger',
]);

export default function DocViewerPage() {
  const { slug } = useParams<{ slug: string }>();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError('No document specified.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/api/docs/${slug}`)
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
        setContent(text);
        track.docsViewed({ slug, source: 'doc-viewer', success: true });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load document.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  const renderedMarkdown = useMemo(
    () => (content ? normalizeMarkdownMath(content) : ''),
    [content],
  );

  const handleDownload = useCallback(() => {
    if (!content || !slug) return;
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
  }, [content, slug]);

  const handlePrint = useCallback(() => {
    if (!slug) return;
    track.exportDownloaded({
      surface: 'doc-viewer-print',
      slug,
      format: 'print',
    });
    window.print();
  }, [slug]);

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
  const showHonestyNote = Boolean(
    slug && (MATH_BEARING_SLUGS.has(slug) || PACKET_SURFACE_SLUGS.has(slug)),
  );

  return (
    <Container
      maxWidth="md"
      sx={{ py: 4 }}
      data-testid="doc-viewer-print-root"
    >
      <Typography variant="h4" gutterBottom fontWeight="bold">
        {title}
      </Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        useFlexGap
        flexWrap="wrap"
        sx={{ mb: 2 }}
        data-testid="doc-viewer-no-print"
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
        <Button
          variant="outlined"
          onClick={handlePrint}
          data-testid="doc-viewer-print"
        >
          Print
        </Button>
      </Stack>
      {showHonestyNote ? (
        // Keep honesty locks printable on testable-predictions (OPEN / lenr_proved:false).
        // Other honesty surfaces stay chrome-only (no-print).
        <Box
          data-testid={
            slug === 'testable-predictions' ? undefined : 'doc-viewer-no-print'
          }
        >
          <DocViewerHonestyNote testIdPrefix="doc-viewer-honesty" slug={slug || ''} />
        </Box>
      ) : null}
      {showPacketSurfaces ? (
        <Box data-testid="doc-viewer-no-print">
          <DocsSurfacesBanner activeSlug={slug || ''} testIdPrefix="doc-viewer-surfaces" />
        </Box>
      ) : null}
      {showPackIndex ? (
        <Box data-testid="doc-viewer-no-print">
          <CampaignPackManifestIndex testIdPrefix="doc-viewer-packs" />
        </Box>
      ) : null}
      {showPackIndex ? (
        <Box data-testid="doc-viewer-no-print">
          <ReviewerPacketCrosswalk testIdPrefix="doc-viewer-crosswalk" />
        </Box>
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
          '& .katex-display': { my: 2, overflowX: 'auto' },
        }}
        data-testid="doc-viewer-markdown"
      >
        <ReactMarkdown
          skipHtml
          urlTransform={defaultUrlTransform}
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {renderedMarkdown}
        </ReactMarkdown>
      </Paper>
    </Container>
  );
}
