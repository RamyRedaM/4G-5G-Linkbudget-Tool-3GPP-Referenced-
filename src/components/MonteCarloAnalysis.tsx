import React, { useState, useMemo } from 'react';
import { LinkBudgetCalculationResult, LinkBudgetInputs } from '../types/telecom';
import {
  runMonteCarloSimulation,
  MonteCarloConfig,
  MonteCarloTrial
} from '../utils/monteCarloSimulation';
import {
  Dices,
  RefreshCw,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Radio,
  Layers,
  Activity,
  BarChart3,
  TrendingUp,
  MapPin,
  Sliders,
  Info,
  Maximize2
} from 'lucide-react';

interface MonteCarloAnalysisProps {
  result: LinkBudgetCalculationResult;
  inputs: LinkBudgetInputs;
}

export const MonteCarloAnalysis: React.FC<MonteCarloAnalysisProps> = ({ result, inputs }) => {
  // Configuration State
  const [config, setConfig] = useState<MonteCarloConfig>({
    trialsCount: 1500,
    shadowFadingStdDevDb: inputs.shadowFadingStdDevDb || 8.0,
    indoorProbabilityPercent: 40,
    interCellLoadPercent: 50,
    spatialDistribution: 'UNIFORM_AREA',
    seed: 101
  });

  const [activeSubTab, setActiveSubTab] = useState<'MAP' | 'CDF' | 'HISTOGRAM' | 'TABLE'>('MAP');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SATISFIED' | 'MARGINAL' | 'OUTAGE'>('ALL');
  const [hoveredTrial, setHoveredTrial] = useState<MonteCarloTrial | null>(null);
  const [cdfMetric, setCdfMetric] = useState<'THROUGHPUT' | 'SINR' | 'RSRP'>('THROUGHPUT');
  const [isSimulating, setIsSimulating] = useState(false);

  // Run Monte Carlo Simulation
  const { trials, summary } = useMemo(() => {
    return runMonteCarloSimulation(result, inputs, config);
  }, [result, inputs, config]);

  const filteredTrials = useMemo(() => {
    if (statusFilter === 'ALL') return trials;
    return trials.filter(t => t.status === statusFilter);
  }, [trials, statusFilter]);

  const handleReRun = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setConfig(prev => ({ ...prev, seed: Math.floor(Math.random() * 100000) }));
      setIsSimulating(false);
    }, 250);
  };

  const handleExportCsv = () => {
    const headers = [
      'Trial ID',
      'Distance (km)',
      'Normalized Dist',
      'Environment',
      'Shadow Fading (dB)',
      'Penetration Loss (dB)',
      'Body Loss (dB)',
      'DL Path Loss (dB)',
      'UL Path Loss (dB)',
      'RSRP (dBm)',
      'DL SINR (dB)',
      'UL SINR (dB)',
      'DL Thrpt (Mbps)',
      'UL Thrpt (Mbps)',
      'Status',
      'Bottleneck'
    ];

    const rows = trials.map(t => [
      t.id,
      t.distanceKm.toFixed(3),
      t.normalizedDistance.toFixed(3),
      t.isIndoor ? 'Indoor' : 'Outdoor',
      t.shadowFadingDb,
      t.penetrationLossDb,
      t.bodyLossDb,
      t.totalDlPathLossDb,
      t.totalUlPathLossDb,
      t.rsrpDbm,
      t.dlSinrDb,
      t.ulSinrDb,
      t.dlThroughputMbps,
      t.ulThroughputMbps,
      t.status,
      t.bottleneck
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `monte_carlo_trials_${inputs.technology}_${inputs.band}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const maxRangeKm = result.maxCellRangeKm;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Executive KPI Deck */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-cyan-950/90 border border-cyan-800/80 rounded-lg text-cyan-400">
                <Dices className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-mono font-bold text-white tracking-wide">
                    Monte Carlo Radio Analysis Module (3GPP Statistical Engine)
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-700/60 text-cyan-300 font-semibold uppercase">
                    {config.trialsCount.toLocaleString()} Trials
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Stochastic user distribution with lognormal shadowing, indoor penetration variance &amp; inter-cell interference
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleReRun}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md shadow-cyan-950/30 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>Re-run Simulation</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
          {/* KPI 1: Coverage Probability */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-0.5">
              Empirical Coverage
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-mono font-bold tabular-nums ${
                summary.coverageProbabilityPercent >= inputs.coverageProbability
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}>
                {summary.coverageProbabilityPercent}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                vs {inputs.coverageProbability}% tgt
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>{summary.satisfiedCount} UEs Satisfied</span>
            </div>
          </div>

          {/* KPI 2: Outage Probability */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-0.5">
              Outage Rate
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-mono font-bold tabular-nums ${
                summary.outageProbabilityPercent <= 10 ? 'text-slate-200' : 'text-rose-400'
              }`}>
                {summary.outageProbabilityPercent}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                ({summary.outageCount} drops)
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-1">
              UL {summary.ulLimitedOutagePercent}% · DL {summary.dlLimitedOutagePercent}%
            </div>
          </div>

          {/* KPI 3: Cell Edge (P10) Throughput */}
          <div className="bg-slate-950/80 border border-cyan-900/40 rounded-lg p-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 block mb-0.5">
              P10 Cell-Edge Rate
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-mono font-bold text-cyan-300 tabular-nums">
                {summary.dlThroughput.p10.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">DL Mbps</span>
            </div>
            <div className="text-[10px] font-mono text-emerald-400 mt-1">
              UL: {summary.ulThroughput.p10.toFixed(1)} Mbps
            </div>
          </div>

          {/* KPI 4: Median (P50) Throughput */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-0.5">
              P50 Median Rate
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-mono font-bold text-white tabular-nums">
                {summary.dlThroughput.p50.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">DL Mbps</span>
            </div>
            <div className="text-[10px] font-mono text-emerald-400 mt-1">
              UL: {summary.ulThroughput.p50.toFixed(1)} Mbps
            </div>
          </div>

          {/* KPI 5: Peak (P90) Near Throughput */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-0.5">
              P90 Peak Rate
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-mono font-bold text-white tabular-nums">
                {summary.dlThroughput.p90.toFixed(0)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">DL Mbps</span>
            </div>
            <div className="text-[10px] font-mono text-emerald-400 mt-1">
              UL: {summary.ulThroughput.p90.toFixed(0)} Mbps
            </div>
          </div>

          {/* KPI 6: Mean RSRP & SINR */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-0.5">
              Mean RSRP &amp; SINR
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-mono font-bold text-white tabular-nums">
                {summary.rsrp.mean.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">dBm</span>
            </div>
            <div className="text-[10px] font-mono text-cyan-300 mt-1">
              Mean SINR: {summary.dlSinr.mean.toFixed(1)} dB
            </div>
          </div>
        </div>
      </div>

      {/* 2. Simulation Parameter Configuration Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800/80 text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>Monte Carlo Simulation Control Parameters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs font-mono">
          {/* Param 1: Number of Trials */}
          <div>
            <label className="text-slate-400 block mb-1">Simulated Trials (N)</label>
            <select
              value={config.trialsCount}
              onChange={(e) => setConfig({ ...config, trialsCount: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:border-cyan-400 focus:outline-none"
            >
              <option value="500">500 UEs (Fast)</option>
              <option value="1000">1,000 UEs (Standard)</option>
              <option value="1500">1,500 UEs (Balanced)</option>
              <option value="3000">3,000 UEs (High precision)</option>
              <option value="5000">5,000 UEs (Ultra density)</option>
            </select>
          </div>

          {/* Param 2: Shadow Fading Std Dev */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-slate-400">Shadowing (σ_SF)</label>
              <span className="text-cyan-300 font-bold">{config.shadowFadingStdDevDb} dB</span>
            </div>
            <input
              type="range"
              min="3"
              max="14"
              step="0.5"
              value={config.shadowFadingStdDevDb}
              onChange={(e) => setConfig({ ...config, shadowFadingStdDevDb: Number(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Param 3: Indoor UE Ratio */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-slate-400">Indoor UE Fraction</label>
              <span className="text-cyan-300 font-bold">{config.indoorProbabilityPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={config.indoorProbabilityPercent}
              onChange={(e) => setConfig({ ...config, indoorProbabilityPercent: Number(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Param 4: Inter-Cell Loading */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-slate-400">Network Loading</label>
              <span className="text-cyan-300 font-bold">{config.interCellLoadPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={config.interCellLoadPercent}
              onChange={(e) => setConfig({ ...config, interCellLoadPercent: Number(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Param 5: Spatial Distribution */}
          <div>
            <label className="text-slate-400 block mb-1">Spatial Distribution</label>
            <select
              value={config.spatialDistribution}
              onChange={(e) => setConfig({ ...config, spatialDistribution: e.target.value as any })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:border-cyan-400 focus:outline-none"
            >
              <option value="UNIFORM_AREA">Uniform Area (2π r dr)</option>
              <option value="UNIFORM_DISTANCE">Uniform Distance (dr)</option>
              <option value="CELL_EDGE_CLUSTERED">Cell-Edge Clustered (Stress)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Navigation Sub-Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveSubTab('MAP')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
              activeSubTab === 'MAP'
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>2D Spatial Scatter Footprint</span>
          </button>

          <button
            onClick={() => setActiveSubTab('CDF')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
              activeSubTab === 'CDF'
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>CDF Curves (P10/P50/P90)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('HISTOGRAM')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
              activeSubTab === 'HISTOGRAM'
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Statistical Histograms</span>
          </button>

          <button
            onClick={() => setActiveSubTab('TABLE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
              activeSubTab === 'TABLE'
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Trials Dataset Table</span>
          </button>
        </div>

        {/* Filter on Map / Table */}
        {(activeSubTab === 'MAP' || activeSubTab === 'TABLE') && (
          <div className="flex items-center gap-1 text-xs font-mono">
            <span className="text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2 py-1 rounded border text-[11px] ${
                statusFilter === 'ALL'
                  ? 'bg-slate-800 border-slate-600 text-white font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({trials.length})
            </button>
            <button
              onClick={() => setStatusFilter('SATISFIED')}
              className={`px-2 py-1 rounded border text-[11px] flex items-center gap-1 ${
                statusFilter === 'SATISFIED'
                  ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" />
              Satisfied ({summary.satisfiedCount})
            </button>
            <button
              onClick={() => setStatusFilter('MARGINAL')}
              className={`px-2 py-1 rounded border text-[11px] flex items-center gap-1 ${
                statusFilter === 'MARGINAL'
                  ? 'bg-amber-950/80 border-amber-600 text-amber-300 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-amber-300'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-400 inline" />
              Marginal ({summary.marginalCount})
            </button>
            <button
              onClick={() => setStatusFilter('OUTAGE')}
              className={`px-2 py-1 rounded border text-[11px] flex items-center gap-1 ${
                statusFilter === 'OUTAGE'
                  ? 'bg-rose-950/80 border-rose-600 text-rose-300 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-rose-300'
              }`}
            >
              <XCircle className="w-3 h-3 text-rose-400 inline" />
              Outage ({summary.outageCount})
            </button>
          </div>
        )}
      </div>

      {/* 4. SUB-TAB 1: 2D Spatial Scatter Footprint Map */}
      {activeSubTab === 'MAP' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex flex-col lg:flex-row gap-5">
            {/* 2D Polar Vector Map */}
            <div className="flex-1 bg-slate-950 rounded-lg p-3 border border-slate-800 relative flex items-center justify-center min-h-[460px]">
              <svg viewBox="-260 -260 520 520" className="w-full max-w-[500px] aspect-square select-none">
                {/* Background Grid & Polar Rings */}
                <circle cx="0" cy="0" r="230" fill="#0b1329" stroke="#1e293b" strokeWidth="1.5" />
                
                {/* Concentric Cell Range Rings */}
                {/* 25% Range */}
                <circle cx="0" cy="0" r="50" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                <text x="3" y="-53" className="font-mono text-[8px]" fill="#64748b">25% R</text>

                {/* 50% Range */}
                <circle cx="0" cy="0" r="100" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                <text x="3" y="-103" className="font-mono text-[8px]" fill="#64748b">50% R</text>

                {/* 75% Range */}
                <circle cx="0" cy="0" r="150" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                <text x="3" y="-153" className="font-mono text-[8px]" fill="#64748b">75% R</text>

                {/* 100% Cell Edge Target Boundary (R_max) */}
                <circle cx="0" cy="0" r="200" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 2" opacity="0.8" />
                <text x="3" y="-203" className="font-mono font-bold text-[9px]" fill="#38bdf8">
                  R_max: {maxRangeKm >= 1 ? `${maxRangeKm.toFixed(2)} km` : `${result.maxCellRangeMeters} m`}
                </text>

                {/* Azimuth Angle Axes */}
                <line x1="-220" y1="0" x2="220" y2="0" stroke="#1e293b" strokeWidth="1" />
                <line x1="0" y1="-220" x2="0" y2="220" stroke="#1e293b" strokeWidth="1" />
                
                {/* Simulated UEs Scatter Points */}
                {filteredTrials.map((trial) => {
                  // Map trial (xKm, yKm) into SVG scale (radius 200 = maxRangeKm)
                  const scale = 200 / maxRangeKm;
                  const svgX = trial.xKm * scale;
                  const svgY = trial.yKm * scale;

                  const color = trial.status === 'SATISFIED'
                    ? '#10b981' // emerald
                    : trial.status === 'MARGINAL'
                    ? '#f59e0b' // amber
                    : '#f43f5e'; // rose

                  return (
                    <circle
                      key={trial.id}
                      cx={svgX}
                      cy={svgY}
                      r={hoveredTrial?.id === trial.id ? 5.5 : 2.5}
                      fill={color}
                      stroke={hoveredTrial?.id === trial.id ? '#ffffff' : 'none'}
                      strokeWidth={hoveredTrial?.id === trial.id ? 1.5 : 0}
                      opacity={hoveredTrial?.id === trial.id ? 1.0 : 0.85}
                      className="cursor-pointer transition-all hover:scale-150"
                      onMouseEnter={() => setHoveredTrial(trial)}
                    />
                  );
                })}

                {/* Base Station Tower in Center */}
                <circle cx="0" cy="0" r="8" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
                <circle cx="0" cy="0" r="16" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.4" className="animate-ping" />
                <text x="0" y="22" textAnchor="middle" className="font-mono font-bold text-[9px]" fill="#ffffff">
                  {inputs.technology === '4G' ? 'eNB' : inputs.technology === '5G_NSA' ? 'eNB/gNB' : 'gNB'}
                </text>
              </svg>

              {/* Map Floating Legend */}
              <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-800 rounded p-2 text-[10px] font-mono space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span className="text-slate-300">Satisfied ({summary.satisfiedCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span className="text-slate-300">Marginal ({summary.marginalCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                  <span className="text-slate-300">Outage ({summary.outageCount})</span>
                </div>
              </div>
            </div>

            {/* Trial Inspector Card */}
            <div className="w-full lg:w-[320px] bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Trial Realization Inspector</span>
                  </span>
                  {hoveredTrial ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
                      UE #{hoveredTrial.id}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Hover any point</span>
                  )}
                </div>

                {hoveredTrial ? (
                  <div className="space-y-2.5 text-slate-300">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Status:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        hoveredTrial.status === 'SATISFIED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : hoveredTrial.status === 'MARGINAL'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {hoveredTrial.status}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Distance to BS:</span>
                      <span className="font-bold text-white">
                        {hoveredTrial.distanceKm.toFixed(3)} km ({(hoveredTrial.distanceKm * 1000).toFixed(0)}m)
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Relative Range:</span>
                      <span className="text-cyan-300">
                        {(hoveredTrial.normalizedDistance * 100).toFixed(1)}% of R_max
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Environment:</span>
                      <span className={hoveredTrial.isIndoor ? 'text-amber-400' : 'text-emerald-400'}>
                        {hoveredTrial.isIndoor ? 'Indoor (+Pen Loss)' : 'Outdoor LOS/NLOS'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Shadow Fading:</span>
                      <span className={hoveredTrial.shadowFadingDb > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        {hoveredTrial.shadowFadingDb > 0 ? `+${hoveredTrial.shadowFadingDb} dB (Loss)` : `${hoveredTrial.shadowFadingDb} dB (Gain)`}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Received RSRP:</span>
                      <span className="font-bold text-white">{hoveredTrial.rsrpDbm} dBm</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">DL / UL SINR:</span>
                      <span>
                        <span className="text-cyan-300 font-bold">{hoveredTrial.dlSinrDb} dB</span> / <span className="text-emerald-400 font-bold">{hoveredTrial.ulSinrDb} dB</span>
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded border border-slate-800 space-y-1">
                      <div className="flex justify-between text-cyan-300">
                        <span>DL Throughput:</span>
                        <span className="font-bold">{hoveredTrial.dlThroughputMbps} Mbps</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>UL Throughput:</span>
                        <span className="font-bold">{hoveredTrial.ulThroughputMbps} Mbps</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                        <span>Limiting Link:</span>
                        <span>{hoveredTrial.bottleneck === 'UL' ? 'Uplink Limited' : hoveredTrial.bottleneck === 'DL' ? 'Downlink Limited' : 'Balanced'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    <p>Hover over any simulated dot on the 2D cell footprint to inspect its RF propagation realization</p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500">
                Spatial footprint spans up to 1.15× cell radius to evaluate spillover &amp; boundary handover zones.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SUB-TAB 2: CDF Curves (P10/P50/P90) */}
      {activeSubTab === 'CDF' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-2 border-b border-slate-800/80">
            <div>
              <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>Cumulative Distribution Functions (CDF)</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Statistical probability curve P(Metric ≤ x) across the entire cell population
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-400 mr-1">Select Metric:</span>
              <button
                onClick={() => setCdfMetric('THROUGHPUT')}
                className={`px-2.5 py-1 rounded border ${
                  cdfMetric === 'THROUGHPUT'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Throughput (Mbps)
              </button>
              <button
                onClick={() => setCdfMetric('SINR')}
                className={`px-2.5 py-1 rounded border ${
                  cdfMetric === 'SINR'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                SINR (dB)
              </button>
              <button
                onClick={() => setCdfMetric('RSRP')}
                className={`px-2.5 py-1 rounded border ${
                  cdfMetric === 'RSRP'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                RSRP (dBm)
              </button>
            </div>
          </div>

          {/* SVG CDF Chart */}
          <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 relative">
            <svg viewBox="0 0 900 360" className="w-full h-auto select-none">
              {/* Axes & Grid Lines */}
              <line x1="70" y1="300" x2="860" y2="300" stroke="#334155" strokeWidth="1.5" />
              <line x1="70" y1="30" x2="70" y2="300" stroke="#334155" strokeWidth="1.5" />

              {/* Y-axis percentiles (0%, 25%, 50%, 75%, 100%) */}
              {[0, 25, 50, 75, 100].map(pct => {
                const y = 300 - (pct / 100) * 260;
                return (
                  <g key={pct}>
                    <line x1="70" y1={y} x2="860" y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                    <text x="60" y={y + 4} textAnchor="end" className="font-mono text-[10px]" fill="#64748b">
                      {pct}%
                    </text>
                  </g>
                );
              })}

              {/* Render Throughput CDF */}
              {cdfMetric === 'THROUGHPUT' && (() => {
                const maxThr = Math.max(summary.dlThroughput.max, summary.ulThroughput.max, 50);
                const getX = (val: number) => 70 + (Math.max(0, val) / maxThr) * 780;
                const getY = (p: number) => 300 - (p / 100) * 260;

                const dlPath = summary.cdfThroughput
                  .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.dlThr)} ${getY(pt.percentile)}`)
                  .join(' ');

                const ulPath = summary.cdfThroughput
                  .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.ulThr)} ${getY(pt.percentile)}`)
                  .join(' ');

                return (
                  <>
                    <path d={dlPath} fill="none" stroke="#38bdf8" strokeWidth="3" />
                    <path d={ulPath} fill="none" stroke="#10b981" strokeWidth="3" />

                    {/* Reference Line for P10 (Cell Edge) */}
                    <line x1={getX(summary.dlThroughput.p10)} y1="30" x2={getX(summary.dlThroughput.p10)} y2="300" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" />
                    <text x={getX(summary.dlThroughput.p10)} y="24" textAnchor="middle" className="font-mono text-[9px]" fill="#f59e0b">
                      P10 Edge: {summary.dlThroughput.p10}M
                    </text>

                    {/* Reference Line for P50 (Median) */}
                    <line x1={getX(summary.dlThroughput.p50)} y1="30" x2={getX(summary.dlThroughput.p50)} y2="300" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2 2" />
                    <text x={getX(summary.dlThroughput.p50)} y="24" textAnchor="middle" className="font-mono text-[9px]" fill="#38bdf8">
                      P50: {summary.dlThroughput.p50}M
                    </text>
                  </>
                );
              })()}

              {/* Render SINR CDF */}
              {cdfMetric === 'SINR' && (() => {
                const minS = -10;
                const maxS = 30;
                const getX = (val: number) => 70 + ((val - minS) / (maxS - minS)) * 780;
                const getY = (p: number) => 300 - (p / 100) * 260;

                const dlPath = summary.cdfSinr
                  .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.dlSinr)} ${getY(pt.percentile)}`)
                  .join(' ');

                const ulPath = summary.cdfSinr
                  .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.ulSinr)} ${getY(pt.percentile)}`)
                  .join(' ');

                return (
                  <>
                    <path d={dlPath} fill="none" stroke="#38bdf8" strokeWidth="3" />
                    <path d={ulPath} fill="none" stroke="#10b981" strokeWidth="3" />
                  </>
                );
              })()}

              {/* Render RSRP CDF */}
              {cdfMetric === 'RSRP' && (() => {
                const minR = -135;
                const maxR = -55;
                const getX = (val: number) => 70 + ((val - minR) / (maxR - minR)) * 780;
                const getY = (p: number) => 300 - (p / 100) * 260;

                const rsrpPath = summary.cdfRsrp
                  .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.rsrp)} ${getY(pt.percentile)}`)
                  .join(' ');

                return (
                  <>
                    <path d={rsrpPath} fill="none" stroke="#a855f7" strokeWidth="3" />
                    <line x1={getX(result.ueRxSensitivityDbm)} y1="30" x2={getX(result.ueRxSensitivityDbm)} y2="300" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 3" />
                    <text x={getX(result.ueRxSensitivityDbm)} y="24" textAnchor="middle" className="font-mono text-[9px]" fill="#f43f5e">
                      Sens: {result.ueRxSensitivityDbm.toFixed(1)} dBm
                    </text>
                  </>
                );
              })()}
            </svg>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-3 text-xs font-mono text-slate-300">
              {cdfMetric === 'THROUGHPUT' && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-1 bg-cyan-400 inline-block rounded"></span>
                    <span>Downlink (DL) Throughput</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-1 bg-emerald-400 inline-block rounded"></span>
                    <span>Uplink (UL) Throughput</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-3 h-0.5 border-t border-dashed border-amber-400 inline-block"></span>
                    <span>P10 Cell-Edge Threshold</span>
                  </span>
                </>
              )}
              {cdfMetric === 'SINR' && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-1 bg-cyan-400 inline-block rounded"></span>
                    <span>Downlink SINR</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-1 bg-emerald-400 inline-block rounded"></span>
                    <span>Uplink SINR</span>
                  </span>
                </>
              )}
              {cdfMetric === 'RSRP' && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-1 bg-purple-400 inline-block rounded"></span>
                    <span>Received SS-RSRP</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-3 h-0.5 border-t border-dashed border-rose-400 inline-block"></span>
                    <span>UE Sensitivity Cutoff</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. SUB-TAB 3: Statistical Histograms */}
      {activeSubTab === 'HISTOGRAM' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Histogram 1: RSRP Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
            <h4 className="text-xs font-mono font-bold text-white mb-1">
              RSRP Signal Distribution Across Cell Area
            </h4>
            <p className="text-[11px] text-slate-400 font-mono mb-3">
              Distribution of received signal power vs UE receiver sensitivity limit
            </p>
            <div className="space-y-1.5 font-mono text-xs">
              {summary.rsrpHistogram.map((bin, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-24 text-[10px] text-slate-400 tabular-nums truncate">
                    {bin.binStart} to {bin.binEnd} dBm
                  </span>
                  <div className="flex-1 bg-slate-950 rounded h-4 overflow-hidden border border-slate-800/80">
                    <div
                      className={`h-full rounded transition-all ${
                        bin.binStart < result.ueRxSensitivityDbm ? 'bg-rose-500/80' : 'bg-cyan-500/80'
                      }`}
                      style={{ width: `${Math.min(100, bin.percentage * 3.5)}%` }}
                    />
                  </div>
                  <span className="w-14 text-[10px] text-right text-slate-300 tabular-nums">
                    {bin.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Histogram 2: Path Loss Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
            <h4 className="text-xs font-mono font-bold text-white mb-1">
              Total Path Loss Distribution (Including Shadowing)
            </h4>
            <p className="text-[11px] text-slate-400 font-mono mb-3">
              Total path loss vs System MAPL limit ({result.systemMaplDb.toFixed(1)} dB)
            </p>
            <div className="space-y-1.5 font-mono text-xs">
              {summary.pathLossHistogram.map((bin, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-24 text-[10px] text-slate-400 tabular-nums truncate">
                    {bin.binStart} to {bin.binEnd} dB
                  </span>
                  <div className="flex-1 bg-slate-950 rounded h-4 overflow-hidden border border-slate-800/80">
                    <div
                      className={`h-full rounded transition-all ${
                        bin.binEnd > result.systemMaplDb ? 'bg-amber-500/80' : 'bg-emerald-500/80'
                      }`}
                      style={{ width: `${Math.min(100, bin.percentage * 3.5)}%` }}
                    />
                  </div>
                  <span className="w-14 text-[10px] text-right text-slate-300 tabular-nums">
                    {bin.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. SUB-TAB 4: Trials Dataset Table */}
      {activeSubTab === 'TABLE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div>
              <h4 className="text-xs font-mono font-bold text-white">
                Simulated Trials Sample Log (Showing {filteredTrials.length} realizations)
              </h4>
              <p className="text-[11px] text-slate-400 font-mono">
                Individual simulated user coordinates, stochastic variables, and achieved throughputs
              </p>
            </div>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono bg-cyan-950 border border-cyan-800 text-cyan-300 hover:bg-cyan-900"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Full CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[460px] overflow-y-auto rounded border border-slate-800">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Trial</th>
                  <th className="p-2.5">Dist (km)</th>
                  <th className="p-2.5">Env</th>
                  <th className="p-2.5">Shadow (dB)</th>
                  <th className="p-2.5">PL DL (dB)</th>
                  <th className="p-2.5">RSRP (dBm)</th>
                  <th className="p-2.5">DL SINR</th>
                  <th className="p-2.5">UL SINR</th>
                  <th className="p-2.5">DL Thrpt</th>
                  <th className="p-2.5">UL Thrpt</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 text-slate-300">
                {filteredTrials.slice(0, 100).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/70 transition-colors">
                    <td className="p-2.5 text-slate-400">#{t.id}</td>
                    <td className="p-2.5 tabular-nums font-semibold text-white">{t.distanceKm.toFixed(3)}</td>
                    <td className="p-2.5">
                      <span className={`text-[10px] px-1 py-0.2 rounded ${t.isIndoor ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60' : 'bg-slate-800 text-slate-300'}`}>
                        {t.isIndoor ? 'Indoor' : 'Outdoor'}
                      </span>
                    </td>
                    <td className={`p-2.5 tabular-nums ${t.shadowFadingDb > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {t.shadowFadingDb > 0 ? `+${t.shadowFadingDb}` : t.shadowFadingDb}
                    </td>
                    <td className="p-2.5 tabular-nums text-slate-300">{t.totalDlPathLossDb}</td>
                    <td className="p-2.5 tabular-nums text-purple-300 font-semibold">{t.rsrpDbm}</td>
                    <td className="p-2.5 tabular-nums text-cyan-300">{t.dlSinrDb} dB</td>
                    <td className="p-2.5 tabular-nums text-emerald-400">{t.ulSinrDb} dB</td>
                    <td className="p-2.5 tabular-nums font-bold text-cyan-300">{t.dlThroughputMbps} Mbps</td>
                    <td className="p-2.5 tabular-nums font-bold text-emerald-300">{t.ulThroughputMbps} Mbps</td>
                    <td className="p-2.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        t.status === 'SATISFIED'
                          ? 'bg-emerald-950 text-emerald-300'
                          : t.status === 'MARGINAL'
                          ? 'bg-amber-950 text-amber-300'
                          : 'bg-rose-950 text-rose-300'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTrials.length > 100 && (
            <p className="text-[10px] text-slate-500 font-mono mt-2 text-right">
              Showing first 100 trials of {filteredTrials.length}. Click "Export Full CSV" to analyze complete dataset.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
