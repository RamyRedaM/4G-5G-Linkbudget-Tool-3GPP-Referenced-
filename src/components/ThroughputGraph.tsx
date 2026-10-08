import React, { useState, useMemo } from 'react';
import { FourPointOutput, LinkBudgetCalculationResult } from '../types/telecom';
import { ArrowDownRight, ArrowUpRight, BarChart3, LineChart, Layers, Info } from 'lucide-react';

interface ThroughputGraphProps {
  fourPoints: FourPointOutput[];
  result: LinkBudgetCalculationResult;
}

export const ThroughputGraph: React.FC<ThroughputGraphProps> = ({
  fourPoints,
  result
}) => {
  const [viewMode, setViewMode] = useState<'CURVE' | 'BARS'>('CURVE');
  const [hoveredPoint, setHoveredPoint] = useState<FourPointOutput | null>(null);

  // SVG dimensions
  const svgWidth = 840;
  const svgHeight = 330;
  const margin = { top: 35, right: 40, bottom: 45, left: 65 };
  const chartW = svgWidth - margin.left - margin.right;
  const chartH = svgHeight - margin.top - margin.bottom;

  // Max throughput for scale
  const maxDlThr = Math.max(10, fourPoints[0].dlThroughputMbps);
  const maxUlThr = Math.max(5, fourPoints[0].ulThroughputMbps);
  const maxScaleThr = Math.ceil((maxDlThr * 1.15) / 50) * 50 || 100;

  // Generate continuous curve data across the cell distance
  const curvePoints = useMemo(() => {
    const pts = [];
    const steps = 60;
    const maxDistKm = Math.max(0.5, result.maxCellRangeKm * 1.15);

    const peakDl = fourPoints[0].dlThroughputMbps;
    const peakUl = fourPoints[0].ulThroughputMbps;
    const edgeDl = fourPoints[3].dlThroughputMbps;
    const edgeUl = fourPoints[3].ulThroughputMbps;

    for (let i = 0; i <= steps; i++) {
      const dist = (i / steps) * maxDistKm;
      const normDist = dist / result.maxCellRangeKm;

      let dlThr: number;
      let ulThr: number;

      if (normDist <= 1.0) {
        // High SNR decay inside cell
        dlThr = peakDl * Math.pow(Math.max(0.02, 1 - normDist * 0.92), 1.55);
        ulThr = peakUl * Math.pow(Math.max(0.02, 1 - normDist * 0.90), 1.45);
        dlThr = Math.max(edgeDl, dlThr);
        ulThr = Math.max(edgeUl, ulThr);
      } else {
        // Outside cell edge (rapid drop)
        const beyondFactor = Math.max(0, 1 - (normDist - 1.0) * 3);
        dlThr = edgeDl * beyondFactor;
        ulThr = edgeUl * beyondFactor;
      }

      pts.push({
        distKm: Number(dist.toFixed(3)),
        dlThr: Number(dlThr.toFixed(1)),
        ulThr: Number(ulThr.toFixed(1))
      });
    }
    return pts;
  }, [fourPoints, result]);

  const maxDistKm = curvePoints[curvePoints.length - 1]?.distKm || 1;

  // Mapping functions
  const getX = (dKm: number) => margin.left + (dKm / maxDistKm) * chartW;
  const getY = (valMbps: number) => margin.top + chartH - (valMbps / maxScaleThr) * chartH;

  // Generate SVG path strings
  const dlPathD = curvePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.distKm)} ${getY(p.dlThr)}`).join(' ');
  const ulPathD = curvePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.distKm)} ${getY(p.ulThr)}`).join(' ');

  // Area under curves
  const dlAreaD = `${dlPathD} L ${getX(curvePoints[curvePoints.length - 1].distKm)} ${margin.top + chartH} L ${getX(0)} ${margin.top + chartH} Z`;
  const ulAreaD = `${ulPathD} L ${getX(curvePoints[curvePoints.length - 1].distKm)} ${margin.top + chartH} L ${getX(0)} ${margin.top + chartH} Z`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xs">
      {/* Top Banner */}
      <div className="px-5 py-3.5 bg-slate-850 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-100 tracking-tight">
            DL & UL Throughput Distribution Profile (Mbps)
          </h2>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            (Downlink vs Uplink Rates Across Coverage Points)
          </span>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setViewMode('CURVE')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              viewMode === 'CURVE'
                ? 'bg-slate-800 text-cyan-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Continuous Curve</span>
          </button>
          <button
            onClick={() => setViewMode('BARS')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              viewMode === 'BARS'
                ? 'bg-slate-800 text-cyan-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>4-Points Bars</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="p-4 relative">
        {viewMode === 'CURVE' ? (
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto select-none overflow-visible"
          >
            <defs>
              <linearGradient id="dlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="ulGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.20" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Ticks (Throughput in Mbps) */}
            {[0.25, 0.5, 0.75, 1.0].map((frac) => {
              const val = Math.round(maxScaleThr * frac);
              const yPos = getY(val);
              return (
                <g key={val}>
                  <line
                    x1={margin.left}
                    y1={yPos}
                    x2={margin.left + chartW}
                    y2={yPos}
                    stroke="#1E293B"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={margin.left - 10}
                    y={yPos + 4}
                    textAnchor="end"
                    className="fill-slate-500 text-[10px] font-mono"
                  >
                    {val} Mbps
                  </text>
                </g>
              );
            })}

            {/* Vertical Distance Grid Lines */}
            {[0.2, 0.4, 0.6, 0.8, 1.0].map((frac, idx) => (
              <g key={idx}>
                <line
                  x1={margin.left + frac * chartW}
                  y1={margin.top}
                  x2={margin.left + frac * chartW}
                  y2={margin.top + chartH}
                  stroke="#1E293B"
                  strokeDasharray="3 3"
                />
                <text
                  x={margin.left + frac * chartW}
                  y={margin.top + chartH + 18}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-mono"
                >
                  {(frac * maxDistKm).toFixed(2)} km
                </text>
              </g>
            ))}

            {/* Cell Edge Boundary Marker */}
            <line
              x1={getX(result.maxCellRangeKm)}
              y1={margin.top}
              x2={getX(result.maxCellRangeKm)}
              y2={margin.top + chartH}
              stroke="#F43F5E"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={getX(result.maxCellRangeKm)}
              y={margin.top - 10}
              textAnchor="middle"
              className="fill-rose-400 text-[10px] font-mono font-semibold"
            >
              Cell Edge: {result.maxCellRangeKm.toFixed(2)} km
            </text>

            {/* Filled Areas under curves */}
            <path d={dlAreaD} fill="url(#dlGradient)" />
            <path d={ulAreaD} fill="url(#ulGradient)" />

            {/* DL Curve */}
            <path d={dlPathD} fill="none" stroke="#06B6D4" strokeWidth="3" />

            {/* UL Curve */}
            <path d={ulPathD} fill="none" stroke="#10B981" strokeWidth="2.5" strokeDasharray="5 3" />

            {/* Four Points Markers */}
            {fourPoints.map((pt, idx) => {
              const xPos = getX(pt.rangeKm);
              const yDl = getY(pt.dlThroughputMbps);
              const yUl = getY(pt.ulThroughputMbps);
              const isSelected = hoveredPoint?.pointName === pt.pointName;

              return (
                <g
                  key={pt.pointName}
                  className="cursor-pointer transition-opacity"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Vertical Guideline */}
                  <line
                    x1={xPos}
                    y1={margin.top}
                    x2={xPos}
                    y2={margin.top + chartH}
                    stroke={isSelected ? '#38BDF8' : '#334155'}
                    strokeWidth={isSelected ? '1.5' : '1'}
                    strokeDasharray="2 2"
                  />

                  {/* DL Point */}
                  <circle
                    cx={xPos}
                    cy={yDl}
                    r={isSelected ? '6' : '4.5'}
                    className="fill-cyan-400"
                    stroke="#0B0F19"
                    strokeWidth="2"
                  />

                  {/* UL Point */}
                  <circle
                    cx={xPos}
                    cy={yUl}
                    r={isSelected ? '6' : '4.5'}
                    className="fill-emerald-400"
                    stroke="#0B0F19"
                    strokeWidth="2"
                  />

                  {/* DL Value Label */}
                  <text
                    x={xPos}
                    y={Math.max(margin.top + 10, yDl - 8)}
                    textAnchor="middle"
                    className="fill-cyan-300 text-[10px] font-mono font-bold"
                  >
                    {pt.dlThroughputMbps.toFixed(0)}M
                  </text>

                  {/* Point Name underneath axis */}
                  <text
                    x={xPos}
                    y={margin.top + chartH + 32}
                    textAnchor="middle"
                    className={`text-[9px] font-mono ${
                      isSelected ? 'fill-cyan-300 font-bold' : 'fill-slate-400'
                    }`}
                  >
                    {pt.pointName}
                  </text>
                </g>
              );
            })}
          </svg>
        ) : (
          /* BAR COMPARISON VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-2">
            {fourPoints.map((pt, idx) => {
              const dlPercent = Math.min(100, (pt.dlThroughputMbps / maxDlThr) * 100);
              const ulPercent = Math.min(100, (pt.ulThroughputMbps / maxUlThr) * 100);

              return (
                <div
                  key={pt.pointName}
                  className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-200">{pt.pointName}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {pt.rangeKm >= 1 ? `${pt.rangeKm.toFixed(2)} km` : `${pt.rangeMeters} m`}
                    </span>
                  </div>

                  {/* DL Bar */}
                  <div>
                    <div className="flex justify-between items-baseline text-xs font-mono mb-1">
                      <span className="text-cyan-400 flex items-center gap-1">
                        <ArrowDownRight className="w-3 h-3" /> DL
                      </span>
                      <span className="text-slate-100 font-bold">
                        {pt.dlThroughputMbps.toFixed(1)} Mbps
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(4, dlPercent)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {pt.avgDlMcs}
                    </div>
                  </div>

                  {/* UL Bar */}
                  <div>
                    <div className="flex justify-between items-baseline text-xs font-mono mb-1">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" /> UL
                      </span>
                      <span className="text-slate-100 font-bold">
                        {pt.ulThroughputMbps.toFixed(1)} Mbps
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(4, ulPercent)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {pt.avgUlMcs}
                    </div>
                  </div>

                  {/* Radio Condition Footer */}
                  <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[10px] font-mono text-slate-400">
                    <span>RSRP: {pt.ssRsrpDbm.toFixed(0)} dBm</span>
                    <span>RSSI: {pt.ssRssiDbm.toFixed(0)} dBm</span>
                    <span>BLER: {pt.avgDlBlerPercent.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Hover inspection box */}
        {hoveredPoint && (
          <div className="absolute top-6 right-6 bg-slate-950/95 border border-cyan-500/50 rounded-lg p-3 shadow-xl pointer-events-none text-xs font-mono space-y-1">
            <div className="text-cyan-300 font-bold">{hoveredPoint.pointName} Inspection</div>
            <div className="text-slate-300">
              Distance: <strong className="text-white">{hoveredPoint.rangeKm.toFixed(3)} km</strong> ({hoveredPoint.rangeMeters} m)
            </div>
            <div className="text-cyan-400">
              DL Rate: <strong>{hoveredPoint.dlThroughputMbps.toFixed(1)} Mbps</strong> ({hoveredPoint.avgDlMcs})
            </div>
            <div className="text-emerald-400">
              UL Rate: <strong>{hoveredPoint.ulThroughputMbps.toFixed(1)} Mbps</strong> ({hoveredPoint.avgUlMcs})
            </div>
            <div className="text-slate-400 text-[11px] pt-1 border-t border-slate-800">
              SS-RSRP: {hoveredPoint.ssRsrpDbm.toFixed(1)} dBm · SS-RSSI: {hoveredPoint.ssRssiDbm.toFixed(1)} dBm · BLER: {hoveredPoint.avgDlBlerPercent.toFixed(1)}%
            </div>
          </div>
        )}

        {/* Graph Legend */}
        <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 mt-4 px-2 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-cyan-400 rounded-sm inline-block" />
              <span className="text-slate-200">DL Throughput (Forward Link)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-emerald-400 rounded-sm border-b border-dashed inline-block" />
              <span className="text-slate-200">UL Throughput (Reverse Link)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-rose-400 border-b border-dashed inline-block" />
              <span className="text-rose-400">Cell Edge Boundary (R_max)</span>
            </div>
          </div>

          <div className="text-slate-500 text-[11px]">
            Peak DL: <span className="text-cyan-300 font-semibold">{fourPoints[0].dlThroughputMbps.toFixed(1)} Mbps</span> · Peak UL: <span className="text-emerald-300 font-semibold">{fourPoints[0].ulThroughputMbps.toFixed(1)} Mbps</span>
          </div>
        </div>
      </div>
    </div>
  );
};
