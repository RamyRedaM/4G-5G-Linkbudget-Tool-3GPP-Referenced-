import React, { useState } from 'react';
import {
  LinkBudgetCalculationResult,
  LinkBudgetInputs,
  MimoMode,
  UeMimoMode,
  UeCategory,
  UeType
} from '../types/telecom';
import { MIMO_CONFIGS } from '../data/telecomBands';
import {
  Cpu,
  Radio,
  Zap,
  Layers,
  ArrowRight,
  Scale,
  Gauge,
  Smartphone,
  Activity,
  CheckCircle2,
  Info,
  TrendingUp,
  BarChart3,
  Flame,
  Weight,
  Sparkles
} from 'lucide-react';

interface MimoTradeoffAnalysisProps {
  result: LinkBudgetCalculationResult;
  inputs: LinkBudgetInputs;
  onUpdateInputs: (partial: Partial<LinkBudgetInputs>) => void;
}

interface MimoSpec {
  mode: MimoMode;
  name: string;
  trxCount: number;
  dlBfGainDb: number;
  ulRxGainDb: number;
  maxDlLayers: number;
  maxUlLayers: number;
  typicalPowerW: number;
  typicalWeightKg: number;
  fronthaulGbps: string;
  dspComplexity: 'Low' | 'Moderate' | 'High' | 'Extreme';
  complexityScore: number; // 1 to 10
  suitability: string;
  vendorHardware: string;
}

const MIMO_SPECS: Record<MimoMode, MimoSpec> = {
  'SISO': {
    mode: 'SISO',
    name: 'Single-Input Single-Output (1T1R)',
    trxCount: 1,
    dlBfGainDb: 0,
    ulRxGainDb: 0,
    maxDlLayers: 1,
    maxUlLayers: 1,
    typicalPowerW: 160,
    typicalWeightKg: 8,
    fronthaulGbps: '2.5 Gbps (CPRI)',
    dspComplexity: 'Low',
    complexityScore: 1,
    suitability: 'Legacy 2G/3G baseline or ultra-low power IoT/sensor sites.',
    vendorHardware: 'Single-carrier discrete RRU'
  },
  '2x2': {
    mode: '2x2',
    name: '2T2R Conventional Cross-Pol MIMO',
    trxCount: 2,
    dlBfGainDb: 0,
    ulRxGainDb: 3.0,
    maxDlLayers: 2,
    maxUlLayers: 2,
    typicalPowerW: 280,
    typicalWeightKg: 12,
    fronthaulGbps: '4.9 - 9.8 Gbps (CPRI)',
    dspComplexity: 'Low',
    complexityScore: 2.5,
    suitability: 'Standard wide-area coverage umbrella, rural corridors, low-density suburban macros.',
    vendorHardware: 'Dual-transceiver Remote Radio Unit (RRU)'
  },
  '4x4': {
    mode: '4x4',
    name: '4T4R Spatial Multiplexing',
    trxCount: 4,
    dlBfGainDb: 3.0,
    ulRxGainDb: 6.0,
    maxDlLayers: 4,
    maxUlLayers: 4,
    typicalPowerW: 460,
    typicalWeightKg: 16,
    fronthaulGbps: '10 - 24.3 Gbps (eCPRI)',
    dspComplexity: 'Moderate',
    complexityScore: 4.5,
    suitability: 'Mainstream 4G LTE-A and low-band 5G NR (Sub-1GHz / Sub-3GHz) sites requiring balanced capacity and tower loading.',
    vendorHardware: 'Quad-transceiver 4T4R RRU + Passive Multi-port Antenna'
  },
  '8x8': {
    mode: '8x8',
    name: '8T8R Sectorized / Multi-layer',
    trxCount: 8,
    dlBfGainDb: 6.0,
    ulRxGainDb: 7.5,
    maxDlLayers: 4,
    maxUlLayers: 4,
    typicalPowerW: 620,
    typicalWeightKg: 20,
    fronthaulGbps: '25 Gbps (eCPRI)',
    dspComplexity: 'Moderate',
    complexityScore: 6.0,
    suitability: 'Sub-3GHz capacity expansion, split-sector cell-splitting, and railway corridors.',
    vendorHardware: '8T8R RRU or integrated sector antenna'
  },
  '16TR': {
    mode: '16TR',
    name: '16T16R Lightweight Massive MIMO',
    trxCount: 16,
    dlBfGainDb: 6.0,
    ulRxGainDb: 8.0,
    maxDlLayers: 4,
    maxUlLayers: 4,
    typicalPowerW: 750,
    typicalWeightKg: 23,
    fronthaulGbps: '25 Gbps (eCPRI)',
    dspComplexity: 'High',
    complexityScore: 7.0,
    suitability: 'Suburban mid-band (n78/n41) sites with strict tower weight, wind load, or lease constraints.',
    vendorHardware: '16TR AAU (Active Antenna Unit)'
  },
  '32TR': {
    mode: '32TR',
    name: '32T32R Massive MIMO AAU',
    trxCount: 32,
    dlBfGainDb: 9.0,
    ulRxGainDb: 10.5,
    maxDlLayers: 4,
    maxUlLayers: 4,
    typicalPowerW: 980,
    typicalWeightKg: 29,
    fronthaulGbps: '50 - 100 Gbps (eCPRI)',
    dspComplexity: 'High',
    complexityScore: 8.5,
    suitability: 'Urban macro deployments, medium-density cities, cost-effective balance of beamforming gain and power consumption.',
    vendorHardware: '32TR Mid-density Massive MIMO AAU'
  },
  '64TR': {
    mode: '64TR',
    name: '64T64R High-Density Massive MIMO AAU (Full 3D Beamforming)',
    trxCount: 64,
    dlBfGainDb: 12.0,
    ulRxGainDb: 12.5,
    maxDlLayers: 4,
    maxUlLayers: 4,
    typicalPowerW: 1250,
    typicalWeightKg: 38,
    fronthaulGbps: '100 Gbps (eCPRI 25G x4)',
    dspComplexity: 'Extreme',
    complexityScore: 10,
    suitability: 'Dense urban CBD, high-rise urban canyons, stadiums, event hotspots, high MU-MIMO spatial multiplexing demand.',
    vendorHardware: '64TR Flagship AAU (e.g., Ericsson AIR 6449, Huawei AAU5613, Nokia AirScale 64TRX)'
  }
};

const UE_MIMO_SPECS: Record<UeMimoMode, {
  name: string;
  txAntennas: number;
  rxAntennas: number;
  ulRank: number;
  dlRank: number;
  diversityGainDb: number;
  ulThrptMultiplier: string;
  description: string;
}> = {
  '1T1R': {
    name: '1Tx 1Rx (SISO Single Antenna / RedCap / IoT)',
    txAntennas: 1,
    rxAntennas: 1,
    ulRank: 1,
    dlRank: 1,
    diversityGainDb: -2.5,
    ulThrptMultiplier: '0.5x (Single Stream)',
    description: '3GPP Rel-17 RedCap, Cat-M1, or low-power IoT sensor baseline. Single antenna with -2.5 dB diversity penalty relative to 2Rx.'
  },
  '1T2R': {
    name: '1Tx 2Rx (SISO Uplink / Dual Rx Diversity)',
    txAntennas: 1,
    rxAntennas: 2,
    ulRank: 1,
    dlRank: 2,
    diversityGainDb: 0.0,
    ulThrptMultiplier: '1.0x (Baseline)',
    description: 'Standard smartphone baseline. Single transmit chain limits uplink to Rank 1 (no UL spatial multiplexing).'
  },
  '1T4R': {
    name: '1Tx 4Rx (SISO Uplink / Quad Rx Diversity)',
    txAntennas: 1,
    rxAntennas: 4,
    ulRank: 1,
    dlRank: 4,
    diversityGainDb: 2.5,
    ulThrptMultiplier: '1.0x (Baseline)',
    description: 'Mainstream 5G Sub-6 phone. Single transmit chain, but 4Rx antennas allow up to 4 DL spatial layers and +2.5 dB diversity gain.'
  },
  '2T2R': {
    name: '2Tx 2Rx (Dual Tx Uplink MIMO)',
    txAntennas: 2,
    rxAntennas: 2,
    ulRank: 2,
    dlRank: 2,
    diversityGainDb: 0.0,
    ulThrptMultiplier: '2.0x (100% Boost)',
    description: 'Dual transmit chains enable 2-layer UL SU-MIMO (doubling peak uplink throughput under good SINR conditions).'
  },
  '2T4R': {
    name: '2Tx 4Rx (Flagship 5G Phone Standard)',
    txAntennas: 2,
    rxAntennas: 4,
    ulRank: 2,
    dlRank: 4,
    diversityGainDb: 2.5,
    ulThrptMultiplier: '2.0x (100% Boost)',
    description: 'Flagship 5G smartphone configuration (iPhone, Galaxy S-series). Dual Tx doubles UL throughput; 4Rx enables 4-layer DL and +2.5 dB diversity gain.'
  },
  '4T4R': {
    name: '4Tx 4Rx (High-Tier FWA CPE / Industrial Terminal)',
    txAntennas: 4,
    rxAntennas: 4,
    ulRank: 4,
    dlRank: 4,
    diversityGainDb: 2.5,
    ulThrptMultiplier: '4.0x (300% Boost)',
    description: 'High-performance Fixed Wireless Access (FWA) CPE or high-end industrial router. 4Tx antennas enable 4-layer UL SU-MIMO (quadrupling peak UL data rates).'
  },
  '4T8R': {
    name: '4Tx 8Rx (5G-Advanced Rel-18 Macro FWA / Array)',
    txAntennas: 4,
    rxAntennas: 8,
    ulRank: 4,
    dlRank: 8,
    diversityGainDb: 4.5,
    ulThrptMultiplier: '4.0x (+4.5 dB Rx Gain)',
    description: 'Rel-18 5G-Advanced high-tier outdoor FWA terminal with 8-antenna beamformed reception array and quad-Tx uplink spatial multiplexing.'
  }
};

const UE_CATEGORIES: { id: UeCategory; label: string; tier: string; defaultUeMimo: UeMimoMode; defaultType: UeType; pwrDbm: number; desc: string }[] = [
  {
    id: 'REL18_ADVANCED',
    label: '5G-Advanced Rel-18 Ultra Flagship',
    tier: 'Tier 1+ Advanced',
    defaultUeMimo: '4T4R',
    defaultType: 'HANDSET_STD',
    pwrDbm: 23,
    desc: '4x4 DL/UL MIMO, 1024QAM Ready, AI Beamforming, Rel-18 5G-Advanced'
  },
  {
    id: 'REL16_FLAGSHIP',
    label: '5G NR Rel-16/17 Flagship Smartphone',
    tier: 'Tier 1 Mobile',
    defaultUeMimo: '2T4R',
    defaultType: 'HANDSET_STD',
    pwrDbm: 23,
    desc: '4x4 DL MIMO, 2Tx UL MIMO, 256QAM DL / 64QAM UL'
  },
  {
    id: 'REL15_STANDARD',
    label: '5G NR Rel-15 Standard Smartphone',
    tier: 'Tier 2 Mobile',
    defaultUeMimo: '1T4R',
    defaultType: 'HANDSET_STD',
    pwrDbm: 23,
    desc: '4x4 DL MIMO, 1Tx UL (SRS carrier switching), 256QAM DL'
  },
  {
    id: 'HPUE_CLASS2',
    label: '5G High-Power UE (HPUE Power Class 2)',
    tier: 'Extended Coverage',
    defaultUeMimo: '2T4R',
    defaultType: 'HANDSET_HPUE',
    pwrDbm: 26,
    desc: '26 dBm (+3 dB Tx power) compensates TDD UL coverage loss (n41/n77/n78/B14)'
  },
  {
    id: 'FWA_CPE_PRO',
    label: '5G FWA High-Gain Outdoor Rooftop CPE (Cat-Pro)',
    tier: 'Fixed Wireless',
    defaultUeMimo: '4T4R',
    defaultType: 'OUTDOOR_CPE',
    pwrDbm: 29,
    desc: '4T4R Quad-Tx Uplink MIMO, 12 dBi Directional Gain, 0 dB Body Loss'
  },
  {
    id: 'FWA_CPE_INDOOR',
    label: '5G FWA Indoor Desktop CPE / Gateway',
    tier: 'Indoor FWA',
    defaultUeMimo: '2T4R',
    defaultType: 'INDOOR_CPE',
    pwrDbm: 26,
    desc: '2T4R Dual-Tx UL MIMO, 4 dBi Internal Antennas, Power Class 2'
  },
  {
    id: 'INDUSTRY_4_0',
    label: '5G Industrial Rugged Terminal / Private 5G URLLC',
    tier: 'Industrial IoT',
    defaultUeMimo: '2T4R',
    defaultType: 'INDUSTRIAL_IOT',
    pwrDbm: 26,
    desc: 'Rel-16 URLLC, 26 dBm HPUE, 5 dBi External Omnis, Ultra-low Latency'
  },
  {
    id: 'MMWAVE_PREMIUM',
    label: '5G mmWave High-Capacity Fixed Terminal (FR2 PC1)',
    tier: 'mmWave FWA',
    defaultUeMimo: '4T4R',
    defaultType: 'MMWAVE_CPE',
    pwrDbm: 33,
    desc: 'FR2 Power Class 1, 18 dBi Phased Array, Multi-Gigabit Peak'
  },
  {
    id: 'REDCAP_REL17',
    label: '5G RedCap Rel-17 Mid-Tier / Wearable Terminal',
    tier: 'Reduced Cap',
    defaultUeMimo: '1T2R',
    defaultType: 'REDCAP_DEVICE',
    pwrDbm: 23,
    desc: '3GPP Rel-17 RedCap, 1Tx 2Rx (or 1Tx 1Rx), 64QAM, Extended Battery'
  },
  {
    id: 'LTE_CAT18_GIGA',
    label: '4G LTE-A Pro Cat 18/20 Gigabit Smartphone',
    tier: 'Flagship 4G',
    defaultUeMimo: '2T4R',
    defaultType: 'HANDSET_STD',
    pwrDbm: 23,
    desc: '5CC CA, 4x4 DL Spatial Multiplexing, 2Tx UL MIMO, 256QAM DL'
  },
  {
    id: 'LTE_CAT16_GIGA',
    label: '4G LTE-A Cat 16 Gigabit Terminal',
    tier: 'Advanced 4G',
    defaultUeMimo: '2T4R',
    defaultType: 'HANDSET_STD',
    pwrDbm: 23,
    desc: '4x4 DL Spatial Multiplexing, 2Tx UL, 256QAM DL'
  },
  {
    id: 'LTE_CAT4_STD',
    label: '4G LTE Cat 4 Standard Legacy Handset',
    tier: 'Legacy / Budget',
    defaultUeMimo: '1T2R',
    defaultType: 'HANDSET_STD',
    pwrDbm: 23,
    desc: '2x2 DL MIMO, 1Tx UL (150 Mbps DL / 50 Mbps UL peak)'
  },
  {
    id: 'LTE_CATM1_IOT',
    label: 'Cellular IoT Cat-M1 / NB-IoT M2M Sensor',
    tier: 'Massive IoT',
    defaultUeMimo: '1T1R',
    defaultType: 'REDCAP_DEVICE',
    pwrDbm: 23,
    desc: '1.4 MHz / 200 kHz Narrowband, 1Tx 1Rx SISO, Ultra-Deep Penetration'
  }
];

export const MimoTradeoffAnalysis: React.FC<MimoTradeoffAnalysisProps> = ({
  result,
  inputs,
  onUpdateInputs
}) => {
  const [activeTab, setActiveTab] = useState<'TRADE_OFF' | 'COMPARISON_64TR_2X2' | 'UE_MIMO_ANALYSIS'>('TRADE_OFF');

  const selectedBsSpec = MIMO_SPECS[inputs.mimoMode] || MIMO_SPECS['64TR'];
  const ref2x2Spec = MIMO_SPECS['2x2'];
  const ref64trSpec = MIMO_SPECS['64TR'];
  const selectedUeSpec = UE_MIMO_SPECS[inputs.ueMimoMode] || UE_MIMO_SPECS['2T4R'];

  // Current operational parameters
  const currentDlBfGain = selectedBsSpec.dlBfGainDb;
  const currentUlRxGain = selectedBsSpec.ulRxGainDb;
  const currentEffectiveDlLayers = Math.min(selectedBsSpec.maxDlLayers, selectedUeSpec.rxAntennas);
  const currentEffectiveUlLayers = Math.min(selectedBsSpec.maxUlLayers, selectedUeSpec.txAntennas);

  // Delta relative to 2x2 baseline
  const bfGainDeltaVs2x2 = Number((selectedBsSpec.dlBfGainDb - ref2x2Spec.dlBfGainDb).toFixed(1));
  const ulRxGainDeltaVs2x2 = Number((selectedBsSpec.ulRxGainDb - ref2x2Spec.ulRxGainDb).toFixed(1));

  // Uplink Throughput comparison at Near Cell for 1Tx vs 2Tx vs 4Tx
  const nearPoint = result.fourPoints[0];
  const medPoint = result.fourPoints[1];

  const handleSelectMimoMode = (mode: MimoMode) => {
    onUpdateInputs({ mimoMode: mode });
  };

  const handleSelectUeMimo = (ueMimo: UeMimoMode) => {
    onUpdateInputs({ ueMimoMode: ueMimo });
  };

  const handleSelectUeCategory = (catId: UeCategory) => {
    const cat = UE_CATEGORIES.find(c => c.id === catId);
    if (!cat) return;
    onUpdateInputs({
      ueCategory: catId,
      ueMimoMode: cat.defaultUeMimo,
      ueType: cat.defaultType,
      ueTxPowerDbm: cat.pwrDbm
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-6">
      {/* Component Title & Header Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Cpu className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight font-mono">
              MIMO & Beamforming Trade-off Analyzer
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-cyan-300 border border-slate-700">
              3GPP TS 38.211 / 38.214
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Evaluate theoretical beamforming array gains, receiver combining gains, and spatial multiplexing capacity 
            against hardware complexity, power consumption, tower load, and UE uplink architecture.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono self-start md:self-auto">
          <button
            onClick={() => setActiveTab('TRADE_OFF')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'TRADE_OFF'
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All MIMO Modes
          </button>
          <button
            onClick={() => setActiveTab('COMPARISON_64TR_2X2')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
              activeTab === 'COMPARISON_64TR_2X2'
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>64TR vs 2x2 Deep Dive</span>
          </button>
          <button
            onClick={() => setActiveTab('UE_MIMO_ANALYSIS')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
              activeTab === 'UE_MIMO_ANALYSIS'
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>UE MIMO & UL Thrpt</span>
          </button>
        </div>
      </div>

      {/* Live System Configuration Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">BS MIMO Mode</div>
          <div className="text-sm font-bold font-mono text-cyan-400 mt-0.5">{inputs.mimoMode}</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedBsSpec.trxCount} TRX Channels</div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">DL Beamforming Gain</div>
          <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">+{currentDlBfGain.toFixed(1)} dB</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            {bfGainDeltaVs2x2 >= 0 ? `+${bfGainDeltaVs2x2} dB vs 2x2` : `${bfGainDeltaVs2x2} dB vs 2x2`}
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">UL Rx Combining Gain</div>
          <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">+{currentUlRxGain.toFixed(1)} dB</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            {ulRxGainDeltaVs2x2 >= 0 ? `+${ulRxGainDeltaVs2x2} dB vs 2x2` : `${ulRxGainDeltaVs2x2} dB vs 2x2`}
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">UE MIMO Configuration</div>
          <div className="text-sm font-bold font-mono text-purple-400 mt-0.5">{inputs.ueMimoMode}</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedUeSpec.txAntennas}Tx / {selectedUeSpec.rxAntennas}Rx Antennas</div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Spatial Layers (DL / UL)</div>
          <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">{currentEffectiveDlLayers} DL / {currentEffectiveUlLayers} UL</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Rank {currentEffectiveUlLayers} Uplink</div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Near UL Throughput</div>
          <div className="text-sm font-bold font-mono text-cyan-300 mt-0.5">{nearPoint.ulThroughputMbps} Mbps</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedUeSpec.ulThrptMultiplier}</div>
        </div>
      </div>

      {/* TAB 1: ALL MIMO MODES COMPARISON & COMPLEXITY TRADEOFF */}
      {activeTab === 'TRADE_OFF' && (
        <div className="space-y-6">
          {/* Quick Mode Selector Cards */}
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
              <span>Select Base Station MIMO Mode to Evaluate:</span>
              <span className="text-slate-500 text-[11px] normal-case">Click card to apply configuration in real-time</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {(Object.keys(MIMO_SPECS) as MimoMode[]).map((mode) => {
                const spec = MIMO_SPECS[mode];
                const isSelected = inputs.mimoMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => handleSelectMimoMode(mode)}
                    className={`text-left p-3 rounded-lg border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400/40 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-2 right-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                      </span>
                    )}
                    <div className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{mode}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-1">
                      {spec.trxCount} TRX
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-0.5 text-[10px] font-mono">
                      <div className="text-emerald-400">BF: +{spec.dlBfGainDb} dB</div>
                      <div className="text-cyan-400">UL: +{spec.ulRxGainDb} dB</div>
                      <div className="text-slate-500">{spec.typicalPowerW}W · {spec.typicalWeightKg}kg</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trade-off Matrix Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">MIMO Mode</th>
                  <th className="py-2.5 px-3">TRX Chains</th>
                  <th className="py-2.5 px-3">DL Array/BF Gain</th>
                  <th className="py-2.5 px-3">UL Rx Gain</th>
                  <th className="py-2.5 px-3">DL/UL Layers</th>
                  <th className="py-2.5 px-3">Power (Typ.)</th>
                  <th className="py-2.5 px-3">Weight (AAU/RRU)</th>
                  <th className="py-2.5 px-3">Complexity</th>
                  <th className="py-2.5 px-3">Target Deployment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(Object.keys(MIMO_SPECS) as MimoMode[]).map((mode) => {
                  const spec = MIMO_SPECS[mode];
                  const isSelected = inputs.mimoMode === mode;
                  return (
                    <tr
                      key={mode}
                      onClick={() => handleSelectMimoMode(mode)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-cyan-950/30 text-white font-semibold'
                          : 'text-slate-300 hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="py-2 px-3 flex items-center gap-1.5 font-bold">
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                        <span className={isSelected ? 'text-cyan-300' : 'text-white'}>{mode}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-400">{spec.trxCount} TRX</td>
                      <td className="py-2 px-3 font-semibold text-emerald-400">+{spec.dlBfGainDb.toFixed(1)} dB</td>
                      <td className="py-2 px-3 font-semibold text-cyan-400">+{spec.ulRxGainDb.toFixed(1)} dB</td>
                      <td className="py-2 px-3 text-amber-300">{spec.maxDlLayers} DL / {spec.maxUlLayers} UL</td>
                      <td className="py-2 px-3 text-slate-400">{spec.typicalPowerW} W</td>
                      <td className="py-2 px-3 text-slate-400">{spec.typicalWeightKg} kg</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            spec.dspComplexity === 'Extreme'
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                              : spec.dspComplexity === 'High'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                              : spec.dspComplexity === 'Moderate'
                              ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                              : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                          }`}
                        >
                          {spec.dspComplexity}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400 text-[11px] truncate max-w-[220px]">
                        {spec.suitability}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Visual Bar Comparison of Theoretical Gains vs Complexity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chart 1: Theoretical RF Gains */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Theoretical RF Gains (Array BF & UL Combining)</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">dB Gain</span>
              </div>
              <div className="space-y-2.5">
                {(Object.keys(MIMO_SPECS) as MimoMode[]).map((mode) => {
                  const spec = MIMO_SPECS[mode];
                  const isSelected = inputs.mimoMode === mode;
                  const totalGain = spec.dlBfGainDb + spec.ulRxGainDb;
                  const maxPossible = 24.5;
                  const widthPct = Math.round((totalGain / maxPossible) * 100);

                  return (
                    <div key={mode} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className={`font-semibold ${isSelected ? 'text-cyan-300' : 'text-slate-300'}`}>
                          {mode} {isSelected && '(Active)'}
                        </span>
                        <span className="text-slate-400">
                          DL BF: <span className="text-emerald-400 font-semibold">+{spec.dlBfGainDb}dB</span> | UL Rx: <span className="text-cyan-400 font-semibold">+{spec.ulRxGainDb}dB</span>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${(spec.dlBfGainDb / maxPossible) * 100}%` }}
                          className="bg-emerald-500 transition-all duration-300"
                        />
                        <div
                          style={{ width: `${(spec.ulRxGainDb / maxPossible) * 100}%` }}
                          className="bg-cyan-500 transition-all duration-300"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center gap-4 text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-emerald-500" /> Downlink Beamforming Array Gain
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-cyan-500" /> Uplink Combining Gain (MMSE-IRC)
                </span>
              </div>
            </div>

            {/* Chart 2: Hardware Complexity, Power & Weight */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-amber-400" />
                  <span>Hardware Complexity, Power & Tower Load</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">Power / Weight</span>
              </div>
              <div className="space-y-2.5">
                {(Object.keys(MIMO_SPECS) as MimoMode[]).map((mode) => {
                  const spec = MIMO_SPECS[mode];
                  const isSelected = inputs.mimoMode === mode;
                  const powerPct = Math.round((spec.typicalPowerW / 1300) * 100);

                  return (
                    <div key={mode} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className={`font-semibold ${isSelected ? 'text-cyan-300' : 'text-slate-300'}`}>
                          {mode} ({spec.trxCount} TRX)
                        </span>
                        <span className="text-slate-400">
                          <span className="text-amber-400 font-semibold">{spec.typicalPowerW} W</span> · <span className="text-slate-300">{spec.typicalWeightKg} kg</span> · <span className="text-slate-500">{spec.dspComplexity} DSP</span>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${powerPct}%` }}
                          className={`h-full transition-all duration-300 ${
                            spec.typicalPowerW > 1000
                              ? 'bg-rose-500'
                              : spec.typicalPowerW > 600
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Power: 160W (SISO) → 1250W (64TR)</span>
                <span>Weight: 8kg (SISO) → 38kg (64TR AAU)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEEP DIVE 64TR VS 2X2 MIMO COMPARISON */}
      {activeTab === 'COMPARISON_64TR_2X2' && (
        <div className="space-y-6">
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold font-mono text-white">
                64TR Massive MIMO vs 2x2 Conventional MIMO: Head-to-Head Architectural Breakdown
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              In modern 5G Sub-6 deployments (such as n78 / 3.5 GHz and n41 / 2.5 GHz), migrating from 2T2R cross-polarized 
              antennas to 64T64R Massive MIMO active antenna units (AAUs) yields massive improvements in downlink beamforming, 
              uplink receiver sensitivity, and cell edge coverage radius, at the expense of capital expenditure, energy consumption, 
              and tower load.
            </p>
          </div>

          {/* Side-by-side comparison cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 64TR Massive MIMO Card */}
            <div className="bg-slate-950 border-2 border-cyan-500/50 rounded-lg p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-cyan-500 text-slate-950 text-[10px] font-bold font-mono px-2 py-0.5 rounded-bl">
                HIGH DENSITY / MASSIVE CAPACITY
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Radio className="w-5 h-5 text-cyan-400" />
                <h4 className="text-base font-bold font-mono text-white">64TR (64T64R Massive MIMO AAU)</h4>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Antenna Architecture:</span>
                  <span className="text-cyan-300 font-semibold">192 elements (8x12 cross-pol array, 64 TRX)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Downlink Array / BF Gain:</span>
                  <span className="text-emerald-400 font-bold text-sm">+{ref64trSpec.dlBfGainDb.toFixed(1)} dB</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Uplink Combining Gain:</span>
                  <span className="text-cyan-400 font-bold text-sm">+{ref64trSpec.ulRxGainDb.toFixed(1)} dB (64Rx MMSE-IRC)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Effective Cell Radius Gain:</span>
                  <span className="text-amber-400 font-bold">+70% to +85% cell range expansion</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">MU-MIMO Spatial Layers:</span>
                  <span className="text-purple-400 font-semibold">Up to 16 - 24 concurrent streams</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Power Consumption:</span>
                  <span className="text-rose-400 font-semibold">~1,100 - 1,400 W (Peak Traffic)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Hardware Weight:</span>
                  <span className="text-slate-300 font-semibold">~35 - 42 kg (Requires strong mast/bracket)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Fronthaul Requirements:</span>
                  <span className="text-slate-300 font-semibold">100 Gbps eCPRI (4x 25G SFP28)</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
                <span className="text-cyan-400 font-semibold">Ideal For:</span> Dense urban CBD, high-rise buildings (3D beam tilt), sports arenas, transportation hubs, and capacity hotspots.
              </div>
            </div>

            {/* 2x2 Conventional MIMO Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-slate-800 text-slate-300 text-[10px] font-bold font-mono px-2 py-0.5 rounded-bl">
                LIGHTWEIGHT / COVERAGE UMBRELLA
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Radio className="w-5 h-5 text-slate-400" />
                <h4 className="text-base font-bold font-mono text-white">2x2 (2T2R Conventional Cross-Pol)</h4>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Antenna Architecture:</span>
                  <span className="text-slate-300 font-semibold">Passive dual-slant (±45°) + 2T2R RRU</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Downlink Array / BF Gain:</span>
                  <span className="text-slate-400 font-bold text-sm">0.0 dB (Baseline)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Uplink Combining Gain:</span>
                  <span className="text-slate-400 font-bold text-sm">+3.0 dB (2Rx MRC Baseline)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Effective Cell Radius Gain:</span>
                  <span className="text-slate-400 font-semibold">Baseline reference (1.0x)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">MU-MIMO Spatial Layers:</span>
                  <span className="text-slate-400 font-semibold">Not supported (SU-MIMO 2-layer max)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Power Consumption:</span>
                  <span className="text-emerald-400 font-semibold">~250 - 320 W (Low energy footprint)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Hardware Weight:</span>
                  <span className="text-emerald-400 font-semibold">~10 - 14 kg (Easy rooftop mounting)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Fronthaul Requirements:</span>
                  <span className="text-slate-300 font-semibold">9.8 Gbps CPRI (Standard SFP+)</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
                <span className="text-slate-300 font-semibold">Ideal For:</span> Rural highways, low-density suburban umbrella coverage, weight-restricted towers, low CAPEX greenfield deployments.
              </div>
            </div>
          </div>

          {/* Quantitative Delta Summary Banner */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs">
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
              Summary Quantitative Delta (64TR vs 2x2):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-300">
              <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                <div className="text-slate-400 text-[11px]">Downlink Link Budget Delta</div>
                <div className="text-emerald-400 font-bold text-sm mt-0.5">+12.0 dB MAPL Improvement</div>
                <div className="text-[10px] text-slate-500 mt-0.5">3D beam energy focused directly on UE beam pattern</div>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                <div className="text-slate-400 text-[11px]">Uplink Link Budget Delta</div>
                <div className="text-cyan-400 font-bold text-sm mt-0.5">+9.5 dB Sensitivity Gain</div>
                <div className="text-[10px] text-slate-500 mt-0.5">64-antenna MMSE-IRC receiver combining suppresses noise & interference</div>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                <div className="text-slate-400 text-[11px]">Cell Capacity Multiplier</div>
                <div className="text-purple-400 font-bold text-sm mt-0.5">3.5x to 5.2x System Cell Capacity</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Via simultaneous multi-user beam multiplexing (MU-MIMO)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: UE MIMO & UPLINK THROUGHPUT IMPACT */}
      {activeTab === 'UE_MIMO_ANALYSIS' && (
        <div className="space-y-6">
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold font-mono text-white">
                UE Device Category & Uplink MIMO Architecture Analyzer
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              In cellular link budgets, the <span className="text-amber-400 font-semibold">Uplink (UL)</span> is almost universally 
              the bottleneck due to the mobile device's power constraint (23 dBm vs 49-53 dBm BS) and limited antenna count. 
              The UE's transmit architecture (1Tx vs 2Tx vs 4Tx) directly governs the maximum number of spatial multiplexing streams 
              available for uplink data transmission, dictating whether UL peak throughput is capped or doubled/quadrupled.
            </p>
          </div>

          {/* UE MIMO Mode Live Switcher */}
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2.5">
              Select User Equipment (UE) MIMO Architecture:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {(Object.keys(UE_MIMO_SPECS) as UeMimoMode[]).map((mode) => {
                const spec = UE_MIMO_SPECS[mode];
                const isSelected = inputs.ueMimoMode === mode;

                return (
                  <button
                    key={mode}
                    onClick={() => handleSelectUeMimo(mode)}
                    className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-400 ring-1 ring-purple-400/40 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-xs font-bold text-white">{mode}</span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-purple-400" />}
                    </div>
                    <div className="text-[11px] font-mono font-semibold text-purple-300">
                      {spec.txAntennas}Tx · {spec.rxAntennas}Rx
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] font-mono space-y-1">
                      <div className="text-emerald-400">UL Rank: {spec.ulRank} Layer</div>
                      <div className="text-cyan-400">DL Rank: {spec.dlRank} Layers</div>
                      <div className="text-amber-300 font-semibold">{spec.ulThrptMultiplier}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Uplink Throughput Impact Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Live Uplink Throughput Analysis for {inputs.ueMimoMode}:</span>
              </span>
              <span className="text-[11px] text-cyan-400">
                Current BS: {inputs.mimoMode} ({inputs.bandwidthMHz} MHz {inputs.duplexMode})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {result.fourPoints.map((pt) => {
                return (
                  <div key={pt.pointName} className="bg-slate-900/80 p-3 rounded border border-slate-800">
                    <div className="text-slate-400 text-[11px] font-semibold">{pt.pointName}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{pt.rangeMeters} m · SINR {pt.ssSinrDb} dB</div>
                    <div className="mt-2 text-base font-bold text-emerald-400">
                      {pt.ulThroughputMbps} <span className="text-xs font-normal text-slate-400">Mbps UL</span>
                    </div>
                    <div className="text-[10px] text-cyan-300 mt-0.5">
                      {pt.dlThroughputMbps} Mbps DL
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      {pt.avgUlMcs}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-900/50 p-3 rounded border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
              <div className="font-semibold text-amber-300 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                <span>Uplink Multi-Stream Mechanics (3GPP TS 38.214):</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                When UE has <strong className="text-white">1Tx (1T2R/1T4R)</strong>, uplink transmission is restricted to a single spatial codeword (Rank 1). 
                Upgrading to a <strong className="text-white">2Tx UE (2T2R/2T4R)</strong> allows the gNodeB to schedule 2 simultaneous uplink transport blocks via 
                codebook or non-codebook UL SU-MIMO, nearly doubling (+100%) the uplink data rate at Near and Medium cell ranges. 
                With <strong className="text-white">4Tx (4T4R)</strong> Fixed Wireless CPEs, Rank 4 uplink is achievable, providing up to 4x throughput under clean radio conditions!
              </p>
            </div>
          </div>

          {/* 3GPP UE Device Category Presets */}
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2.5">
              Or Choose Standard 3GPP UE Device Category Profile:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {UE_CATEGORIES.map((cat) => {
                const isSelected = inputs.ueCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectUeCategory(cat.id)}
                    className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-400 ring-1 ring-emerald-400/40 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-mono text-xs font-bold text-white">{cat.label}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                        {cat.tier}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-emerald-300 mt-1">
                      {cat.defaultUeMimo} · {cat.pwrDbm} dBm Tx
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1 leading-relaxed">
                      {cat.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
