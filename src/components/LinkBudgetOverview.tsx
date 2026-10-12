import React from 'react';
import {
  LinkBudgetCalculationResult,
  LinkBudgetInputs
} from '../types/telecom';
import { ArrowDownRight, ArrowUpRight, Radio, ShieldAlert, Cpu } from 'lucide-react';
import { LinkBudgetDiagram } from './LinkBudgetDiagram';

interface LinkBudgetOverviewProps {
  result: LinkBudgetCalculationResult;
  inputs: LinkBudgetInputs;
}

export const LinkBudgetOverview: React.FC<LinkBudgetOverviewProps> = ({ result, inputs }) => {
  const isUlLimited = result.bottleneck === 'UL_LIMITED';
  const isDlLimited = result.bottleneck === 'DL_LIMITED';

  // BS designation as per user specification:
  // eNB in case of 4G, gNB in case of 5G SA, eNB/gNB in case of 5G NSA
  const bsLabel = inputs.technology === '4G'
    ? 'eNB'
    : inputs.technology === '5G_NSA'
    ? 'eNB/gNB'
    : 'gNB';

  return (
    <div className="space-y-4 mb-6">
      {/* 4 KPI Summary Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: System MAPL & Limiting Link */}
        <div className={`bg-slate-900/90 border border-slate-800/90 rounded-lg p-4 relative overflow-hidden transition-all duration-300 shadow-md hover:border-slate-700 ${
          isUlLimited
            ? 'border-t-2 border-t-amber-400 shadow-amber-950/20'
            : isDlLimited
            ? 'border-t-2 border-t-rose-400 shadow-rose-950/20'
            : 'border-t-2 border-t-cyan-400 shadow-cyan-950/20'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-mono uppercase tracking-wider text-slate-300">System MAPL (Limit)</span>
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-mono font-bold text-white tabular-nums">
              {result.systemMaplDb.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-400 uppercase">dB</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={`font-semibold inline-flex items-center gap-1 ${
                isUlLimited
                  ? 'text-amber-400'
                  : isDlLimited
                  ? 'text-rose-400'
                  : 'text-emerald-400'
              }`}
            >
              {isUlLimited && <ShieldAlert className="w-3.5 h-3.5" />}
              {result.bottleneck === 'UL_LIMITED'
                ? 'UL LIMITED (Uplink Bottleneck)'
                : result.bottleneck === 'DL_LIMITED'
                ? 'DL LIMITED (Downlink Bottleneck)'
                : 'BALANCED (UL = DL)'}
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              · Δ {result.bottleneckDeltaDb.toFixed(1)} dB
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-0.5 font-mono">
            <div className="flex justify-between">
              <span>DL: {result.dlMaplDb.toFixed(1)} dB</span>
              <span className="text-cyan-300 font-medium">UE Sens: {result.ueRxSensitivityDbm.toFixed(1)} dBm</span>
            </div>
            <div className="flex justify-between">
              <span>UL: {result.ulMaplDb.toFixed(1)} dB</span>
              <span className="text-emerald-300 font-medium">{bsLabel} Sens: {result.bsRxSensitivityDbm.toFixed(1)} dBm</span>
            </div>
            <div className="flex justify-between pt-0.5 border-t border-slate-800/50 text-[10px] text-slate-400">
              <span>Shadow Fading Margin:</span>
              <span className="text-cyan-300 font-medium">+{result.shadowFadingMarginDb.toFixed(1)} dB (σ={inputs.shadowFadingStdDevDb.toFixed(1)} dB)</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Max Cell Range */}
        <div className="bg-slate-900/90 border border-slate-800/90 border-t-2 border-t-emerald-400 rounded-lg p-4 relative overflow-hidden transition-all duration-300 shadow-md hover:border-slate-700 shadow-emerald-950/20">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-mono uppercase tracking-wider text-slate-300">Max Cell Radius (R_max)</span>
            <span className="text-[11px] text-emerald-400 font-mono font-semibold">{inputs.propagationModel}</span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-mono font-bold text-white tabular-nums">
              {result.maxCellRangeKm >= 1
                ? result.maxCellRangeKm.toFixed(2)
                : (result.maxCellRangeKm * 1000).toFixed(0)}
            </span>
            <span className="text-xs font-mono text-slate-400 uppercase">
              {result.maxCellRangeKm >= 1 ? 'km' : 'meters'}
            </span>
          </div>
          <div className="text-xs text-slate-400">
            <span className="text-emerald-300 font-mono font-medium">
              {result.maxCellRangeMeters.toLocaleString()} m
            </span>{' '}
            at {inputs.coverageProbability}% cell edge target
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono flex items-center justify-between">
            <span className="text-slate-400 truncate max-w-[160px]" title={result.serviceSummary.displayName}>
              Service: {result.serviceSummary.displayName}
            </span>
            <span className="text-cyan-300 font-semibold">
              {result.serviceSummary.targetDlThroughputFormatted} DL
            </span>
          </div>
          <div className="pt-1 text-[10px] text-slate-500 flex justify-between font-mono">
            <span>h_BS: {inputs.bsHeightMeters}m · h_UE: {inputs.ueHeightMeters}m</span>
            <span className="text-emerald-400 font-medium">{result.serviceSummary.targetUlThroughputFormatted} UL</span>
          </div>
        </div>

        {/* KPI 3: Radiated RF Power (EIRP & RS) */}
        <div className="bg-slate-900/90 border border-slate-800/90 border-t-2 border-t-indigo-400 rounded-lg p-4 relative overflow-hidden transition-all duration-300 shadow-md hover:border-slate-700 shadow-indigo-950/20">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-mono uppercase tracking-wider text-slate-300">BS EIRP &amp; RS Power</span>
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-mono font-bold text-white tabular-nums">
              {result.bsEirpDbm.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-400 uppercase">dBm EIRP</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between font-mono">
            <span>SS-PBCH EPRE / RS:</span>
            <span className="text-cyan-300 font-semibold">{result.rsPowerDbm.toFixed(1)} dBm/RE</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between font-mono">
            <span>UE EIRP: {result.ueEirpDbm.toFixed(1)} dBm</span>
            <span className="text-indigo-300">MIMO: {inputs.mimoMode}</span>
          </div>
        </div>

        {/* KPI 4: Peak Throughput & Carrier Aggregation */}
        <div className="bg-slate-900/90 border border-slate-800/90 border-t-2 border-t-blue-400 rounded-lg p-4 relative overflow-hidden transition-all duration-300 shadow-md hover:border-slate-700 shadow-blue-950/20">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-mono uppercase tracking-wider text-slate-300">Peak Near Throughput</span>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono font-semibold">
              {inputs.caEnabled ? `${result.caSummary.carrierCount}CC AGG` : '1CC'}
            </div>
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <div className="flex items-baseline gap-1">
              <ArrowDownRight className="w-3.5 h-3.5 text-cyan-400 inline" />
              <span className="text-2xl font-mono font-bold text-white tabular-nums">
                {result.fourPoints[0].dlThroughputMbps.toFixed(0)}
              </span>
              <span className="text-xs font-mono text-slate-400">Mbps DL</span>
            </div>
            <div className="flex items-baseline gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 inline" />
              <span className="text-xl font-mono font-bold text-slate-200 tabular-nums">
                {result.fourPoints[0].ulThroughputMbps.toFixed(0)}
              </span>
              <span className="text-xs font-mono text-slate-400">Mbps UL</span>
            </div>
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between font-mono">
            <span>Spectrum ({inputs.duplexMode}):</span>
            <span className="text-slate-200 font-medium">{result.caSummary.totalBandwidthMHz} MHz</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between font-mono">
            <span>Near Latency: {result.fourPoints[0].latencyMs} ms</span>
            <span>Edge: {result.fourPoints[3].latencyMs} ms</span>
          </div>
        </div>
      </div>

      {/* Interactive 4G/5G Physical Link Budget Topology Diagram */}
      <LinkBudgetDiagram result={result} inputs={inputs} />
    </div>
  );
};

