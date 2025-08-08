import React from 'react';

export interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  size?: number; // overall svg size in px
  thickness?: number; // ring thickness in px
  centerLabel?: string;
}

const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: cx + (r * Math.cos(angleInRadians)),
    y: cy + (r * Math.sin(angleInRadians))
  };
};

const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', start.x, start.y,
    'A', r, r, 0, largeArcFlag, 0, end.x, end.y
  ].join(' ');
};

const DonutChart: React.FC<DonutChartProps> = ({ data, size = 220, thickness = 24, centerLabel }) => {
  const total = data.reduce((sum, d) => sum + (isFinite(d.value) ? d.value : 0), 0);
  const radius = (size / 2) - 6; // padding

  let cumulative = 0;
  const segments = data.map((d, idx) => {
    const value = isFinite(d.value) ? d.value : 0;
    const startAngle = (cumulative / Math.max(total, 1e-6)) * 360;
    cumulative += value;
    const endAngle = (cumulative / Math.max(total, 1e-6)) * 360;
    const path = describeArc(size/2, size/2, radius, startAngle, endAngle);
    return (
      <path key={idx} d={path} stroke={d.color} strokeWidth={thickness} fill="none" />
    );
  });

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={thickness} />
        {segments}
        {centerLabel && (
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-900" style={{ fontSize: 16, fontWeight: 600 }}>
            {centerLabel}
          </text>
        )}
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="text-gray-700">{d.label}</span>
            <span className="ml-2 font-medium text-gray-900">{d.value}</span>
          </div>
        ))}
        <div className="pt-2 text-sm text-gray-500">Total: <span className="font-medium text-gray-700">{total}</span></div>
      </div>
    </div>
  );
};

export default DonutChart;