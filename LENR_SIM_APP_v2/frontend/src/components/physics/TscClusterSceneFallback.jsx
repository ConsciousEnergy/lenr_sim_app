/**
 * Text fallback for the TSC cluster scene. Deliberately free of any three /
 * @react-three import so it can be rendered when WebGL is missing OR when the
 * lazily-loaded 3D chunk itself fails to evaluate.
 */
import React from 'react';
import { Alert, Typography } from '@mui/material';
import { formatCompact } from '../../utils/formatCompact';

export { formatCompact };

export function detectWebGL() {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return Boolean(gl) && typeof gl.getParameter === 'function';
  } catch (_error) {
    return false;
  }
}

export function summarizeNumbers(dicke, alphaStopping, channels) {
  const rDicke = Number(dicke?.dicke_radius_m);
  const lDomain = Number(dicke?.paper_domain_m);
  const ratio = Number.isFinite(rDicke) && rDicke > 0 && Number.isFinite(lDomain)
    ? lDomain / rDicke
    : null;
  const tscChannel = (channels || []).find((row) => row.id === 'tsc_4d_2alpha');
  const kePerAlpha = alphaStopping?.ke_per_alpha_mev;
  const nAlphas = alphaStopping?.n_alphas ?? 2;
  const q4d = alphaStopping?.q_4d_mev ?? tscChannel?.q_mev;
  return {
    dickeRadius: formatCompact(rDicke),
    paperDomain: formatCompact(lDomain),
    ratio: ratio == null ? '—' : `${Math.round(ratio)}:1`,
    nWithinRadius: formatCompact(dicke?.n_within_radius),
    nCohLicensedMax: dicke?.n_coh_licensed_max ?? '—',
    alphaLabel: `${formatCompact(kePerAlpha)} MeV α`,
    alphaCaption: `${nAlphas}×${formatCompact(kePerAlpha)} = ${formatCompact(q4d)} MeV; no primary γ modeled; remainder OPEN`,
  };
}

export function SceneFallback({ numbers, reason }) {
  return (
    <Alert severity="info" data-testid="tsc-cluster-scene-fallback" sx={{ mb: 2 }}>
      <Typography variant="subtitle2">TSC cluster scene (text fallback)</Typography>
      <Typography variant="body2">{reason}</Typography>
      <Typography variant="body2" component="div">
        Dicke radius {numbers.dickeRadius} m · paper domain {numbers.paperDomain} m
        {' '}(ratio ≈ {numbers.ratio}) · N within Dicke radius {numbers.nWithinRadius}
        {' '}· N_coh licensed max {numbers.nCohLicensedMax}
      </Typography>
      <Typography variant="body2">{numbers.alphaCaption}</Typography>
    </Alert>
  );
}

/** Drop-in replacement for TscClusterScene when its chunk cannot be loaded. */
export default function TscClusterSceneUnavailable({ dicke, alphaStopping, channels }) {
  if (!dicke) return null;
  return (
    <SceneFallback
      numbers={summarizeNumbers(dicke, alphaStopping, channels)}
      reason="The 3D renderer could not be loaded in this browser; the schematic scene is replaced by its numbers."
    />
  );
}
