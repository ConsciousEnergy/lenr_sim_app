/**
 * SVG process / interaction diagram for Oracle B mechanism paths.
 */
import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { resolveDiagramSpec } from '../../utils/mechanismPathDiagrams';

const NODE_RADIUS = 22;

function edgePath(fromNode, toNode) {
  const x1 = fromNode.x + NODE_RADIUS;
  const y1 = fromNode.y;
  const x2 = toNode.x - NODE_RADIUS;
  const y2 = toNode.y;
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

export default function MechanismPathDiagram({ pathId, diagramSpec, posterior = 0 }) {
  const spec = resolveDiagramSpec(pathId, diagramSpec);
  if (!spec) return null;

  const opacity = 0.35 + Math.min(Math.max(posterior, 0), 1) * 0.65;
  const strokeWidth = 1.5 + posterior * 2.5;
  const nodeMap = Object.fromEntries(spec.nodes.map((node) => [node.id, node]));

  return (
    <Box data-testid={`mechanism-diagram-${pathId}`} sx={{ width: '100%' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
        <Typography variant="subtitle2">{spec.title}</Typography>
        <Chip label="Hypothesis path (speculative)" size="small" color="warning" variant="outlined" />
        {spec.tier && <Chip label={spec.tier} size="small" variant="outlined" />}
        <Chip label={`posterior ${(posterior * 100).toFixed(1)}%`} size="small" />
      </Stack>
      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox="0 0 520 160" width="100%" height="160" role="img" aria-label={spec.title}>
          {spec.edges.map((edge) => {
            const fromNode = nodeMap[edge.from];
            const toNode = nodeMap[edge.to];
            if (!fromNode || !toNode) return null;
            const path = edgePath(fromNode, toNode);
            const labelX = (fromNode.x + toNode.x) / 2;
            const labelY = (fromNode.y + toNode.y) / 2 - 8;
            return (
              <g key={`${edge.from}-${edge.to}`} opacity={opacity}>
                <path
                  d={path}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  markerEnd="url(#arrow)"
                />
                {edge.label && (
                  <text x={labelX} y={labelY} textAnchor="middle" fontSize="10" fill="currentColor">
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="currentColor" />
            </marker>
          </defs>
          {spec.nodes.map((node) => (
            <g key={node.id} opacity={opacity}>
              <circle cx={node.x} cy={node.y} r={NODE_RADIUS} fill="#1e2a3a" stroke="currentColor" strokeWidth="1.5" />
              <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="11" fill="currentColor">
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </Box>
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
        {(spec.lean_ids || []).map((id) => (
          <Chip key={id} label={id} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
        ))}
      </Stack>
    </Box>
  );
}
