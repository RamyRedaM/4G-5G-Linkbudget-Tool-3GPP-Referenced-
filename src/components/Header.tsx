import React from 'react';
import { Download, BookOpen, Dices, Radio } from 'lucide-react';
import { LinkBudgetInputs } from '../types/telecom';

interface HeaderProps {
  activeModule: 'lkb' | 'montecarlo';
  onModuleChange: (module: 'lkb' | 'montecarlo') => void;
  currentTab: string;
  onTabChange: (tab: string) => void;
  onSelectPreset?: (inputs: LinkBudgetInputs) => void;
  onOpenGuide: () => void;
  onExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeModule,
  onModuleChange,
  currentTab,
  onTabChange,
  onOpenGuide,
  onExport
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Zone 1: Main Tool Name + 2 Module Buttons on the Top Left */}
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto py-1">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-cyan-400/20 shrink-0" />
            <span
              style={{ fontSize: '14px', lineHeight: '27px' }}
              className="font-semibold tracking-tight text-white font-mono whitespace-nowrap"
            >
              4G-5G LKB (3GPP Ref) Ver 1.33.7 <span className="text-cyan-400 font-normal">by RamyREDA</span>
            </span>
          </div>

          {/* 2 Primary Buttons on the Top Left of the tool */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 shadow-inner gap-1 shrink-0">
            {/* Button #1: LKB Tool Module */}
            <button
              onClick={() => onModuleChange('lkb')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeModule === 'lkb'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 font-medium'
              }`}
              title="Button #1: LKB Tool Module - Takes user to the LKB inputs and outputs while minimizing other Monte carlo analysis outputs"
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">LKB Tool Module</span>
            </button>

            {/* Button #2: Monte Carlo Analysis Module */}
            <button
              onClick={() => onModuleChange('montecarlo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeModule === 'montecarlo'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 font-medium'
              }`}
              title="Button #2: Monte Carlo Analysis Module - Takes user to the Monte Carlo Analysis inputs and outputs while minimizing other LKB outputs"
            >
              <Dices className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">Monte Carlo Analysis Module</span>
            </button>
          </div>
        </div>

        {/* Zone 2: Replaces Standard Presets Menu - Appears ONLY when user chooses LKB Tool Module */}
        <div className="flex items-center gap-2.5 shrink-0">
          {activeModule === 'lkb' && (
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 shadow-inner gap-1">
              {/* 1. 4 points coverage */}
              <button
                onClick={() => onTabChange('overview')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                  currentTab === 'overview'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 font-medium'
                }`}
                title="4 points coverage (Near cell, Medium range, Bad radio conditions, Cell edge)"
              >
                4 points coverage
              </button>

              {/* 2. MIMO & Beam Forming */}
              <button
                onClick={() => onTabChange('mimo')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                  currentTab === 'mimo'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 font-medium'
                }`}
                title="MIMO & Beam Forming Gain/Complexity Trade-offs"
              >
                MIMO &amp; Beam Forming
              </button>

              {/* 3. RF Cascade Waterfall */}
              <button
                onClick={() => onTabChange('waterfall')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                  currentTab === 'waterfall'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 font-medium'
                }`}
                title="RF Cascade Waterfall Analysis"
              >
                RF Cascade Waterfall
              </button>

              {/* 4. Propagation curves */}
              <button
                onClick={() => onTabChange('charts')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                  currentTab === 'charts'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 font-medium'
                }`}
                title="Propagation curves & SPM Model"
              >
                Propagation curves
              </button>
            </div>
          )}

          {activeModule === 'montecarlo' && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-3 py-1.5 rounded-lg shrink-0">
              <Dices className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Monte Carlo Statistical Radio Engine Active</span>
              <span className="md:hidden">Monte Carlo Active</span>
            </div>
          )}

          {/* Action Buttons: 3GPP Specs Guide & Export */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenGuide}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-cyan-300 px-2.5 py-1.5 rounded-md hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer"
              title="3GPP & SPM Formulas Guide"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">3GPP Specs</span>
            </button>

            <button
              onClick={onExport}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-900 bg-cyan-400 hover:bg-cyan-300 px-3 py-1.5 rounded-md transition-colors shadow-xs cursor-pointer"
              title="Export Link Budget Calculation Summary"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
