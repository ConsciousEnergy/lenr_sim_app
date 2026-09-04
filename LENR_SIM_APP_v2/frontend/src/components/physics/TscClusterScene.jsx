/**
 * TscClusterScene — schematic 3D view of the WH-ENP-01 TSC / Dicke geometry.
 *
 * Everything drawn here is a lookup of API-provided numbers (dicke_radius_m,
 * paper_domain_m, alpha_stopping) placed into a schematic scene. The collapse
 * slider is a scrub, not physical time, and nothing here implies LENR occurs:
 * the remainder stays OPEN in every caption.
 *
 * Follows the R3F precedent in visualizations/ReactionDynamicsVisualization.jsx
 * (declarative <Canvas> + useFrame + drei OrbitControls); the Canvas disposes
 * its renderer on unmount so no manual WebGL cleanup is needed.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Chip,
  FormControlLabel,
  Paper,
  Slider,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { CLAIM_TIERS } from '../../utils/theoryGovernance';
import { SceneFallback, detectWebGL, summarizeNumbers } from './TscClusterSceneFallback';

export { detectWebGL, formatCompact } from './TscClusterSceneFallback';

const SQRT3 = Math.sqrt(3);
const TETRAHEDRON_VERTICES = [
  [1, 1, 1],
  [1, -1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
].map((v) => v.map((c) => c / SQRT3));

const ALPHA_AXIS = (() => {
  const raw = [1, 0.35, 0.2];
  const norm = Math.hypot(...raw);
  return raw.map((c) => c / norm);
})();

const ALPHA_ONSET = 0.9;
const LOG_REFERENCE_M = 1e-12;
const LINEAR_BOX_HALF = 3.5;
const DEUTERON_COLOR = '#1565c0';
const ALPHA_COLOR = '#c62828';
const DICKE_COLOR = '#ef6c00';
const DOMAIN_COLOR = '#616161';

function usePrefersReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return Boolean(window.matchMedia(query)?.matches);
  });
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(query);
    if (!media) return undefined;
    const onChange = (event) => setReduced(Boolean(event.matches));
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

/**
 * Display radii. The real Dicke radius : paper domain ratio is ~135:1, which
 * is unreadable at linear scale; log scale maps r -> log10(r / 1 pm).
 */
export function computeDisplayRadii(dicke, logScale) {
  const rDicke = Number(dicke?.dicke_radius_m);
  const lDomain = Number(dicke?.paper_domain_m);
  const hasDicke = Number.isFinite(rDicke) && rDicke > 0;
  const hasDomain = Number.isFinite(lDomain) && lDomain > 0;
  if (logScale) {
    const toLog = (r) => Math.max(0.05, Math.log10(r / LOG_REFERENCE_M));
    return {
      dickeRadius: hasDicke ? toLog(rDicke) : 0,
      boxHalf: hasDomain ? toLog(lDomain / 2) : LINEAR_BOX_HALF,
    };
  }
  const boxHalf = LINEAR_BOX_HALF;
  const dickeRadius = hasDicke && hasDomain ? boxHalf * (rDicke / (lDomain / 2)) : 0;
  return { dickeRadius, boxHalf };
}

function AlphaPair({ collapse, boxHalf, label }) {
  const progress = Math.min(1, Math.max(0, (collapse - ALPHA_ONSET) / (1 - ALPHA_ONSET)));
  const distance = 0.35 + progress * boxHalf * 0.8;
  const positions = [1, -1].map((sign) => ALPHA_AXIS.map((c) => c * sign * distance));
  return (
    <group>
      {positions.map((position, index) => (
        <group key={index} position={position}>
          <mesh>
            <sphereGeometry args={[0.22, 24, 24]} />
            <meshStandardMaterial color={ALPHA_COLOR} emissive={ALPHA_COLOR} emissiveIntensity={0.35} />
          </mesh>
          <Html center distanceFactor={9} style={{ pointerEvents: 'none' }}>
            <span
              style={{
                fontSize: 12,
                fontFamily: 'monospace',
                color: ALPHA_COLOR,
                background: 'rgba(255,255,255,0.85)',
                padding: '1px 4px',
                borderRadius: 3,
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          </Html>
        </group>
      ))}
    </group>
  );
}

function ClusterGroup({ collapse, radii, reducedMotion, alphaLabel }) {
  const groupRef = useRef();
  useFrame((_state, delta) => {
    if (reducedMotion || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.25;
  });

  // Schematic deuteron orbit: contracts toward the centre with the scrub.
  const deuteronOrbit = 1.4 - 1.25 * collapse;
  const showAlphas = collapse >= ALPHA_ONSET;
  const boxSize = radii.boxHalf * 2;

  return (
    <group ref={groupRef}>
      {!showAlphas &&
        TETRAHEDRON_VERTICES.map((vertex, index) => (
          <mesh key={index} position={vertex.map((c) => c * deuteronOrbit)}>
            <sphereGeometry args={[0.18, 24, 24]} />
            <meshStandardMaterial color={DEUTERON_COLOR} />
          </mesh>
        ))}
      {showAlphas && <AlphaPair collapse={collapse} boxHalf={radii.boxHalf} label={alphaLabel} />}
      {radii.dickeRadius > 0 && (
        <mesh>
          <sphereGeometry args={[radii.dickeRadius, 32, 32]} />
          <meshStandardMaterial color={DICKE_COLOR} transparent opacity={0.18} depthWrite={false} />
        </mesh>
      )}
      <mesh>
        <boxGeometry args={[boxSize, boxSize, boxSize]} />
        <meshBasicMaterial color={DOMAIN_COLOR} wireframe />
      </mesh>
    </group>
  );
}

class SceneErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

export default function TscClusterScene({ dicke, alphaStopping, channels }) {
  const [collapse, setCollapse] = useState(0);
  const [logScale, setLogScale] = useState(true);
  const [renderFailed, setRenderFailed] = useState(false);
  const [webglAvailable] = useState(() => detectWebGL());
  const reducedMotion = usePrefersReducedMotion();
  const numbers = useMemo(
    () => summarizeNumbers(dicke, alphaStopping, channels),
    [dicke, alphaStopping, channels],
  );
  const radii = useMemo(() => computeDisplayRadii(dicke, logScale), [dicke, logScale]);
  const tier = CLAIM_TIERS.speculative_exploratory;

  if (!dicke) {
    return (
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
        TSC cluster scene: Dicke geometry not supplied by this API response.
      </Typography>
    );
  }

  if (!webglAvailable) {
    return <SceneFallback numbers={numbers} reason="WebGL is not available in this browser; the schematic scene is replaced by its numbers." />;
  }
  if (renderFailed) {
    return <SceneFallback numbers={numbers} reason="The 3D renderer failed to start; the schematic scene is replaced by its numbers." />;
  }

  const showAlphaCaption = collapse >= ALPHA_ONSET;

  return (
    <Box sx={{ mb: 2 }} data-testid="tsc-cluster-scene">
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
        <Typography variant="subtitle2">TSC cluster / Dicke geometry (schematic)</Typography>
        <Chip label={tier.label} color={tier.color} size="small" variant="outlined" title={tier.description} />
        <Chip label="OPEN" size="small" color="warning" />
      </Stack>
      <Box sx={{ position: 'relative', height: 320, borderRadius: 1, overflow: 'hidden', bgcolor: '#fafafa' }}>
        <SceneErrorBoundary
          onError={() => setRenderFailed(true)}
          fallback={<SceneFallback numbers={numbers} reason="The 3D renderer failed; numbers shown as text." />}
        >
          <Canvas
            camera={{ position: [4.5, 3.5, 6.5], fov: 45 }}
            frameloop={reducedMotion ? 'demand' : 'always'}
            dpr={[1, 1.5]}
            gl={{ antialias: true, powerPreference: 'low-power' }}
          >
            <ambientLight intensity={0.6} />
            <pointLight position={[8, 10, 8]} intensity={1.2} />
            <ClusterGroup
              collapse={collapse}
              radii={radii}
              reducedMotion={reducedMotion}
              alphaLabel={numbers.alphaLabel}
            />
            <OrbitControls enablePan={false} enableDamping={!reducedMotion} />
          </Canvas>
        </SceneErrorBoundary>
        <Paper
          variant="outlined"
          sx={{ position: 'absolute', top: 8, right: 8, p: 1, maxWidth: 240, opacity: 0.92 }}
          data-testid="tsc-cluster-scene-legend"
        >
          <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
            dicke_radius_m {numbers.dickeRadius}
          </Typography>
          <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
            paper_domain_m {numbers.paperDomain}
          </Typography>
          <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
            n_within_radius {numbers.nWithinRadius}
          </Typography>
          <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
            n_coh_licensed_max {numbers.nCohLicensedMax}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            true ratio ≈ {numbers.ratio}; {logScale ? 'log-scale radii' : 'linear radii'}; deuterons schematic
          </Typography>
        </Paper>
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ mt: 1 }}>
        <Box sx={{ flex: 1, px: 1 }}>
          <Typography id="tsc-collapse-slider-label" variant="caption" color="text.secondary">
            TSC collapse (scrub, not physical time)
          </Typography>
          <Slider
            aria-labelledby="tsc-collapse-slider-label"
            value={collapse}
            min={0}
            max={1}
            step={0.01}
            onChange={(_event, value) => setCollapse(Array.isArray(value) ? value[0] : value)}
            valueLabelDisplay="auto"
            size="small"
          />
        </Box>
        <FormControlLabel
          control={<Switch checked={logScale} onChange={(event) => setLogScale(event.target.checked)} size="small" />}
          label="log-scale radii"
        />
      </Stack>
      {showAlphaCaption && (
        <Typography variant="body2" color="text.secondary" data-testid="tsc-alpha-caption">
          {numbers.alphaCaption}
        </Typography>
      )}
      {reducedMotion && (
        <Typography variant="caption" color="text.secondary" display="block">
          Reduced motion: auto-rotation disabled; the slider still scrubs the scene.
        </Typography>
      )}
    </Box>
  );
}
