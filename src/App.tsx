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
import { LinkBudgetWaterfall } from './components/LinkBudgetWaterfall';
import { CoverageCharts } from './components/CoverageCharts';
import { TelecomGuruGuide } from './components/TelecomGuruGuide';
import { TELECOM_PRESETS } from './data/telecomPresets';
import { calculateLinkBudget } from './utils/linkBudgetCalculator';
import { exportLinkBudgetCsv } from './utils/exportReport';
import { LinkBudgetInputs } from './types/telecom';

export default function App() {
  // Initialize with the standard 5G NR n78 100MHz 64TR Massive MIMO preset
  const [inputs, setInputs] = useState<LinkBudgetInputs>(TELECOM_PRESETS[0].inputs);
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Real-time link budget calculation
  const result = useMemo(() => {
    return calculateLinkBudget(inputs);
  }, [inputs]);

  const handleExport = () => {
    exportLinkBudgetCsv(result, inputs);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Bar Contract compliant Header */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onSelectPreset={(newInputs) => setInputs(newInputs)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onExport={handleExport}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Overview Bar */}
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
            
            {/* Embedded SPM Propagation Curve Snapshot */}
            <CoverageCharts result={result} inputs={inputs} />
          </div>
        )}

        {currentTab === 'waterfall' && (
          <div className="space-y-6">
            <LinkBudgetWaterfall cascadeTable={result.cascadeTable} result={result} />
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
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            4G-5G LinkBudget (3GPP Referenced) by RamyREDA · Standard Propagation Model (SPM) Engine
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
