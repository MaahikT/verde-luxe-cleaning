import { TrendingUp } from "lucide-react";

interface RevenueTrend {
  month: string;
  monthKey: string;
  revenue: number;
}

interface RevenueOverviewCardProps {
  data: RevenueTrend[];
}

export function RevenueOverviewCard({ data }: RevenueOverviewCardProps) {
  // Calculate max revenue for scaling
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  // Chart dimensions
  const chartWidth = 100; // percentage
  const chartHeight = 140; // pixels - reduced for compact layout
  const padding = 20;

  // Calculate points for the line
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    // Fix: Map revenue to y-coordinate where bottom (chartHeight - padding) = $0, top (padding) = maxRevenue
    const y = chartHeight - padding - ((item.revenue / maxRevenue) * (chartHeight - padding * 2));
    return { x, y, revenue: item.revenue };
  });

  // Helper function to create smooth Bezier curve path
  const getSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];

      // Calculate control points for smooth curve
      const prev = points[i - 1] || current;
      const nextNext = points[i + 2] || next;

      // Control point 1 (for current point)
      const cp1x = current.x + (next.x - prev.x) / 6;
      const cp1y = current.y + (next.y - prev.y) / 6;

      // Control point 2 (for next point)
      const cp2x = next.x - (nextNext.x - current.x) / 6;
      const cp2y = next.y - (nextNext.y - current.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }

    return path;
  };

  // Create smooth SVG path
  const linePath = getSmoothPath(points);

  // Create area path (for gradient fill) using smooth curve
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight} L 0 ${chartHeight} Z`
    : "";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-0.5">Revenue Overview</h3>
          <p className="text-xs text-gray-600">Last 6 months</p>
        </div>
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-green-600" />
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-6">
          <TrendingUp className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No revenue data available yet</p>
        </div>
      ) : (
        <>
          {/* Line Chart */}
          <div className="relative" style={{ height: `${chartHeight}px` }}>
            <svg
              viewBox={`0 0 100 ${chartHeight}`}
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              <defs>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#163022" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#163022" stopOpacity="0.01" />
                </linearGradient>
                <filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
                  <feOffset dx="0" dy="1" result="offsetblur" />
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.2" />
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Horizontal gridlines - representing revenue values from 0 to maxRevenue */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const yPosition = chartHeight - padding - ((ratio) * (chartHeight - padding * 2));
                return (
                  <line
                    key={`h-grid-${index}`}
                    x1="0"
                    y1={yPosition}
                    x2="100"
                    y2={yPosition}
                    stroke="#e5e7eb"
                    strokeWidth="0.5"
                    vectorEffect="non-scaling-stroke"
                    opacity="0.5"
                  />
                );
              })}

              {/* Vertical gridlines */}
              {points.map((point, index) => (
                <line
                  key={`v-grid-${index}`}
                  x1={point.x}
                  y1={padding}
                  x2={point.x}
                  y2={chartHeight}
                  stroke="#e5e7eb"
                  strokeWidth="0.5"
                  vectorEffect="non-scaling-stroke"
                  opacity="0.3"
                />
              ))}

              {/* Area fill */}
              <path
                d={areaPath}
                fill="url(#areaGradient)"
              />

              {/* Line */}
              <path
                d={linePath}
                fill="none"
                stroke="#163022"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              {/* Data points - smaller for cleaner look */}
              {points.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r="2"
                  fill="#163022"
                  filter="url(#dropShadow)"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between mt-2">
            {data.map((item, index) => (
              <div key={item.monthKey} className="text-xs text-gray-600 text-center flex-1">
                <div className="font-medium">{item.month.split(' ')[0]}</div>
                <div className="text-gray-500 mt-0.5">${item.revenue.toFixed(0)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
