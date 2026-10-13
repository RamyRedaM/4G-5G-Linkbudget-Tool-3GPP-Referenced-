/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { LinkBudgetOverview } from './components/LinkBudgetOverview';
import { FourPointsAnalysisTable } from './components/FourPointsAnalysisTable';
import { ThroughputGraph } from './components/ThroughputGraph';
import { InputPanel } from './components/InputPanel';
import { MimoTradeoffAnalysis } from './components/MimoTradeoffAnalysis';
import { LinkBudgetWaterfall } from './components/LinkBudgetWaterfall';
import { CoverageCharts } from './components/CoverageCharts';
import { MonteCarloAnalysis } from './components/MonteCarloAnalysis';
import { TelecomGuruGuide } from './components/TelecomGuruGuide';
import { TELECOM_PRESETS } from './data/telecomPresets';
import { calculateLinkBudget } from './utils/linkBudgetCalculator';
import { exportLinkBudgetCsv } from './utils/exportReport';
import { LinkBudgetInputs } from './types/telecom';
import { Radio } from 'lucide-react';

export default function App() {
  // Initialize with the standard 5G NR n78 100MHz 64TR Massive MIMO preset
  const [inputs, setInputs] = useState<LinkBudgetInputs>(TELECOM_PRESETS[0].inputs);
  const [activeModule, setActiveModule] = useState<'lkb' | 'montecarlo'>('lkb');
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isLkbExpandedInMonteCarlo, setIsLkbExpandedInMonteCarlo] = useState<boolean>(false);

  // Real-time link budget calculation
  const result = useMemo(() => {
    return calculateLinkBudget(inputs);
  }, [inputs]);

  const handleExport = () => {
    exportLinkBudgetCsv(result, inputs);
  };

  const handleModuleChange = (module: 'lkb' | 'montecarlo') => {
    setActiveModule(module);
    if (module === 'montecarlo') {
      setCurrentTab('montecarlo');
    } else {
      if (currentTab === 'montecarlo') {
        setCurrentTab('overview');
      }
    }
  };

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    if (tab === 'montecarlo') {
      setActiveModule('montecarlo');
    } else {
      setActiveModule('lkb');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Bar Contract compliant Header with 2 Module Buttons on Top Left & Monte Carlo Tab */}
      <Header
        activeModule={activeModule}
        onModuleChange={handleModuleChange}
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onSelectPreset={(newInputs) => setInputs(newInputs)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onExport={handleExport}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeModule === 'lkb' ? (
          /* LKB Tool Module: Takes user to the LKB inputs and outputs while minimizing other Monte carlo analysis outputs */
          <>
            {/* KPI Overview Bar & Physical RF Topology Visualization */}
            <LinkBudgetOverview result={result} inputs={inputs} />

            {/* Input Configuration Panel (Collapsible / Accordion) */}
            <InputPanel inputs={inputs} onChange={setInputs} />

            {/* Tab Views */}
            {currentTab === 'overview' && (
              <div className="space-y-6">
                {/* The primary 4-Points Coverage Table */}
                <FourPointsAnalysisTable fourPoints={result.fourPoints} result={result} />

                {/* Dedicated Graph for DL / UL Thrpt Values (Mbps) */}
                <ThroughputGraph fourPoints={result.fourPoints} result={result} />

                {/* MIMO & Beamforming Gain/Complexity Trade-offs Analysis */}
                <MimoTradeoffAnalysis
                  result={result}
                  inputs={inputs}
                  onUpdateInputs={(partial) => setInputs(prev => ({ ...prev, ...partial }))}
                />
                
                {/* Embedded SPM Propagation Curve Snapshot */}
                <CoverageCharts result={result} inputs={inputs} />
              </div>
            )}

            {currentTab === 'mimo' && (
              <div className="space-y-6">
                {/* Full-width dedicated MIMO & Beamforming Analyzer */}
                <MimoTradeoffAnalysis
                  result={result}
                  inputs={inputs}
                  onUpdateInputs={(partial) => setInputs(prev => ({ ...prev, ...partial }))}
                />

                {/* Dedicated Graph for DL / UL Thrpt Values (Mbps) */}
                <ThroughputGraph fourPoints={result.fourPoints} result={result} />

                {/* Coverage Table summary */}
                <FourPointsAnalysisTable fourPoints={result.fourPoints} result={result} />
              </div>
            )}

            {currentTab === 'waterfall' && (
              <div className="space-y-6">
                <LinkBudgetWaterfall cascadeTable={result.cascadeTable} result={result} inputs={inputs} />
              </div>
            )}

            {currentTab === 'charts' && (
              <div className="space-y-6">
                {/* Dedicated Graph for DL / UL Thrpt Values (Mbps) */}
                <ThroughputGraph fourPoints={result.fourPoints} result={result} />

                <CoverageCharts result={result} inputs={inputs} />
                
                {/* Quick 4-Points summary underneath */}
                <FourPointsAnalysisTable fourPoints={result.fourPoints} result={result} />
              </div>
            )}
          </>
        ) : (
          /* Monte Carlo Analysis Module: Takes user to the Monte Carlo Analysis inputs and outputs while minimizing other LKB outputs */
          <div className="space-y-6">
            {/* Minimized LKB Reference Summary Strip */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-lg">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  <Radio className="w-4 h-4" />
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-slate-400 font-semibold">Underlying LKB Radio Context:</span>
                  <span className="text-cyan-300 font-bold">
                    {inputs.technology === '4G' ? '4G LTE' : inputs.technology === '5G_NSA' ? '5G NSA' : '5G NR SA'} · Band {inputs.band} ({inputs.bandwidthMHz} MHz BW)
                  </span>
                  <span className="text-slate-600 hidden sm:inline">|</span>
                  <span className="text-slate-400">System MAPL:</span>
                  <span className="text-slate-200 font-bold">{result.systemMaplDb.toFixed(1)} dB</span>
                  <span className="text-slate-600 hidden sm:inline">|</span>
                  <span className="text-slate-400">Max Radius:</span>
                  <span className="text-emerald-400 font-bold">{result.maxCellRangeKm.toFixed(2)} km</span>
                  <span className="text-slate-600 hidden md:inline">|</span>
                  <span className="text-slate-400 hidden md:inline">Bottleneck:</span>
                  <span className={`hidden md:inline font-bold ${
                    result.bottleneck === 'UL_LIMITED' ? 'text-amber-400' : result.bottleneck === 'DL_LIMITED' ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {result.bottleneck.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLkbExpandedInMonteCarlo(!isLkbExpandedInMonteCarlo)}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {isLkbExpandedInMonteCarlo ? 'Minimize LKB Details' : 'Expand LKB Details'}
                </button>
                <button
                  onClick={() => handleModuleChange('lkb')}
                  className="px-2.5 py-1 rounded-md bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-mono transition-colors cursor-pointer"
                >
                  Return to LKB Tool Module
                </button>
              </div>
            </div>

            {/* Optional Expanded LKB Panels when user toggles 'Expand LKB Details' */}
            {isLkbExpandedInMonteCarlo && (
              <div className="space-y-6 border-b border-slate-800/80 pb-6 animate-fadeIn">
                <LinkBudgetOverview result={result} inputs={inputs} />
                <InputPanel inputs={inputs} onChange={setInputs} />
              </div>
            )}

            {/* Primary Monte Carlo Analysis Module (Simulation inputs, 2D Scatter Map, CDF curves, throughput histograms, trial table) */}
            <MonteCarloAnalysis result={result} inputs={inputs} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            4G-5G LKB (3GPP Ref) Ver 1.33.3 by RamyREDA · Standard Propagation Model (SPM) Engine
          </span>
          <span className="text-slate-600">
            TS 38.101 · TS 38.104 · TS 38.901 · TS 38.306 · TS 36.101
          </span>
        </div>
      </footer>

      {/* Guru Specification & Manual Modal */}
      <TelecomGuruGuide
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
