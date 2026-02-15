/**
 * RelevanceMap - Rigid Force-Directed Network Graph for LENR Theory Relationships
 *
 * Visualises 19 LENR theories as nodes connected by edges representing
 * shared physics, predicted products, and explanatory relationships.
 *
 * Inspired by network explorer UIs — rigid layout that settles quickly,
 * click-to-select with neighbourhood highlighting, search, detail panel.
 *
 * @module RelevanceMap
 * @version 0.3.4-beta
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import {
  Box,
  Typography,
  Chip,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  IconButton,
  Stack,
  TextField,
  InputAdornment,
  Divider,
  useTheme,
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';

/* ---------- Constants ---------- */

const CATEGORY_COLOURS: Record<string, string> = {
  mechanism: '#2196F3',
  measurement: '#4CAF50',
  engineering: '#FF9800',
  triggering: '#9C27B0',
};

const EDGE_TYPE_COLOURS: Record<string, string> = {
  shares_mechanism: '#5C8DB8',
  predicts_same_product: '#6DAE78',
  explains_observation: '#D4A843',
  contradicts: '#C75050',
  extends: '#A66BBF',
};

const EDGE_TYPE_LABELS: Record<string, string> = {
  shares_mechanism: 'Shares Mechanism',
  predicts_same_product: 'Same Product',
  explains_observation: 'Explains',
  contradicts: 'Contradicts',
  extends: 'Extends',
};

const MIN_NODE_RADIUS = 14;
const MAX_NODE_RADIUS = 40;

/* ---------- Component ---------- */

const RelevanceMap = ({
  graphData,
  scores,
  loading = false,
  error = null,
  onNodeClick,
  onRunScores,
  selectedProperty = null,
  selectedCategory = null,
  minScore = 0,
}: any) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const simulationRef = useRef<any>(null);
  const zoomRef = useRef<any>(null);
  const gRef = useRef<any>(null);
  const theme = useTheme();

  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Observe container resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width: Math.max(300, width), height: Math.max(250, height) });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute filtered data
  const { nodes, links, nodeScoreMap } = useMemo(() => {
    if (!graphData) return { nodes: [], links: [], nodeScoreMap: {} };
    const { nodes: rawNodes, edges: rawEdges } = graphData;
    if (!rawNodes?.length) return { nodes: [], links: [], nodeScoreMap: {} };

    const scoreMap: Record<string, number> = {};
    if (scores) {
      Object.entries(scores).forEach(([tid, s]: [string, any]) => {
        scoreMap[tid] = s.final_score ?? 0;
      });
    }

    let filteredIds: Set<string> = new Set(rawNodes.map((n: any) => n.theory_id as string));

    if (selectedCategory) {
      filteredIds = new Set(
        rawNodes.filter((n: any) => n.category === selectedCategory).map((n: any) => n.theory_id as string)
      );
    }
    if (selectedProperty) {
      filteredIds = new Set(
        rawNodes
          .filter((n: any) => filteredIds.has(n.theory_id) && n.physical_properties.includes(selectedProperty))
          .map((n: any) => n.theory_id as string)
      );
    }
    if (minScore > 0) {
      filteredIds = new Set(
        Array.from(filteredIds).filter((tid: string) => (scoreMap[tid] ?? 0) >= minScore / 100)
      );
    }

    const filteredNodes = rawNodes
      .filter((n: any) => filteredIds.has(n.theory_id))
      .map((n: any) => ({
        ...n,
        id: n.theory_id,
        score: scoreMap[n.theory_id] ?? 0,
      }));

    const nodeIdSet = new Set(filteredNodes.map((n: any) => n.id));
    const filteredLinks = rawEdges
      .filter((e: any) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))
      .map((e: any) => ({ ...e }));

    return { nodes: filteredNodes, links: filteredLinks, nodeScoreMap: scoreMap };
  }, [graphData, scores, selectedProperty, selectedCategory, minScore]);

  // Network stats
  const stats = useMemo(() => {
    if (!graphData) return { theories: 0, relationships: 0, properties: 0 };
    const propSet = new Set<string>();
    (graphData.nodes || []).forEach((n: any) => {
      (n.physical_properties || []).forEach((p: string) => propSet.add(p));
    });
    return {
      theories: nodes.length,
      relationships: links.length,
      properties: propSet.size,
    };
  }, [graphData, nodes, links]);

  // Search-matched node IDs
  const searchMatchIds = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const term = searchTerm.toLowerCase();
    return new Set(
      nodes
        .filter((n: any) =>
          n.theory_name.toLowerCase().includes(term) ||
          n.researcher.toLowerCase().includes(term) ||
          n.theory_id.toLowerCase().includes(term)
        )
        .map((n: any) => n.id)
    );
  }, [nodes, searchTerm]);

  // Neighbour map for selected node
  const neighbourIds = useMemo(() => {
    if (!selectedNode) return null;
    const ids = new Set<string>([selectedNode.id]);
    links.forEach((l: any) => {
      const src = typeof l.source === 'object' ? l.source.id : l.source;
      const tgt = typeof l.target === 'object' ? l.target.id : l.target;
      if (src === selectedNode.id) ids.add(tgt);
      if (tgt === selectedNode.id) ids.add(src);
    });
    return ids;
  }, [selectedNode, links]);

  // Build / update the D3 graph
  useEffect(() => {
    if (!nodes.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const g = svg.append('g');
    gRef.current = g;

    // --- Zoom ---
    // Allow generous panning (2x canvas in each direction) so graph never feels clipped
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 6])
      .translateExtent([[-width, -height], [width * 2, height * 2]])
      .on('zoom', (event: any) => g.attr('transform', event.transform));
    svg.call(zoom as any);
    zoomRef.current = zoom;

    // --- Defs: arrow markers + glow filter ---
    const defs = svg.append('defs');

    // Glow filter
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Arrow markers
    defs
      .selectAll('marker')
      .data(['extends', 'explains_observation'])
      .enter()
      .append('marker')
      .attr('id', (d: string) => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 30)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', (d: string) => EDGE_TYPE_COLOURS[d] || '#999');

    // Scale
    const maxScore = Math.max(...nodes.map((n: any) => n.score), 0.01);
    const rScale = d3.scaleSqrt().domain([0, maxScore]).range([MIN_NODE_RADIUS, MAX_NODE_RADIUS]);

    // --- Links ---
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (d: any) => EDGE_TYPE_COLOURS[d.relationship_type] || '#555')
      .attr('stroke-width', (d: any) => Math.max(1, d.strength * 3))
      .attr('stroke-opacity', 0.35)
      .attr('marker-end', (d: any) =>
        ['extends', 'explains_observation'].includes(d.relationship_type)
          ? `url(#arrow-${d.relationship_type})`
          : null
      );

    // --- Edge hover labels ---
    const edgeLabel = g
      .append('g')
      .attr('class', 'edge-labels')
      .selectAll('text')
      .data(links)
      .enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', -4)
      .attr('font-size', '8px')
      .attr('fill', theme.palette.text.secondary)
      .attr('pointer-events', 'none')
      .attr('opacity', 0)
      .text((d: any) => EDGE_TYPE_LABELS[d.relationship_type] || d.relationship_type);

    // --- Nodes ---
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(
        d3
          .drag()
          .on('start', (event: any, d: any) => {
            if (!event.active) simulationRef.current?.alphaTarget(0.15).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event: any, d: any) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event: any, d: any) => {
            if (!event.active) simulationRef.current?.alphaTarget(0);
            // Pin node where user dropped it (rigid behaviour)
            d.fx = event.x;
            d.fy = event.y;
          }) as any
      );

    // Outer glow ring (visible for high-score nodes)
    node
      .append('circle')
      .attr('class', 'glow-ring')
      .attr('r', (d: any) => rScale(d.score) + 4)
      .attr('fill', 'none')
      .attr('stroke', (d: any) => CATEGORY_COLOURS[d.category] || '#999')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', (d: any) => d.score > 0.7 ? 0.6 : 0)
      .style('filter', 'url(#glow)');

    // Main circle
    node
      .append('circle')
      .attr('class', 'main-circle')
      .attr('r', (d: any) => rScale(d.score))
      .attr('fill', (d: any) => CATEGORY_COLOURS[d.category] || '#999')
      .attr('stroke', (d: any) => {
        const conf = scores?.[d.id]?.confidence ?? 0;
        return conf > 0.5 ? '#fff' : theme.palette.grey[700];
      })
      .attr('stroke-width', (d: any) => Math.max(1.5, (scores?.[d.id]?.confidence ?? 0) * 4))
      .attr('opacity', 0.9);

    // Score label inside node
    node
      .append('text')
      .attr('class', 'score-label')
      .text((d: any) => (d.score * 100).toFixed(0))
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', (d: any) => `${Math.max(9, rScale(d.score) * 0.5)}px`)
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none');

    // Name label below node
    node
      .append('text')
      .attr('class', 'name-label')
      .text((d: any) => {
        const name = d.theory_name.replace(/\s*\(.*\)/, '');
        return name.length > 20 ? name.substring(0, 18) + '...' : name;
      })
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => rScale(d.score) + 14)
      .attr('font-size', '9px')
      .attr('font-weight', 500)
      .attr('fill', theme.palette.text.primary)
      .attr('pointer-events', 'none');

    // --- Interaction handlers (state only; visuals handled by React effect to prevent flashing) ---
    node
      .on('mouseover', (_event: any, d: any) => {
        setHoveredNode(d);
        // Edge labels: show for connected edges
        edgeLabel.attr('opacity', (l: any) => {
          const src = typeof l.source === 'object' ? l.source.id : l.source;
          const tgt = typeof l.target === 'object' ? l.target.id : l.target;
          return (src === d.id || tgt === d.id) ? 0.9 : 0;
        });
      })
      .on('mouseout', () => {
        setHoveredNode(null);
        edgeLabel.attr('opacity', 0);
      })
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        setSelectedNode((prev: any) => (prev?.id === d.id ? null : d));
        if (onNodeClick) onNodeClick(d);
      });

    // Click on background to deselect
    svg.on('click', () => {
      setSelectedNode(null);
    });

    // --- Force simulation (rigid, well-spaced) ---
    const nodeCount = nodes.length;
    const chargeStrength = Math.min(-300, -250 - nodeCount * 15);
    const baseDist = Math.max(120, Math.min(200, width / (nodeCount * 0.35)));

    // Deterministic initial layout — same organization every time user opens Relevance Map
    const SEED = 0.314159;
    nodes.forEach((n: any, i: number) => {
      const id = n.theory_id || n.id || String(i);
      const hash = id.split('').reduce((a: number, c: string) => ((a << 5) - a) + c.charCodeAt(0), SEED);
      const angle = (Math.abs(hash) % 1000) / 1000 * 2 * Math.PI;
      const r = 60 + ((Math.abs(hash) % 700) / 700) * Math.min(width, height) * 0.3;
      n.x = width / 2 + Math.cos(angle) * r;
      n.y = height / 2 + Math.sin(angle) * r;
    });

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance((d: any) => baseDist + (1 - d.strength) * 60)
          .strength((d: any) => d.strength * 0.5)
      )
      .force('charge', d3.forceManyBody().strength(chargeStrength).distanceMax(width * 0.8))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.03))
      .force('collision', d3.forceCollide().radius((d: any) => rScale(d.score) + 18).strength(0.85))
      .force('x', d3.forceX(width / 2).strength(0.04))
      .force('y', d3.forceY(height / 2).strength(0.04))
      .alphaDecay(0.035)
      .velocityDecay(0.5)
      .stop();  // Don't auto-start — we'll run it synchronously first

    // --- Pre-compute layout (run simulation synchronously for ~200 ticks) ---
    // This ensures all node positions are settled BEFORE first render
    for (let i = 0; i < 200; i++) {
      simulation.tick();
      // Soft-clamp during pre-computation
      const pad = 40;
      const pull = 0.3;
      nodes.forEach((d: any) => {
        if (d.x < pad) d.vx += (pad - d.x) * pull;
        if (d.x > width - pad) d.vx -= (d.x - (width - pad)) * pull;
        if (d.y < pad) d.vy += (pad - d.y) * pull;
        if (d.y > height - pad) d.vy -= (d.y - (height - pad)) * pull;
      });
    }

    // Helper: compute zoom transform that fits all nodes with generous padding ("locked in" easy-reading view)
    const computeFitTransform = () => {
      const padding = 80;  // Generous padding for comfortable initial view
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach((d: any) => {
        const x = d.x ?? width / 2;
        const y = d.y ?? height / 2;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      });
      const bw = maxX - minX + padding * 2;
      const bh = maxY - minY + padding * 2;
      const scale = Math.min(0.92, width / bw, height / bh);  // Slight headroom for readability
      const tx = (width - bw * scale) / 2 - minX * scale + padding * scale;
      const ty = (height - bh * scale) / 2 - minY * scale + padding * scale;
      return d3.zoomIdentity.translate(tx, ty).scale(scale);
    };

    // --- Render the pre-computed layout ---
    const updatePositions = () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      edgeLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    };

    updatePositions();

    // Apply fit-to-bounds zoom immediately (layout is already settled)
    svg.call((zoom as any).transform, computeFitTransform());

    // Restart simulation for interactive dragging (low alpha so it barely moves)
    simulation
      .alpha(0.05)
      .on('tick', () => {
        // Soft-clamp for interactive drag
        const pad = 40;
        const pullStrength = 0.3;
        nodes.forEach((d: any) => {
          if (d.x < pad) d.vx += (pad - d.x) * pullStrength;
          if (d.x > width - pad) d.vx -= (d.x - (width - pad)) * pullStrength;
          if (d.y < pad) d.vy += (pad - d.y) * pullStrength;
          if (d.y > height - pad) d.vy -= (d.y - (height - pad)) * pullStrength;
        });
        updatePositions();
      })
      .restart();

    simulationRef.current = simulation;

    return () => { simulation.stop(); };
  }, [nodes, links, dimensions, theme, scores, onNodeClick]);

  // Apply selection/search highlighting — use immediate attr() for hover to prevent flicker
  useEffect(() => {
    if (!gRef.current) return;
    const g = gRef.current;  // Already a D3 selection — do NOT re-wrap with d3.select()

    // Node visuals — immediate attr() (no transition) to avoid flicker from interrupted transitions
    g.selectAll('.nodes g').each(function (d: any) {
      const el = d3.select(this);
      const isHovered = hoveredNode?.id === d.id;
      let opacity = 0.9;
      if (selectedNode && neighbourIds && !neighbourIds.has(d.id)) {
        opacity = 0.15;
      } else if (searchMatchIds && !searchMatchIds.has(d.id)) {
        opacity = 0.15;
      }
      const finalOpacity = isHovered ? 1 : opacity;
      const strokeWidth = isHovered ? 3 : Math.max(1.5, (scores?.[d.id]?.confidence ?? 0) * 4);
      const glowOpacity = isHovered ? 0.8 : (selectedNode?.id === d.id ? 0.9 : (d.score > 0.7 && opacity > 0.5 ? 0.6 : 0));
      el.select('.main-circle').attr('opacity', finalOpacity).attr('stroke-width', strokeWidth);
      el.select('.name-label').attr('opacity', opacity < 0.5 ? 0.2 : 1);
      el.select('.score-label').attr('opacity', opacity < 0.5 ? 0.2 : 1);
      el.select('.glow-ring').attr('stroke-opacity', glowOpacity);
    });

    // Link opacity
    g.selectAll('.links line').each(function (d: any) {
      const el = d3.select(this);
      const src = typeof d.source === 'object' ? d.source.id : d.source;
      const tgt = typeof d.target === 'object' ? d.target.id : d.target;
      let opacity = 0.35;
      if (selectedNode) {
        opacity = (src === selectedNode.id || tgt === selectedNode.id) ? 0.85 : 0.05;
      } else if (searchMatchIds) {
        opacity = (searchMatchIds.has(src) || searchMatchIds.has(tgt)) ? 0.6 : 0.08;
      }
      el.attr('stroke-opacity', opacity);
    });
  }, [selectedNode, neighbourIds, searchMatchIds, hoveredNode, scores]);

  // Zoom controls
  const handleZoom = useCallback((factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current) as any;
    svg.transition().duration(300).call(zoomRef.current.scaleBy, factor);
  }, []);

  const handleCentre = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current) as any;
    const { width, height } = dimensions;

    // Auto-fit: same padding as initial load for consistent "locked in" view
    if (nodes.length) {
      const padding = 80;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach((n: any) => {
        const x = n.x ?? width / 2;
        const y = n.y ?? height / 2;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      });
      const bw = maxX - minX + padding * 2;
      const bh = maxY - minY + padding * 2;
      const scale = Math.min(0.92, width / bw, height / bh);
      const tx = (width - bw * scale) / 2 - minX * scale + padding * scale;
      const ty = (height - bh * scale) / 2 - minY * scale + padding * scale;
      svg.transition().duration(500).call(
        zoomRef.current.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale)
      );
    } else {
      svg.transition().duration(500).call(
        zoomRef.current.transform,
        d3.zoomIdentity.translate(width * 0.05, height * 0.05).scale(0.85)
      );
    }
  }, [dimensions, nodes]);

  // Unpin all nodes
  const handleUnpinAll = useCallback(() => {
    if (!simulationRef.current) return;
    nodes.forEach((n: any) => { n.fx = null; n.fy = null; });
    simulationRef.current.alpha(0.3).restart();
  }, [nodes]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 500 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading theory network...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* --- Top bar: stats + search --- */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
        {/* Network stats */}
        <Stack direction="row" spacing={2}>
          <Typography variant="caption" color="primary.main" fontWeight={700}>
            Theories: <span style={{ color: '#4FC3F7' }}>{stats.theories}</span>
          </Typography>
          <Typography variant="caption" color="primary.main" fontWeight={700}>
            Relationships: <span style={{ color: '#4FC3F7' }}>{stats.relationships}</span>
          </Typography>
          <Typography variant="caption" color="primary.main" fontWeight={700}>
            Properties: <span style={{ color: '#4FC3F7' }}>{stats.properties}</span>
          </Typography>
        </Stack>

        {/* Search */}
        <TextField
          size="small"
          placeholder="Search theories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 200, maxWidth: 280 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
            endAdornment: searchTerm ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm('')}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        {/* Legend chips */}
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.3 }}>
          {Object.entries(CATEGORY_COLOURS).map(([cat, colour]) => (
            <Chip
              key={cat}
              icon={<CircleIcon sx={{ fontSize: 10, color: `${colour} !important` }} />}
              label={cat.charAt(0).toUpperCase() + cat.slice(1)}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 22 }}
            />
          ))}
        </Stack>
      </Stack>

      {/* --- Main content: graph + detail panel --- */}
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0, gap: 1 }}>
        {/* Graph container */}
        <Box
          ref={containerRef}
          sx={{
            flex: 1,
            minHeight: 350,  // Minimum usable height; auto-fit zoom scales content to fit
            position: 'relative',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            overflow: 'hidden',  // Clips SVG to container bounds; D3 zoom handles internal pan/scale
            bgcolor: theme.palette.mode === 'dark' ? '#0a1628' : theme.palette.grey[50],
          }}
        >
          <svg
            ref={svgRef}
            style={{ display: 'block', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
          />

          {/* Zoom controls */}
          <Stack
            direction="column"
            spacing={0.5}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(0,0,0,0.5)',
              borderRadius: 1,
              p: 0.3,
            }}
          >
            <IconButton size="small" onClick={() => handleZoom(1.4)} sx={{ color: '#fff' }}>
              <ZoomInIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => handleZoom(0.7)} sx={{ color: '#fff' }}>
              <ZoomOutIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={handleCentre} sx={{ color: '#fff' }}>
              <CenterIcon fontSize="small" />
            </IconButton>
          </Stack>

          {/* Status bar */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              px: 1.5,
              py: 0.5,
              bgcolor: 'rgba(0,0,0,0.6)',
              display: 'flex',
              justifyContent: 'center',
              gap: 3,
            }}
          >
            <Typography variant="caption" color="grey.400">
              Click nodes to explore &bull; Scroll to zoom &bull; Drag to pan &bull; Drag nodes to pin
            </Typography>
            {nodes.some((n: any) => n.fx != null) && (
              <Typography
                variant="caption"
                color="primary.light"
                sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={handleUnpinAll}
              >
                Unpin all
              </Typography>
            )}
          </Box>

          {/* Hovered node tooltip — pointer-events: none so it doesn't overlay nodes and cause hover flicker */}
          {hoveredNode && !selectedNode && (
            <Card
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                maxWidth: 320,
                zIndex: 10,
                boxShadow: 4,
                bgcolor: 'rgba(15,25,45,0.95)',
                backdropFilter: 'blur(8px)',
                pointerEvents: 'none',
              }}
            >
              <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                <Typography variant="subtitle2" fontWeight={700} color="common.white">
                  {hoveredNode.theory_name}
                </Typography>
                <Typography variant="caption" color="grey.400">
                  {hoveredNode.researcher} ({hoveredNode.year})
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.3 }}>
                  {hoveredNode.key_predictions?.slice(0, 3).map((p: string, i: number) => (
                    <Chip key={i} label={p} size="small" variant="outlined"
                      sx={{ fontSize: '0.6rem', color: 'grey.300', borderColor: 'grey.700', height: 20 }} />
                  ))}
                </Stack>
                {scores?.[hoveredNode.id] && (
                  <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: 'grey.300' }}>
                    Score: <strong style={{ color: '#4FC3F7' }}>{(scores[hoveredNode.id].final_score * 100).toFixed(1)}%</strong>
                    {' | '}Confidence: {(scores[hoveredNode.id].confidence * 100).toFixed(0)}%
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}
        </Box>

        {/* Selected node detail panel (right side) */}
        {selectedNode && (
          <Card
            sx={{
              width: 300,
              minWidth: 280,
              maxHeight: '100%',
              overflow: 'auto',
              flexShrink: 0,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(15,25,45,0.95)' : 'background.paper',
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Chip
                    size="small"
                    label={selectedNode.category}
                    sx={{
                      bgcolor: CATEGORY_COLOURS[selectedNode.category],
                      color: '#fff',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem', lineHeight: 1.3 }}>
                    {selectedNode.theory_name}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => setSelectedNode(null)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {selectedNode.researcher} &mdash; {selectedNode.year}
              </Typography>

              {/* Score */}
              {scores?.[selectedNode.id] && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="overline" color="text.secondary">Predictive Score</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant="h4" fontWeight={700} color="primary.main">
                      {(scores[selectedNode.id].final_score * 100).toFixed(0)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      confidence: {(scores[selectedNode.id].confidence * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.3 }}>
                    {['physical_consistency', 'experimental_agreement', 'parameter_sensitivity', 'cross_theory_agreement', 'observables_completeness'].map((key) => {
                      const val = scores[selectedNode.id]?.[key];
                      if (val == null) return null;
                      const short = key.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()).substring(0, 12);
                      return (
                        <Chip
                          key={key}
                          label={`${short}: ${(val * 100).toFixed(0)}%`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.6rem', height: 20 }}
                        />
                      );
                    })}
                  </Stack>
                </Box>
              )}

              <Divider sx={{ my: 1.5 }} />

              {/* Key predictions */}
              <Typography variant="overline" color="text.secondary">Key Predictions</Typography>
              <Stack spacing={0.3} sx={{ mt: 0.3 }}>
                {selectedNode.key_predictions?.map((p: string, i: number) => (
                  <Typography key={i} variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <span style={{ color: CATEGORY_COLOURS[selectedNode.category], fontWeight: 700 }}>&#x25CF;</span> {p}
                  </Typography>
                ))}
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              {/* Physical properties */}
              <Typography variant="overline" color="text.secondary">Physical Properties</Typography>
              <Stack direction="row" spacing={0.3} sx={{ mt: 0.3, flexWrap: 'wrap', gap: 0.3 }}>
                {selectedNode.physical_properties?.map((p: string, i: number) => (
                  <Chip key={i} label={p.replace(/_/g, ' ')} size="small" variant="outlined"
                    sx={{ fontSize: '0.6rem', height: 20 }} />
                ))}
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              {/* Material systems */}
              <Typography variant="overline" color="text.secondary">Material Systems</Typography>
              <Stack direction="row" spacing={0.3} sx={{ mt: 0.3, flexWrap: 'wrap', gap: 0.3 }}>
                {selectedNode.material_systems?.map((m: string, i: number) => (
                  <Chip key={i} label={m} size="small" color="info" variant="outlined"
                    sx={{ fontSize: '0.6rem', height: 20 }} />
                ))}
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              {/* Connected theories */}
              <Typography variant="overline" color="text.secondary">Connected Theories</Typography>
              <Stack spacing={0.5} sx={{ mt: 0.3 }}>
                {links
                  .filter((l: any) => {
                    const src = typeof l.source === 'object' ? l.source.id : l.source;
                    const tgt = typeof l.target === 'object' ? l.target.id : l.target;
                    return src === selectedNode.id || tgt === selectedNode.id;
                  })
                  .map((l: any, i: number) => {
                    const src = typeof l.source === 'object' ? l.source.id : l.source;
                    const tgt = typeof l.target === 'object' ? l.target.id : l.target;
                    const otherId = src === selectedNode.id ? tgt : src;
                    const otherNode = nodes.find((n: any) => n.id === otherId);
                    return (
                      <Box key={i} sx={{
                        display: 'flex', alignItems: 'center', gap: 0.5,
                        p: 0.5, borderRadius: 0.5,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                        onClick={() => {
                          if (otherNode) setSelectedNode(otherNode);
                        }}
                      >
                        <Box sx={{
                          width: 8, height: 8, borderRadius: '50%',
                          bgcolor: EDGE_TYPE_COLOURS[l.relationship_type] || '#999',
                        }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" fontWeight={600}>
                            {otherNode?.theory_name || otherId}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem' }}>
                            {EDGE_TYPE_LABELS[l.relationship_type] || l.relationship_type}
                            {l.shared_properties?.length > 0 && ` (${l.shared_properties.join(', ')})`}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {(l.strength * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                    );
                  })}
              </Stack>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
};

export default RelevanceMap;
