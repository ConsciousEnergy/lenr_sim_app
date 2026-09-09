/**
 * ChannelDag — inline SVG DAG of the WH-ENP-01 channel ledger.
 * Root "D+D / 4D cluster" fans out to one node per channel; a dashed edge marks
 * a channel whose primary-γ requirement is still OPEN. No layout dependency.
 */
import React from 'react';
import { Box, Typography } from '@mui/material';

const ROW_HEIGHT = 58;
const NODE_WIDTH = 210;
const NODE_HEIGHT = 44;
const ROOT_WIDTH = 130;
const WIDTH = 520;
const ROOT_X = 8;
const CHILD_X = WIDTH - NODE_WIDTH - 8;
const OPEN_COLOR = '#c62828';
const EDGE_COLOR = '#616161';
const ROOT_FILL = '#e3f2fd';
const CHILD_FILL = '#fff8e1';

function edgeStyle(channel) {
  const open = channel.primary_gamma_required === 'open';
  return {
    stroke: open ? OPEN_COLOR : EDGE_COLOR,
    strokeDasharray: open ? '6 4' : undefined,
  };
}

export default function ChannelDag({ channels }) {
  const rows = Array.isArray(channels) ? channels : [];
  if (rows.length === 0) return null;

  const height = Math.max(ROW_HEIGHT, rows.length * ROW_HEIGHT) + 16;
  const rootY = height / 2 - NODE_HEIGHT / 2;
  const rootRight = ROOT_X + ROOT_WIDTH;
  const rootCenterY = rootY + NODE_HEIGHT / 2;

  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        Channel DAG (dashed edge = primary γ requirement OPEN; weights are ledger kinds, not rates)
      </Typography>
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        width="100%"
        style={{ maxWidth: WIDTH, display: 'block' }}
        role="img"
        aria-label="Channel DAG: D+D / 4D cluster root with one node per channel"
        data-testid="wh-channel-dag"
      >
        <rect x={ROOT_X} y={rootY} width={ROOT_WIDTH} height={NODE_HEIGHT} rx={6} fill={ROOT_FILL} stroke={EDGE_COLOR} />
        <text x={ROOT_X + ROOT_WIDTH / 2} y={rootCenterY + 4} textAnchor="middle" fontSize={12} fontFamily="monospace">
          D+D / 4D cluster
        </text>
        {rows.map((channel, index) => {
          const y = 8 + index * ROW_HEIGHT;
          const centerY = y + NODE_HEIGHT / 2;
          const style = edgeStyle(channel);
          const midX = (rootRight + CHILD_X) / 2;
          const path = `M ${rootRight} ${rootCenterY} C ${midX} ${rootCenterY}, ${midX} ${centerY}, ${CHILD_X} ${centerY}`;
          return (
            <g key={channel.id} data-testid={`wh-channel-dag-node-${channel.id}`}>
              <path d={path} fill="none" strokeWidth={1.5} {...style} />
              <rect x={CHILD_X} y={y} width={NODE_WIDTH} height={NODE_HEIGHT} rx={6} fill={CHILD_FILL} stroke={style.stroke} />
              <text x={CHILD_X + 8} y={y + 17} fontSize={12} fontFamily="monospace">
                {channel.id}
              </text>
              <text x={CHILD_X + 8} y={y + 34} fontSize={11} fill="#424242">
                Q {channel.q_mev} MeV · {channel.weight_kind}
                {channel.primary_gamma_required === 'open' ? ' · γ OPEN' : ''}
              </text>
            </g>
          );
        })}
      </svg>
    </Box>
  );
}
