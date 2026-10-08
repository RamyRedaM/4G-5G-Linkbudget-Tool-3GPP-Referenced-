import React, { useState, useMemo } from 'react';
import { LinkBudgetCalculationResult, LinkBudgetInputs } from '../types/telecom';
import { calculatePathLoss } from '../utils/spmPropagation';
import { TELECOM_BANDS } from '../data/telecomBands';
import { Activity, Crosshair } from 'lucide-react';

interface CoverageChartsProps {
  result: LinkBudgetCalculationResult;
  inputs: LinkBudgetInputs;
}

export const CoverageCharts: React.FC<CoverageChartsProps> = ({ result, inputs }) => {
  const [activeChart, setActiveChart] = useState<'PL' | 'RSRP' | 'THROUGHPUT'>('PL');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const currentBand = TELECOM_BANDS.find(b => b.band === inputs.band) || TELECOM_BANDS[0];

  // Generate 50 points along the distance profile up to 1.25x max range
  const curveData = useMemo(() => {
    const maxDist = Math.max(0.5, result.maxCellRangeKm * 1.25);
    const steps = 50;
    const points = [];

    const propParams = {
      freqMHz: currentBand.dlFreqMHz,
      hbMeters: inputs.bsHeightMeters,
      hmMeters: inputs.ueHeightMeters,
      model: inputs.propagationModel,
      clutter: inputs.environmentClutter,
      scenario: inputs.indoorOutdoorScenario,
      additionalPenetrationLossDb: inputs.additionalPenetrationLossDb,
      foliageLossDb: inputs.foliageLossDb,
      spmK1Override: inputs.spmK1,
      spmK2Override: inputs.spmK2
    };

    for (let i = 1; i <= steps; i++) {
      const distKm = (i / steps) * maxDist;
      const pl = calculatePathLoss(distKm, propParams);
      const rsrp = result.rsPowerDbm + inputs.bsAntennaGainDbi - inputs.bsFeederCableLossDb - pl;
      
      // SINR approximation
      const normDist = distKm / result.maxCellRangeKm;
      let sinr = 25 - normDist * 29;
      sinr = Math.max(-6, Math.min(27, sinr));

      // Throughputs
      const peakDl = result.fourPoints[0].dlThroughputMbps;
      const peakUl = result.fourPoints[0].ulThroughputMbps;
      const edgeDl = result.fourPoints[3].dlThroughputMbps;
      const edgeUl = result.fourPoints[3].ulThroughputMbps;

      let dlThr = peakDl * Math.pow(Math.max(0.02, 1 - normDist * 0.92), 1.6);
      let ulThr = peakUl * Math.pow(Math.max(0.02, 1 - normDist * 0.90), 1.5);
      if (normDist > 1.0) {
        dlThr = Math.max(0, edgeDl * 0.4);
        ulThr = Math.max(0, edgeUl * 0.3);
      } else {
        dlThr = Math.max(edgeDl, dlThr);
        ulThr = Math.max(edgeUl, ulThr);
      }

      points.push({
        distKm: Number(distKm.toFixed(3)),
        distMeters: Math.round(distKm * 1000),
        pl: Number(pl.toFixed(1)),
        rsrp: Number(rsrp.toFixed(1)),
        sinr: Number(sinr.toFixed(1)),
        dlThr: Number(dlThr.toFixed(1)),
        ulThr: Number(ulThr.toFixed(1))
      });
    }

    return points;
  }, [result, inputs, currentBand]);

  // Chart rendering dimensions
  const svgWidth = 800;
  const svgHeight = 320;
  const margin = { top: 25, right: 35, bottom: 45, left: 60 };
  const chartW = svgWidth - margin.left - margin.right;
  const chartH = svgHeight - margin.top - margin.bottom;

  const maxDist = curveData[curveData.length - 1]?.distKm || 1;

  // Scales
  const getX = (dKm: number) => margin.left + (dKm / maxDist) * chartW;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xs">
      {/* Chart Header Bar */}
      <div className="px-5 py-3.5 bg-slate-850 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-100 tracking-tight">
            Propagation Model & Signal Distribution Curves
          </h2>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            ({inputs.propagationModel} · {inputs.environmentClutter})
          </span>
        </div>

        {/* Chart View Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveChart('PL')}
            className={`px-3 py-1 rounded transition-colors ${
              activeChart === 'PL'
                ? 'bg-slate-800 text-cyan-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Path Loss vs Distance
          </button>
          <button
            onClick={() => setActiveChart('RSRP')}
            className={`px-3 py-1 rounded transition-colors ${
              activeChart === 'RSRP'
                ? 'bg-slate-800 text-cyan-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SS-RSRP & SINR
          </button>
          <button
            onClick={() => setActiveChart('THROUGHPUT')}
            className={`px-3 py-1 rounded transition-colors ${
              activeChart === 'THROUGHPUT'
                ? 'bg-slate-800 text-cyan-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Throughput (DL/UL)
          </button>
        </div>
      </div>

      {/* SVG Canvas Stage */}
      <div className="p-4 relative">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none overflow-visible"
        >
          {/* Subtle Grid Lines */}
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
                {(frac * maxDist).toFixed(2)} km
              </text>
            </g>
          ))}

          {/* R_max / Cell Edge Boundary Line */}
          {result.maxCellRangeKm <= maxDist && (
            <g>
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
                y={margin.top - 8}
                textAnchor="middle"
                className="fill-rose-400 text-[10px] font-mono font-semibold"
              >
                R_max: {result.maxCellRangeKm.toFixed(2)} km (Edge)
              </text>
            </g>
          )}

          {/* 1. PATH LOSS CHART */}
          {activeChart === 'PL' && (() => {
            const minPl = 50;
            const maxPl = Math.max(165, result.systemMaplDb + 18);
            const getY = (val: number) => margin.top + chartH - ((val - minPl) / (maxPl - minPl)) * chartH;
            const sigma = inputs.shadowFadingStdDevDb;
            const msf = result.shadowFadingMarginDb;

            // Nominal SPM Curve
            const pathD = curveData.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.distKm)} ${getY(pt.pl)}`).join(' ');

            // Effective Curve with Shadow Fading Margin (+M_SF)
            const pathEffD = curveData.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.distKm)} ${getY(pt.pl + msf)}`).join(' ');

            // Log-Normal Shadow Fading (+/- sigma) Envelope Area
            const upperPoints = curveData.map((pt) => `${getX(pt.distKm)},${getY(pt.pl + sigma)}`);
            const lowerPoints = [...curveData].reverse().map((pt) => `${getX(pt.distKm)},${getY(Math.max(minPl, pt.pl - sigma))}`);
            const envelopePolygon = `${upperPoints.join(' ')} ${lowerPoints.join(' ')}`;

            return (
              <g>
                <defs>
                  <linearGradient id="shadowFadingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid & Ticks */}
                {[60, 80, 100, 120, 140, 160].map((val) => (
                  <g key={val}>
                    <line
                      x1={margin.left}
                      y1={getY(val)}
                      x2={margin.left + chartW}
                      y2={getY(val)}
                      stroke="#1E293B"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={margin.left - 10}
                      y={getY(val) + 4}
                      textAnchor="end"
                      className="fill-slate-500 text-[10px] font-mono"
                    >
                      {val} dB
                    </text>
                  </g>
                ))}

                {/* Log-Normal Shadow Fading (+/- sigma) Envelope Area */}
                <polygon points={envelopePolygon} fill="url(#shadowFadingGrad)" stroke="#0891B2" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.4" />

                {/* Effective Planning Curve (+M_SF Shadow Fading Margin) */}
                <path d={pathEffD} fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3 2" />

                {/* System MAPL Limit Line */}
                <line
                  x1={margin.left}
                  y1={getY(result.systemMaplDb)}
                  x2={margin.left + chartW}
                  y2={getY(result.systemMaplDb)}
                  stroke="#F59E0B"
                  strokeWidth="1.8"
                  strokeDasharray="6 3"
                />
                <text
                  x={margin.left + chartW - 5}
                  y={getY(result.systemMaplDb) - 6}
                  textAnchor="end"
                  className="fill-amber-400 text-[10px] font-mono font-bold"
                >
                  MAPL Limit: {result.systemMaplDb.toFixed(1)} dB ({result.bottleneck.replace('_', ' ')})
                </text>

                {/* Median Path Loss Curve */}
                <path d={pathD} fill="none" stroke="#06B6D4" strokeWidth="2.5" />

                {/* 4 Points on Curve */}
                {result.fourPoints.map((pt, idx) => (
                  <g key={pt.pointName}>
                    <circle
                      cx={getX(pt.rangeKm)}
                      cy={getY(pt.pathLossDb)}
                      r="4.5"
                      className={
                        idx === 0
                          ? 'fill-emerald-400'
                          : idx === 1
                          ? 'fill-cyan-400'
                          : idx === 2
                          ? 'fill-amber-400'
                          : 'fill-rose-400'
                      }
                      stroke="#0B0F19"
                      strokeWidth="2"
                    />
                    <text
                      x={getX(pt.rangeKm)}
                      y={getY(pt.pathLossDb) - 10}
                      textAnchor="middle"
                      className="fill-slate-200 text-[9px] font-mono font-medium"
                    >
                      {pt.pointName}
                    </text>
                  </g>
                ))}
              </g>
            );
          })()}

          {/* 2. RSRP & SINR CHART */}
          {activeChart === 'RSRP' && (() => {
            const minRsrp = -130;
            const maxRsrp = -60;
            const getY = (val: number) => margin.top + chartH - ((val - minRsrp) / (maxRsrp - minRsrp)) * chartH;

            const pathD = curveData.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.distKm)} ${getY(pt.rsrp)}`).join(' ');

            return (
              <g>
                {/* Horizontal Ticks */}
                {[-70, -85, -100, -115, -125].map((val) => (
                  <g key={val}>
                    <line
                      x1={margin.left}
                      y1={getY(val)}
                      x2={margin.left + chartW}
                      y2={getY(val)}
                      stroke="#1E293B"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={margin.left - 10}
                      y={getY(val) + 4}
                      textAnchor="end"
                      className="fill-slate-500 text-[10px] font-mono"
                    >
                      {val} dBm
                    </text>
                  </g>
                ))}

                {/* Coverage Threshold Line (-118 dBm) */}
                <line
                  x1={margin.left}
                  y1={getY(-118)}
                  x2={margin.left + chartW}
                  y2={getY(-118)}
                  stroke="#F43F5E"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={margin.left + 10}
                  y={getY(-118) - 5}
                  className="fill-rose-400 text-[9px] font-mono"
                >
                  Cell Edge Sensitivity (-118 dBm)
                </text>

                {/* RSRP Curve */}
                <path d={pathD} fill="none" stroke="#10B981" strokeWidth="2.5" />

                {/* 4 Points Markers */}
                {result.fourPoints.map((pt, idx) => (
                  <g key={pt.pointName}>
                    <circle
                      cx={getX(pt.rangeKm)}
                      cy={getY(pt.ssRsrpDbm)}
                      r="4.5"
                      className="fill-emerald-400"
                      stroke="#0B0F19"
                      strokeWidth="2"
                    />
                    <text
                      x={getX(pt.rangeKm)}
                      y={getY(pt.ssRsrpDbm) - 9}
                      textAnchor="middle"
                      className="fill-slate-200 text-[9px] font-mono"
                    >
                      {pt.ssRsrpDbm.toFixed(0)} dBm
                    </text>
                  </g>
                ))}
              </g>
            );
          })()}

          {/* 3. THROUGHPUT CHART */}
          {activeChart === 'THROUGHPUT' && (() => {
            const maxThr = Math.max(100, result.fourPoints[0].dlThroughputMbps * 1.15);
            const getY = (val: number) => margin.top + chartH - (val / maxThr) * chartH;

            const pathDl = curveData.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.distKm)} ${getY(pt.dlThr)}`).join(' ');
            const pathUl = curveData.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.distKm)} ${getY(pt.ulThr)}`).join(' ');

            return (
              <g>
                {/* Horizontal Ticks */}
                {[0.25, 0.5, 0.75, 1.0].map((frac) => {
                  const val = Math.round(maxThr * frac);
                  return (
                    <g key={val}>
                      <line
                        x1={margin.left}
                        y1={getY(val)}
                        x2={margin.left + chartW}
                        y2={getY(val)}
                        stroke="#1E293B"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={margin.left - 10}
                        y={getY(val) + 4}
                        textAnchor="end"
                        className="fill-slate-500 text-[10px] font-mono"
                      >
                        {val} Mbps
                      </text>
                    </g>
                  );
                })}

                {/* DL Curve */}
                <path d={pathDl} fill="none" stroke="#06B6D4" strokeWidth="2.5" />
                {/* UL Curve */}
                <path d={pathUl} fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="5 3" />

                {/* Point Labels */}
                {result.fourPoints.map((pt) => (
                  <circle
                    key={pt.pointName}
                    cx={getX(pt.rangeKm)}
                    cy={getY(pt.dlThroughputMbps)}
                    r="4"
                    fill="#06B6D4"
                    stroke="#0B0F19"
                    strokeWidth="2"
                  />
                ))}
              </g>
            );
          })()}
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mt-2 px-2">
          <div className="flex items-center gap-4">
            {activeChart === 'PL' && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
                  <span>SPM Median PL</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-2 bg-cyan-500/20 border border-dashed border-cyan-400/50 inline-block rounded-xs" />
                  <span>Shadow Fading Envelope (±σ: ±{inputs.shadowFadingStdDevDb.toFixed(1)} dB)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-amber-400 border-b border-dashed inline-block" />
                  <span>Effective Margin (+M_SF: +{result.shadowFadingMarginDb.toFixed(1)} dB)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-amber-400 inline-block" />
                  <span>MAPL Limit ({result.systemMaplDb.toFixed(1)} dB)</span>
                </div>
              </>
            )}
            {activeChart === 'RSRP' && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
                  <span>SS-RSRP (dBm)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-rose-400 border-b border-dashed inline-block" />
                  <span>Coverage Threshold (-118 dBm)</span>
                </div>
              </>
            )}
            {activeChart === 'THROUGHPUT' && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
                  <span>DL Throughput (Mbps)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-emerald-400 border-b border-dashed inline-block" />
                  <span>UL Throughput (Mbps)</span>
                </div>
              </>
            )}
          </div>
          <div className="text-slate-500 text-[11px]">
            X-Axis: Distance from gNB (km)
          </div>
        </div>
      </div>
    </div>
  );
};
