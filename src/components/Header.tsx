import React from 'react';
import { Download, Sliders, BookOpen } from 'lucide-react';
import { TELECOM_PRESETS } from '../data/telecomPresets';
import { LinkBudgetInputs } from '../types/telecom';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onSelectPreset: (inputs: LinkBudgetInputs) => void;
  onOpenGuide: () => void;
  onExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onSelectPreset,
  onOpenGuide,
  onExport
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-cyan-400/20" />
          <span className="text-sm sm:text-base font-semibold tracking-tight text-white font-mono">
            4G-5G LinkBudget (3GPP Referenced) <span className="text-cyan-400 font-normal">by RamyREDA</span>
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
          <button
            onClick={() => onTabChange('overview')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              currentTab === 'overview'
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            4-Points Coverage
          </button>
          <button
            onClick={() => onTabChange('waterfall')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              currentTab === 'waterfall'
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            RF Cascade Waterfall
          </button>
          <button
            onClick={() => onTabChange('charts')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              currentTab === 'charts'
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            SPM Propagation Curves
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Preset Selector */}
          <div className="relative">
            <select
              aria-label="Preset Configurations"
              onChange={(e) => {
                const found = TELECOM_PRESETS.find(p => p.id === e.target.value);
                if (found) onSelectPreset(found.inputs);
              }}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer"
              defaultValue=""
            >
              <option value="" disabled>Standard Presets</option>
              {TELECOM_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-cyan-300 px-2.5 py-1.5 rounded-md hover:bg-slate-800 border border-slate-700/60 transition-colors"
            title="3GPP & SPM Formulas Guide"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3GPP Specs</span>
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-900 bg-cyan-400 hover:bg-cyan-300 px-3 py-1.5 rounded-md transition-colors shadow-xs"
            title="Export Link Budget Calculation Summary"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </header>
  );
};
