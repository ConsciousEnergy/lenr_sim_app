/**
 * DocViewerPage — Renders markdown documentation from GET /api/docs/{slug}.
 * Supports slugs: issue-ledger, testable-predictions, reviewer-packets.
 */

import React, { useEffect, useState } from 'react';
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
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { API_BASE_URL } from '../config/api';
import { track } from '../analytics/events';

const SLUG_TO_TITLE: Record<string, string> = {
  'issue-ledger': 'Issue Ledger',
  'testable-predictions': 'Testable Predictions',
  'reviewer-packets': 'Reviewer Packets',
};

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

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        {title}
      </Typography>
      <Button component={Link} to="/documentation" sx={{ mb: 2 }}>
        ← Back to Documentation
      </Button>
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
      >
        <ReactMarkdown>{content}</ReactMarkdown>
      </Paper>
    </Container>
  );
}
