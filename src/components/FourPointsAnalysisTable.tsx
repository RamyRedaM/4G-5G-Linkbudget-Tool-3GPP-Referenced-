import React from 'react';
import { FourPointOutput, LinkBudgetCalculationResult } from '../types/telecom';
import { ArrowDownRight, ArrowUpRight, Clock, Activity, Zap, CheckCircle2, AlertTriangle, ShieldX } from 'lucide-react';

interface FourPointsAnalysisTableProps {
  fourPoints: FourPointOutput[];
  result: LinkBudgetCalculationResult;
}

export const FourPointsAnalysisTable: React.FC<FourPointsAnalysisTableProps> = ({
  fourPoints,
  result
}) => {
  const getRsrpQuality = (rsrp: number) => {
    if (rsrp >= -80) return { label: 'Excellent', color: 'text-emerald-400' };
    if (rsrp >= -95) return { label: 'Good', color: 'text-cyan-400' };
    if (rsrp >= -110) return { label: 'Mid / Fair', color: 'text-amber-400' };
    return { label: 'Edge / Weak', color: 'text-rose-400' };
  };

  const getSinrQuality = (sinr: number) => {
    if (sinr >= 20) return { label: '256QAM', color: 'text-emerald-400' };
    if (sinr >= 10) return { label: '64QAM', color: 'text-cyan-400' };
    if (sinr >= 0) return { label: '16QAM', color: 'text-amber-400' };
    return { label: 'QPSK', color: 'text-rose-400' };
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xs">
      {/* Table Header Banner */}
      <div className="px-5 py-3.5 bg-slate-850 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-100 tracking-tight">
            Four Operating Radio Points Coverage Matrix
          </h2>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            (3GPP TR 38.901 & TS 38.306 Analysis)
          </span>
        </div>

        {/* MAPL & Limiting Link callout */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded border border-slate-700">
            <span className="text-slate-400">System MAPL:</span>
            <span className="text-cyan-300 font-bold">{result.systemMaplDb.toFixed(1)} dB</span>
          </div>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-semibold ${
              result.bottleneck === 'UL_LIMITED'
                ? 'bg-amber-950/40 border-amber-800/80 text-amber-300'
                : result.bottleneck === 'DL_LIMITED'
                ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
            }`}
          >
            {result.bottleneck === 'UL_LIMITED' ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>UL LIMITED</span>
              </>
            ) : result.bottleneck === 'DL_LIMITED' ? (
              <>
                <ShieldX className="w-3.5 h-3.5" />
                <span>DL LIMITED</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>BALANCED LINK</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <th className="py-3 px-3.5 font-medium">Operating Point</th>
              <th className="py-3 px-3 font-medium">Expected Cell Range</th>
              <th className="py-3 px-3 font-medium">SS-RSRP</th>
              <th className="py-3 px-3 font-medium text-cyan-300">SS-RSSI</th>
              <th className="py-3 px-3 font-medium">SS-SINR</th>
              <th className="py-3 px-3 font-medium text-cyan-400">Avg. DL MCS</th>
              <th className="py-3 px-3 font-medium text-emerald-400">Avg. UL MCS</th>
              <th className="py-3 px-3 font-medium text-amber-300">Avg. DL BLER</th>
              <th className="py-3 px-3 font-medium">
                <span className="inline-flex items-center gap-1 text-cyan-400">
                  <ArrowDownRight className="w-3 h-3" /> DL Thrpt
                </span>
              </th>
              <th className="py-3 px-3 font-medium">
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <ArrowUpRight className="w-3 h-3" /> UL Thrpt
                </span>
              </th>
              <th className="py-3 px-3 font-medium">
                <span className="inline-flex items-center gap-1 text-amber-300">
                  <Clock className="w-3 h-3" /> Latency
                </span>
              </th>
              <th className="py-3 px-3 font-medium">Limiting Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-xs font-mono">
            {fourPoints.map((pt, idx) => {
              const rsrpInfo = getRsrpQuality(pt.ssRsrpDbm);
              const sinrInfo = getSinrQuality(pt.ssSinrDb);
              const isEdge = pt.pointName === 'Cell edge';
              const isNear = pt.pointName === 'Near Cell';

              return (
                <tr
                  key={pt.pointName}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    isEdge ? 'bg-rose-950/10' : isNear ? 'bg-cyan-950/10' : ''
                  }`}
                >
                  {/* Point Name & Description */}
                  <td className="py-3 px-3.5 font-sans">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          idx === 0
                            ? 'bg-emerald-400'
                            : idx === 1
                            ? 'bg-cyan-400'
                            : idx === 2
                            ? 'bg-amber-400'
                            : 'bg-rose-400'
                        }`}
                      />
                      <span className="font-semibold text-slate-100">{pt.pointName}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 max-w-[200px] line-clamp-1 font-sans">
                      {pt.description}
                    </div>
                  </td>

                  {/* Range (km / meters) */}
                  <td className="py-3 px-3 tabular-nums">
                    <div className="font-semibold text-slate-200">
                      {pt.rangeKm >= 1 ? `${pt.rangeKm.toFixed(3)} km` : `${pt.rangeMeters} m`}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      ({pt.rangeMeters.toLocaleString()} m) · PL: {pt.pathLossDb.toFixed(1)} dB
                    </div>
                  </td>

                  {/* SS-RSRP */}
                  <td className="py-3 px-3 tabular-nums">
                    <div className={`font-semibold ${rsrpInfo.color}`}>
                      {pt.ssRsrpDbm.toFixed(1)} dBm
                    </div>
                    <div className="text-[10px] text-slate-400">{rsrpInfo.label}</div>
                  </td>

                  {/* SS-RSSI */}
                  <td className="py-3 px-3 tabular-nums">
                    <div className="font-semibold text-slate-100">
                      {pt.ssRssiDbm.toFixed(1)} dBm
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      Wideband / SSB
                    </div>
                  </td>

                  {/* SS-SINR */}
                  <td className="py-3 px-3 tabular-nums">
                    <div className={`font-semibold ${sinrInfo.color}`}>
                      {pt.ssSinrDb > 0 ? `+${pt.ssSinrDb.toFixed(1)}` : pt.ssSinrDb.toFixed(1)} dB
                    </div>
                    <div className="text-[10px] text-slate-400">{sinrInfo.label}</div>
                  </td>

                  {/* Avg. DL MCS */}
                  <td className="py-3 px-3">
                    <div className="text-cyan-300 font-semibold text-[11px]">
                      {pt.avgDlMcs}
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      {idx === 0 ? 'Peak Rank ' + pt.mimoLayers : idx === 1 ? 'Rank 2-4' : 'Rank 1 SISO'}
                    </div>
                  </td>

                  {/* Avg. UL MCS */}
                  <td className="py-3 px-3">
                    <div className="text-emerald-300 font-semibold text-[11px]">
                      {pt.avgUlMcs}
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      {idx > 1 ? '1 PRB PUSCH' : 'Full / Multi-PRB'}
                    </div>
                  </td>

                  {/* Avg. DL BLER % */}
                  <td className="py-3 px-3 tabular-nums">
                    <div className={`font-semibold ${
                      pt.avgDlBlerPercent <= 2
                        ? 'text-emerald-400'
                        : pt.avgDlBlerPercent <= 6
                        ? 'text-cyan-400'
                        : pt.avgDlBlerPercent <= 11
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}>
                      {pt.avgDlBlerPercent.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      {idx === 3 ? 'Target 10% HARQ' : idx === 2 ? 'Fading Peaks' : 'Nominal'}
                    </div>
                  </td>

                  {/* DL Throughput */}
                  <td className="py-3 px-3 tabular-nums">
                    <div className="text-cyan-300 font-bold text-sm">
                      {pt.dlThroughputMbps.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">Mbps</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      Forward Link
                    </div>
                  </td>

                  {/* UL Throughput */}
                  <td className="py-3 px-3 tabular-nums">
                    <div className="text-emerald-300 font-bold text-sm">
                      {pt.ulThroughputMbps.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">Mbps</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      Reverse Link
                    </div>
                  </td>

                  {/* Latency */}
                  <td className="py-3 px-3 tabular-nums">
                    <span className="text-amber-200 font-medium">{pt.latencyMs.toFixed(1)} ms</span>
                    <div className="text-[10px] text-slate-500">
                      {isEdge ? 'HARQ Retrans' : 'Radio RTT'}
                    </div>
                  </td>

                  {/* Limiting Link */}
                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                        result.bottleneck === 'UL_LIMITED'
                          ? 'bg-amber-900/30 text-amber-300 border border-amber-800/40'
                          : result.bottleneck === 'DL_LIMITED'
                          ? 'bg-rose-900/30 text-rose-300 border border-rose-800/40'
                          : 'bg-emerald-900/30 text-emerald-300 border border-emerald-800/40'
                      }`}
                    >
                      {result.bottleneck === 'UL_LIMITED'
                        ? 'UL Limited'
                        : result.bottleneck === 'DL_LIMITED'
                        ? 'DL Limited'
                        : 'Balanced'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Explanatory Technical Footer */}
      <div className="px-5 py-3 bg-slate-900/80 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            Cell Edge is bounded strictly by the <strong>{result.bottleneck.replace('_', ' ')}</strong> MAPL threshold of{' '}
            <strong className="text-slate-200">{result.systemMaplDb.toFixed(1)} dB</strong>.
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Downlink MAPL: <strong className="text-slate-300">{result.dlMaplDb.toFixed(1)} dB</strong></span>
          <span>Uplink MAPL: <strong className="text-slate-300">{result.ulMaplDb.toFixed(1)} dB</strong></span>
          <span>Bottleneck Headroom: <strong className="text-amber-400">{result.bottleneckDeltaDb.toFixed(1)} dB</strong></span>
        </div>
      </div>
    </div>
  );
};
