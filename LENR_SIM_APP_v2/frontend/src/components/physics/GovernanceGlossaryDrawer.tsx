/**
 * GovernanceGlossaryDrawer.tsx
 *
 * In-app glossary for the evidence-class and claim-tier chips shown on
 * theory contributions. Renders the same semantic tables that live in
 * docs/v0.3.6-beta/RUBRIC_GOVERNANCE.md so users never have to leave
 * the app to understand why a score is down-weighted.
 *
 * Usage:
 *   const [open, setOpen] = useState(false);
 *   <GovernanceGlossaryDrawer open={open} onClose={() => setOpen(false)} />
 */

import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  Divider,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import {
  CLAIM_TIERS,
  EVIDENCE_CLASSES,
} from '../../utils/theoryGovernance';

interface GovernanceGlossaryDrawerProps {
  open: boolean;
  onClose: () => void;
  /**
   * Optional initial anchor to scroll to, one of:
   *  - 'evidence'
   *  - 'claim'
   * (Used when the drawer is opened by clicking a specific chip.)
   */
  initialAnchor?: 'evidence' | 'claim' | null;
}

const GovernanceGlossaryDrawer: React.FC<GovernanceGlossaryDrawerProps> = ({
  open,
  onClose,
  initialAnchor,
}) => {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '90vw', sm: 420 }, p: 0 } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <MenuBookIcon color="primary" />
        <Typography variant="h6" sx={{ flex: 1 }}>
          Governance glossary
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="Close governance glossary">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ p: 2, overflow: 'auto' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Every theory contribution is tagged with two semantic labels that
          control how its raw prediction affects aggregated scores. These
          tables mirror <code>RUBRIC_GOVERNANCE.md</code> so the UI and
          docs stay in sync.
        </Typography>

        <Typography
          id="glossary-claim"
          variant="subtitle2"
          color="primary"
          gutterBottom
          sx={{
            mt: initialAnchor === 'claim' ? 0 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          Claim tiers (score multipliers)
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          The raw weighted-geometric-mean score is multiplied by the tier
          multiplier before aggregation. Speculative and cross-regime
          tracks are visible but cannot dominate the final score.
        </Typography>
        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Tier</TableCell>
              <TableCell align="right">×</TableCell>
              <TableCell>Meaning</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(CLAIM_TIERS).map(([id, t]) => (
              <TableRow key={id}>
                <TableCell>
                  <Chip
                    label={t.label}
                    size="small"
                    color={t.color}
                    variant="outlined"
                    sx={{ fontSize: '0.65rem', height: 20 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                    {t.multiplier.toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{t.description}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Divider sx={{ my: 1 }} />

        <Typography
          id="glossary-evidence"
          variant="subtitle2"
          color="primary"
          gutterBottom
          sx={{ mt: 1 }}
        >
          Evidence classes
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Describes the empirical maturity of the underlying measurements
          or theoretical derivation. Used as a secondary weighting input
          in the combined confidence score.
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Class</TableCell>
              <TableCell>Meaning</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(EVIDENCE_CLASSES).map(([id, e]) => (
              <TableRow key={id}>
                <TableCell>
                  <Chip
                    label={e.label}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.65rem', height: 20 }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{e.description}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Divider sx={{ my: 2 }} />

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Reference: <code>docs/v0.3.6-beta/RUBRIC_GOVERNANCE.md</code>.
          Changes to tier multipliers or class semantics require a
          coordinated update to both the backend scoring module and this
          glossary.
        </Typography>
      </Box>
    </Drawer>
  );
};

export default GovernanceGlossaryDrawer;
