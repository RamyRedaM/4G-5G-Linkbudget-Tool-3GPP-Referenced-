import React, { useState } from 'react';
import { LinkBudgetCascadeItem, LinkBudgetCalculationResult } from '../types/telecom';
import { ArrowDownRight, ArrowUpRight, Filter, Info, ShieldCheck, AlertCircle } from 'lucide-react';

interface LinkBudgetWaterfallProps {
  cascadeTable: LinkBudgetCascadeItem[];
  result: LinkBudgetCalculationResult;
}

export const LinkBudgetWaterfall: React.FC<LinkBudgetWaterfallProps> = ({
  cascadeTable,
  result
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const categories = [
    { id: 'ALL', label: 'All Parameters' },
    { id: 'TX', label: 'Transmitter (Tx)' },
    { id: 'ANTENNA', label: 'Antennas & RF Feeder' },
    { id: 'RX', label: 'Receiver (Rx & Sens)' },
    { id: 'MARGINS', label: 'Planning Margins' },
    { id: 'RESULT', label: 'Final MAPL' }
  ];

  const filteredItems = filterCategory === 'ALL'
    ? cascadeTable
    : cascadeTable.filter(item => item.category === filterCategory);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xs">
      {/* Waterfall Banner */}
      <div className="px-5 py-4 bg-slate-850 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 tracking-tight flex items-center gap-2">
            <span>Detailed RF Link Budget Cascade Waterfall</span>
            <span className="text-xs text-slate-400 font-mono font-normal">
              (Downlink vs Uplink Balance)
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Step-by-step 3GPP power cascade from transmitter antenna port to receiver sensitivity limit.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800 text-xs">
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setFilterCategory(c.id)}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                filterCategory === c.id
                  ? 'bg-slate-800 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Callout */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 border-b border-slate-800 bg-slate-950/40">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Downlink MAPL (gNB → UE)
              </div>
              <div className="text-xl font-mono font-bold text-slate-100 tabular-nums">
                {result.dlMaplDb.toFixed(1)} <span className="text-xs text-slate-400 font-normal">dB</span>
              </div>
            </div>
          </div>
          <div className="text-right text-xs font-mono">
            <div className="text-slate-400">UE Sensitivity</div>
            <div className="text-slate-200 font-semibold">{result.ueRxSensitivityDbm.toFixed(1)} dBm</div>
          </div>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Uplink MAPL (UE → gNB)
              </div>
              <div className="text-xl font-mono font-bold text-slate-100 tabular-nums">
                {result.ulMaplDb.toFixed(1)} <span className="text-xs text-slate-400 font-normal">dB</span>
              </div>
            </div>
          </div>
          <div className="text-right text-xs font-mono">
            <div className="text-slate-400">gNB Sensitivity</div>
            <div className="text-slate-200 font-semibold">{result.bsRxSensitivityDbm.toFixed(1)} dBm</div>
          </div>
        </div>
      </div>

      {/* Waterfall Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <th className="py-2.5 px-4 font-medium w-1/3">Cascade Parameter</th>
              <th className="py-2.5 px-4 font-medium text-cyan-400">
                Downlink (Forward Link)
              </th>
              <th className="py-2.5 px-4 font-medium text-emerald-400">
                Uplink (Reverse Link)
              </th>
              <th className="py-2.5 px-4 font-medium">Unit</th>
              <th className="py-2.5 px-4 font-medium text-slate-400">3GPP Notes & References</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-xs font-mono">
            {filteredItems.map((item, idx) => {
              const isHighlight = item.category === 'RESULT' || item.name.includes('EIRP') || item.name.includes('Sensitivity');
              return (
                <tr
                  key={idx}
                  className={`hover:bg-slate-800/30 transition-colors ${
                    item.category === 'RESULT'
                      ? 'bg-slate-800/60 font-semibold'
                      : isHighlight
                      ? 'bg-slate-950/30'
                      : ''
                  }`}
                >
                  <td className="py-2.5 px-4 font-sans text-slate-200 font-medium">
                    {item.name}
                  </td>
                  <td className="py-2.5 px-4 tabular-nums text-cyan-300 font-semibold">
                    {item.dlValue}
                  </td>
                  <td className="py-2.5 px-4 tabular-nums text-emerald-300 font-semibold">
                    {item.ulValue}
                  </td>
                  <td className="py-2.5 px-4 text-slate-400">
                    {item.unit}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-400 text-[11px]">
                    {item.description}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Engineering Diagnostic Footer */}
      <div className="p-4 bg-slate-950/70 border-t border-slate-800 text-xs">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-slate-300 leading-relaxed font-sans">
            <strong>Telecom Guru Bottleneck Analysis:</strong>{' '}
            {result.bottleneck === 'UL_LIMITED' ? (
              <span>
                Your network deployment is <strong className="text-amber-400">Uplink-Limited by {result.bottleneckDeltaDb.toFixed(1)} dB</strong>. 
                The limiting factor is the handheld UE transmitter power (+23 dBm) compared to the base station high EIRP ({result.bsEirpDbm.toFixed(1)} dBm). 
                To balance the link, consider enabling <strong>UL 2Tx / HPUE (+26 dBm)</strong>, deploying <strong>SRS-based UL Beamforming (64TR)</strong>, or utilizing <strong>Outdoor High-Gain CPE (+27 dBm, 9 dBi gain)</strong>.
              </span>
            ) : result.bottleneck === 'DL_LIMITED' ? (
              <span>
                Your network deployment is <strong className="text-rose-400">Downlink-Limited by {result.bottleneckDeltaDb.toFixed(1)} dB</strong>. 
                This commonly happens when high-gain CPEs or HPUEs are paired with low-power micro cells, or when heavy DL thermal noise across wide bandwidths exceeds the UE receive sensitivity.
              </span>
            ) : (
              <span>
                Your Downlink and Uplink budgets are <strong className="text-emerald-400">perfectly balanced (within 0.5 dB)</strong>, maximizing spectral utilization without wasting base station RF transmit power.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
