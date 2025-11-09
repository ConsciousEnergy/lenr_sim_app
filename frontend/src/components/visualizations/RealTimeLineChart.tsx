import React, { useState, useCallback, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceArea
} from 'recharts';
import { DataSeries, TimeSeriesDataPoint } from '../../api/realtime';

interface RealTimeLineChartProps {
  dataSeries: DataSeries[];
  title?: string;
  height?: number | string;
  width?: number | string;
  yAxisLabel?: string;
  xAxisLabel?: string;
  allowZoom?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  xAxisDataKey?: string;
  colors?: string[];
}

const defaultColors = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', 
  '#00c49f', '#ffbb28', '#ff8042', '#a4de6c', '#d0ed57'
];

const RealTimeLineChart: React.FC<RealTimeLineChartProps> = ({
  dataSeries,
  title,
  height = 400,
  width = '100%',
  yAxisLabel,
  xAxisLabel,
  allowZoom = true,
  showLegend = true,
  showGrid = true,
  xAxisDataKey = 'timestamp',
  colors = defaultColors
}) => {
  // State for zooming functionality
  const [zoomState, setZoomState] = useState<{left?: number; right?: number; refAreaLeft?: number; refAreaRight?: number}>({});
  
  // Memoize the data formatting to avoid unnecessary recalculations
  const formattedData = useMemo(() => {
    // Collect all timestamps from all series
    const allTimestamps = new Set<number>();
    dataSeries.forEach(series => {
      series.data.forEach(point => {
        allTimestamps.add(point.timestamp);
      });
    });
    
    // Sort timestamps in ascending order
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    
    // Create data points for each timestamp
    return sortedTimestamps.map(timestamp => {
      const point: Record<string, any> = { timestamp };
      
      // Add value for each series at this timestamp
      dataSeries.forEach(series => {
        const dataPoint = series.data.find(p => p.timestamp === timestamp);
        point[series.id] = dataPoint ? dataPoint.value : null;
      });
      
      return point;
    });
  }, [dataSeries]);
  
  // Format X-axis timestamps
  const formatXAxis = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };
  
  // Zoom functionality
  const handleZoomStart = useCallback((event: any) => {
    if (!allowZoom) return;
    const { activeLabel } = event;
    setZoomState(prev => ({ ...prev, refAreaLeft: activeLabel }));
  }, [allowZoom]);
  
  const handleZoomMove = useCallback((event: any) => {
    if (!allowZoom || !zoomState.refAreaLeft) return;
    const { activeLabel } = event;
    setZoomState(prev => ({ ...prev, refAreaRight: activeLabel }));
  }, [allowZoom, zoomState.refAreaLeft]);
  
  const handleZoomEnd = useCallback(() => {
    if (!allowZoom || !zoomState.refAreaLeft || !zoomState.refAreaRight) {
      setZoomState(prev => ({ ...prev, refAreaLeft: undefined, refAreaRight: undefined }));
      return;
    }
    
    // Ensure left is smaller than right
    let left = Math.min(zoomState.refAreaLeft, zoomState.refAreaRight);
    let right = Math.max(zoomState.refAreaLeft, zoomState.refAreaRight);
    
    // If they're too close, don't zoom
    if (right - left < 1) {
      setZoomState({
        refAreaLeft: undefined,
        refAreaRight: undefined
      });
      return;
    }
    
    // Set the zoom area
    setZoomState({
      left,
      right,
      refAreaLeft: undefined,
      refAreaRight: undefined
    });
  }, [allowZoom, zoomState.refAreaLeft, zoomState.refAreaRight]);
  
  const handleResetZoom = useCallback(() => {
    setZoomState({});
  }, []);
  
  return (
    <div style={{ width, height: typeof height === 'number' ? `${height}px` : height }}>
      {title && <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>{title}</h3>}
      
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
          onMouseDown={handleZoomStart}
          onMouseMove={handleZoomMove}
          onMouseUp={handleZoomEnd}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          
          <XAxis 
            dataKey={xAxisDataKey} 
            label={{ value: xAxisLabel, position: 'insideBottomRight', offset: -10 }}
            tickFormatter={formatXAxis}
            domain={[zoomState.left || 'dataMin', zoomState.right || 'dataMax']}
            type="number"
          />
          
          <YAxis 
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
          />
          
          <Tooltip 
            labelFormatter={(label) => `Time: ${formatXAxis(label as number)}`}
            formatter={(value, name) => {
              const series = dataSeries.find(s => s.id === name);
              return [
                `${value !== null ? value : 'N/A'}${series?.unit ? ' ' + series.unit : ''}`,
                series?.name || name
              ];
            }}
          />
          
          {showLegend && (
            <Legend 
              verticalAlign="top" 
              wrapperStyle={{ paddingBottom: '10px' }} 
            />
          )}
          
          {/* Draw reference area if zooming */}
          {zoomState.refAreaLeft && zoomState.refAreaRight && (
            <ReferenceArea
              x1={zoomState.refAreaLeft}
              x2={zoomState.refAreaRight}
              strokeOpacity={0.3}
              fill="#8884d8"
              fillOpacity={0.3}
            />
          )}
          
          {/* Draw each data series as a line */}
          {dataSeries
            .filter(series => series.visible !== false)
            .map((series, index) => (
              <Line
                key={series.id}
                type="monotone"
                dataKey={series.id}
                name={series.name}
                stroke={series.color || colors[index % colors.length]}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
                connectNulls
              />
            ))
          }
          
          {/* Add brush for panning/selection */}
          <Brush
            dataKey={xAxisDataKey}
            height={30}
            stroke="#8884d8"
            tickFormatter={formatXAxis}
          />
        </LineChart>
      </ResponsiveContainer>
      
      {/* Reset zoom button */}
      {allowZoom && (zoomState.left || zoomState.right) && (
        <button
          onClick={handleResetZoom}
          style={{
            position: 'absolute',
            right: '20px',
            top: '20px',
            zIndex: 1,
            padding: '5px 10px',
            background: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reset Zoom
        </button>
      )}
    </div>
  );
};

export default RealTimeLineChart; 