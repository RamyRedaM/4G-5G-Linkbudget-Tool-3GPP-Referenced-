import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PathLossDiagnosticsPanel } from './PathLossDiagnosticsPanel';
import { LinkBudgetCalculationResult, LinkBudgetInputs } from '../types/telecom';
import {
  UeClassConfig,
  BinConfig,
  TrafficProfile,
  SimulationSettings,
  MonteCarloDashboardResults,
  UnitTestItem,
  AssumptionItem,
  ServiceType,
  BinPlacementMethod,
  SimulatedUserRecord
} from '../types/monteCarlo';
import {
  generateBins,
  executeMonteCarloSimulation,
  executeSelfTests,
  getAssumptionsCatalog,
  DEFAULT_SERVICE_CATALOGUE,
  DEFAULT_TRAFFIC_PROFILES,
  DEFAULT_UE_CLASSES
} from '../utils/monteCarloEngine';
import {
  exportMonteCarloResultsCsv,
  exportPrintableReportHtml,
  generatePrintableReportHtml,
  printReportDirectly,
  downloadReportHtml
} from '../utils/monteCarloStandaloneExport';
import {
  Dices,
  RefreshCw,
  Download,
  Upload,
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
  ShieldAlert,
  Play,
  Square,
  FileText,
  HelpCircle,
  PieChart,
  Check,
  Zap,
  Target,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Printer,
  ExternalLink
} from 'lucide-react';

interface MonteCarloAnalysisProps {
  result: LinkBudgetCalculationResult;
  inputs: LinkBudgetInputs;
}

export const MonteCarloAnalysis: React.FC<MonteCarloAnalysisProps> = ({ result, inputs: lkbInputs }) => {
  // Main Tab Navigation
  const [activeTab, setActiveTab] = useState<'TAB1_SCENARIO' | 'TAB2_BINS' | 'TAB3_TRAFFIC' | 'TAB4_SETTINGS' | 'TAB5_RESULTS'>('TAB1_SCENARIO');
  
  // Extra Modals / Views
  const [showUnitTests, setShowUnitTests] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPathLossDiagnostics, setShowPathLossDiagnostics] = useState(false);
  const [assumptionsTab, setAssumptionsTab] = useState<'AUTO' | '5G' | '4G' | 'ALL'>('AUTO');
  const [unitTestResults, setUnitTestResults] = useState<UnitTestItem[] | null>(null);

  // Tab 1: Scenario Configuration (Reusing LKB values with mix of UEs)
  const [scenarioInputs, setScenarioInputs] = useState<LinkBudgetInputs>({ ...lkbInputs });
  const [ueClasses, setUeClasses] = useState<UeClassConfig[]>(DEFAULT_UE_CLASSES);

  // Tab 2: Bins & Users
  const [numBins, setNumBins] = useState<number>(5);
  const [binMethod, setBinMethod] = useState<BinPlacementMethod>('UNIFORM_DISTANCE');
  const [totalUsers, setTotalUsers] = useState<number>(60);
  const [baseIndoorPercent, setBaseIndoorPercent] = useState<number>(40);
  const [bins, setBins] = useState<BinConfig[]>(() =>
    generateBins(5, result.maxCellRangeMeters || 1000, 'UNIFORM_DISTANCE', 60, 40, lkbInputs)
  );

  // Tab 3: Traffic Profiles & Service Catalogue
  const [serviceCatalogue, setServiceCatalogue] = useState(DEFAULT_SERVICE_CATALOGUE);
  const [trafficProfiles, setTrafficProfiles] = useState<TrafficProfile[]>(DEFAULT_TRAFFIC_PROFILES);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('CONSUMER_HEAVY');

  // Tab 4: Simulation Settings
  const [settings, setSettings] = useState<SimulationSettings>({
    iterations: 2000,
    seed: 101,
    earlyConvergenceStop: true,
    scheduler: 'PROPORTIONAL_FAIR',
    gbrFirstPriority: true,
    prbReservationPercent: 10,
    linkAbstraction: 'CQI_MCS_LOOKUP',
    shannonAlpha: 0.65,
    shannonMaxSe: 7.4,
    rankAdaptationThresholdsDb: [5.0, 11.0, 17.0],
    runCapacitySearch: true,
    targetSatisfactionPercent: 95,
    targetVoiceSatisfactionPercent: 98,
    runCellRangeSearch: true,
    rangeSearchDensityBasis: 'CONSTANT_USER_DENSITY'
  });

  // Simulation Running State
  const [isSimulating, setIsSimulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentIter, setCurrentIter] = useState(0);
  const cancelRef = useRef(false);

  // Tab 5: Simulation Results
  const [dashboardResults, setDashboardResults] = useState<MonteCarloDashboardResults | null>(null);
  const [hoveredUser, setHoveredUser] = useState<SimulatedUserRecord | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedUserFilter, setSelectedUserFilter] = useState<'ALL' | 'SATISFIED' | 'CONGESTION' | 'OUTAGE' | 'INDOOR'>('ALL');
  const [showBinRings, setShowBinRings] = useState<boolean>(true);

  // Polar Map Zoom and Pan State
  const [mapZoom, setMapZoom] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    setMapZoom(prev => Math.min(3.5, Number((prev + 0.25).toFixed(2))));
  };

  const handleZoomOut = () => {
    setMapZoom(prev => {
      const next = Math.max(0.6, Number((prev - 0.25).toFixed(2)));
      if (next <= 1.0) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setMapZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // Sync Bins when Range or Method Changes
  const handleRegenerateBins = (n: number, m: BinPlacementMethod, uTot: number, ind: number, propInputs: LinkBudgetInputs = scenarioInputs) => {
    const validN = Math.max(1, Math.min(20, Math.round(n)));
    const validTot = Math.max(1, Math.min(3000, Math.round(uTot)));
    const newBins = generateBins(validN, result.maxCellRangeMeters || 1000, m, validTot, ind, propInputs);
    setBins(newBins);
  };

  // Variable user distribution strategies across bins
  const handleDistributeUsersByProfile = (pattern: 'EQUAL' | 'BY_AREA' | 'CENTER_HEAVY' | 'EDGE_HEAVY', customTot?: number) => {
    if (bins.length === 0) return;
    const n = bins.length;
    const targetTotal = customTot !== undefined ? customTot : totalUsers;
    let distributed: number[] = [];

    if (pattern === 'EQUAL') {
      const base = Math.floor(targetTotal / n);
      const rem = targetTotal % n;
      distributed = bins.map((_, i) => base + (i < rem ? 1 : 0));
    } else if (pattern === 'BY_AREA') {
      const totalArea = bins.reduce((acc, b) => acc + b.areaKm2, 0) || 1;
      let allocated = 0;
      distributed = bins.map((b, i) => {
        if (i === n - 1) {
          return Math.max(0, targetTotal - allocated);
        }
        const cnt = Math.round((b.areaKm2 / totalArea) * targetTotal);
        allocated += cnt;
        return cnt;
      });
    } else if (pattern === 'CENTER_HEAVY') {
      const weights = bins.map((_, i) => n - i);
      const sumW = weights.reduce((a, b) => a + b, 0);
      let allocated = 0;
      distributed = bins.map((_, i) => {
        if (i === n - 1) {
          return Math.max(0, targetTotal - allocated);
        }
        const cnt = Math.round((weights[i] / sumW) * targetTotal);
        allocated += cnt;
        return cnt;
      });
    } else {
      const weights = bins.map((_, i) => i + 1);
      const sumW = weights.reduce((a, b) => a + b, 0);
      let allocated = 0;
      distributed = bins.map((_, i) => {
        if (i === n - 1) {
          return Math.max(0, targetTotal - allocated);
        }
        const cnt = Math.round((weights[i] / sumW) * targetTotal);
        allocated += cnt;
        return cnt;
      });
    }

    setBins(prev => prev.map((b, idx) => ({ ...b, userCount: distributed[idx] })));
    setTotalUsers(targetTotal);
  };

  // Sync when LKB range changes
  useEffect(() => {
    if (!dashboardResults) {
      handleRegenerateBins(numBins, binMethod, totalUsers, baseIndoorPercent);
    }
  }, [result.maxCellRangeMeters]);

  // Run Initial Simulation on Mount if none
  useEffect(() => {
    if (!dashboardResults) {
      const initRes = executeMonteCarloSimulation(
        scenarioInputs,
        result,
        bins,
        ueClasses,
        trafficProfiles,
        serviceCatalogue,
        { ...settings, iterations: 600 }
      );
      setDashboardResults(initRes);
    }
  }, []);

  // Run Simulation Handler with Async Non-blocking Chunking
  const handleStartSimulation = () => {
    setIsSimulating(true);
    setProgress(0);
    setCurrentIter(0);
    cancelRef.current = false;

    // Use requestAnimationFrame / setTimeout chunking
    setTimeout(() => {
      try {
        const simRes = executeMonteCarloSimulation(
          scenarioInputs,
          result,
          bins,
          ueClasses,
          trafficProfiles,
          serviceCatalogue,
          settings,
          (prog, iter, tot) => {
            setProgress(prog);
            setCurrentIter(iter);
          },
          () => cancelRef.current
        );

        if (!cancelRef.current) {
          setDashboardResults(simRes);
          setActiveTab('TAB5_RESULTS');
        }
      } catch (err) {
        console.error('Simulation error', err);
      } finally {
        setIsSimulating(false);
      }
    }, 40);
  };

  const handleCancelSimulation = () => {
    cancelRef.current = true;
    setIsSimulating(false);
  };

  // Sync with active Link Budget (LKB) Tool
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleImportFromLkb = () => {
    setScenarioInputs({ ...lkbInputs });
    handleRegenerateBins(numBins, binMethod, totalUsers, baseIndoorPercent, lkbInputs);
    const techLabel = lkbInputs.technology === '4G' ? '4G LTE' : lkbInputs.technology === '5G_NSA' ? '5G NSA' : '5G NR SA';
    setSyncFeedback(`Synchronized with LKB (${techLabel} · Band ${lkbInputs.band} · ${lkbInputs.bandwidthMHz} MHz · MAPL ${result.systemMaplDb.toFixed(1)} dB · Range ${result.maxCellRangeKm.toFixed(2)} km)`);
    setTimeout(() => {
      setSyncFeedback(null);
    }, 4500);
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!dashboardResults) return;
    const csvStr = exportMonteCarloResultsCsv(dashboardResults, scenarioInputs);
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monte_carlo_results_${scenarioInputs.technology}_${scenarioInputs.band}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Self Tests Handler
  const handleRunSelfTests = () => {
    const tests = executeSelfTests(scenarioInputs);
    setUnitTestResults(tests);
    setShowUnitTests(true);
  };

  // Active Technology Check
  const is5G = scenarioInputs.technology !== '4G';
  const assumptionsList = useMemo(() => {
    const targetTech = assumptionsTab === 'AUTO' ? scenarioInputs.technology : assumptionsTab === '5G' ? '5G_SA' : assumptionsTab === '4G' ? '4G' : scenarioInputs.technology;
    return getAssumptionsCatalog(targetTech);
  }, [assumptionsTab, scenarioInputs.technology]);

  // Validation: Check valid SCS & Bandwidth combinations per 3GPP TS 38.101-1 Table 5.3.5-1
  const validationError = useMemo(() => {
    if (is5G) {
      if (scenarioInputs.bandwidthMHz === 100 && scenarioInputs.subcarrierSpacingKhz === 15) {
        return 'Invalid 3GPP configuration: 100 MHz channel bandwidth requires 30 kHz or 60 kHz SCS in FR1 (TS 38.101-1 Table 5.3.5-1).';
      }
      if (scenarioInputs.bandwidthMHz < 10 && scenarioInputs.subcarrierSpacingKhz === 60) {
        return 'Invalid 3GPP configuration: 60 kHz SCS requires >= 10 MHz channel bandwidth in FR1.';
      }
    }
    return null;
  }, [is5G, scenarioInputs.bandwidthMHz, scenarioInputs.subcarrierSpacingKhz]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-6 text-slate-100 font-sans">
      {/* ==================================================== */}
      {/* 1. Header Toolbar & Action Controls */}
      {/* ==================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 rounded-xl text-cyan-400 shadow-inner">
              <Dices className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-mono tracking-tight text-white">
                  Monte Carlo Stochastic Analysis Engine
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-cyan-950/80 border border-cyan-800 text-cyan-300">
                  3GPP TR 38.901 / ITU-R M.2412
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Stochastic spatial dropping, user density binning, GBR-first scheduling & multi-service satisfaction
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <button
            onClick={handleImportFromLkb}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 border border-cyan-600/70 text-cyan-200 font-semibold transition-all shadow-md shadow-cyan-950/60 cursor-pointer active:scale-95"
            title="Synchronize all radio, carrier, power and propagation parameters directly from active Link Budget (LKB) Tool"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sync with LKB</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={!dashboardResults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors cursor-pointer disabled:opacity-40"
            title="Export results to CSV"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            disabled={!dashboardResults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors cursor-pointer disabled:opacity-40"
            title="Generate and print publication-grade PDF report (Includes KPI Dashboard, Polar Map & CDF Charts)"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-400" />
            <span>Report (PDF)</span>
          </button>

          <button
            onClick={handleRunSelfTests}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 transition-colors cursor-pointer"
            title="Run 3GPP unit self-tests (Peak formula, PRB lookup, Path loss, Erlang-B)"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Self Tests</span>
          </button>

          <button
            onClick={() => setShowAssumptions(!showAssumptions)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 transition-colors cursor-pointer"
            title="View separated 4G and 5G engineering assumptions with 3GPP citations"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Assumptions</span>
          </button>
        </div>
      </div>

      {/* Synchronization Feedback Banner */}
      {syncFeedback && (
        <div className="bg-cyan-950/70 border border-cyan-700/80 p-3 rounded-xl flex items-center justify-between gap-2.5 text-cyan-200 text-xs font-mono shadow-md shadow-cyan-950/40 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-slate-400 hover:text-slate-200 text-[11px] px-1.5 py-0.5 rounded border border-slate-700 hover:border-slate-500 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Validation Warning Bar */}
      {validationError && (
        <div className="bg-rose-950/80 border border-rose-800 p-3 rounded-xl flex items-center gap-2.5 text-rose-200 text-xs font-mono animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. Primary 5-Tab Workflow Bar */}
      {/* ==================================================== */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800 text-xs font-mono">
        {[
          { id: 'TAB1_SCENARIO', label: '1. Technology Scenario', icon: Radio },
          { id: 'TAB2_BINS', label: '2. Bins & Users', icon: MapPin },
          { id: 'TAB3_TRAFFIC', label: '3. Traffic Profiles', icon: Activity },
          { id: 'TAB4_SETTINGS', label: '4. Simulation Settings', icon: Sliders },
          { id: 'TAB5_RESULTS', label: '5. Results Dashboard', icon: BarChart3 }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/50 font-bold'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800/80'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================== */}
      {/* 3. Tab Contents */}
      {/* ==================================================== */}

      {/* ---------------------------------------------------- */}
      {/* TAB 1: TECHNOLOGY SCENARIO */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'TAB1_SCENARIO' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            {/* Carrier Parameters */}
            <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-cyan-300 uppercase">Radio / Carrier</span>
                <span className="text-[10px] text-slate-500">From LKB</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 block">Technology:</label>
                <select
                  value={scenarioInputs.technology}
                  onChange={(e) => setScenarioInputs(prev => ({ ...prev, technology: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                >
                  <option value="5G_SA">5G NR Standalone (SA)</option>
                  <option value="5G_NSA">5G NR Non-Standalone (NSA)</option>
                  <option value="4G">4G LTE</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 block">Band:</label>
                <input
                  type="text"
                  value={scenarioInputs.band}
                  onChange={(e) => setScenarioInputs(prev => ({ ...prev, band: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block">BW (MHz):</label>
                  <input
                    type="number"
                    value={scenarioInputs.bandwidthMHz}
                    onChange={(e) => setScenarioInputs(prev => ({ ...prev, bandwidthMHz: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">SCS (kHz):</label>
                  <select
                    value={scenarioInputs.subcarrierSpacingKhz ?? (is5G ? 30 : 15)}
                    onChange={(e) => setScenarioInputs(prev => ({ ...prev, subcarrierSpacingKhz: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                  >
                    <option value={15}>15 kHz (FR1)</option>
                    <option value={30}>30 kHz (FR1)</option>
                    <option value={60}>60 kHz (FR1/FR2)</option>
                    <option value={120}>120 kHz (FR2)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 block">Duplex & TDD Pattern:</label>
                <div className="text-slate-300 text-xs bg-slate-950 p-1.5 rounded border border-slate-800">
                  {scenarioInputs.duplexMode} · {scenarioInputs.tddFrameRatio}
                </div>
              </div>
            </div>

            {/* Base Station (gNB/eNB) */}
            <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-cyan-300 uppercase">{is5G ? 'gNodeB' : 'eNodeB'} Transmitter</span>
                <span className="text-[10px] text-slate-500">From LKB</span>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block">Tx Power (dBm):</label>
                <input
                  type="number"
                  value={scenarioInputs.bsTxPowerDbm}
                  onChange={(e) => setScenarioInputs(prev => ({ ...prev, bsTxPowerDbm: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block">Antenna Gain (dBi):</label>
                <input
                  type="number"
                  value={scenarioInputs.bsAntennaGainDbi}
                  onChange={(e) => setScenarioInputs(prev => ({ ...prev, bsAntennaGainDbi: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block">Antenna Height (m):</label>
                <input
                  type="number"
                  value={scenarioInputs.bsHeightMeters}
                  onChange={(e) => setScenarioInputs(prev => ({ ...prev, bsHeightMeters: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block">MIMO Configuration:</label>
                <input
                  type="text"
                  value={scenarioInputs.mimoMode}
                  readOnly
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-400"
                />
              </div>
            </div>

            {/* Propagation & Environment */}
            <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-cyan-300 uppercase">Channel Propagation</span>
                <span className="text-[10px] text-slate-500">3GPP TR 38.901</span>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block">Model & Clutter:</label>
                <div className="text-slate-300 text-xs bg-slate-950 p-1.5 rounded border border-slate-800">
                  {scenarioInputs.propagationModel} ({scenarioInputs.environmentClutter})
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block">Shadow Fading Std Dev (σ_SF):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    value={scenarioInputs.shadowFadingStdDevDb}
                    onChange={(e) => setScenarioInputs(prev => ({ ...prev, shadowFadingStdDevDb: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                  />
                  <span className="text-slate-400">dB</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block">Outdoor-to-Indoor Loss:</label>
                <span className="text-xs text-slate-300">12 - 18 dB (Concrete/Glass)</span>
                <span className="text-[9px] text-amber-400 block font-mono">Assumption</span>
              </div>
            </div>

            {/* Technology Assumptions Badge */}
            <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-amber-400 uppercase">Technology Assumptions</span>
                <span className="text-[10px] text-amber-300 px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800">
                  {is5G ? '5G Active' : '4G Active'}
                </span>
              </div>

              {is5G ? (
                <div className="text-[11px] text-slate-300 space-y-1.5">
                  <p>● <strong>Lean Carrier:</strong> 0% continuous CRS. Inter-cell interference scales strictly with user traffic.</p>
                  <p>● <strong>Massive MIMO:</strong> Spatial isolation provides 3.5 - 5.5 dB inter-cell interference attenuation.</p>
                  <p>● <strong>MU-MIMO Leakage:</strong> Non-ideal precoding adds small cross-talk under high loading.</p>
                </div>
              ) : (
                <div className="text-[11px] text-slate-300 space-y-1.5">
                  <p>● <strong>Continuous CRS Floor:</strong> 14.3% continuous RF transmission floor even at 0% traffic.</p>
                  <p>● <strong>Sector Broadcast:</strong> Static 65° azimuth broadcast beam (0 dB spatial isolation).</p>
                  <p>● <strong>SC-FDMA UL:</strong> Fractional path loss power control with f = 0.55 inter-cell coupling.</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowAssumptions(true)}
                className="w-full text-center text-xs text-cyan-400 hover:text-cyan-300 underline pt-1 cursor-pointer"
              >
                Inspect All Technical Assumptions
              </button>
            </div>
          </div>

          {/* User Terminal Mix (Multiple UE Classes) */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-xs font-bold font-mono text-cyan-300 uppercase tracking-wider">
                  User Terminal (UE) Class Mix & Distribution
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Multi-class terminal simulation: Handsets, High-Power UEs (HPUE), and High-Gain CPEs
                </p>
              </div>
              <span className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                ueClasses.reduce((a, b) => a + b.percentage, 0) === 100 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}>
                Total Mix: {ueClasses.reduce((a, b) => a + b.percentage, 0)}%
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-2 px-2">Terminal Class</th>
                    <th className="py-2 px-2">Tx Power (dBm)</th>
                    <th className="py-2 px-2">Antenna Gain (dBi)</th>
                    <th className="py-2 px-2">NF (dB)</th>
                    <th className="py-2 px-2">MIMO Layers (DL / UL)</th>
                    <th className="py-2 px-2">Share Mix (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {ueClasses.map((uc, idx) => (
                    <tr key={uc.id} className="hover:bg-slate-800/30">
                      <td className="py-2 px-2 font-bold text-slate-200">{uc.name}</td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={uc.txPowerDbm}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setUeClasses(prev => prev.map((item, i) => i === idx ? { ...item, txPowerDbm: val } : item));
                          }}
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={uc.antennaGainDbi}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setUeClasses(prev => prev.map((item, i) => i === idx ? { ...item, antennaGainDbi: val } : item));
                          }}
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={uc.noiseFigureDb}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setUeClasses(prev => prev.map((item, i) => i === idx ? { ...item, noiseFigureDb: val } : item));
                          }}
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white"
                        />
                      </td>
                      <td className="py-2 px-2 text-slate-300">
                        {uc.dlMimoLayers} DL / {uc.ulMimoLayers} UL
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={uc.percentage}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(100, Number(e.target.value)));
                              setUeClasses(prev => prev.map((item, i) => i === idx ? { ...item, percentage: val } : item));
                            }}
                            className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-cyan-300 font-bold"
                          />
                          <span>%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: BINS AND USERS */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'TAB2_BINS' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Controls Bar for Binning (CSS Selector 1) */}
          <div className="bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/90 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs font-mono shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 shadow-md">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono text-cyan-300 uppercase tracking-wide">
                    Spatial Binning & User Drop Configuration
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    User-defined concentric distance annuli (1 to 20 bins) · Stochastic user distribution up to 3,000 users/cell
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
                  Cell Radius R = <strong className="text-cyan-300">{result.maxCellRangeKm.toFixed(2)} km</strong> ({result.maxCellRangeMeters} m)
                </span>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold">
                  Current Load: {totalUsers} Users
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Number of Bins (N) */}
              <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">Number of Bins (N):</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={numBins}
                    onChange={(e) => {
                      const n = Math.max(1, Math.min(20, Number(e.target.value) || 1));
                      setNumBins(n);
                      handleRegenerateBins(n, binMethod, totalUsers, baseIndoorPercent);
                    }}
                    className="w-14 bg-slate-900 border border-cyan-500/60 rounded px-1.5 py-0.5 text-center text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={numBins}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setNumBins(n);
                    handleRegenerateBins(n, binMethod, totalUsers, baseIndoorPercent);
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                {/* Quick Presets for Bins */}
                <div className="flex items-center justify-between gap-1 pt-1">
                  {[1, 3, 5, 8, 10, 15, 20].map((bVal) => (
                    <button
                      key={bVal}
                      type="button"
                      onClick={() => {
                        setNumBins(bVal);
                        handleRegenerateBins(bVal, binMethod, totalUsers, baseIndoorPercent);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                        numBins === bVal
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {bVal}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-500 block">
                  ~{Math.round((result.maxCellRangeMeters || 1000) / Math.max(1, numBins))} m width per bin
                </span>
              </div>

              {/* 2. Bin Placement Method */}
              <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 space-y-2">
                <label className="text-slate-300 font-semibold block">Placement Geometry:</label>
                <select
                  value={binMethod}
                  onChange={(e) => {
                    const m = e.target.value as BinPlacementMethod;
                    setBinMethod(m);
                    handleRegenerateBins(numBins, m, totalUsers, baseIndoorPercent);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white cursor-pointer focus:outline-none focus:border-cyan-400"
                >
                  <option value="UNIFORM_DISTANCE">Uniform Distance ((k-1)R/N to kR/N)</option>
                  <option value="EQUAL_AREA">Equal Area (Uniform User Density)</option>
                  <option value="EQUAL_PATHLOSS_STEP">Equal Path Loss Step (dB)</option>
                </select>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {binMethod === 'UNIFORM_DISTANCE' && 'Constant Δr radial rings spanning cell radius'}
                  {binMethod === 'EQUAL_AREA' && 'Equal sector area slices r_k = R·√(k/N)'}
                  {binMethod === 'EQUAL_PATHLOSS_STEP' && 'Even dB path loss increments from MCL to MAPL'}
                </div>
              </div>

              {/* 3. Total Users Dropped (Cell Load up to 3000) */}
              <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">Total Users Dropped:</label>
                  <input
                    type="number"
                    min="1"
                    max="3000"
                    step="1"
                    value={totalUsers}
                    onChange={(e) => {
                      const u = Math.max(1, Math.min(3000, Number(e.target.value) || 1));
                      setTotalUsers(u);
                      handleRegenerateBins(numBins, binMethod, u, baseIndoorPercent);
                    }}
                    className="w-20 bg-slate-900 border border-emerald-500/60 rounded px-1.5 py-0.5 text-center text-xs font-bold text-emerald-300 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <input
                  type="range"
                  min="10"
                  max="3000"
                  step="10"
                  value={totalUsers}
                  onChange={(e) => {
                    const u = Number(e.target.value);
                    setTotalUsers(u);
                    handleRegenerateBins(numBins, binMethod, u, baseIndoorPercent);
                  }}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                {/* Quick Presets for Total Users */}
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  {[
                    { label: '60', val: 60 },
                    { label: '250', val: 250 },
                    { label: '600', val: 600 },
                    { label: '1.2k', val: 1200 },
                    { label: '2k', val: 2000 },
                    { label: '3k', val: 3000 }
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => {
                        setTotalUsers(p.val);
                        handleRegenerateBins(numBins, binMethod, p.val, baseIndoorPercent);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                        totalUsers === p.val
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                      title={`Set Total Users to ${p.val}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-500 block">
                  ~{Math.round(totalUsers / Math.max(1, numBins))} users/bin (Max: 3,000/cell)
                </span>
              </div>

              {/* 4. Base Indoor Probability */}
              <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">Indoor Probability:</label>
                  <span className="text-cyan-300 font-bold">{baseIndoorPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={baseIndoorPercent}
                  onChange={(e) => {
                    const ind = Number(e.target.value);
                    setBaseIndoorPercent(ind);
                    handleRegenerateBins(numBins, binMethod, totalUsers, ind);
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>0% (Outdoor)</span>
                  <span>50%</span>
                  <span>100% (Indoor)</span>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  O2I building penetration loss model
                </span>
              </div>
            </div>

            {/* Quick Auto-Distribute Toolbar */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Auto-Distribute {totalUsers} Users across Bins:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDistributeUsersByProfile('EQUAL')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-md text-[11px] text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                  title="Distribute users equally across all bins"
                >
                  Flat Equal Count
                </button>
                <button
                  type="button"
                  onClick={() => handleDistributeUsersByProfile('BY_AREA')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-md text-[11px] text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                  title="Distribute users proportional to bin area (uniform geographic density)"
                >
                  Equal Area Density
                </button>
                <button
                  type="button"
                  onClick={() => handleDistributeUsersByProfile('CENTER_HEAVY')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-md text-[11px] text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                  title="Concentrate more users near cell center (urban center gradient)"
                >
                  Center-Heavy (Urban Core)
                </button>
                <button
                  type="button"
                  onClick={() => handleDistributeUsersByProfile('EDGE_HEAVY')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-md text-[11px] text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                  title="Concentrate more users near cell edge (stress test / hotspot)"
                >
                  Cell-Edge Hotspot
                </button>
              </div>
            </div>
          </div>

          {/* Per-Bin Configuration & Pre-Simulation Radio Preview Table (CSS Selector 2) */}
          <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold font-mono text-cyan-300 uppercase tracking-wider">
                    Per-Bin Variable Inputs & Pre-Simulation Radio Preview
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 border border-slate-700 text-slate-300">
                    {bins.length} Active Bins
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Enter variable users per each bin (0 to 3,000) · Real-time sum automatically synchronizes with cell load
                </p>
              </div>

              {/* Total User Sum Progress Bar Badge */}
              <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono">
                <span className="text-slate-400 text-[11px]">Sum of All Bins:</span>
                <strong className={`text-sm ${
                  totalUsers > 2500 ? 'text-purple-400' : totalUsers > 1000 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {bins.reduce((acc, b) => acc + b.userCount, 0)}
                </strong>
                <span className="text-slate-500 text-[10px]">/ 3,000 max</span>
                <div className="w-16 bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      totalUsers > 2500 ? 'bg-purple-500' : totalUsers > 1000 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, (bins.reduce((acc, b) => acc + b.userCount, 0) / 3000) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] bg-slate-950/40">
                    <th className="py-2.5 px-3">Bin ID</th>
                    <th className="py-2.5 px-3">Radius Span (m)</th>
                    <th className="py-2.5 px-3">Area (km²)</th>
                    <th className="py-2.5 px-3">
                      <span className="text-cyan-300 font-bold">Users in Bin (Editable)</span>
                    </th>
                    <th className="py-2.5 px-3">Bin Share</th>
                    <th className="py-2.5 px-3">Spatial Density</th>
                    <th className="py-2.5 px-3">Indoor %</th>
                    <th className="py-2.5 px-3">Mean Pathloss</th>
                    <th className="py-2.5 px-3">Exp. RSRP</th>
                    <th className="py-2.5 px-3">Exp. SINR</th>
                    <th className="py-2.5 px-3">Exp. MCS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {bins.map((b, idx) => {
                    const currentSum = bins.reduce((acc, it) => acc + it.userCount, 0);
                    const binSharePercent = currentSum > 0 ? (b.userCount / currentSum) * 100 : 0;
                    const densityPerKm2 = b.areaKm2 > 0 ? b.userCount / b.areaKm2 : 0;

                    return (
                      <tr key={b.binIndex} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-cyan-400">
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                            Bin {b.binIndex}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-200">
                          {b.innerRadiusMeters} – {b.outerRadiusMeters} m
                          <span className="text-[10px] text-slate-500 block">
                            (Δr: {b.outerRadiusMeters - b.innerRadiusMeters} m)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 font-mono">
                          {b.areaKm2.toFixed(3)}
                        </td>
                        {/* Variable User Input: 0 to 3000 */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="3000"
                              step="1"
                              value={b.userCount}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(3000, Number(e.target.value) || 0));
                                setBins(prev => {
                                  const updated = prev.map((item, i) => i === idx ? { ...item, userCount: val } : item);
                                  const newSum = updated.reduce((acc, item) => acc + item.userCount, 0);
                                  setTotalUsers(newSum);
                                  return updated;
                                });
                              }}
                              className="w-20 bg-slate-950 border border-cyan-500/50 hover:border-cyan-400 focus:border-cyan-400 rounded px-2 py-1 text-xs font-bold text-cyan-200 text-center focus:outline-none"
                            />
                            <span className="text-slate-500 text-[10px]">users</span>
                          </div>
                        </td>
                        {/* Bin Share Bar */}
                        <td className="py-2.5 px-3">
                          <div className="w-20 space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>{binSharePercent.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                              <div
                                className="bg-cyan-400 h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, binSharePercent)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        {/* Spatial Density */}
                        <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">
                          {Math.round(densityPerKm2).toLocaleString()} <span className="text-slate-500 text-[10px]">u/km²</span>
                        </td>
                        {/* Indoor % */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={b.indoorProbabilityPercent}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(100, Number(e.target.value)));
                                setBins(prev => prev.map((item, i) => i === idx ? { ...item, indoorProbabilityPercent: val } : item));
                              }}
                              className="w-14 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded px-1.5 py-0.5 text-xs text-white text-center focus:outline-none"
                            />
                            <span className="text-slate-400 text-[11px]">%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{b.meanPathLossDb} dB</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">{b.expectedRsrpDbm} dBm</td>
                        <td className="py-2.5 px-3 text-cyan-300">{b.expectedSinrRangeDb[0]} .. {b.expectedSinrRangeDb[1]} dB</td>
                        <td className="py-2.5 px-3 text-purple-300 font-semibold">MCS {b.expectedDominantMcs}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Table Footer Summary */}
                <tfoot>
                  <tr className="border-t-2 border-slate-700 bg-slate-950/60 font-bold text-slate-200">
                    <td className="py-2.5 px-3 text-cyan-400">Total / Avg</td>
                    <td className="py-2.5 px-3 text-slate-300">
                      0 – {result.maxCellRangeMeters} m
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {bins.reduce((acc, b) => acc + b.areaKm2, 0).toFixed(3)} km²
                    </td>
                    <td className="py-2.5 px-3 text-cyan-300 font-bold text-sm">
                      {bins.reduce((acc, b) => acc + b.userCount, 0)} users
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">100.0%</td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {Math.round(
                        bins.reduce((acc, b) => acc + b.userCount, 0) /
                        Math.max(0.001, bins.reduce((acc, b) => acc + b.areaKm2, 0))
                      ).toLocaleString()} u/km²
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {Math.round(bins.reduce((acc, b) => acc + b.indoorProbabilityPercent, 0) / Math.max(1, bins.length))}%
                    </td>
                    <td colSpan={4} className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                      Ready for Monte Carlo Spatial Drop ({totalUsers} users)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: TRAFFIC PROFILES */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'TAB3_TRAFFIC' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Service Catalogue (All editable and labelled Assumption) */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-xs font-bold font-mono text-cyan-300 uppercase tracking-wider">
                  Service Catalogue (3GPP TS 23.501 5QI Standard QoS Mapping)
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  All service rate targets, activity ratios, and satisfaction criteria are editable engineering assumptions
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-950/80 border border-amber-800 text-amber-300 rounded font-bold">
                Assumption Labelled
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-2 px-2">Service</th>
                    <th className="py-2 px-2">5QI</th>
                    <th className="py-2 px-2">Type</th>
                    <th className="py-2 px-2">DL Target (Mbps)</th>
                    <th className="py-2 px-2">UL Target (Mbps)</th>
                    <th className="py-2 px-2">Erlangs / BH</th>
                    <th className="py-2 px-2">Min SINR (DL/UL)</th>
                    <th className="py-2 px-2">Satisfaction Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {serviceCatalogue.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-800/30">
                      <td className="py-2 px-2">
                        <div className="font-bold text-slate-200">{s.name}</div>
                        <span className="text-[9px] text-amber-400 font-mono">Assumption: {s.assumptionSource}</span>
                      </td>
                      <td className="py-2 px-2 font-bold text-cyan-400">{s.fiveQi}</td>
                      <td className="py-2 px-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          s.isGbr ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {s.isGbr ? 'GBR' : 'Non-GBR'}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.05"
                          value={s.dlTargetRateMbps}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setServiceCatalogue(prev => prev.map((item, i) => i === idx ? { ...item, dlTargetRateMbps: val } : item));
                          }}
                          className="w-18 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.05"
                          value={s.ulTargetRateMbps}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setServiceCatalogue(prev => prev.map((item, i) => i === idx ? { ...item, ulTargetRateMbps: val } : item));
                          }}
                          className="w-18 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.005"
                          value={s.erlangsPerUser}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setServiceCatalogue(prev => prev.map((item, i) => i === idx ? { ...item, erlangsPerUser: val } : item));
                          }}
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white"
                        />
                      </td>
                      <td className="py-2 px-2 text-slate-300">
                        {s.minSinrThresholdDb.dl} / {s.minSinrThresholdDb.ul} dB
                      </td>
                      <td className="py-2 px-2 text-emerald-400 font-bold">
                        {s.satisfactionThresholdPercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Named Traffic Profiles */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold font-mono text-cyan-300 uppercase tracking-wider">
                Select Active Traffic Profile
              </h3>
              <span className="text-[11px] text-slate-400">
                Mix of voice, streaming, gaming, and web browsing
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {trafficProfiles.map(prof => (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => setSelectedProfileId(prof.id)}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedProfileId === prof.id
                      ? 'bg-cyan-950/70 border-cyan-500 shadow-sm shadow-cyan-950 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-xs text-white">{prof.name}</span>
                    {selectedProfileId === prof.id && (
                      <span className="text-[10px] text-cyan-400 font-bold">● Active</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">{prof.description}</p>
                  <div className="text-[10px] text-slate-500 space-y-0.5">
                    {prof.serviceMix.map(sm => (
                      <div key={sm.serviceId} className="flex justify-between">
                        <span>{sm.serviceId.replace('_', ' ')}:</span>
                        <span className="text-slate-300 font-bold">{sm.weight}%</span>
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 4: SIMULATION SETTINGS */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'TAB4_SETTINGS' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
            {/* Iterations & Seed */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-cyan-300 uppercase">Monte Carlo Iterations</span>
                <span className="text-xs font-bold text-cyan-400">{settings.iterations.toLocaleString()} Drops</span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Iterations (500 to 20,000):</label>
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="500"
                  value={settings.iterations}
                  onChange={(e) => setSettings(prev => ({ ...prev, iterations: Number(e.target.value) }))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>500 (Fast)</span>
                  <span>2,000 (Recommended)</span>
                  <span>10,000 (High Precision)</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">PRNG Seed (mulberry32 reproducible):</label>
                <input
                  type="number"
                  value={settings.seed}
                  onChange={(e) => setSettings(prev => ({ ...prev, seed: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-bold"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.earlyConvergenceStop}
                    onChange={(e) => setSettings(prev => ({ ...prev, earlyConvergenceStop: e.target.checked }))}
                    className="accent-cyan-400 rounded"
                  />
                  <span>Early Convergence Stop (95% CI &lt; ±1%)</span>
                </label>
              </div>
            </div>

            {/* Scheduler & QoS */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-cyan-300 uppercase">MAC Scheduler & Priority</span>
                <span className="text-xs text-slate-400">{settings.scheduler}</span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Scheduler Algorithm:</label>
                <select
                  value={settings.scheduler}
                  onChange={(e) => setSettings(prev => ({ ...prev, scheduler: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                >
                  <option value="PROPORTIONAL_FAIR">Proportional Fair (PF - 3GPP Best Practice)</option>
                  <option value="ROUND_ROBIN">Round Robin (Equal Resource Sharing)</option>
                  <option value="MAX_CI">Max C/I (Greedy Spectral Throughput)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Control / GBR PRB Reservation (%):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={settings.prbReservationPercent}
                    onChange={(e) => setSettings(prev => ({ ...prev, prbReservationPercent: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                  />
                  <span>%</span>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.gbrFirstPriority}
                    onChange={(e) => setSettings(prev => ({ ...prev, gbrFirstPriority: e.target.checked }))}
                    className="accent-cyan-400 rounded"
                  />
                  <span>GBR-First Priority (5QI Voice / Video Call First)</span>
                </label>
              </div>
            </div>

            {/* Link Abstraction & Rank Adaptation */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-cyan-300 uppercase">Link Abstraction & Rank</span>
                <span className="text-xs text-slate-400">{settings.linkAbstraction === 'CQI_MCS_LOOKUP' ? 'CQI Table' : 'Shannon'}</span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Link Abstraction Method:</label>
                <select
                  value={settings.linkAbstraction}
                  onChange={(e) => setSettings(prev => ({ ...prev, linkAbstraction: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                >
                  <option value="CQI_MCS_LOOKUP">3GPP TS 38.214 Table 5.2.2.1-2/3 (10% BLER)</option>
                  <option value="ATTENUATED_SHANNON">Attenuated Shannon: α·log2(1+SINR)</option>
                </select>
              </div>

              {settings.linkAbstraction === 'ATTENUATED_SHANNON' && (
                <div>
                  <label className="text-slate-400 block mb-1">Shannon Attenuation Factor (α):</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="0.8"
                    value={settings.shannonAlpha}
                    onChange={(e) => setSettings(prev => ({ ...prev, shannonAlpha: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                  />
                  <span className="text-[9px] text-amber-400 block mt-0.5">Assumption (0.60 to 0.75)</span>
                </div>
              )}

              <div>
                <label className="text-slate-400 block mb-1">Rank Adaptation Thresholds (R2 / R3 / R4):</label>
                <div className="grid grid-cols-3 gap-1">
                  <input
                    type="number"
                    value={settings.rankAdaptationThresholdsDb[0]}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSettings(prev => ({ ...prev, rankAdaptationThresholdsDb: [val, prev.rankAdaptationThresholdsDb[1], prev.rankAdaptationThresholdsDb[2]] }));
                    }}
                    className="bg-slate-950 border border-slate-700 rounded p-1 text-center text-xs"
                    placeholder="R2"
                  />
                  <input
                    type="number"
                    value={settings.rankAdaptationThresholdsDb[1]}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSettings(prev => ({ ...prev, rankAdaptationThresholdsDb: [prev.rankAdaptationThresholdsDb[0], val, prev.rankAdaptationThresholdsDb[2]] }));
                    }}
                    className="bg-slate-950 border border-slate-700 rounded p-1 text-center text-xs"
                    placeholder="R3"
                  />
                  <input
                    type="number"
                    value={settings.rankAdaptationThresholdsDb[2]}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSettings(prev => ({ ...prev, rankAdaptationThresholdsDb: [prev.rankAdaptationThresholdsDb[0], prev.rankAdaptationThresholdsDb[1], val] }));
                    }}
                    className="bg-slate-950 border border-slate-700 rounded p-1 text-center text-xs"
                    placeholder="R4"
                  />
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">SINR thresholds in dB for multi-layer transmission</span>
              </div>
            </div>
          </div>

          {/* Launch Simulation Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-cyan-800/60 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-sm font-bold font-mono text-cyan-300 flex items-center justify-center sm:justify-start gap-2">
                <Play className="w-4 h-4 fill-cyan-400 text-cyan-400" />
                Launch 3GPP Stochastic Monte Carlo Run
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Executes {settings.iterations.toLocaleString()} independent spatial drops across {bins.length} radial bins with GBR-first MAC scheduling
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {isSimulating ? (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-mono font-bold text-cyan-400">Running: {progress}%</span>
                    <span className="text-[10px] text-slate-400 font-mono">Drop {currentIter} / {settings.iterations}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelSimulation}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg shadow-rose-950 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Cancel</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleStartSimulation}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl text-xs font-mono font-bold flex items-center gap-2 shadow-lg shadow-cyan-950/50 cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <Dices className="w-4 h-4" />
                  <span>Execute Monte Carlo Engine</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 5: RESULTS DASHBOARD */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'TAB5_RESULTS' && dashboardResults && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Executive Action & Export Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3 sm:p-3.5 rounded-xl font-mono text-xs shadow-lg">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-200 font-bold">Stochastic Simulation Completed</span>
              <span className="text-slate-500">· {dashboardResults.completedIterations.toLocaleString()} Drops · Seed: {dashboardResults.seed}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowPathLossDiagnostics(v => !v)}
                aria-pressed={showPathLossDiagnostics}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                  showPathLossDiagnostics
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
                title="Diagnostic output mode: compare Monte Carlo path loss per bin with the LKB propagation curve"
              >
                <Activity className="w-4 h-4" />
                <span>{showPathLossDiagnostics ? 'Hide' : 'Show'} Path Loss Diagnostics</span>
              </button>

              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-md shadow-cyan-950/50 cursor-pointer"
                title="Generate and print comprehensive PDF executive report"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF Report</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                title="Export results table to CSV"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
            {/* Card 1: Cell Capacity */}
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Cell Capacity</span>
              <div className="text-base sm:text-lg font-bold text-cyan-400">
                {dashboardResults.cellCapacityUsersTotal} <span className="text-xs font-normal text-slate-400">users</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                {dashboardResults.cellCapacityUsersPerKm2} users / km²
              </span>
            </div>

            {/* Card 2: Mean Cell Throughput */}
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Mean Cell DL / UL</span>
              <div className="text-base sm:text-lg font-bold text-emerald-400">
                {dashboardResults.meanCellThroughputDlMbps} <span className="text-xs font-normal text-slate-400">/</span> {dashboardResults.meanCellThroughputUlMbps}
              </div>
              <span className="text-[10px] text-slate-500 block">
                Peak: {dashboardResults.peak38306ThroughputDlMbps} Mbps (38.306)
              </span>
            </div>

            {/* Card 3: Spectral Efficiency */}
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Spectral Efficiency</span>
              <div className="text-base sm:text-lg font-bold text-purple-400">
                {dashboardResults.cellSpectralEfficiencyDl} <span className="text-xs font-normal text-slate-400">bps/Hz</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                UL: {dashboardResults.cellSpectralEfficiencyUl} bps/Hz
              </span>
            </div>

            {/* Card 4: Cell-Edge 5th Percentile */}
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Cell-Edge User (P05)</span>
              <div className="text-base sm:text-lg font-bold text-amber-400">
                {dashboardResults.userThroughput5thPercentileDlMbps} <span className="text-xs font-normal text-slate-400">Mbps</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                Median: {dashboardResults.userThroughputMedianDlMbps} Mbps
              </span>
            </div>

            {/* Card 5: Overall Satisfaction */}
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Overall Satisfaction</span>
              <div className="text-base sm:text-lg font-bold text-cyan-300">
                {dashboardResults.overallSatisfactionPercent}%
              </div>
              <span className="text-[10px] text-slate-500 block">
                Voice: {dashboardResults.voiceSatisfactionPercent}%
              </span>
            </div>

            {/* Card 6: Limiting Factor & Range */}
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Limiting Factor</span>
              <div className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded border inline-block ${
                dashboardResults.limitingFactor === 'UL_COVERAGE' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                dashboardResults.limitingFactor === 'DL_CAPACITY' ? 'bg-rose-950 text-rose-300 border-rose-800' :
                'bg-emerald-950 text-emerald-300 border-emerald-800'
              }`}>
                {dashboardResults.limitingFactor.replace('_', ' ')}
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                Rec. R: {dashboardResults.recommendedCellRangeKm} km
              </span>
            </div>
          </div>

          {/* Per-Bin Performance Table */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold font-mono text-cyan-300 uppercase tracking-wider">
                Per-Bin Statistical Performance & Outage Breakdown
              </h3>
              <span className="text-xs font-mono text-slate-400">
                {dashboardResults.completedIterations.toLocaleString()} Iterations Completed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-2 px-2">Bin</th>
                    <th className="py-2 px-2">Radius (m)</th>
                    <th className="py-2 px-2">Users</th>
                    <th className="py-2 px-2">Satisfied (%)</th>
                    <th className="py-2 px-2">Mean DL SINR</th>
                    <th className="py-2 px-2">MCS</th>
                    <th className="py-2 px-2">Mean Rank</th>
                    <th className="py-2 px-2">Mean DL Rate</th>
                    <th className="py-2 px-2">PRB Util (%)</th>
                    <th className="py-2 px-2">Primary Bottleneck</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {dashboardResults.binResults.map(b => (
                    <tr key={b.binIndex} className="hover:bg-slate-800/30">
                      <td className="py-2 px-2 font-bold text-cyan-400">Bin {b.binIndex}</td>
                      <td className="py-2 px-2 text-slate-200">{b.innerRadiusMeters} – {b.outerRadiusMeters} m</td>
                      <td className="py-2 px-2 text-slate-300">{b.userCount}</td>
                      <td className="py-2 px-2">
                        <span className={`font-bold ${
                          b.satisfactionRatePercent >= 95 ? 'text-emerald-400' : b.satisfactionRatePercent >= 80 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {b.satisfactionRatePercent}%
                        </span>
                      </td>
                      <td className="py-2 px-2 text-slate-300">{b.meanDlSinrDb} dB</td>
                      <td className="py-2 px-2 text-purple-300">MCS {b.dominantMcs}</td>
                      <td className="py-2 px-2 text-slate-300">{b.meanRank}</td>
                      <td className="py-2 px-2 font-bold text-cyan-300">{b.meanDlRateMbps} Mbps</td>
                      <td className="py-2 px-2 text-slate-300">{b.prbUtilizationPercent}%</td>
                      <td className="py-2 px-2">
                        <span className="text-[10px] text-slate-400">
                          {b.violationReasons.outageCount > b.violationReasons.congestionCount
                            ? 'Coverage Outage'
                            : b.violationReasons.congestionCount > 0
                            ? 'PRB Congestion'
                            : b.violationReasons.powerLimitedCount > 0
                            ? 'UL Power Limited'
                            : 'Compliant'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Diagnostic output mode: Monte Carlo path loss vs LKB propagation curve */}
          {showPathLossDiagnostics && dashboardResults.pathLossDiagnostics && (
            <PathLossDiagnosticsPanel
              diagnostics={dashboardResults.pathLossDiagnostics}
            />
          )}

          {/* 1. Top Graphs: CDF and Capacity Curve Side-by-Side (2 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 1: SINR and Throughput CDF */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400"></div>
                  <h4 className="text-xs sm:text-sm font-bold font-mono text-cyan-300 uppercase">
                    Cumulative Distribution Function (CDF)
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">DL User Throughput</span>
              </div>

              <div className="h-56 flex items-end gap-1.5 pt-6 pb-2 border-b border-l border-slate-800 relative bg-slate-950/40 rounded px-2">
                {/* 50% Median Guideline */}
                <div className="absolute inset-x-2 top-1/2 border-b border-slate-700/50 border-dashed pointer-events-none">
                  <span className="text-[9px] text-slate-500 font-mono absolute -top-3.5 right-1">50th Percentile (Median)</span>
                </div>
                {dashboardResults.throughputCdf.map((item, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer">
                    <div
                      style={{ height: `${Math.min(100, Math.max(6, (item.dlRateMbps / (dashboardResults.peak38306ThroughputDlMbps * 0.5)) * 100))}%` }}
                      className="w-full bg-gradient-to-t from-cyan-600/70 to-cyan-400 hover:from-cyan-400 hover:to-cyan-200 rounded-t transition-all shadow-sm"
                    />
                    <span className="text-[8px] text-slate-400 font-mono mt-1.5">{item.percentile}%</span>
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-20 pointer-events-none whitespace-nowrap">
                      <div className="bg-slate-900 border border-cyan-500/60 rounded px-2 py-1 text-[10px] font-mono text-cyan-200 shadow-xl">
                        P{item.percentile}: <strong className="text-white">{item.dlRateMbps} Mbps</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono">
                <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
                  <span className="text-[9px] text-slate-500 block">5TH PERCENTILE (CELL-EDGE)</span>
                  <strong className="text-amber-400">{dashboardResults.userThroughput5thPercentileDlMbps} Mbps</strong>
                </div>
                <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
                  <span className="text-[9px] text-slate-500 block">50TH PERCENTILE (MEDIAN)</span>
                  <strong className="text-cyan-300">{dashboardResults.userThroughputMedianDlMbps} Mbps</strong>
                </div>
                <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
                  <span className="text-[9px] text-slate-500 block">PEAK THEORETICAL (38.306)</span>
                  <strong className="text-emerald-400">{dashboardResults.peak38306ThroughputDlMbps} Mbps</strong>
                </div>
              </div>
            </div>

            {/* Chart 2: Capacity Curve (Users vs Satisfaction) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                  <h4 className="text-xs sm:text-sm font-bold font-mono text-emerald-300 uppercase">
                    Cell Capacity Curve (Load vs % Satisfied)
                  </h4>
                </div>
                <span className="text-[10px] text-emerald-400/90 font-mono font-semibold">Target: ≥95% Target</span>
              </div>

              <div className="h-56 flex items-end gap-2.5 pt-6 pb-2 border-b border-l border-slate-800 relative bg-slate-950/40 rounded px-2">
                {/* 95% Satisfaction Target Line */}
                <div className="absolute inset-x-2 bottom-[95%] border-b border-emerald-500/60 border-dashed pointer-events-none">
                  <span className="text-[9px] text-emerald-400 font-mono absolute -top-3.5 right-1 bg-slate-950/80 px-1 rounded">
                    Target 95% Cutoff
                  </span>
                </div>
                {dashboardResults.capacityCurve.map((c, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer">
                    <div
                      style={{ height: `${c.satisfactionPercent}%` }}
                      className={`w-full rounded-t transition-all shadow-sm ${
                        c.satisfactionPercent >= 95
                          ? 'bg-gradient-to-t from-emerald-600/80 to-emerald-400 hover:from-emerald-400 hover:to-emerald-200'
                          : 'bg-gradient-to-t from-amber-600/80 to-amber-400 hover:from-amber-400 hover:to-amber-200'
                      }`}
                    />
                    <span className="text-[9px] text-slate-400 font-mono mt-1.5">{c.userCount}u</span>

                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-20 pointer-events-none whitespace-nowrap">
                      <div className="bg-slate-900 border border-emerald-500/60 rounded px-2 py-1 text-[10px] font-mono text-emerald-200 shadow-xl">
                        {c.userCount} users: <strong className="text-white">{c.satisfactionPercent}%</strong> satisfied
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono">
                <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
                  <span className="text-[9px] text-slate-500 block">SATISFACTION TARGET</span>
                  <strong className="text-emerald-400">≥ 95% All Users</strong>
                </div>
                <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
                  <span className="text-[9px] text-slate-500 block">MAX CAPACITY (CELL)</span>
                  <strong className="text-cyan-300">{dashboardResults.cellCapacityUsersTotal} users / cell</strong>
                </div>
                <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
                  <span className="text-[9px] text-slate-500 block">AREA CAPACITY</span>
                  <strong className="text-purple-300">{dashboardResults.cellCapacityUsersPerKm2} users / km²</strong>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Polar Sector Drop Map (Enlarged, Clear & Prominent Full-Width Placement Below the 2 Graphs) */}
          {(() => {
            const filteredUsers = dashboardResults.sampleDropUsers.filter(u => {
              if (selectedUserFilter === 'SATISFIED') return u.isSatisfied;
              if (selectedUserFilter === 'CONGESTION') return u.violationReason === 'PRB_CONGESTION';
              if (selectedUserFilter === 'OUTAGE') return u.violationReason === 'OUTAGE_COVERAGE' || u.violationReason === 'UL_POWER_LIMITED';
              if (selectedUserFilter === 'INDOOR') return u.isIndoor;
              return true;
            });

            const satCount = dashboardResults.sampleDropUsers.filter(u => u.isSatisfied).length;
            const congCount = dashboardResults.sampleDropUsers.filter(u => u.violationReason === 'PRB_CONGESTION').length;
            const outCount = dashboardResults.sampleDropUsers.filter(u => u.violationReason === 'OUTAGE_COVERAGE' || u.violationReason === 'UL_POWER_LIMITED').length;
            const indCount = dashboardResults.sampleDropUsers.filter(u => u.isIndoor).length;
            const maxRangeM = result.maxCellRangeMeters || 1000;

            return (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl">
                {/* Header & Controls */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-purple-950/80 border border-purple-800/60 text-purple-300">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm sm:text-base font-bold font-mono text-purple-300 uppercase tracking-tight">
                        Polar Sector Drop Map (Stochastic Spatial Distribution)
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-slate-950 border border-slate-700 text-slate-300">
                        120° Sector Boresight
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Concentric distance annuli per 3GPP TR 38.901 §7.3 · Azimuth range: -60° to +60° · User status and radio topology
                    </p>
                  </div>

                  {/* Filter Pills & Toggle */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <button
                      onClick={() => setSelectedUserFilter('ALL')}
                      className={`px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                        selectedUserFilter === 'ALL'
                          ? 'bg-purple-950 border-purple-600 text-purple-200 font-bold shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      All ({dashboardResults.sampleDropUsers.length})
                    </button>
                    <button
                      onClick={() => setSelectedUserFilter('SATISFIED')}
                      className={`px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                        selectedUserFilter === 'SATISFIED'
                          ? 'bg-emerald-950 border-emerald-600 text-emerald-200 font-bold shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-emerald-400 mr-1">●</span> Satisfied ({satCount})
                    </button>
                    <button
                      onClick={() => setSelectedUserFilter('CONGESTION')}
                      className={`px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                        selectedUserFilter === 'CONGESTION'
                          ? 'bg-amber-950 border-amber-600 text-amber-200 font-bold shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-amber-400 mr-1">●</span> Congestion ({congCount})
                    </button>
                    <button
                      onClick={() => setSelectedUserFilter('OUTAGE')}
                      className={`px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                        selectedUserFilter === 'OUTAGE'
                          ? 'bg-rose-950 border-rose-600 text-rose-200 font-bold shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-rose-400 mr-1">●</span> Outage ({outCount})
                    </button>
                    <button
                      onClick={() => setSelectedUserFilter('INDOOR')}
                      className={`px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                        selectedUserFilter === 'INDOOR'
                          ? 'bg-cyan-950 border-cyan-600 text-cyan-200 font-bold shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Indoor ({indCount})
                    </button>

                    <button
                      onClick={() => setShowBinRings(!showBinRings)}
                      className={`px-2 py-1 rounded-md border text-[11px] transition-colors cursor-pointer ${
                        showBinRings ? 'bg-slate-800 border-slate-600 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                      title="Toggle bin rings labels and alternating shading"
                    >
                      {showBinRings ? 'Hide Bin Rings' : 'Show Bin Rings'}
                    </button>
                  </div>
                </div>

                {/* Main Visual Layout: Map Canvas + Interactive User Inspector Sidebar */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                  {/* Left / Center: High-Clarity Scaled SVG Map Canvas */}
                  <div
                    ref={mapContainerRef}
                    className="xl:col-span-8 bg-slate-950/90 rounded-2xl border border-slate-800/90 p-3 sm:p-4 shadow-inner relative flex flex-col items-center justify-center overflow-hidden"
                  >
                    {/* Floating Map Zoom & Pan Control Toolbar */}
                    <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-2xl font-mono text-xs">
                      <button
                        onClick={handleZoomIn}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white transition-colors cursor-pointer"
                        title="Zoom In (+25%)"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>

                      <span className="px-2 text-[11px] font-bold text-slate-200 select-none min-w-[42px] text-center">
                        {Math.round(mapZoom * 100)}%
                      </span>

                      <button
                        onClick={handleZoomOut}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white transition-colors cursor-pointer"
                        title="Zoom Out (-25%)"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>

                      <button
                        onClick={handleResetZoom}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white transition-colors cursor-pointer"
                        title="Reset Zoom to 100% (1:1)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Zoom & Pan Guidance Hint */}
                    {mapZoom > 1.0 && (
                      <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700 text-[10px] font-mono text-cyan-300 shadow-md pointer-events-none">
                        <span>Zoom {Math.round(mapZoom * 100)}% · Drag to Pan · Scroll to Zoom</span>
                      </div>
                    )}

                    {/* SVG Map Container */}
                    <div
                      className={`w-full h-[480px] sm:h-[540px] flex items-center justify-center select-none ${
                        mapZoom > 1.0 ? (isDraggingMap ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
                      }`}
                      onMouseDown={(e) => {
                        if (e.button === 0 && mapZoom > 1.0) {
                          setIsDraggingMap(true);
                          dragStartRef.current = {
                            x: e.clientX - panOffset.x,
                            y: e.clientY - panOffset.y
                          };
                        }
                      }}
                      onMouseMove={(e) => {
                        if (isDraggingMap) {
                          setPanOffset({
                            x: e.clientX - dragStartRef.current.x,
                            y: e.clientY - dragStartRef.current.y
                          });
                        }
                      }}
                      onMouseUp={() => setIsDraggingMap(false)}
                      onMouseLeave={() => {
                        setIsDraggingMap(false);
                        setHoveredUser(null);
                        setTooltipPos(null);
                      }}
                      onWheel={(e) => {
                        e.preventDefault();
                        if (e.deltaY < 0) {
                          setMapZoom(prev => Math.min(3.5, Number((prev + 0.15).toFixed(2))));
                        } else {
                          setMapZoom(prev => {
                            const next = Math.max(0.6, Number((prev - 0.15).toFixed(2)));
                            if (next <= 1.0) setPanOffset({ x: 0, y: 0 });
                            return next;
                          });
                        }
                      }}
                    >
                      <svg
                        className="w-full h-full select-none"
                        viewBox="-270 -290 540 330"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <defs>
                          {/* Radial Gradient for 120 deg Sector Coverage Area */}
                          <radialGradient id="sectorGlowGrad" cx="0" cy="20" r="260" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.20" />
                            <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.08" />
                            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.02" />
                          </radialGradient>

                          {/* Glow filter for user dots */}
                          <filter id="dotGlow" x="-30%" y="-30%" width="160%" height="160%">
                            <feGaussianBlur stdDeviation="1.5" result="blur" />
                            <feMerge>
                              <feMergeNode in="blur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>

                        {/* Zoomable & Pannable Master Group */}
                        <g
                          transform={`translate(${panOffset.x}, ${panOffset.y}) translate(0, 20) scale(${mapZoom}) translate(0, -20)`}
                          style={{ transition: isDraggingMap ? 'none' : 'transform 0.12s ease-out' }}
                        >
                          {/* 1. Tri-Sector Reference Context (Neighbor Sectors 2 & 3 in faint dotted line) */}
                          <g opacity="0.35">
                            {/* Sector 2 boundary ray (+180 deg, straight down) */}
                            <line x1="0" y1="20" x2="0" y2="100" stroke="#475569" strokeDasharray="3 3" />
                            {/* Sector 3 arc outline */}
                            <circle cx="0" cy="20" r="240" fill="none" stroke="#334155" strokeDasharray="2 4" strokeWidth="0.8" />
                            <text x="-160" y="40" fill="#64748b" fontSize="8" fontFamily="monospace">Neighbor Sector 3</text>
                            <text x="70" y="40" fill="#64748b" fontSize="8" fontFamily="monospace">Neighbor Sector 2</text>
                          </g>

                          {/* 2. Active 120° Sector Polygon Wedge Fill & Outline */}
                          <path
                            d="M 0 20 L -207.85 -100 A 240 240 0 0 1 207.85 -100 Z"
                            fill="url(#sectorGlowGrad)"
                            stroke="#0284c7"
                            strokeWidth="1.6"
                          />

                          {/* 3. Concentric Distance Bins & Shading */}
                          {bins.map((b, bIdx) => {
                            const rOuterSvg = Math.min(240, (b.outerRadiusMeters / maxRangeM) * 240);
                            const rInnerSvg = Math.max(0, (b.innerRadiusMeters / maxRangeM) * 240);
                            const xOuter = rOuterSvg * 0.866025;
                            const yOuter = 20 - rOuterSvg * 0.5;
                            const xInner = rInnerSvg * 0.866025;
                            const yInner = 20 - rInnerSvg * 0.5;

                            return (
                              <g key={b.binIndex}>
                                {/* Alternating Bin Shading Band */}
                                {showBinRings && (
                                  <path
                                    d={`M ${-xInner} ${yInner} A ${rInnerSvg} ${rInnerSvg} 0 0 1 ${xInner} ${yInner} L ${xOuter} ${yOuter} A ${rOuterSvg} ${rOuterSvg} 0 0 0 ${-xOuter} ${yOuter} Z`}
                                    fill={bIdx % 2 === 0 ? 'rgba(6, 182, 212, 0.05)' : 'rgba(59, 130, 246, 0.02)'}
                                  />
                                )}

                                {/* Concentric Arc Ring Edge */}
                                <path
                                  d={`M ${-xOuter} ${yOuter} A ${rOuterSvg} ${rOuterSvg} 0 0 1 ${xOuter} ${yOuter}`}
                                  fill="none"
                                  stroke="#334155"
                                  strokeDasharray="4 3"
                                  strokeWidth="1"
                                />

                                {/* Distance Badge on Boresight Line */}
                                {showBinRings && (
                                  <g>
                                    <rect
                                      x="-28"
                                      y={20 - rOuterSvg - 8}
                                      width="56"
                                      height="12"
                                      rx="2.5"
                                      fill="#020617"
                                      stroke="#334155"
                                      strokeWidth="0.8"
                                    />
                                    <text
                                      x="0"
                                      y={20 - rOuterSvg + 1}
                                      textAnchor="middle"
                                      fill="#38bdf8"
                                      fontSize="7.5"
                                      fontFamily="monospace"
                                      fontWeight="bold"
                                    >
                                      {b.outerRadiusMeters >= 1000
                                        ? `${(b.outerRadiusMeters / 1000).toFixed(2)} km`
                                        : `${Math.round(b.outerRadiusMeters)} m`}
                                    </text>
                                  </g>
                                )}
                              </g>
                            );
                          })}

                          {/* 4. Radial Azimuth Guidelines & Labels */}
                          {/* -60 deg Sector Left Ray */}
                          <line x1="0" y1="20" x2="-207.85" y2="-100" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 2" />
                          <text x="-216" y="-95" textAnchor="end" fill="#7dd3fc" fontSize="8" fontFamily="monospace" fontWeight="bold">
                            -60° (Left Edge)
                          </text>

                          {/* -30 deg Guideline */}
                          <line x1="0" y1="20" x2="-120" y2="-187.8" stroke="#334155" strokeWidth="0.9" strokeDasharray="3 3" />
                          <text x="-124" y="-192" textAnchor="end" fill="#94a3b8" fontSize="7.5" fontFamily="monospace">
                            -30°
                          </text>

                          {/* 0 deg Central Antenna Boresight */}
                          <line x1="0" y1="20" x2="0" y2="-220" stroke="#06b6d4" strokeWidth="1.8" strokeDasharray="6 3" />
                          <polygon points="0,-225 -3.5,-217 3.5,-217" fill="#06b6d4" />
                          <text x="0" y="-233" textAnchor="middle" fill="#22d3ee" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                            0° Boresight (Antenna Peak Beam)
                          </text>

                          {/* +30 deg Guideline */}
                          <line x1="0" y1="20" x2="120" y2="-187.8" stroke="#334155" strokeWidth="0.9" strokeDasharray="3 3" />
                          <text x="124" y="-192" textAnchor="start" fill="#94a3b8" fontSize="7.5" fontFamily="monospace">
                            +30°
                          </text>

                          {/* +60 deg Sector Right Ray */}
                          <line x1="0" y1="20" x2="207.85" y2="-100" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 2" />
                          <text x="216" y="-95" textAnchor="start" fill="#7dd3fc" fontSize="8" fontFamily="monospace" fontWeight="bold">
                            +60° (Right Edge)
                          </text>

                          {/* 5. Base Station (gNB / eNB) Symbol at Origin (0, 20) */}
                          <g>
                            {/* Antenna Tower Base */}
                            <polygon points="0,8 -9,26 9,26" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.2" />
                            {/* Antenna Mast Pin */}
                            <line x1="0" y1="8" x2="0" y2="-2" stroke="#38bdf8" strokeWidth="2" />
                            <circle cx="0" cy="-2" r="3.5" fill="#22d3ee" filter="url(#dotGlow)" />

                            {/* Base Station Site Badge */}
                            <rect x="-56" y="29" width="112" height="15" rx="3" fill="#020617" stroke="#0284c7" strokeWidth="1" />
                            <text x="0" y="40" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">
                              gNB / eNB Site (0, 0)
                            </text>
                          </g>

                          {/* 6. Dropped Users as Interactive SVG Dots */}
                          {filteredUsers.map(u => {
                            const normR = Math.min(240, (u.distanceMeters / maxRangeM) * 240);
                            const rad = (u.azimuthDeg * Math.PI) / 180;
                            const cx = normR * Math.sin(rad);
                            const cy = 20 - normR * Math.cos(rad);
                            const isHovered = hoveredUser?.id === u.id;

                            // Color by status
                            const dotColor = u.isSatisfied
                              ? '#10b981' // Green: Satisfied
                              : u.violationReason === 'OUTAGE_COVERAGE'
                              ? '#f43f5e' // Rose: Coverage Outage
                              : u.violationReason === 'UL_POWER_LIMITED'
                              ? '#fb7185' // Light Rose: UL Power Limited
                              : '#f59e0b'; // Amber: PRB Congestion / Rate Violation

                            return (
                              <g
                                key={u.id}
                                className="cursor-pointer transition-transform"
                                onMouseEnter={(e) => {
                                  setHoveredUser(u);
                                  if (mapContainerRef.current) {
                                    const rect = mapContainerRef.current.getBoundingClientRect();
                                    setTooltipPos({
                                      x: e.clientX - rect.left,
                                      y: e.clientY - rect.top
                                    });
                                  }
                                }}
                                onMouseMove={(e) => {
                                  if (mapContainerRef.current) {
                                    const rect = mapContainerRef.current.getBoundingClientRect();
                                    setTooltipPos({
                                      x: e.clientX - rect.left,
                                      y: e.clientY - rect.top
                                    });
                                  }
                                }}
                                onMouseLeave={() => {
                                  setHoveredUser(null);
                                  setTooltipPos(null);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHoveredUser(u);
                                }}
                              >
                                {/* Pulsing Highlight Halo if Hovered */}
                                {isHovered && (
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r="9"
                                    fill="none"
                                    stroke="#38bdf8"
                                    strokeWidth="2"
                                    strokeDasharray="3 2"
                                    className="animate-spin-slow"
                                  />
                                )}

                                {/* Indoor user square boundary indicator */}
                                {u.isIndoor && (
                                  <rect
                                    x={cx - (isHovered ? 6 : 4.5)}
                                    y={cy - (isHovered ? 6 : 4.5)}
                                    width={isHovered ? 12 : 9}
                                    height={isHovered ? 12 : 9}
                                    fill="none"
                                    stroke="#cbd5e1"
                                    strokeWidth="1"
                                  />
                                )}

                                {/* Core User Dot */}
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={isHovered ? 5.8 : filteredUsers.length > 1500 ? 1.6 : filteredUsers.length > 600 ? 2.2 : 3.6}
                                  fill={dotColor}
                                  stroke={isHovered ? '#ffffff' : '#0f172a'}
                                  strokeWidth={isHovered ? 1.6 : 0.7}
                                  filter={isHovered ? 'url(#dotGlow)' : undefined}
                                />
                              </g>
                            );
                          })}
                        </g>
                      </svg>
                    </div>

                    {/* Floating Hover Tooltip over Drop Points */}
                    {hoveredUser && tooltipPos && (
                      <div
                        className="absolute z-30 pointer-events-none shadow-2xl rounded-xl border border-cyan-500/70 bg-slate-950/95 backdrop-blur-md p-3 font-mono text-xs w-72 text-slate-100 transition-all duration-75"
                        style={{
                          left: Math.min(Math.max(12, tooltipPos.x + 14), (mapContainerRef.current?.clientWidth || 500) - 295),
                          top: Math.min(Math.max(12, tooltipPos.y - 120), (mapContainerRef.current?.clientHeight || 500) - 230)
                        }}
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${
                              hoveredUser.isSatisfied
                                ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                                : hoveredUser.violationReason === 'OUTAGE_COVERAGE'
                                ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                                : 'bg-amber-400 shadow-sm shadow-amber-400/50'
                            }`} />
                            <span className="font-bold text-white">User #{hoveredUser.id}</span>
                            <span className="text-[10px] text-cyan-300 bg-cyan-950/90 px-1.5 py-0.5 rounded border border-cyan-800">
                              Bin {hoveredUser.binIndex}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            hoveredUser.isSatisfied
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : hoveredUser.violationReason === 'OUTAGE_COVERAGE'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            {hoveredUser.isSatisfied ? 'Satisfied' : hoveredUser.violationReason === 'OUTAGE_COVERAGE' ? 'Outage' : 'Congestion'}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Assigned Service:</span>
                            <span className="text-purple-300 font-bold truncate max-w-[140px]">{hoveredUser.serviceId}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">DL Path Loss:</span>
                            <span className="text-amber-300 font-bold">{hoveredUser.pathLossDlDb} dB</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">UL Path Loss:</span>
                            <span className="text-amber-300/90 font-medium">{hoveredUser.pathLossUlDb} dB</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">DL SINR:</span>
                            <span className={`font-bold ${hoveredUser.dlSinrDb >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {hoveredUser.dlSinrDb} dB
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">UL SINR:</span>
                            <span className="text-cyan-300 font-semibold">{hoveredUser.ulSinrDb} dB</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Distance & Azimuth:</span>
                            <span className="text-slate-200">{hoveredUser.distanceMeters} m · {hoveredUser.azimuthDeg}°</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Achieved DL Rate:</span>
                            <span className="text-emerald-400 font-bold">{hoveredUser.achievedDlRateMbps} Mbps</span>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-800/80 pt-1 text-[10px]">
                            <span className="text-slate-500">Clutter & Radio:</span>
                            <span className="text-slate-300">
                              {hoveredUser.isIndoor ? `Indoor (${hoveredUser.penetrationLossDb}dB)` : 'Outdoor'} · MCS {hoveredUser.mcs} · R{hoveredUser.rank}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick On-Map Summary Footer */}
                    <div className="w-full flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                          <span className="text-slate-300">Satisfied (Target Met)</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
                          <span className="text-slate-300">Congestion (PRBs Exhausted)</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></span>
                          <span className="text-slate-300">Outage (Coverage Limited)</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 border border-slate-300 rounded-sm"></span>
                          <span className="text-slate-300">Indoor User</span>
                        </span>
                      </div>
                      <div className="text-slate-400">
                        Max Radius: <strong className="text-cyan-300">{result.maxCellRangeKm.toFixed(2)} km</strong> ({Math.round(maxRangeM)} m)
                      </div>
                    </div>
                  </div>

                  {/* Right: Interactive User Inspector & Sector Topology Breakdown */}
                  <div className="xl:col-span-4 space-y-4">
                    {/* Live User Inspector Card */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-1.5">
                          <Target className="w-4 h-4 text-purple-400" />
                          <h4 className="text-xs font-bold font-mono text-purple-300 uppercase">
                            User Inspector
                          </h4>
                        </div>
                        {hoveredUser ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-purple-950 border border-purple-800 text-purple-300">
                            User #{hoveredUser.id}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">Hover a dot</span>
                        )}
                      </div>

                      {hoveredUser ? (
                        <div className="space-y-3 font-mono text-xs">
                          {/* Status Badge */}
                          <div className={`p-2 rounded-lg border flex items-center justify-between text-xs font-bold ${
                            hoveredUser.isSatisfied
                              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                              : hoveredUser.violationReason === 'OUTAGE_COVERAGE'
                              ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                              : 'bg-amber-950/80 border-amber-800 text-amber-300'
                          }`}>
                            <span>
                              {hoveredUser.isSatisfied
                                ? '✓ Satisfied (Target Met)'
                                : hoveredUser.violationReason === 'OUTAGE_COVERAGE'
                                ? '✗ Coverage Outage (SINR < Min)'
                                : hoveredUser.violationReason === 'UL_POWER_LIMITED'
                                ? '✗ UL Power Limited'
                                : '✗ PRB Congestion / Rate Target'}
                            </span>
                            <span className="text-[10px] opacity-80">Bin {hoveredUser.binIndex}</span>
                          </div>

                          {/* Coordinates & Geometry */}
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="bg-slate-900 p-2 rounded border border-slate-800">
                              <span className="text-[9px] text-slate-500 block">DISTANCE FROM BS</span>
                              <strong className="text-white">{hoveredUser.distanceMeters} m</strong>
                            </div>
                            <div className="bg-slate-900 p-2 rounded border border-slate-800">
                              <span className="text-[9px] text-slate-500 block">SECTOR AZIMUTH</span>
                              <strong className="text-cyan-300">{hoveredUser.azimuthDeg}°</strong>
                            </div>
                            <div className="bg-slate-900 p-2 rounded border border-slate-800">
                              <span className="text-[9px] text-slate-500 block">CLUTTER / ENV</span>
                              <strong className="text-slate-200">{hoveredUser.isIndoor ? `Indoor (${hoveredUser.penetrationLossDb} dB)` : 'Outdoor (LOS/NLOS)'}</strong>
                            </div>
                            <div className="bg-slate-900 p-2 rounded border border-slate-800">
                              <span className="text-[9px] text-slate-500 block">ACTIVE SERVICE</span>
                              <strong className="text-purple-300 truncate block">{hoveredUser.serviceId}</strong>
                            </div>
                          </div>

                          {/* Radio & Channel Metrics */}
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="bg-slate-900 p-2 rounded border border-slate-800">
                              <span className="text-[9px] text-slate-500 block">DL SINR</span>
                              <strong className={hoveredUser.dlSinrDb >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                                {hoveredUser.dlSinrDb} dB
                              </strong>
                            </div>
                            <div className="bg-slate-900 p-2 rounded border border-slate-800">
                              <span className="text-[9px] text-slate-500 block">DL RSRP</span>
                              <strong className="text-slate-200">{hoveredUser.dlRsrpDbm} dBm</strong>
                            </div>
                            <div className="bg-slate-900 p-2 rounded border border-slate-800">
                              <span className="text-[9px] text-slate-500 block">MCS & CQI</span>
                              <strong className="text-cyan-300">MCS {hoveredUser.mcs} (CQI {hoveredUser.cqi})</strong>
                            </div>
                            <div className="bg-slate-900 p-2 rounded border border-slate-800">
                              <span className="text-[9px] text-slate-500 block">MIMO LAYERS</span>
                              <strong className="text-purple-300">Rank {hoveredUser.rank}</strong>
                            </div>
                          </div>

                          {/* Throughput */}
                          <div className="bg-slate-900 p-2 rounded border border-slate-800 flex items-center justify-between">
                            <div>
                              <span className="text-[9px] text-slate-500 block">ALLOCATED PRBS</span>
                              <strong className="text-white">{hoveredUser.allocatedPrbsDl} PRBs</strong>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] text-slate-500 block">ACHIEVED DL RATE</span>
                              <strong className="text-emerald-400 text-sm">{hoveredUser.achievedDlRateMbps} Mbps</strong>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 text-center text-slate-500 font-mono text-xs space-y-2">
                          <MapPin className="w-6 h-6 mx-auto text-slate-600" />
                          <p>Hover or click any user marker on the polar sector map to inspect real-time channel conditions, distance, and achieved throughput.</p>
                        </div>
                      )}
                    </div>

                    {/* Sector Spatial Metrics Card */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5 font-mono text-xs">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-slate-300 uppercase">Sector Summary</span>
                        <span className="text-[10px] text-cyan-400">3GPP TR 38.901</span>
                      </div>
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Users in Sector:</span>
                          <strong className="text-white">{dashboardResults.sampleDropUsers.length}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Sector Cell Range:</span>
                          <strong className="text-cyan-300">{result.maxCellRangeKm.toFixed(3)} km</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">120° Sector Area:</span>
                          <strong className="text-slate-200">
                            {((Math.PI * (result.maxCellRangeKm ** 2)) / 3).toFixed(3)} km²
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Active Spatial Bins:</span>
                          <strong className="text-purple-300">{bins.length} concentric annuli</strong>
                        </div>
                        <div className="flex justify-between border-t border-slate-800/80 pt-1.5">
                          <span className="text-slate-400">Satisfaction Rate:</span>
                          <strong className="text-emerald-400 font-bold">
                            {((satCount / Math.max(1, dashboardResults.sampleDropUsers.length)) * 100).toFixed(1)}%
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Recommended Cell Range & ISD Optimization Box */}
          <div className="bg-gradient-to-r from-slate-900 to-cyan-950/50 border border-cyan-800/60 rounded-xl p-4 text-xs font-mono space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h4 className="font-bold text-cyan-300 uppercase">
                3GPP Recommended Cell Range Search & Network Dimensioning
              </h4>
            </div>
            <p className="text-slate-300">
              To guarantee that 100% of spatial bins meet the satisfaction threshold under the current traffic profile, the recommended cell range is{' '}
              <strong className="text-white">{dashboardResults.recommendedCellRangeKm} km</strong> (ISD ={' '}
              <strong className="text-white">{dashboardResults.recommendedIsdMeters} m</strong>, requires{' '}
              <strong className="text-cyan-300">{dashboardResults.recommendedSitesPerKm2} sites/km²</strong>).
            </p>
            <div className="text-[10px] text-slate-400">
              Baseline LKB Range: {result.maxCellRangeKm.toFixed(3)} km · Delta vs Baseline:{' '}
              <span className={dashboardResults.cellRangeDeltaPercent < 0 ? 'text-amber-400' : 'text-emerald-400'}>
                {dashboardResults.cellRangeDeltaPercent}%
              </span>{' '}
              · Primary Limiting Dimension: <strong className="text-white">{dashboardResults.limitingFactor}</strong>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. Assumptions & References Modal/Panel */}
      {/* ==================================================== */}
      {showAssumptions && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <h3 className="text-sm font-bold font-mono text-amber-300 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                3GPP / ITU-R Engineering Assumptions & References
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Vendor-agnostic assumptions separated between 4G and 5G technologies
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAssumptions(false)}
              className="text-slate-400 hover:text-white font-mono text-xs cursor-pointer"
            >
              Close ✕
            </button>
          </div>

          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-mono">
            {(['AUTO', '5G', '4G', 'ALL'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setAssumptionsTab(tab)}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  assumptionsTab === tab ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {tab === 'AUTO' ? `Active (${is5G ? '5G' : '4G'})` : tab}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {assumptionsList.map(a => (
              <div key={a.id} className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs font-mono space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">{a.name}</span>
                  <span className="text-[10px] text-cyan-400 bg-cyan-950 border border-cyan-800 px-1.5 py-0.5 rounded">
                    {a.standardReference}
                  </span>
                </div>
                <div className="text-cyan-300">{a.value}</div>
                <p className="text-[11px] text-slate-400">{a.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 5. Self Tests Modal/Panel */}
      {/* ==================================================== */}
      {showUnitTests && unitTestResults && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <h3 className="text-sm font-bold font-mono text-cyan-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                3GPP Mathematical Formula & Standard Verification Tests
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Verification of PRB lookups, TDD patterns, 38.306 throughput, 38.901 path loss & Erlang-B
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowUnitTests(false)}
              className="text-slate-400 hover:text-white font-mono text-xs cursor-pointer"
            >
              Close ✕
            </button>
          </div>

          <div className="space-y-2">
            {unitTestResults.map((t, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs font-mono flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-200">{t.testName}</div>
                  <div className="text-[11px] text-slate-400">Input: {t.inputDescription}</div>
                  <div className="text-[11px] text-cyan-300">Expected: {t.expectedOutput} · Actual: {t.actualOutput}</div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold shrink-0 ${
                  t.passed ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}>
                  {t.passed ? 'PASSED ✓' : 'FAILED ✗'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 6. Printable PDF Report Preview Modal */}
      {/* ==================================================== */}
      {showReportModal && dashboardResults && (() => {
        const reportHtml = generatePrintableReportHtml(dashboardResults, scenarioInputs, result, bins);
        return (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col p-2 sm:p-5 overflow-hidden animate-fadeIn">
            {/* Modal Controls Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-t-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold font-mono text-white flex items-center gap-2">
                    Printable 3GPP Simulation Report (PDF)
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                      Print Preview
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Includes Executive KPI Dashboard, Polar Sector Drop Map, Throughput/SINR CDFs, Capacity Curve & 3GPP Baseline
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => printReportDirectly(reportHtml)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs shadow-md shadow-cyan-950/50 transition-all cursor-pointer"
                  title="Open Print Dialog to Print or Save as PDF"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportPrintableReportHtml(dashboardResults, scenarioInputs, result, bins)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs transition-colors cursor-pointer"
                  title="Open Report in Standalone Browser Window"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Open in Window</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadReportHtml(reportHtml, `3gpp_mc_report_${scenarioInputs.technology}_band${scenarioInputs.band}_${dashboardResults.seed}.html`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs transition-colors cursor-pointer"
                  title="Download Standalone HTML Report File"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Download HTML</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
                  title="Close Report Modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Iframe Document Preview */}
            <div className="flex-1 bg-slate-950 border-x border-b border-slate-800 rounded-b-2xl overflow-hidden relative shadow-2xl">
              <iframe
                title="3GPP Executive Report Preview"
                srcDoc={reportHtml}
                className="w-full h-full border-0 bg-white"
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
};
