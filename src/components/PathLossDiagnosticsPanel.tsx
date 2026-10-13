import React, { useMemo, useState } from 'react';
import { Activity, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PathLossDiagnostics } from '../types/monteCarlo';

interface PathLossDiagnosticsPanelProps {
  diagnostics: PathLossDiagnostics;
}

const SCENARIO_LABELS: Record<string, string> = {
  OUTDOOR_LOS: 'Outdoor LOS',
  OUTDOOR_NLOS: 'Outdoor NLOS',
  IN_VEHICLE: 'In-Vehicle',
  INDOOR_STANDARD: 'Indoor Standard',
  TUNNEL_COVERAGE: 'Tunnel',
  INDOOR_DEEP: 'Deep Indoor'
};

// Chart geometry (SVG user units)
const W = 900;
const H = 380;
const PAD = { left: 56, right: 20, top: 28, bottom: 44 };

/**
 * Diagnostic output mode: path loss of the Monte Carlo users against the LKB propagation curve, per bin distance.
 */
export const PathLossDiagnosticsPanel: React.FC<PathLossDiagnosticsPanelProps> = ({ diagnostics: d }) => {
  const [showSamples, setShowSamples] = useState(true);
  const [sampleMetric, setSampleMetric] = useState<'TOTAL' | 'MEDIAN'>('TOTAL');

  const chart = useMemo(() => {
    const maxDist = Math.max(100, d.lkbMaxCellRangeMeters, ...d.bins.map(b => b.outerRadiusMeters));
    const samples = d.samplePoints.map(u => ({
      x: u.distanceMeters,
      y: sampleMetric === 'TOTAL' ? u.totalPathLossDb : u.medianPathLossDb,
      indoor: u.isIndoor
    }));
    const ys = [
      ...d.lkbCurve.flatMap(p => [p.lkbPathLossDb, p.mcMedianPathLossDb]),
      ...(showSamples ? samples.map(s => s.y) : []),
      ...d.bins.map(b => b.meanTotalPathLossDb),
      d.lkbMaplDb
    ].filter(v => Number.isFinite(v));
    const yMin = Math.floor((Math.min(...ys) - 5) / 10) * 10;
    const yMax = Math.ceil((Math.max(...ys) + 5) / 10) * 10;
    const sx = (m: number) => PAD.left + (Math.min(m, maxDist) / maxDist) * (W - PAD.left - PAD.right);
    const sy = (db: number) => PAD.top + ((yMax - db) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);
    const yTicks: number[] = [];
    const yStep = yMax - yMin > 80 ? 20 : 10;
    for (let v = yMin; v <= yMax; v += yStep) yTicks.push(v);
    const xStep = niceStep(maxDist / 6);
    const xTicks: number[] = [];
    for (let v = 0; v <= maxDist; v += xStep) xTicks.push(v);
    const path = (key: 'lkbPathLossDb' | 'mcMedianPathLossDb') =>
      d.lkbCurve.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.distanceMeters).toFixed(1)},${sy(p[key]).toFixed(1)}`).join(' ');
    return { maxDist, samples, yMin, yMax, sx, sy, yTicks, xTicks, lkbPath: path('lkbPathLossDb'), mcPath: path('mcMedianPathLossDb') };
  }, [d, showSamples, sampleMetric]);

  const hasOffset = d.lkbScenarioPenetrationDb > 0;

  return (
    <div className="bg-slate-900/70 border border-amber-500/30 rounded-xl p-4 space-y-4">
      {/* Header & verdict */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="space-y-1">
          <h3 className="text-xs font-bold font-mono text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Path Loss Diagnostics · Monte Carlo vs LKB Propagation Curve
          </h3>
          <p className="text-[11px] font-mono text-slate-400">
            {d.propagationModel} · {d.environmentClutter} · DL {d.dlFreqMHz} MHz{d.ulFreqMHz !== d.dlFreqMHz ? ` / UL ${d.ulFreqMHz} MHz` : ''} ·
            LKB scenario {SCENARIO_LABELS[d.lkbScenario] ?? d.lkbScenario} → MC outdoor state {SCENARIO_LABELS[d.mcOutdoorScenario] ?? d.mcOutdoorScenario}
          </p>
        </div>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border ${
          d.curveMatches
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
        }`}>
          {d.curveMatches ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          {d.curveMatches ? 'Median path loss matches LKB curve' : 'Median path loss deviates from LKB curve'} · max Δ {d.maxCurveDeviationDb.toFixed(3)} dB
        </span>
      </div>

      {/* Key reference values */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px] font-mono">
        {[
          ['LKB system MAPL', `${d.lkbMaplDb.toFixed(1)} dB`],
          ['LKB R_max', `${(d.lkbMaxCellRangeMeters / 1000).toFixed(2)} km`],
          ['Shadowing σ (sampled)', `${d.configuredShadowSigmaDb.toFixed(1)} dB`],
          ['LKB shadowing margin', `${d.lkbShadowFadingMarginDb.toFixed(1)} dB`],
          ['LKB scenario penetration', `${d.lkbScenarioPenetrationDb.toFixed(1)} dB`],
          ['Users plotted', `${d.samplePoints.length.toLocaleString()} drops`]
        ].map(([k, v]) => (
          <div key={k} className="bg-slate-950/50 border border-slate-800 rounded-lg px-2.5 py-2 min-w-0">
            <span className="block text-slate-500 uppercase text-[9px] tracking-wider">{k}</span>
            <span className="block text-slate-100 font-bold tabular-nums">{v}</span>
          </div>
        ))}
      </div>

      {hasOffset && (
        <p className="text-[11px] font-mono text-amber-200/90 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
          The LKB curve includes {d.lkbScenarioPenetrationDb.toFixed(1)} dB of building penetration for its {SCENARIO_LABELS[d.lkbScenario] ?? d.lkbScenario} scenario.
          The Monte Carlo engine applies O2I loss per user instead (indoor fraction and 12/18 dB draw), so its median curve sits exactly that much below the LKB curve.
        </p>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
        <button
          onClick={() => setShowSamples(v => !v)}
          className={`px-2.5 py-1 rounded-md border cursor-pointer ${showSamples ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
        >
          {showSamples ? 'Hide' : 'Show'} user samples
        </button>
        <div className="flex rounded-md border border-slate-700 overflow-hidden">
          {([['TOTAL', 'Total PL (σ + O2I + body)'], ['MEDIAN', 'Distance-only PL']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setSampleMetric(k)}
              className={`px-2.5 py-1 cursor-pointer ${sampleMetric === k ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px] h-auto bg-slate-950/40 rounded-lg" role="img"
          aria-label="Path loss versus distance: LKB curve, Monte Carlo median curve and simulated users">
          {/* Bin bands */}
          {d.bins.map((b, i) => (
            <g key={b.binIndex}>
              <rect
                x={chart.sx(b.innerRadiusMeters)}
                y={PAD.top}
                width={Math.max(0, chart.sx(b.outerRadiusMeters) - chart.sx(b.innerRadiusMeters))}
                height={H - PAD.top - PAD.bottom}
                fill={i % 2 === 0 ? '#1e293b' : '#0f172a'}
                opacity={0.45}
              />
              <text x={(chart.sx(b.innerRadiusMeters) + chart.sx(b.outerRadiusMeters)) / 2} y={PAD.top - 8}
                textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="monospace">Bin {b.binIndex}</text>
            </g>
          ))}

          {/* Grid & axes */}
          {chart.yTicks.map(v => (
            <g key={`y${v}`}>
              <line x1={PAD.left} x2={W - PAD.right} y1={chart.sy(v)} y2={chart.sy(v)} stroke="#334155" strokeWidth="0.5" strokeDasharray="2 4" />
              <text x={PAD.left - 6} y={chart.sy(v) + 3} textAnchor="end" fontSize="10" fill="#94a3b8" fontFamily="monospace">{v}</text>
            </g>
          ))}
          {chart.xTicks.map(v => (
            <text key={`x${v}`} x={chart.sx(v)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="monospace">
              {v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)} km` : `${v} m`}
            </text>
          ))}
          <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="#475569" />
          <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={H - PAD.bottom} stroke="#475569" />
          <text x={(PAD.left + W - PAD.right) / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#cbd5e1" fontFamily="monospace">Distance from site</text>
          <text x={14} y={(PAD.top + H - PAD.bottom) / 2} textAnchor="middle" fontSize="10" fill="#cbd5e1" fontFamily="monospace"
            transform={`rotate(-90 14 ${(PAD.top + H - PAD.bottom) / 2})`}>Path loss (dB)</text>

          {/* MAPL and R_max references */}
          <line x1={PAD.left} x2={W - PAD.right} y1={chart.sy(d.lkbMaplDb)} y2={chart.sy(d.lkbMaplDb)} stroke="#fb7185" strokeDasharray="6 4" strokeWidth="1" />
          <text x={W - PAD.right - 4} y={chart.sy(d.lkbMaplDb) - 4} textAnchor="end" fontSize="10" fill="#fb7185" fontFamily="monospace">
            LKB MAPL {d.lkbMaplDb.toFixed(1)} dB
          </text>
          {d.lkbMaxCellRangeMeters <= chart.maxDist && (
            <line x1={chart.sx(d.lkbMaxCellRangeMeters)} x2={chart.sx(d.lkbMaxCellRangeMeters)} y1={PAD.top} y2={H - PAD.bottom}
              stroke="#fb7185" strokeDasharray="2 3" strokeWidth="1" />
          )}

          {/* User samples */}
          {showSamples && chart.samples.map((s, i) => (
            <circle key={i} cx={chart.sx(s.x)} cy={chart.sy(s.y)} r={1.8}
              fill={s.indoor ? '#c084fc' : '#34d399'} opacity={0.45} />
          ))}

          {/* LKB curve and Monte Carlo median curve */}
          <path d={chart.lkbPath} fill="none" stroke="#22d3ee" strokeWidth="2.5" />
          <path d={chart.mcPath} fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="6 4" />

          {/* Per-bin mean total path loss */}
          {d.bins.map(b => (
            <rect key={`m${b.binIndex}`} x={chart.sx(b.midDistanceMeters) - 4} y={chart.sy(b.meanTotalPathLossDb) - 4} width={8} height={8}
              fill="#f8fafc" stroke="#0f172a" transform={`rotate(45 ${chart.sx(b.midDistanceMeters)} ${chart.sy(b.meanTotalPathLossDb)})`} />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-mono text-slate-300">
        <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-cyan-400 inline-block" />LKB propagation curve</span>
        <span className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed border-amber-400 inline-block" />Monte Carlo median (distance only)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rotate-45 bg-slate-50 inline-block" />Bin mean total path loss</span>
        {showSamples && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Outdoor user</span>}
        {showSamples && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />Indoor user</span>}
        <span className="flex items-center gap-1.5"><span className="w-5 border-t border-dashed border-rose-400 inline-block" />LKB MAPL / R_max</span>
      </div>

      {/* Per-bin table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono text-left tabular-nums">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
              <th className="py-2 px-2">Bin</th>
              <th className="py-2 px-2">Range (m)</th>
              <th className="py-2 px-2">Mid (m)</th>
              <th className="py-2 px-2">LKB PL @ mid</th>
              <th className="py-2 px-2">MC median @ mid</th>
              <th className="py-2 px-2">Δ (MC − LKB)</th>
              <th className="py-2 px-2">Shadowing μ / σ</th>
              <th className="py-2 px-2">O2I mean (indoor %)</th>
              <th className="py-2 px-2">Body</th>
              <th className="py-2 px-2">Mean total PL</th>
              <th className="py-2 px-2">Min – max</th>
              <th className="py-2 px-2">Max curve dev.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {d.bins.map(b => {
              const delta = b.mcMedianPathLossAtMidDb - b.lkbPathLossAtMidDb;
              const sigmaOk = Math.abs(b.stdShadowFadingDb - d.configuredShadowSigmaDb) <= Math.max(0.5, d.configuredShadowSigmaDb * 0.1);
              return (
                <tr key={b.binIndex} className="hover:bg-slate-800/30">
                  <td className="py-2 px-2 font-bold text-cyan-400">Bin {b.binIndex}</td>
                  <td className="py-2 px-2 text-slate-300">{b.innerRadiusMeters} – {b.outerRadiusMeters}</td>
                  <td className="py-2 px-2 text-slate-300">{b.midDistanceMeters}</td>
                  <td className="py-2 px-2 text-cyan-300">{b.lkbPathLossAtMidDb.toFixed(1)} dB</td>
                  <td className="py-2 px-2 text-amber-300">{b.mcMedianPathLossAtMidDb.toFixed(1)} dB</td>
                  <td className="py-2 px-2 text-slate-200">{delta >= 0 ? '+' : ''}{delta.toFixed(1)} dB</td>
                  <td className={`py-2 px-2 ${sigmaOk ? 'text-slate-200' : 'text-amber-300'}`}>
                    {b.meanShadowFadingDb >= 0 ? '+' : ''}{b.meanShadowFadingDb.toFixed(2)} / {b.stdShadowFadingDb.toFixed(2)} dB
                  </td>
                  <td className="py-2 px-2 text-slate-300">{b.meanPenetrationLossDb.toFixed(1)} dB ({b.indoorPercent.toFixed(0)}%)</td>
                  <td className="py-2 px-2 text-slate-300">{b.meanBodyLossDb.toFixed(1)} dB</td>
                  <td className="py-2 px-2 font-bold text-slate-100">{b.meanTotalPathLossDb.toFixed(1)} dB</td>
                  <td className="py-2 px-2 text-slate-400">{b.minTotalPathLossDb.toFixed(0)} – {b.maxTotalPathLossDb.toFixed(0)} dB</td>
                  <td className={`py-2 px-2 font-bold ${b.maxCurveDeviationDb < 0.05 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {b.maxCurveDeviationDb.toFixed(3)} dB
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
        Max curve dev. is the largest |MC median + LKB scenario penetration − LKB curve| over every user dropped in the bin, across all iterations.
        Shadowing μ should be close to 0 dB and σ close to the configured value. Total PL = median + shadowing + O2I + body loss.
      </p>
    </div>
  );
};

function niceStep(raw: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(1, raw))));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}
