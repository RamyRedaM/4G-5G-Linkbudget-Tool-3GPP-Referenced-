import React, { useState } from 'react';
import {
  LinkBudgetInputs,
  TechnologyType,
  DuplexMode,
  MimoMode,
  UeType,
  UeMimoMode,
  UeCategory,
  PropagationModelType,
  EnvironmentClutter,
  IndoorOutdoorScenario,
  ServiceProfileType,
  NbIoTDeploymentMode,
  NbIoTSubcarrierSpacing,
  NbIoTCeLevel,
  VoNrCodec,
  VoLteCodec,
  RedCapProfile,
  McxProfile
} from '../types/telecom';
import { TELECOM_BANDS, TDD_FRAME_PATTERNS, POPULAR_CA_COMBOS } from '../data/telecomBands';
import {
  Radio,
  Sliders,
  Layers,
  Smartphone,
  Trees,
  Settings2,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Activity,
  Gauge,
  RotateCcw,
  ShieldCheck,
  Building2,
  PhoneCall,
  Wifi,
  ShieldAlert,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { calculateControlOverheads, calculateLinkBudget } from '../utils/linkBudgetCalculator';
import {
  calculateShadowFadingMargin,
  calculateStdDevFromMargin,
  getGaussianZ
} from '../utils/spmPropagation';

interface InputPanelProps {
  inputs: LinkBudgetInputs;
  onChange: (inputs: LinkBudgetInputs) => void;
}

export const InputPanel: React.FC<InputPanelProps> = ({ inputs, onChange }) => {
  const [activeSection, setActiveSection] = useState<'tech' | 'bs' | 'ue' | 'spm' | 'ca'>('tech');

  const overheads = calculateControlOverheads(inputs);
  const lbResult = calculateLinkBudget(inputs);
  const { rxSensitivityBreakdown, serviceSummary } = lbResult;

  const update = (partial: Partial<LinkBudgetInputs>) => {
    onChange({ ...inputs, ...partial });
  };

  const handleServiceProfileChange = (newProfile: ServiceProfileType) => {
    switch (newProfile) {
      case 'MBB_PS_DATA':
        update({
          serviceProfile: 'MBB_PS_DATA',
          targetDlCellEdgeThroughputMbps: inputs.targetDlCellEdgeThroughputMbps ?? (inputs.technology === '4G' ? 1.0 : 2.0),
          targetUlCellEdgeThroughputMbps: inputs.targetUlCellEdgeThroughputMbps ?? (inputs.technology === '4G' ? 0.256 : 0.512),
          dlRequiredSnrDb: undefined,
          ulRequiredSnrDb: undefined
        });
        break;
      case 'VONR_5G':
        update({
          serviceProfile: 'VONR_5G',
          technology: inputs.technology === '4G' ? '5G_SA' : inputs.technology,
          vonrCodec: inputs.vonrCodec || 'EVS_13_2',
          vonrSlotAggregation: inputs.vonrSlotAggregation ?? 4,
          dlRequiredSnrDb: undefined,
          ulRequiredSnrDb: undefined,
          dlSubcarriersCount: 12,
          ulSubcarriersCount: 12
        });
        break;
      case 'VOLTE_4G':
        update({
          serviceProfile: 'VOLTE_4G',
          volteCodec: inputs.volteCodec || 'AMR_WB_12_65',
          volteTtiBundling: inputs.volteTtiBundling ?? true,
          dlRequiredSnrDb: undefined,
          ulRequiredSnrDb: undefined,
          dlSubcarriersCount: 12,
          ulSubcarriersCount: 12
        });
        break;
      case 'NBIOT_4G':
        update({
          serviceProfile: 'NBIOT_4G',
          technology: '4G',
          nbiotDeploymentMode: inputs.nbiotDeploymentMode || 'IN_BAND',
          nbiotScs: inputs.nbiotScs || '15KHZ_SINGLE',
          nbiotCeLevel: inputs.nbiotCeLevel || 'CE_LEVEL_1',
          nbiotTargetRateKbps: inputs.nbiotTargetRateKbps ?? 15.6,
          nbiotPowerClassDbm: inputs.nbiotPowerClassDbm ?? 23,
          dlRequiredSnrDb: undefined,
          ulRequiredSnrDb: undefined,
          dlSubcarriersCount: 12,
          ulSubcarriersCount: 1
        });
        break;
      case 'REDCAP_5G':
        update({
          serviceProfile: 'REDCAP_5G',
          technology: inputs.technology === '4G' ? '5G_SA' : inputs.technology,
          redcapProfile: inputs.redcapProfile || 'INDUSTRIAL_SENSOR',
          redcapRxBranches: inputs.redcapRxBranches ?? 1,
          redcapTargetDlMbps: inputs.redcapTargetDlMbps ?? 5.0,
          redcapTargetUlMbps: inputs.redcapTargetUlMbps ?? 2.0,
          dlRequiredSnrDb: undefined,
          ulRequiredSnrDb: undefined
        });
        break;
      case 'MCX_PUBLIC_SAFETY':
        update({
          serviceProfile: 'MCX_PUBLIC_SAFETY',
          mcxProfile: inputs.mcxProfile || 'MCPTT',
          mcxHpueEnabled: inputs.mcxHpueEnabled ?? true,
          mcxReliabilityTargetPercent: inputs.mcxReliabilityTargetPercent ?? 99.0,
          dlRequiredSnrDb: undefined,
          ulRequiredSnrDb: undefined
        });
        break;
    }
  };

  // Filter bands according to selected technology and duplex mode
  const availableBands = TELECOM_BANDS.filter(b => {
    if (inputs.technology === '4G') {
      return b.tech === '4G' || b.tech === 'BOTH';
    } else {
      return b.tech === '5G' || b.tech === 'BOTH';
    }
  }).filter(b => b.duplex === inputs.duplexMode);

  const selectedBandInfo = TELECOM_BANDS.find(b => b.band === inputs.band) || availableBands[0] || TELECOM_BANDS[0];

  const handleTechChange = (tech: TechnologyType) => {
    // If switching to 4G, select a valid 4G band
    const validBand = TELECOM_BANDS.find(b => {
      const matchTech = tech === '4G' ? (b.tech === '4G' || b.tech === 'BOTH') : (b.tech === '5G' || b.tech === 'BOTH');
      return matchTech && b.duplex === inputs.duplexMode;
    }) || (tech === '4G' ? TELECOM_BANDS[0] : TELECOM_BANDS.find(b => b.band === 'n78')!);

    const validBw = validBand.bandwidthsMHz.includes(inputs.bandwidthMHz)
      ? inputs.bandwidthMHz
      : validBand.bandwidthsMHz[validBand.bandwidthsMHz.length - 1];

    if (tech === '4G') {
      update({
        technology: tech,
        band: validBand.band,
        bandwidthMHz: validBw,
        // Assume 3GPP defaults for 4G counterpart inputs
        dmrsSymbolsPerSlot: 1,
        numberOfBeams: 1,
        ssbPeriodicityMs: 20,
        csiRsReportsPerPeriod: 1,
        csiRsCaPeriodicitySlots: 20
      });
    } else {
      update({
        technology: tech,
        band: validBand.band,
        bandwidthMHz: validBw
      });
    }
  };

  const handleDuplexChange = (duplex: DuplexMode) => {
    const validBand = TELECOM_BANDS.find(b => {
      const matchTech = inputs.technology === '4G' ? (b.tech === '4G' || b.tech === 'BOTH') : (b.tech === '5G' || b.tech === 'BOTH');
      return matchTech && b.duplex === duplex;
    }) || TELECOM_BANDS.find(b => b.duplex === duplex)!;

    const validBw = validBand.bandwidthsMHz.includes(inputs.bandwidthMHz)
      ? inputs.bandwidthMHz
      : validBand.bandwidthsMHz[validBand.bandwidthsMHz.length - 1];

    update({
      duplexMode: duplex,
      band: validBand.band,
      bandwidthMHz: validBw
    });
  };

  const handleBandChange = (bandName: string) => {
    const b = TELECOM_BANDS.find(item => item.band === bandName);
    if (!b) return;
    const validBw = b.bandwidthsMHz.includes(inputs.bandwidthMHz)
      ? inputs.bandwidthMHz
      : b.bandwidthsMHz[b.bandwidthsMHz.length - 1];

    update({
      band: bandName,
      duplexMode: b.duplex,
      bandwidthMHz: validBw
    });
  };

  const handleUeTypeChange = (ueType: UeType) => {
    let power = 23;
    let gain = 0;
    let bodyLoss = 3;
    let nf = 8;
    let height = 1.5;

    switch (ueType) {
      case 'HANDSET_STD':
        power = 23; gain = 0; bodyLoss = 3; nf = 8; height = 1.5;
        break;
      case 'HANDSET_HPUE':
        power = 26; gain = 0; bodyLoss = 3; nf = 8; height = 1.5;
        break;
      case 'INDOOR_CPE':
        power = 26; gain = 4; bodyLoss = 0; nf = 6.5; height = 2.0;
        break;
      case 'OUTDOOR_CPE':
        power = 27; gain = 9; bodyLoss = 0; nf = 5.5; height = 6.0;
        break;
    }

    update({
      ueType,
      ueTxPowerDbm: power,
      ueAntennaGainDbi: gain,
      bodyLossDb: bodyLoss,
      ueNoiseFigureDb: nf,
      ueHeightMeters: height
    });
  };

  const handleUeCategoryChange = (cat: UeCategory) => {
    switch (cat) {
      case 'REL16_FLAGSHIP':
        handleUeTypeChange('HANDSET_STD');
        update({ ueCategory: cat, ueMimoMode: '2T4R', ueTxPowerDbm: 23 });
        break;
      case 'REL15_STANDARD':
        handleUeTypeChange('HANDSET_STD');
        update({ ueCategory: cat, ueMimoMode: '1T4R', ueTxPowerDbm: 23 });
        break;
      case 'HPUE_CLASS2':
        handleUeTypeChange('HANDSET_HPUE');
        update({ ueCategory: cat, ueMimoMode: '2T4R', ueTxPowerDbm: 26 });
        break;
      case 'FWA_CPE_PRO':
        handleUeTypeChange('OUTDOOR_CPE');
        update({ ueCategory: cat, ueMimoMode: '4T4R', ueTxPowerDbm: 27, ueAntennaGainDbi: 9, bodyLossDb: 0 });
        break;
      case 'LTE_CAT16_GIGA':
        handleUeTypeChange('HANDSET_STD');
        update({ ueCategory: cat, ueMimoMode: '2T4R', ueTxPowerDbm: 23 });
        break;
      case 'LTE_CAT4_STD':
        handleUeTypeChange('HANDSET_STD');
        update({ ueCategory: cat, ueMimoMode: '1T2R', ueTxPowerDbm: 23, ueNoiseFigureDb: 9 });
        break;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      {/* Tab Navigation for Input Groups */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-950/70 border border-slate-800 rounded-lg mb-5 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveSection('tech')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeSection === 'tech'
              ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>1. Technology, Band & Service Profile</span>
        </button>

        <button
          onClick={() => setActiveSection('bs')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeSection === 'bs'
              ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>2. Base Station (gNB/eNB)</span>
        </button>

        <button
          onClick={() => setActiveSection('ue')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeSection === 'ue'
              ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>3. UE / Terminal & CPE</span>
        </button>

        <button
          onClick={() => setActiveSection('spm')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeSection === 'spm'
              ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trees className="w-3.5 h-3.5" />
          <span>4. SPM & Environment</span>
        </button>

        <button
          onClick={() => setActiveSection('ca')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeSection === 'ca'
              ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>5. Carrier Aggregation (CA)</span>
          {inputs.caEnabled && (
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
          )}
        </button>
      </div>

      {/* SECTION 1: TECHNOLOGY, DUPLEXING & BAND */}
      {activeSection === 'tech' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Technology selection */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                Technology Standard
              </label>
              <select
                value={inputs.technology}
                onChange={(e) => handleTechChange(e.target.value as TechnologyType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="5G_SA">5G NR Standalone (SA) - Rel 16/17</option>
                <option value="5G_NSA">5G NR Non-Standalone (NSA - Option 3x)</option>
                <option value="4G">4G LTE / LTE-Advanced - Rel 8-15</option>
              </select>
            </div>

            {/* Duplexing Mode */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                Duplexing Mode
              </label>
              <select
                value={inputs.duplexMode}
                onChange={(e) => handleDuplexChange(e.target.value as DuplexMode)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="TDD">TDD (Time Division Duplex)</option>
                <option value="FDD">FDD (Frequency Division Duplex)</option>
              </select>
            </div>

            {/* Band selection */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                3GPP Operating Band
              </label>
              <select
                value={inputs.band}
                onChange={(e) => handleBandChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                {availableBands.map((b) => (
                  <option key={b.band} value={b.band}>
                    {b.name} - {b.commonName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SERVICE PROFILE & CELL EDGE REQUIREMENTS (3GPP REQUIREMENT ENGINE) */}
          <div className="p-4 bg-gradient-to-r from-slate-950/95 via-cyan-950/20 to-slate-950/95 border border-cyan-800/60 rounded-lg space-y-3.5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

            {/* Header with Calculated Edge Range KPI */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-900/40 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-cyan-400/20 animate-pulse" />
                <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
                  Service Profile & Cell Edge Requirements (3GPP Engineering)
                </span>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700/60 px-2 py-0.5 rounded font-mono">
                  {inputs.technology === '4G' ? '4G LTE Spec' : '5G NR Spec'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-300">
                Calculated Cell Edge: <span className="text-cyan-300 font-bold">{serviceSummary.calculatedEdgeRangeKm >= 1 ? `${serviceSummary.calculatedEdgeRangeKm.toFixed(3)} km` : `${serviceSummary.calculatedEdgeRangeMeters} m`}</span> <span className="text-slate-400">({serviceSummary.calculatedEdgeRangeMeters.toLocaleString()} m)</span>
              </div>
            </div>

            {/* Pull-Down Menu: Current Service Profile */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center justify-between">
                <span>Current Service Profile (Pull-down Menu):</span>
                <span className="text-cyan-400 font-normal normal-case text-[11px]">
                  {serviceSummary.displayName}
                </span>
              </label>
              <select
                value={inputs.serviceProfile || 'MBB_PS_DATA'}
                onChange={(e) => handleServiceProfileChange(e.target.value as ServiceProfileType)}
                className="w-full bg-slate-900 border border-cyan-500/70 rounded-md px-3 py-2 text-xs text-cyan-200 font-mono font-semibold focus:border-cyan-400 focus:outline-none shadow-inner"
              >
                <option value="MBB_PS_DATA">MBB PS DATA  (where user define DL / UL Thrpt values at cell edge)</option>
                <option value="VONR_5G">VoNR Service in 5G (requirements as per 3GPP Specs for VoNR Codecs)</option>
                <option value="VOLTE_4G">VoLTE service in 4G or 5G NSA (requirements as per 3GPP Specs for VoLTE Codecs)</option>
                <option value="NBIOT_4G">NB-IoT for 4G (user to choose NB-IoT is in band or out of band or guard band , and requirements as per 3GPP Specs for NB-IoT)</option>
                <option value="REDCAP_5G">RedCap for 5G (requirements as per 3GPP Specs for RedCap)</option>
                <option value="MCX_PUBLIC_SAFETY">MCX / PS - Public Safety User defined Profiles ( requirements as per 3GPP Specs)</option>
              </select>
            </div>

            {/* SERVICE-SPECIFIC VALUE CONTROLS */}
            {(!inputs.serviceProfile || inputs.serviceProfile === 'MBB_PS_DATA') && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-md p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-cyan-300 font-semibold">
                    MBB PS DATA: Cell Edge Target Values
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    User defined target DL / UL throughputs at cell edge
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* DL Throughput */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 mb-1 flex justify-between">
                      <span>Target DL Throughput @ Cell Edge</span>
                      <span className="text-cyan-400 font-semibold">{inputs.targetDlCellEdgeThroughputMbps ?? (inputs.technology === '4G' ? 1.0 : 2.0)} Mbps</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="50"
                        value={inputs.targetDlCellEdgeThroughputMbps ?? (inputs.technology === '4G' ? 1.0 : 2.0)}
                        onChange={(e) => update({ targetDlCellEdgeThroughputMbps: Math.max(0.05, Number(e.target.value)) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-cyan-300 font-mono focus:border-cyan-400 focus:outline-none"
                      />
                      <span className="text-xs text-slate-400 font-mono self-center">Mbps</span>
                    </div>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {[0.5, 1.0, 2.0, 5.0, 10.0].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => update({ targetDlCellEdgeThroughputMbps: val })}
                          className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                            (inputs.targetDlCellEdgeThroughputMbps ?? (inputs.technology === '4G' ? 1.0 : 2.0)) === val
                              ? 'bg-cyan-500/30 text-cyan-300 border-cyan-500/60 font-bold'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {val} Mbps
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* UL Throughput */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 mb-1 flex justify-between">
                      <span>Target UL Throughput @ Cell Edge</span>
                      <span className="text-emerald-400 font-semibold">
                        {(inputs.targetUlCellEdgeThroughputMbps ?? (inputs.technology === '4G' ? 0.256 : 0.512)) >= 1
                          ? `${inputs.targetUlCellEdgeThroughputMbps} Mbps`
                          : `${Math.round((inputs.targetUlCellEdgeThroughputMbps ?? (inputs.technology === '4G' ? 0.256 : 0.512)) * 1000)} kbps`}
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.05"
                        min="0.05"
                        max="25"
                        value={inputs.targetUlCellEdgeThroughputMbps ?? (inputs.technology === '4G' ? 0.256 : 0.512)}
                        onChange={(e) => update({ targetUlCellEdgeThroughputMbps: Math.max(0.01, Number(e.target.value)) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-emerald-300 font-mono focus:border-emerald-400 focus:outline-none"
                      />
                      <span className="text-xs text-slate-400 font-mono self-center">Mbps</span>
                    </div>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {[
                        { label: '128 kbps', val: 0.128 },
                        { label: '256 kbps', val: 0.256 },
                        { label: '512 kbps', val: 0.512 },
                        { label: '1.0 Mbps', val: 1.0 },
                        { label: '2.0 Mbps', val: 2.0 }
                      ].map(item => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => update({ targetUlCellEdgeThroughputMbps: item.val })}
                          className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                            Math.abs((inputs.targetUlCellEdgeThroughputMbps ?? (inputs.technology === '4G' ? 0.256 : 0.512)) - item.val) < 0.001
                              ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/60 font-bold'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VONR 5G CONTROLS */}
            {inputs.serviceProfile === 'VONR_5G' && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-md p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-mono text-cyan-300 font-semibold">
                      VoNR 5G Speech Codec & Bundling Parameters (3GPP TS 26.114)
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                    5QI 1 Conversational QoS
                  </span>
                </div>

                {inputs.technology === '4G' && (
                  <div className="bg-amber-950/40 border border-amber-600/50 rounded p-2 text-xs font-mono flex items-center justify-between gap-2">
                    <span className="text-amber-200">
                      VoNR is native to 5G NR Standalone. Currently selected standard is 4G.
                    </span>
                    <button
                      type="button"
                      onClick={() => update({ technology: '5G_SA' })}
                      className="bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 px-2.5 py-1 rounded text-[11px] whitespace-nowrap cursor-pointer"
                    >
                      Switch to 5G NR SA
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 mb-1">
                      3GPP VoNR Audio Codec
                    </label>
                    <select
                      value={inputs.vonrCodec || 'EVS_13_2'}
                      onChange={(e) => update({ vonrCodec: e.target.value as VoNrCodec })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-cyan-300 font-mono focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="EVS_13_2">EVS-WB 13.2 kbps (3GPP Default HD Voice)</option>
                      <option value="EVS_24_4">EVS-SWB 24.4 kbps (High Fidelity Audio)</option>
                      <option value="AMR_WB_12_65">AMR-WB 12.65 kbps (Rel-15 Interop)</option>
                      <option value="AMR_WB_23_85">AMR-WB 23.85 kbps</option>
                      <option value="AMR_NB_12_2">AMR-NB 12.2 kbps (Legacy Narrowband)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      Packet period: 20 ms · RoHC compressed
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 mb-1">
                      5G Slot Aggregation / Bundling
                    </label>
                    <select
                      value={inputs.vonrSlotAggregation ?? 4}
                      onChange={(e) => update({ vonrSlotAggregation: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-cyan-300 font-mono focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="1">1 Slot (No Aggregation)</option>
                      <option value="2">2 Slots (+1.8 dB Bundling Gain)</option>
                      <option value="4">4 Slots (+3.6 dB Bundling Gain - Default)</option>
                      <option value="8">8 Slots (+5.4 dB Bundling Gain)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      TTI aggregation boosts cell-edge voice reach
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 mb-1">
                      Resource Allocation & BLER
                    </label>
                    <div className="bg-slate-950 border border-slate-800 rounded p-2 text-[11px] font-mono text-slate-300 space-y-0.5">
                      <div>Allocated PRB: <span className="text-cyan-400 font-semibold">1 PRB (12 SCs)</span></div>
                      <div>Target BLER: <span className="text-emerald-400 font-semibold">1.0% (strict voice)</span></div>
                      <div>Demod Req SNR: <span className="text-cyan-300 font-semibold">DL {serviceSummary.dlRequiredSnrDb} dB / UL {serviceSummary.ulRequiredSnrDb} dB</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VOLTE 4G CONTROLS */}
            {inputs.serviceProfile === 'VOLTE_4G' && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-md p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-mono text-emerald-300 font-semibold">
                      VoLTE 4G Codec & TTI Bundling Requirements (3GPP TS 26.114 / TS 36.213)
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                    QCI 1 Conversational QoS
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 mb-1">
                      3GPP VoLTE Audio Codec
                    </label>
                    <select
                      value={inputs.volteCodec || 'AMR_WB_12_65'}
                      onChange={(e) => update({ volteCodec: e.target.value as VoLteCodec })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-emerald-300 font-mono focus:border-emerald-400 focus:outline-none"
                    >
                      <option value="AMR_WB_12_65">AMR-WB 12.65 kbps (HD Voice Default)</option>
                      <option value="AMR_WB_23_85">AMR-WB 23.85 kbps (High Quality)</option>
                      <option value="AMR_NB_12_2">AMR-NB 12.2 kbps (Standard Voice)</option>
                      <option value="EVS_13_2">EVS-WB 13.2 kbps over LTE</option>
                    </select>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      Packet period: 20 ms · 1 PRB (180 kHz)
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 mb-1">
                      3GPP TTI Bundling (4 Subframes)
                    </label>
                    <select
                      value={inputs.volteTtiBundling ? 'ENABLED' : 'DISABLED'}
                      onChange={(e) => update({ volteTtiBundling: e.target.value === 'ENABLED' })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-emerald-300 font-mono focus:border-emerald-400 focus:outline-none"
                    >
                      <option value="ENABLED">Enabled (4 Subframe Bundling: +4.0 dB UL Gain)</option>
                      <option value="DISABLED">Disabled (Normal Subframe Transmission)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      Bundles 4 consecutive subframes to boost UL MAPL
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 mb-1">
                      Resource Allocation & BLER
                    </label>
                    <div className="bg-slate-950 border border-slate-800 rounded p-2 text-[11px] font-mono text-slate-300 space-y-0.5">
                      <div>Allocated PRB: <span className="text-emerald-400 font-semibold">1 PRB (180 kHz)</span></div>
                      <div>Target BLER: <span className="text-emerald-400 font-semibold">1.0% (strict voice)</span></div>
                      <div>Demod Req SNR: <span className="text-emerald-300 font-semibold">DL {serviceSummary.dlRequiredSnrDb} dB / UL {serviceSummary.ulRequiredSnrDb} dB</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NB-IOT 4G CONTROLS */}
            {inputs.serviceProfile === 'NBIOT_4G' && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-md p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-mono text-amber-300 font-semibold">
                      NB-IoT for 4G (In-Band / Guard-Band / Standalone Specs - 3GPP TS 36.211)
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-mono bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
                    MCL up to 164 dB
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* 1. Deployment Mode */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 mb-1">
                      Deployment Mode (3GPP)
                    </label>
                    <select
                      value={inputs.nbiotDeploymentMode || 'IN_BAND'}
                      onChange={(e) => update({ nbiotDeploymentMode: e.target.value as NbIoTDeploymentMode })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-amber-300 font-mono focus:border-amber-400 focus:outline-none"
                    >
                      <option value="IN_BAND">In-Band (LTE PRB +6dB Boost)</option>
                      <option value="GUARD_BAND">Guard-Band (LTE 200kHz Edge)</option>
                      <option value="STANDALONE">Standalone / Out-of-Band (200kHz)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      {inputs.nbiotDeploymentMode === 'GUARD_BAND' ? 'Placed in carrier guard band' : inputs.nbiotDeploymentMode === 'STANDALONE' ? 'Dedicated refarmed spectrum' : 'Shares power inside LTE carrier'}
                    </span>
                  </div>

                  {/* 2. Subcarrier Spacing & Tone Mode */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 mb-1">
                      Subcarrier Spacing & Tone Mode
                    </label>
                    <select
                      value={inputs.nbiotScs || '15KHZ_SINGLE'}
                      onChange={(e) => update({ nbiotScs: e.target.value as NbIoTSubcarrierSpacing })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-amber-300 font-mono focus:border-amber-400 focus:outline-none"
                    >
                      <option value="15KHZ_SINGLE">15 kHz Single-Tone (+10.8 dB PSD Boost)</option>
                      <option value="3_75KHZ_SINGLE">3.75 kHz Single-Tone (+16.8 dB PSD Boost)</option>
                      <option value="15KHZ_MULTI">15 kHz Multi-Tone (12 SCs / 180 kHz)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      Single-tone concentrates UE power in 1 tone
                    </span>
                  </div>

                  {/* 3. Coverage Enhancement Level */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 mb-1">
                      Coverage Enhancement (CE Level)
                    </label>
                    <select
                      value={inputs.nbiotCeLevel || 'CE_LEVEL_1'}
                      onChange={(e) => update({ nbiotCeLevel: e.target.value as NbIoTCeLevel })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-amber-300 font-mono focus:border-amber-400 focus:outline-none"
                    >
                      <option value="CE_LEVEL_0">CE Level 0 (Normal - Rep 1, MCL 144 dB)</option>
                      <option value="CE_LEVEL_1">CE Level 1 (Robust - Rep 8, MCL 154 dB)</option>
                      <option value="CE_LEVEL_2">CE Level 2 (Deep Extreme - Rep 64, MCL 164 dB)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      {inputs.nbiotCeLevel === 'CE_LEVEL_2' ? 'Deep basement / meter penetration' : 'Standard outdoor/indoor coverage'}
                    </span>
                  </div>

                  {/* 4. Target Bitrate & Power Class */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 mb-1">
                      Target Bitrate & UE Class
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={inputs.nbiotPowerClassDbm ?? 23}
                        onChange={(e) => update({ nbiotPowerClassDbm: Number(e.target.value) })}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-amber-300 font-mono"
                      >
                        <option value="23">23 dBm (Class 3)</option>
                        <option value="14">14 dBm (Class 5/6)</option>
                      </select>
                      <div className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-[11px] font-mono text-amber-400 flex items-center justify-center font-bold">
                        {serviceSummary.targetUlThroughputFormatted}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      Req SNR: DL {serviceSummary.dlRequiredSnrDb} dB / UL {serviceSummary.ulRequiredSnrDb} dB
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* REDCAP 5G CONTROLS */}
            {inputs.serviceProfile === 'REDCAP_5G' && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-md p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-xs font-mono text-violet-300 font-semibold">
                      RedCap for 5G (NR Reduced Capability / NR-Light - Rel-17 TS 38.101-1)
                    </span>
                  </div>
                  <span className="text-[10px] text-violet-300 font-mono bg-violet-950/60 border border-violet-800/60 px-2 py-0.5 rounded">
                    Max 20 MHz BWP
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Profile Preset */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-mono text-slate-300 mb-1">
                      RedCap Device Profile
                    </label>
                    <select
                      value={inputs.redcapProfile || 'INDUSTRIAL_SENSOR'}
                      onChange={(e) => update({ redcapProfile: e.target.value as RedCapProfile })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-violet-300 font-mono focus:border-violet-400 focus:outline-none"
                    >
                      <option value="INDUSTRIAL_SENSOR">Industrial Wireless Sensor & Robotics (5 Mbps DL / 2 Mbps UL)</option>
                      <option value="VIDEO_SURVEILLANCE">Smart Video Surveillance / CCTV (2 Mbps DL / 5 Mbps UL)</option>
                      <option value="WEARABLE">Smart Wearables / Smart Watch (1 Mbps DL / 500 kbps UL)</option>
                      <option value="CUSTOM_REDCAP">Custom RedCap User Defined Profile</option>
                    </select>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      65% lower modem complexity & extended battery life
                    </span>
                  </div>

                  {/* Antenna Branches */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 mb-1">
                      UE Rx Antennas
                    </label>
                    <select
                      value={inputs.redcapRxBranches ?? 1}
                      onChange={(e) => update({ redcapRxBranches: Number(e.target.value) as 1 | 2 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-violet-300 font-mono focus:border-violet-400 focus:outline-none"
                    >
                      <option value="1">1 Rx (Single-Antenna, Ultra Low Cost)</option>
                      <option value="2">2 Rx (Dual-Antenna with Diversity)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      1T1R or 1T2R architecture
                    </span>
                  </div>

                  {/* Target Values */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 mb-1">
                      Cell Edge Target Throughput
                    </label>
                    <div className="bg-slate-950 border border-slate-800 rounded p-2 text-[11px] font-mono text-violet-300 space-y-0.5">
                      <div>DL: <span className="font-semibold text-white">{serviceSummary.targetDlThroughputFormatted}</span></div>
                      <div>UL: <span className="font-semibold text-white">{serviceSummary.targetUlThroughputFormatted}</span></div>
                      <div className="text-[10px] text-slate-500">Req SNR: DL {serviceSummary.dlRequiredSnrDb} dB / UL {serviceSummary.ulRequiredSnrDb} dB</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MCX / PUBLIC SAFETY CONTROLS */}
            {inputs.serviceProfile === 'MCX_PUBLIC_SAFETY' && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-md p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-xs font-mono text-rose-300 font-semibold">
                      MCX / Public Safety Mission Critical Profiles (3GPP TS 22.179 / TS 23.379)
                    </span>
                  </div>
                  <span className="text-[10px] text-rose-300 font-mono bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded">
                    99.9% Reliability Target
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Mission Critical Profile */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-mono text-slate-300 mb-1">
                      Mission Critical Service Type
                    </label>
                    <select
                      value={inputs.mcxProfile || 'MCPTT'}
                      onChange={(e) => update({ mcxProfile: e.target.value as McxProfile })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-rose-300 font-mono focus:border-rose-400 focus:outline-none"
                    >
                      <option value="MCPTT">MCPTT (Mission Critical Push-to-Talk - QCI 65 / 5QI 65, 24.4 kbps Voice)</option>
                      <option value="MCVIDEO">MCVideo (Mission Critical Video - QCI 67 / 5QI 67, 1.5 Mbps DL / 2.0 Mbps Live)</option>
                      <option value="MCDATA">MCData (Mission Critical Data / Situational Awareness - QCI 69 / 5QI 69, 256 kbps)</option>
                      <option value="CUSTOM_MCX">Custom Public Safety Profile (User Defined)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      Dedicated high-priority public safety QoS bearers
                    </span>
                  </div>

                  {/* HPUE Class 2 */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 mb-1">
                      High-Power UE (HPUE)
                    </label>
                    <select
                      value={inputs.mcxHpueEnabled ? 'HPUE_ON' : 'HPUE_OFF'}
                      onChange={(e) => update({ mcxHpueEnabled: e.target.value === 'HPUE_ON' })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-rose-300 font-mono focus:border-rose-400 focus:outline-none"
                    >
                      <option value="HPUE_ON">HPUE Class 2 (+26 dBm / 400 mW - Boosted)</option>
                      <option value="HPUE_OFF">Standard UE (+23 dBm / 200 mW)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      FirstNet / emergency responders high power transmitter
                    </span>
                  </div>

                  {/* Target Reliability */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 mb-1">
                      Packet Reliability Target
                    </label>
                    <select
                      value={inputs.mcxReliabilityTargetPercent ?? 99.0}
                      onChange={(e) => update({ mcxReliabilityTargetPercent: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-rose-300 font-mono focus:border-rose-400 focus:outline-none"
                    >
                      <option value="99.9">99.9% Reliability (Strict BLER 0.1%)</option>
                      <option value="99.0">99.0% Reliability (BLER 1.0%)</option>
                      <option value="95.0">95.0% Reliability (BLER 5.0%)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      Req SNR: DL {serviceSummary.dlRequiredSnrDb} dB / UL {serviceSummary.ulRequiredSnrDb} dB
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* LIVE REQUIRED CELL EDGE CALCULATION RESULT CARD */}
            <div className="bg-slate-900 border border-cyan-500/40 rounded-lg p-3.5 space-y-2 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-white uppercase">
                    Required Cell Edge Calculation Result ({serviceSummary.displayName})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-slate-400">Calculated Radius: </span>
                  <span className="text-base font-mono font-bold text-cyan-300">
                    {serviceSummary.calculatedEdgeRangeKm >= 1 ? `${serviceSummary.calculatedEdgeRangeKm.toFixed(3)} km` : `${serviceSummary.calculatedEdgeRangeMeters} m`}
                  </span>
                  <span className="text-xs font-mono text-slate-400"> ({serviceSummary.calculatedEdgeRangeMeters.toLocaleString()} m)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] font-mono">
                <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase">Target Data Rate</span>
                  <span className="text-cyan-300 font-semibold">{serviceSummary.targetDlThroughputFormatted} DL</span>
                  <span className="text-emerald-300 block font-semibold">{serviceSummary.targetUlThroughputFormatted} UL</span>
                </div>

                <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase">Demod Req SNR</span>
                  <span className="text-cyan-300 font-semibold">DL {serviceSummary.dlRequiredSnrDb.toFixed(1)} dB</span>
                  <span className="text-emerald-300 block font-semibold">UL {serviceSummary.ulRequiredSnrDb.toFixed(1)} dB</span>
                </div>

                <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase">Rx Sensitivity</span>
                  <span className="text-cyan-300 font-semibold">{lbResult.ueRxSensitivityDbm.toFixed(1)} dBm (UE)</span>
                  <span className="text-emerald-300 block font-semibold">{lbResult.bsRxSensitivityDbm.toFixed(1)} dBm ({inputs.technology === '4G' ? 'eNB' : 'gNB'})</span>
                </div>

                <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase">Limiting MAPL</span>
                  <span className="text-white font-bold">{lbResult.systemMaplDb.toFixed(1)} dB</span>
                  <span className={`text-[10px] block font-semibold ${lbResult.bottleneck === 'UL_LIMITED' ? 'text-amber-400' : lbResult.bottleneck === 'DL_LIMITED' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {lbResult.bottleneck === 'UL_LIMITED' ? 'UL LIMITED' : lbResult.bottleneck === 'DL_LIMITED' ? 'DL LIMITED' : 'BALANCED'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            {/* Bandwidth as per 3GPP */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                Channel Bandwidth (3GPP)
              </label>
              <select
                value={inputs.bandwidthMHz}
                onChange={(e) => update({ bandwidthMHz: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                {selectedBandInfo.bandwidthsMHz.map((bw) => (
                  <option key={bw} value={bw}>
                    {bw} MHz
                  </option>
                ))}
              </select>
            </div>

            {/* Max Modulation Enabled: 256QAM or 64QAM */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                Max. DL Modulation
              </label>
              <select
                value={inputs.maxDlModulation || '256QAM'}
                onChange={(e) => update({ maxDlModulation: e.target.value as '256QAM' | '64QAM' })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="256QAM">256QAM Enabled (Peak)</option>
                <option value="64QAM">64QAM Capped</option>
              </select>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                {inputs.maxDlModulation === '64QAM' ? 'Capped at 64QAM' : '256QAM enabled for high SINR'}
              </span>
            </div>

            {/* TDD Frame Ratio (if TDD) */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                <span>TDD Frame Ratio</span>
                {inputs.duplexMode === 'TDD' && inputs.tddFrameRatio === 'CUSTOM' && (
                  <span className="text-[10px] text-amber-400 font-semibold uppercase">Custom</span>
                )}
              </label>
              <select
                disabled={inputs.duplexMode === 'FDD'}
                value={inputs.tddFrameRatio}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'CUSTOM') {
                    update({
                      tddFrameRatio: val,
                      customTddDlPercent: inputs.customTddDlPercent ?? 75,
                      customTddUlPercent: inputs.customTddUlPercent ?? 25
                    });
                  } else {
                    update({ tddFrameRatio: val });
                  }
                }}
                className={`w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none ${
                  inputs.duplexMode === 'FDD' ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                {TDD_FRAME_PATTERNS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              {inputs.duplexMode === 'FDD' && (
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                  * FDD has 100% paired spectrum
                </span>
              )}
            </div>

            {/* Carrier Information Info Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-md p-2.5 text-xs font-mono">
              <div className="text-slate-400 mb-1">Carrier RF Center:</div>
              <div className="text-slate-200">
                DL: <span className="text-cyan-400 font-semibold">{selectedBandInfo.dlFreqMHz} MHz</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                UL: <span className="text-emerald-400 font-semibold">{selectedBandInfo.ulFreqMHz} MHz</span>
              </div>
            </div>
          </div>

          {/* User Defined / Customized TDD Frame Ratio Manual Controls */}
          {inputs.duplexMode === 'TDD' && inputs.tddFrameRatio === 'CUSTOM' && (
            <div className="mt-3 p-3.5 bg-gradient-to-r from-slate-900/90 via-amber-950/20 to-slate-900/90 border border-amber-500/40 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-amber-500/20">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                    Customized TDD Frame Ratio (User Defined)
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                    Manual Config
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  DL Duty: <span className="text-cyan-400 font-semibold">{inputs.customTddDlPercent ?? 75}%</span> | UL Duty: <span className="text-emerald-400 font-semibold">{inputs.customTddUlPercent ?? 25}%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
                {/* Manual DL Ratio Input */}
                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1">
                    Custom DL Ratio (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={5}
                      max={95}
                      step={1}
                      value={inputs.customTddDlPercent ?? 75}
                      onChange={(e) => {
                        const dl = Math.max(5, Math.min(95, Number(e.target.value) || 0));
                        update({
                          customTddDlPercent: dl,
                          customTddUlPercent: Math.max(5, 100 - dl)
                        });
                      }}
                      className="w-full bg-slate-950 border border-cyan-500/50 rounded px-2.5 py-1.5 text-xs text-cyan-300 font-mono focus:border-cyan-400 focus:outline-none"
                    />
                    <span className="absolute right-2.5 top-1.5 text-xs text-slate-500 font-mono">% DL</span>
                  </div>
                </div>

                {/* Manual UL Ratio Input */}
                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1">
                    Custom UL Ratio (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={5}
                      max={95}
                      step={1}
                      value={inputs.customTddUlPercent ?? 25}
                      onChange={(e) => {
                        const ul = Math.max(5, Math.min(95, Number(e.target.value) || 0));
                        update({
                          customTddUlPercent: ul,
                          customTddDlPercent: Math.max(5, 100 - ul)
                        });
                      }}
                      className="w-full bg-slate-950 border border-emerald-500/50 rounded px-2.5 py-1.5 text-xs text-emerald-300 font-mono focus:border-emerald-400 focus:outline-none"
                    />
                    <span className="absolute right-2.5 top-1.5 text-xs text-slate-500 font-mono">% UL</span>
                  </div>
                </div>

                {/* Interactive Slider */}
                <div className="md:col-span-2">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>Ratio Slider (DL / UL split):</span>
                    <span className="text-amber-300">{inputs.customTddDlPercent ?? 75}% DL / {inputs.customTddUlPercent ?? 25}% UL</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={95}
                    step={1}
                    value={inputs.customTddDlPercent ?? 75}
                    onChange={(e) => {
                      const dl = Number(e.target.value);
                      update({
                        customTddDlPercent: dl,
                        customTddUlPercent: 100 - dl
                      });
                    }}
                    className="w-full accent-amber-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between gap-1 mt-1.5">
                    {[
                      { label: '80:20', dl: 80, ul: 20 },
                      { label: '75:25', dl: 75, ul: 25 },
                      { label: '70:30', dl: 70, ul: 30 },
                      { label: '60:40', dl: 60, ul: 40 },
                      { label: '50:50', dl: 50, ul: 50 },
                      { label: '30:70', dl: 30, ul: 70 }
                    ].map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => update({ customTddDlPercent: p.dl, customTddUlPercent: p.ul })}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                          (inputs.customTddDlPercent ?? 75) === p.dl
                            ? 'bg-amber-500/30 text-amber-300 border-amber-500/60 font-bold'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Physical Layer Numerology, Signaling & Beam Configuration */}
          {inputs.technology !== '4G' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-800/60">
              {/* 1. Residual BLER Target */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Residual BLER Target
                  </label>
                  <span className="text-xs font-mono font-semibold text-cyan-400">
                    {inputs.residualBlerTargetPercent ?? 10}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.1"
                    max="50"
                    step="0.5"
                    value={inputs.residualBlerTargetPercent ?? 10}
                    onChange={(e) => update({ residualBlerTargetPercent: Math.max(0.1, Number(e.target.value)) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                    placeholder="10"
                  />
                  <span className="text-xs text-slate-400 font-mono">%</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                  Outer-loop target (Default: 10%)
                </span>
              </div>

              {/* 2. Number of PDSCH/PUSCH DMRS symbols per slot (5G NR) */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  PDSCH/PUSCH DMRS Symbols / Slot
                </label>
                <select
                  value={inputs.dmrsSymbolsPerSlot ?? 1}
                  onChange={(e) => update({ dmrsSymbolsPerSlot: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                >
                  <option value="1">1 Symbol (Single-symbol DMRS, Type 1)</option>
                  <option value="2">2 Symbols (Additional DMRS pos 1)</option>
                  <option value="3">3 Symbols (Double-symbol DMRS pos 2)</option>
                </select>
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                  5G Pilots overhead per 14-symbol slot (Default: 1)
                </span>
              </div>

              {/* 3. Number of beams (5G NR) */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  Number of Beams
                </label>
                <select
                  value={inputs.numberOfBeams ?? 1}
                  onChange={(e) => update({ numberOfBeams: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                >
                  <option value="1">1 Beam (Sector / Omni)</option>
                  <option value="2">2 Beams (Dual-beam splitting)</option>
                  <option value="3">3 Beams (Tri-beam pattern)</option>
                  <option value="4">4 Beams (4-Beam SS-PBCH Grid)</option>
                  <option value="5">5 Beams (5-Beam Grid)</option>
                  <option value="6">6 Beams (6-Beam Sweeping)</option>
                  <option value="7">7 Beams (7-Beam Sweeping)</option>
                  <option value="8">8 Beams (8-Beam 3GPP Sub-6 GHz Max)</option>
                </select>
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                  5G SSB / CSI-RS sweeping beams (Default: 1)
                </span>
              </div>

              {/* 4. SSB periodicity [ms] (5G NR) */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  SSB Periodicity [ms]
                </label>
                <select
                  value={inputs.ssbPeriodicityMs ?? 20}
                  onChange={(e) => update({ ssbPeriodicityMs: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                >
                  <option value="10">10 ms (High-density rapid discovery)</option>
                  <option value="20">20 ms (Default 3GPP Standalone)</option>
                  <option value="40">40 ms (Energy-saving low overhead)</option>
                  <option value="80">80 ms (Deep power conservation)</option>
                  <option value="160">160 ms (Maximum 3GPP allowed)</option>
                </select>
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                  5G SS-PBCH burst cycle (Default: 20 ms)
                </span>
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-800/60">
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs font-mono flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-slate-200 font-semibold">4G LTE Physical Layer 3GPP Defaults:</span>
                  <span className="text-slate-400">CRS (Cell-Specific Reference Signals, 4 ports) & SC-FDMA UL DMRS (2 symbols/slot) active</span>
                </div>
                <div className="text-[11px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                  3GPP TS 36.211 / TS 36.213 Standard Frame
                </div>
              </div>
            </div>
          )}

          {/* Systems Overhead & Receiver Noise Configuration */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-200">
                  Systems Overhead & Receiver Noise Configuration
                </span>
                <span className="text-[10px] bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-mono px-2 py-0.5 rounded-full">
                  {inputs.technology === '4G' ? '3GPP TS 36.101 / 36.104' : '3GPP TS 38.211 / 38.213 / 38.214'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {inputs.technology === '4G' ? '4G LTE Simplified Control & RF Noise' : 'Physical Layer Control Overhead Budgeting'}
              </div>
            </div>

            {inputs.technology !== '4G' ? (
              <div className="space-y-4">
                {/* 5G NR full 6-parameter layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {/* 1. Noise figure in DL (dB) */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold">
                        Noise figure in DL
                      </label>
                      <span className="text-xs font-mono font-bold text-cyan-400">
                        {inputs.dlNoiseFigureDb ?? inputs.ueNoiseFigureDb ?? 7} dB
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mb-2">
                      UE receiver LNA (Default: 7 dB)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      step="0.5"
                      value={inputs.dlNoiseFigureDb ?? inputs.ueNoiseFigureDb ?? 7}
                      onChange={(e) => {
                        const val = Math.max(0.1, Number(e.target.value));
                        update({ dlNoiseFigureDb: val, ueNoiseFigureDb: val });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                      placeholder="7"
                    />
                    <span className="text-xs text-slate-400 font-mono">dB</span>
                  </div>
                </div>

                {/* 2. Noise figure in UL (dB) */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold">
                        Noise figure in UL
                      </label>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {inputs.ulNoiseFigureDb ?? inputs.bsNoiseFigureDb ?? 4} dB
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mb-2">
                      gNB/eNB receiver (Default: 4 dB)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="15"
                      step="0.5"
                      value={inputs.ulNoiseFigureDb ?? inputs.bsNoiseFigureDb ?? 4}
                      onChange={(e) => {
                        const val = Math.max(0.1, Number(e.target.value));
                        update({ ulNoiseFigureDb: val, bsNoiseFigureDb: val });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                      placeholder="4"
                    />
                    <span className="text-xs text-slate-400 font-mono">dB</span>
                  </div>
                </div>

                {/* 3. Number of CSI-RS reports within report period */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold">
                        CSI-RS reports
                      </label>
                      <span className="text-xs font-mono font-bold text-cyan-400">
                        {inputs.csiRsReportsPerPeriod ?? 2} rpts
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mb-2">
                      Within report period (1 to 5)
                    </p>
                  </div>
                  <select
                    value={inputs.csiRsReportsPerPeriod ?? 2}
                    onChange={(e) => update({ csiRsReportsPerPeriod: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="1">1 Report (Minimum OH)</option>
                    <option value="2">2 Reports (Default 3GPP)</option>
                    <option value="3">3 Reports (Balanced)</option>
                    <option value="4">4 Reports (Enhanced CSI)</option>
                    <option value="5">5 Reports (High tracking)</option>
                  </select>
                </div>

                {/* 4. CSI-RS for CA periodicity (slots) */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold">
                        CSI-RS CA periodicity
                      </label>
                      <span className="text-xs font-mono font-bold text-cyan-400">
                        {inputs.csiRsCaPeriodicitySlots ?? 20} slots
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mb-2">
                      Periodicity (10, 20, 40, 80 slots)
                    </p>
                  </div>
                  <select
                    value={inputs.csiRsCaPeriodicitySlots ?? 20}
                    onChange={(e) => update({ csiRsCaPeriodicitySlots: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="10">10 slots (High frequency)</option>
                    <option value="20">20 slots (Default CA)</option>
                    <option value="40">40 slots (Medium)</option>
                    <option value="80">80 slots (Low overhead)</option>
                  </select>
                </div>

                {/* 5. Average PDCCH overhead (%) - CALCULATED (< 10%) */}
                <div className="bg-slate-950/90 border border-cyan-800/60 rounded-lg p-3 flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-300 font-semibold flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-cyan-400 inline" />
                        Avg PDCCH Overhead
                      </span>
                      <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/90 border border-cyan-700/60 px-1.5 py-0.5 rounded">
                        &lt; 10%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mb-2">
                      Calculated from BW, Beams, CA & DMRS
                    </p>
                  </div>
                  <div className="bg-slate-900/90 border border-cyan-900/60 rounded p-2 text-center">
                    <div className="text-xl font-mono font-bold text-cyan-300 tabular-nums">
                      {overheads.avgPdcchOverheadPercent.toFixed(2)}%
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block"></span>
                      <span>Dynamic DL Control (&lt; 10%)</span>
                    </div>
                  </div>
                </div>

                {/* 6. Average PUCCH overhead (%) - CALCULATED (< 20%) */}
                <div className="bg-slate-950/90 border border-emerald-800/60 rounded-lg p-3 flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-300 font-semibold flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-emerald-400 inline" />
                        Avg PUCCH Overhead
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-700/60 px-1.5 py-0.5 rounded">
                        &lt; 20%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mb-2">
                      Calculated from CSI, CA slots & TDD
                    </p>
                  </div>
                  <div className="bg-slate-900/90 border border-emerald-900/60 rounded p-2 text-center">
                    <div className="text-xl font-mono font-bold text-emerald-300 tabular-nums">
                      {overheads.avgPucchOverheadPercent.toFixed(2)}%
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                      <span>Dynamic UL Control (&lt; 20%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3GPP Receiver Sensitivity Engineering (DL UE & UL gNB) */}
              <div className="mt-4 pt-4 border-t border-slate-800/80">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-cyan-400/20" />
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-200">
                      3GPP Receiver Sensitivity (dBm) & Cell-Edge Service Engineering
                    </span>
                    <span className="text-[10px] bg-slate-800 text-cyan-300 font-mono px-2 py-0.5 rounded border border-slate-700">
                      P_sens = P_thermal_sc + 10·log₁₀(N_sc) + NF + SNR_req - G_rx
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Directly Drives MAPL Headroom & Cell Range
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Downlink UE Receiver Sensitivity Card & Controls */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-cyan-400" />
                        <div>
                          <span className="text-xs font-mono font-bold text-slate-100 uppercase">
                            Downlink UE Receiver Sensitivity (P_sens,DL)
                          </span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            Service: {serviceSummary.displayName} @ Cell Edge
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-mono font-bold text-cyan-300 tabular-nums">
                          {rxSensitivityBreakdown.dl.sensitivityDbm.toFixed(1)} <span className="text-xs font-normal text-slate-400">dBm</span>
                        </div>
                        <span className="text-[10px] font-mono text-cyan-400/80">UE Antenna Port</span>
                      </div>
                    </div>

                    {/* DL Sensitivity Formula Breakdown Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/90 p-2.5 rounded border border-slate-800/80 text-[11px] font-mono">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">P_thermal/SC</span>
                        <span className="text-slate-200 font-semibold">{rxSensitivityBreakdown.dl.thermalNoisePerSubcarrierDbm.toFixed(2)}</span>
                        <span className="text-[9px] text-slate-500 block">dBm/SC ({rxSensitivityBreakdown.dl.scsKhz}kHz)</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Received SCs</span>
                        <span className="text-cyan-300 font-semibold">{rxSensitivityBreakdown.dl.receivedSubcarriers}</span>
                        <span className="text-[9px] text-slate-500 block">+{(10 * Math.log10(rxSensitivityBreakdown.dl.receivedSubcarriers)).toFixed(1)} dB</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">UE Noise Fig.</span>
                        <span className="text-slate-200 font-semibold">+{rxSensitivityBreakdown.dl.noiseFigureDb.toFixed(1)} dB</span>
                        <span className="text-[9px] text-slate-500 block">Floor {rxSensitivityBreakdown.dl.thermalNoiseFloorDbm.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Req SNR / Div</span>
                        <span className="text-emerald-300 font-semibold">{rxSensitivityBreakdown.dl.requiredSnrDb.toFixed(1)} dB</span>
                        <span className="text-[9px] text-slate-500 block">Div -{rxSensitivityBreakdown.dl.rxDiversityGainDb.toFixed(1)} dB</span>
                      </div>
                    </div>

                    {/* Interactive DL Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1 flex justify-between">
                          <span>DL Required SNR @ Edge</span>
                          <span className="text-cyan-400 font-semibold">{inputs.dlRequiredSnrDb !== undefined ? inputs.dlRequiredSnrDb : -4.5} dB</span>
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="-15"
                          max="15"
                          value={inputs.dlRequiredSnrDb !== undefined ? inputs.dlRequiredSnrDb : -4.5}
                          onChange={(e) => update({ dlRequiredSnrDb: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                          placeholder="-4.5"
                        />
                        <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                          Demodulation threshold for PS DL Data (QPSK)
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                          No. of Received Subcarriers (DL)
                        </label>
                        <select
                          value={inputs.dlSubcarriersCount ?? 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            update({ dlSubcarriersCount: val > 0 ? val : undefined });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                        >
                          <option value="0">Full Channel Bandwidth ({rxSensitivityBreakdown.dl.receivedSubcarriers} SCs - Default)</option>
                          <option value="12">1 PRB (12 Subcarriers - Min Edge)</option>
                          <option value="48">4 PRBs (48 Subcarriers)</option>
                          <option value="144">12 PRBs (144 Subcarriers)</option>
                          <option value="300">25 PRBs (300 Subcarriers)</option>
                          <option value="600">50 PRBs (600 Subcarriers)</option>
                        </select>
                        <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                          Bandwidth allocation for PS DL Data reception
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Uplink gNodeB Receiver Sensitivity Card & Controls */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-emerald-400" />
                        <div>
                          <span className="text-xs font-mono font-bold text-slate-100 uppercase">
                            Uplink gNB Receiver Sensitivity (P_sens,UL)
                          </span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            Service: {serviceSummary.displayName} @ Cell Edge
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-mono font-bold text-emerald-300 tabular-nums">
                          {rxSensitivityBreakdown.ul.sensitivityDbm.toFixed(1)} <span className="text-xs font-normal text-slate-400">dBm</span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400/80">gNB Antenna Port</span>
                      </div>
                    </div>

                    {/* UL Sensitivity Formula Breakdown Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/90 p-2.5 rounded border border-slate-800/80 text-[11px] font-mono">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">P_thermal/SC</span>
                        <span className="text-slate-200 font-semibold">{rxSensitivityBreakdown.ul.thermalNoisePerSubcarrierDbm.toFixed(2)}</span>
                        <span className="text-[9px] text-slate-500 block">dBm/SC ({rxSensitivityBreakdown.ul.scsKhz}kHz)</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Allocated SCs</span>
                        <span className="text-emerald-300 font-semibold">{rxSensitivityBreakdown.ul.receivedSubcarriers}</span>
                        <span className="text-[9px] text-slate-500 block">{rxSensitivityBreakdown.ul.allocatedPrbs} PRBs (+{(10 * Math.log10(rxSensitivityBreakdown.ul.receivedSubcarriers)).toFixed(1)}dB)</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">gNB Noise Fig.</span>
                        <span className="text-slate-200 font-semibold">+{rxSensitivityBreakdown.ul.noiseFigureDb.toFixed(1)} dB</span>
                        <span className="text-[9px] text-slate-500 block">Floor {rxSensitivityBreakdown.ul.thermalNoiseFloorDbm.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Req SNR / Array</span>
                        <span className="text-emerald-300 font-semibold">{rxSensitivityBreakdown.ul.requiredSnrDb.toFixed(1)} dB</span>
                        <span className="text-[9px] text-slate-500 block">Array -{rxSensitivityBreakdown.ul.rxGainDb.toFixed(1)} dB</span>
                      </div>
                    </div>

                    {/* Interactive UL Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1 flex justify-between">
                          <span>UL Required SNR @ Edge</span>
                          <span className="text-emerald-400 font-semibold">{inputs.ulRequiredSnrDb !== undefined ? inputs.ulRequiredSnrDb : -4.0} dB</span>
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="-15"
                          max="15"
                          value={inputs.ulRequiredSnrDb !== undefined ? inputs.ulRequiredSnrDb : -4.0}
                          onChange={(e) => update({ ulRequiredSnrDb: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                          placeholder="-4.0"
                        />
                        <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                          Demodulation threshold for PS UL Data (QPSK)
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                          No. of Received Subcarriers (UL)
                        </label>
                        <select
                          value={inputs.ulSubcarriersCount ?? 24}
                          onChange={(e) => update({ ulSubcarriersCount: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                        >
                          <option value="12">1 PRB (12 Subcarriers - Max PSD / Range)</option>
                          <option value="24">2 PRBs (24 Subcarriers - 3GPP Standard Default)</option>
                          <option value="48">4 PRBs (48 Subcarriers - Balanced Uplink)</option>
                          <option value="96">8 PRBs (96 Subcarriers - High Rate Uplink)</option>
                        </select>
                        <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                          UL cell edge allocation (PSD concentration)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
              /* 4G LTE Simplified 4-item layout: Only DL/UL NF + Calculated PDCCH & PUCCH */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* 1. Noise figure in DL (dB) */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                          Noise figure in DL
                        </label>
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          {inputs.dlNoiseFigureDb ?? inputs.ueNoiseFigureDb ?? 7} dB
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mb-2">
                        UE receiver LNA (Default: 7 dB)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        step="0.5"
                        value={inputs.dlNoiseFigureDb ?? inputs.ueNoiseFigureDb ?? 7}
                        onChange={(e) => {
                          const val = Math.max(0.1, Number(e.target.value));
                          update({ dlNoiseFigureDb: val, ueNoiseFigureDb: val });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                        placeholder="7"
                      />
                      <span className="text-xs text-slate-400 font-mono">dB</span>
                    </div>
                  </div>

                  {/* 2. Noise figure in UL (dB) */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                          Noise figure in UL
                        </label>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {inputs.ulNoiseFigureDb ?? inputs.bsNoiseFigureDb ?? 4} dB
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mb-2">
                        eNodeB receiver LNA (Default: 4 dB)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="15"
                        step="0.5"
                        value={inputs.ulNoiseFigureDb ?? inputs.bsNoiseFigureDb ?? 4}
                        onChange={(e) => {
                          const val = Math.max(0.1, Number(e.target.value));
                          update({ ulNoiseFigureDb: val, bsNoiseFigureDb: val });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                        placeholder="4"
                      />
                      <span className="text-xs text-slate-400 font-mono">dB</span>
                    </div>
                  </div>

                  {/* 3. Average PDCCH overhead (%) - CALCULATED (< 10%) */}
                  <div className="bg-slate-950/90 border border-cyan-800/60 rounded-lg p-3.5 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-semibold flex items-center gap-1">
                          <Gauge className="w-3.5 h-3.5 text-cyan-400 inline" />
                          Avg PDCCH Overhead
                        </span>
                        <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/90 border border-cyan-700/60 px-1.5 py-0.5 rounded">
                          &lt; 10%
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mb-2">
                        3GPP LTE Control Region (1-3 OFDM symbols)
                      </p>
                    </div>
                    <div className="bg-slate-900/90 border border-cyan-900/60 rounded p-2 text-center">
                      <div className="text-xl font-mono font-bold text-cyan-300 tabular-nums">
                        {overheads.avgPdcchOverheadPercent.toFixed(2)}%
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block"></span>
                        <span>LTE Downlink PDCCH/PCFICH/PHICH</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Average PUCCH overhead (%) - CALCULATED (< 20%) */}
                  <div className="bg-slate-950/90 border border-emerald-800/60 rounded-lg p-3.5 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-mono uppercase tracking-wider text-emerald-300 font-semibold flex items-center gap-1">
                          <Gauge className="w-3.5 h-3.5 text-emerald-400 inline" />
                          Avg PUCCH Overhead
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-700/60 px-1.5 py-0.5 rounded">
                          &lt; 20%
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mb-2">
                        3GPP LTE PUCCH Edge PRBs (Format 1/2)
                      </p>
                    </div>
                    <div className="bg-slate-900/90 border border-emerald-900/60 rounded p-2 text-center">
                      <div className="text-xl font-mono font-bold text-emerald-300 tabular-nums">
                        {overheads.avgPucchOverheadPercent.toFixed(2)}%
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                        <span>LTE Uplink PUCCH Control Region</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4G LTE Receiver Sensitivity Engineering (DL UE & UL eNodeB) */}
                <div className="pt-3 border-t border-slate-800/80">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-cyan-400/20" />
                      <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-200">
                        4G LTE Receiver Sensitivity (dBm) & Cell-Edge Service
                      </span>
                      <span className="text-[10px] bg-slate-800 text-cyan-300 font-mono px-2 py-0.5 rounded border border-slate-700">
                        3GPP TS 36.101 & TS 36.104
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      15 kHz Standard SCS (-132.24 dBm/SC)
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* DL UE Sensitivity Card (4G) */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-cyan-400" />
                          <div>
                            <span className="text-xs font-mono font-bold text-slate-100 uppercase">
                              4G UE Receiver Sensitivity
                            </span>
                            <span className="block text-[10px] text-slate-400 font-mono">
                              Service: PS DL Data @ Cell Edge (QPSK)
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-mono font-bold text-cyan-300 tabular-nums">
                            {rxSensitivityBreakdown.dl.sensitivityDbm.toFixed(1)} <span className="text-xs font-normal text-slate-400">dBm</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-slate-900/90 p-2 rounded border border-slate-800/80 text-[11px] font-mono">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">P_thermal/SC</span>
                          <span className="text-slate-200 font-semibold">-132.24 dBm</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">Received SCs</span>
                          <span className="text-cyan-300 font-semibold">{rxSensitivityBreakdown.dl.receivedSubcarriers} SCs</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">UE Noise Fig.</span>
                          <span className="text-slate-200 font-semibold">+{rxSensitivityBreakdown.dl.noiseFigureDb.toFixed(1)} dB</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1 flex justify-between">
                            <span>DL Req SNR @ Edge</span>
                            <span className="text-cyan-400 font-semibold">{inputs.dlRequiredSnrDb !== undefined ? inputs.dlRequiredSnrDb : -5.0} dB</span>
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="-15"
                            max="15"
                            value={inputs.dlRequiredSnrDb !== undefined ? inputs.dlRequiredSnrDb : -5.0}
                            onChange={(e) => update({ dlRequiredSnrDb: Number(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                            placeholder="-5.0"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                            No. of Received Subcarriers
                          </label>
                          <select
                            value={inputs.dlSubcarriersCount ?? 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              update({ dlSubcarriersCount: val > 0 ? val : undefined });
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                          >
                            <option value="0">Full LTE Channel ({rxSensitivityBreakdown.dl.receivedSubcarriers} SCs)</option>
                            <option value="12">1 PRB (12 SCs)</option>
                            <option value="48">4 PRBs (48 SCs)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* UL eNodeB Sensitivity Card (4G) */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <Radio className="w-4 h-4 text-emerald-400" />
                          <div>
                            <span className="text-xs font-mono font-bold text-slate-100 uppercase">
                              4G eNodeB Receiver Sensitivity
                            </span>
                            <span className="block text-[10px] text-slate-400 font-mono">
                              Service: {serviceSummary.displayName} @ Cell Edge
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-mono font-bold text-emerald-300 tabular-nums">
                            {rxSensitivityBreakdown.ul.sensitivityDbm.toFixed(1)} <span className="text-xs font-normal text-slate-400">dBm</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-slate-900/90 p-2 rounded border border-slate-800/80 text-[11px] font-mono">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">P_thermal/SC</span>
                          <span className="text-slate-200 font-semibold">-132.24 dBm</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">Allocated SCs</span>
                          <span className="text-emerald-300 font-semibold">{rxSensitivityBreakdown.ul.receivedSubcarriers} SCs ({rxSensitivityBreakdown.ul.allocatedPrbs} PRBs)</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">eNB Noise Fig.</span>
                          <span className="text-slate-200 font-semibold">+{rxSensitivityBreakdown.ul.noiseFigureDb.toFixed(1)} dB</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1 flex justify-between">
                            <span>UL Req SNR @ Edge</span>
                            <span className="text-emerald-400 font-semibold">{inputs.ulRequiredSnrDb !== undefined ? inputs.ulRequiredSnrDb : -4.5} dB</span>
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="-15"
                            max="15"
                            value={inputs.ulRequiredSnrDb !== undefined ? inputs.ulRequiredSnrDb : -4.5}
                            onChange={(e) => update({ ulRequiredSnrDb: Number(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                            placeholder="-4.5"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                            No. of Received Subcarriers
                          </label>
                          <select
                            value={inputs.ulSubcarriersCount ?? 24}
                            onChange={(e) => update({ ulSubcarriersCount: Number(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                          >
                            <option value="12">1 PRB (12 SCs)</option>
                            <option value="24">2 PRBs (24 SCs - 3GPP Default)</option>
                            <option value="48">4 PRBs (48 SCs)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: BASE STATION (eNodeB / gNodeB) */}
      {activeSection === 'bs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* DL Cell TX Power Max */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  DL Cell Max TX Power
                </label>
                <span className="text-xs font-mono font-semibold text-cyan-400">
                  {inputs.bsTxPowerDbm} dBm ({Math.round(Math.pow(10, (inputs.bsTxPowerDbm - 30) / 10))} W)
                </span>
              </div>
              <input
                type="range"
                min="38"
                max="56"
                step="0.5"
                value={inputs.bsTxPowerDbm}
                onChange={(e) => update({ bsTxPowerDbm: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>38 dBm (6.3W)</span>
                <span>46 dBm (40W)</span>
                <span>53 dBm (200W)</span>
                <span>56 dBm (400W)</span>
              </div>
            </div>

            {/* BS Antenna Gain */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  BS Antenna Gain
                </label>
                <span className="text-xs font-mono font-semibold text-slate-200">
                  {inputs.bsAntennaGainDbi} dBi
                </span>
              </div>
              <input
                type="range"
                min="12"
                max="28"
                step="0.5"
                value={inputs.bsAntennaGainDbi}
                onChange={(e) => update({ bsAntennaGainDbi: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>12 dBi (Micro)</span>
                <span>18 dBi (Macro)</span>
                <span>24.5 dBi (Massive MIMO AAU)</span>
              </div>
            </div>

            {/* Feeder & Cable Losses */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Feeder / Cable Loss
                </label>
                <span className="text-xs font-mono font-semibold text-slate-200">
                  {inputs.bsFeederCableLossDb} dB
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="4"
                step="0.1"
                value={inputs.bsFeederCableLossDb}
                onChange={(e) => update({ bsFeederCableLossDb: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>0.0 dB (AAU/integrated)</span>
                <span>0.5 dB (RRU jumper)</span>
                <span>2.5 dB (Long Feeder)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* MIMO Mode of Operation */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                MIMO Mode of Operation
              </label>
              <select
                value={inputs.mimoMode}
                onChange={(e) => update({ mimoMode: e.target.value as MimoMode })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="SISO">SISO (1x1 Single-Input Single-Output)</option>
                <option value="2x2">2x2 (2T2R Conventional Cross-Pol)</option>
                <option value="4x4">4x4 (4T4R Spatial Multiplexing)</option>
                <option value="8x8">8x8 (8T8R Sectorized / 4-Layer)</option>
                <option value="16TR">16TR (16T16R Lightweight Massive MIMO)</option>
                <option value="32TR">32TR (32T32R Massive MIMO AAU)</option>
                <option value="64TR">64TR (64T64R High-Density 3D Beamforming)</option>
              </select>
            </div>

            {/* Base Station Antenna Height */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  BS Antenna Height (h_b)
                </label>
                <span className="text-xs font-mono font-semibold text-slate-200">
                  {inputs.bsHeightMeters} meters
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="1"
                value={inputs.bsHeightMeters}
                onChange={(e) => update({ bsHeightMeters: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>10m (Street)</span>
                <span>30m (Rooftop)</span>
                <span>60m (Tower)</span>
              </div>
            </div>

            {/* Reference Signal Power (RS/SSB EPRE) */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-md p-2.5 text-xs font-mono">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-400">Reference Signal (RS/SSB) PWR</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inputs.rsPowerAuto}
                    onChange={(e) => update({ rsPowerAuto: e.target.checked })}
                    className="accent-cyan-400"
                  />
                  <span className="text-[11px] text-cyan-400">Auto 3GPP</span>
                </label>
              </div>
              {inputs.rsPowerAuto ? (
                <div className="text-[11px] text-slate-400 mt-1">
                  Derived from: <code className="text-cyan-300">P_total - 10*log10(N_RE)</code>
                  <div className="mt-1 flex items-center gap-2">
                    <span>RS Boost:</span>
                    <select
                      value={inputs.rsPowerBoostDb}
                      onChange={(e) => update({ rsPowerBoostDb: Number(e.target.value) })}
                      className="bg-slate-900 border border-slate-700 px-1 py-0.5 rounded text-slate-200"
                    >
                      <option value="0">0 dB (Normal)</option>
                      <option value="1.77">+1.77 dB (Boosted)</option>
                      <option value="3">+3.0 dB (Max PBCH)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="mt-1">
                  <label className="text-[11px] text-slate-400 block mb-1">Manual RS Override (dBm/RE):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={inputs.rsPowerDbmOverride ?? 15}
                    onChange={(e) => update({ rsPowerDbmOverride: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Base Station Receiver Noise Figure in UL */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-md p-2.5 text-xs font-mono">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-400">Noise Figure in UL (gNB/eNB)</span>
                <span className="text-emerald-400 font-bold">
                  {inputs.ulNoiseFigureDb ?? inputs.bsNoiseFigureDb ?? 4} dB
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="15"
                  step="0.5"
                  value={inputs.ulNoiseFigureDb ?? inputs.bsNoiseFigureDb ?? 4}
                  onChange={(e) => {
                    const val = Math.max(0.1, Number(e.target.value));
                    update({ ulNoiseFigureDb: val, bsNoiseFigureDb: val });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs font-mono focus:border-cyan-400 focus:outline-none"
                  placeholder="4"
                />
                <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">Default: 4 dB</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: USER EQUIPMENT & CPE */}
      {activeSection === 'ue' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* UE Category Selection */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                UE Device Category / 3GPP Tier
              </label>
              <select
                value={inputs.ueCategory || 'REL16_FLAGSHIP'}
                onChange={(e) => handleUeCategoryChange(e.target.value as UeCategory)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="REL16_FLAGSHIP">5G NR Rel-16/17 Flagship (4x4 DL / 2Tx UL / 256QAM)</option>
                <option value="REL15_STANDARD">5G NR Rel-15 Standard (4x4 DL / 1Tx UL / 256QAM)</option>
                <option value="HPUE_CLASS2">5G High-Power UE (HPUE Class 2 - 26 dBm / 2Tx UL)</option>
                <option value="FWA_CPE_PRO">5G FWA Outdoor CPE (4T4R Quad-Tx / 27 dBm / 9 dBi)</option>
                <option value="LTE_CAT16_GIGA">4G LTE-A Cat 16+ Gigabit (4x4 DL / 2Tx UL)</option>
                <option value="LTE_CAT4_STD">4G LTE Cat 4 Legacy (2x2 DL / 1Tx UL - 150/50 Mbps)</option>
              </select>
            </div>

            {/* UE MIMO Mode (1T2R, 1T4R, 2T2R, 2T4R, 4T4R) */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                UE MIMO Mode (Tx/Rx Antennas)
              </label>
              <select
                value={inputs.ueMimoMode || '2T4R'}
                onChange={(e) => update({ ueMimoMode: e.target.value as UeMimoMode })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="1T2R">1Tx 2Rx (Rank 1 UL SISO / 2-Layer DL)</option>
                <option value="1T4R">1Tx 4Rx (Rank 1 UL SISO / 4-Layer DL + 2.5dB Div)</option>
                <option value="2T2R">2Tx 2Rx (Rank 2 UL MIMO [2x UL Thrpt] / 2-Layer DL)</option>
                <option value="2T4R">2Tx 4Rx (Rank 2 UL MIMO [2x UL Thrpt] / 4-Layer DL + 2.5dB Div)</option>
                <option value="4T4R">4Tx 4Rx (Rank 4 UL MIMO [4x UL Thrpt] / 4-Layer DL + 2.5dB Div)</option>
              </select>
            </div>

            {/* UE Terminal Form Factor */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                UE Terminal Form Factor
              </label>
              <select
                value={inputs.ueType}
                onChange={(e) => handleUeTypeChange(e.target.value as UeType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="HANDSET_STD">Standard Handset (Power Class 3 - 23 dBm)</option>
                <option value="HANDSET_HPUE">High-Power UE (HPUE Class 2 - 26 dBm)</option>
                <option value="INDOOR_CPE">Indoor FWA CPE (26 dBm, 4 dBi Gain)</option>
                <option value="OUTDOOR_CPE">Outdoor Rooftop CPE (27-30 dBm, 9 dBi Gain)</option>
              </select>
            </div>
          </div>

          {/* UE MIMO Uplink Impact Banner */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-md p-3 text-xs font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-300 font-semibold">
                  Uplink Spatial Architecture: <span className="text-emerald-400 font-bold">{inputs.ueMimoMode?.startsWith('4T') ? '4Tx (Quad Streams - Rank 4)' : inputs.ueMimoMode?.startsWith('2T') ? '2Tx (Dual Streams - Rank 2)' : '1Tx (Single Stream - Rank 1)'}</span>
                </span>
              </div>
              <span className="text-cyan-400 font-semibold">
                {inputs.ueMimoMode?.startsWith('4T') ? '⚡ +300% Peak UL Speed Potential (4x UL MIMO)' : inputs.ueMimoMode?.startsWith('2T') ? '⚡ +100% Peak UL Speed Potential (2x UL MIMO)' : 'Standard Single-Stream Uplink (Capped)'}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Downlink Diversity: {inputs.ueMimoMode?.endsWith('4R') ? '4Rx Antennas active (Up to 4 DL layers supported + 2.5 dB MMSE-IRC Diversity Gain)' : '2Rx Antennas active (Up to 2 DL layers supported)'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Max UE TX Power */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  UE Max TX Power
                </label>
                <span className="text-xs font-mono font-semibold text-emerald-400">
                  {inputs.ueTxPowerDbm} dBm ({Math.round(Math.pow(10, (inputs.ueTxPowerDbm - 30) / 10) * 1000)} mW)
                </span>
              </div>
              <input
                type="range"
                min="18"
                max="30"
                step="0.5"
                value={inputs.ueTxPowerDbm}
                onChange={(e) => update({ ueTxPowerDbm: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>20 dBm (Class 4)</span>
                <span>23 dBm (Class 3 std)</span>
                <span>26 dBm (HPUE)</span>
                <span>27-30 dBm (CPE)</span>
              </div>
            </div>

            {/* UE Antenna Gain */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  UE Antenna Gain
                </label>
                <span className="text-xs font-mono font-semibold text-slate-200">
                  {inputs.ueAntennaGainDbi} dBi
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={inputs.ueAntennaGainDbi}
                onChange={(e) => update({ ueAntennaGainDbi: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>0 dBi (Phone)</span>
                <span>4 dBi (Indoor CPE)</span>
                <span>9-12 dBi (Outdoor High Gain)</span>
              </div>
            </div>

            {/* UE Height */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  UE Antenna Height (h_m)
                </label>
                <span className="text-xs font-mono font-semibold text-slate-200">
                  {inputs.ueHeightMeters} meters
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={inputs.ueHeightMeters}
                onChange={(e) => update({ ueHeightMeters: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>1.5m (Handset)</span>
                <span>5m (2nd Floor)</span>
                <span>10m+ (Rooftop CPE)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Body Loss */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Body Loss (Hand / Head)
                </label>
                <span className="text-xs font-mono font-semibold text-slate-200">
                  {inputs.bodyLossDb} dB
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={inputs.bodyLossDb}
                onChange={(e) => update({ bodyLossDb: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>0.0 dB (CPE / Free space)</span>
                <span>3.0 dB (Handset standard)</span>
                <span>5.0 dB (Heavy absorption)</span>
              </div>
            </div>

            {/* UE Noise Figure (Noise figure in DL) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Noise Figure in DL (UE NF)
                </label>
                <span className="text-xs font-mono font-semibold text-cyan-400">
                  {inputs.dlNoiseFigureDb ?? inputs.ueNoiseFigureDb ?? 7} dB
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="12"
                step="0.5"
                value={inputs.dlNoiseFigureDb ?? inputs.ueNoiseFigureDb ?? 7}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  update({ dlNoiseFigureDb: val, ueNoiseFigureDb: val });
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>5.0 dB (CPE)</span>
                <span>7.0 dB (3GPP Default)</span>
                <span>9.0 dB (Budget UE)</span>
              </div>
            </div>

            {/* Uplink Transmission Scheme Summary */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-md p-2.5 text-xs font-mono flex flex-col justify-between">
              <div>
                <div className="text-slate-400 mb-1">UL SU-MIMO Codebook Status:</div>
                <div className="text-slate-200 font-semibold">
                  {inputs.ueMimoMode?.startsWith('4T') ? '4Tx Codebook / Non-Codebook' : inputs.ueMimoMode?.startsWith('2T') ? '2Tx Codebook / Non-Codebook' : '1Tx Single Port Port-0'}
                </div>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                TS 38.214 §6.1.1 · Sounding Reference Signal (SRS) 1T2R/1T4R/2T4R switching supported.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: SPM PROPAGATION & ENVIRONMENT */}
      {activeSection === 'spm' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Propagation Model */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                Propagation Model
              </label>
              <select
                value={inputs.propagationModel}
                onChange={(e) => update({ propagationModel: e.target.value as PropagationModelType })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="SPM">SPM (Standard Propagation Model - Calibrated)</option>
                <option value="3GPP_UMA">3GPP TR 38.901 Urban Macro (UMa)</option>
                <option value="3GPP_UMI">3GPP TR 38.901 Urban Micro (UMi Street Canyon)</option>
                <option value="3GPP_RMA">3GPP TR 38.901 Rural Macro (RMa)</option>
                <option value="COST231_HATA">Cost-231 Hata Model (Sub-2.6GHz)</option>
                <option value="FSPL">Free Space Path Loss (FSPL Benchmark)</option>
              </select>
            </div>

            {/* Clutter Environment */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                Morphology / Clutter Environment
              </label>
              <select
                value={inputs.environmentClutter}
                onChange={(e) => update({ environmentClutter: e.target.value as EnvironmentClutter })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="DENSE_URBAN">Dense Urban (High-rise, high obstruction)</option>
                <option value="URBAN">Urban (Medium density commercial/residential)</option>
                <option value="SUBURBAN">Sub-Urban (Low-rise, open streets)</option>
                <option value="RURAL">Rural / Open Terrain (Unobstructed farmland)</option>
              </select>
            </div>

            {/* Indoor / Outdoor Planning Scenario */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                Site Planning Scenario (Penetration)
              </label>
              <select
                value={inputs.indoorOutdoorScenario}
                onChange={(e) => update({ indoorOutdoorScenario: e.target.value as IndoorOutdoorScenario })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="OUTDOOR_LOS">Pure Outdoor LOS (0 dB Penetration)</option>
                <option value="OUTDOOR_NLOS">Pure Outdoor NLOS (Clutter Shadowing)</option>
                <option value="IN_VEHICLE">In-Vehicle Penetration (~8-10 dB)</option>
                <option value="INDOOR_STANDARD">Indoor Standard Glass/Plaster (~12-16 dB)</option>
                <option value="INDOOR_DEEP">Deep Indoor / Low-E Glass & Concrete (~22-28 dB)</option>
              </select>
            </div>
          </div>

          {/* Log-Normal Shadow Fading & Margins Panel */}
          {(() => {
            const calculatedMargin = calculateShadowFadingMargin(inputs.shadowFadingStdDevDb, inputs.coverageProbability);
            const currentMargin = (inputs.shadowFadingMarginDb !== undefined && inputs.shadowFadingMarginDb !== null && !isNaN(inputs.shadowFadingMarginDb))
              ? inputs.shadowFadingMarginDb
              : calculatedMargin;
            const currentZ = getGaussianZ(inputs.coverageProbability);

            const envPresets = [
              {
                id: 'RURAL' as const,
                name: 'Rural / Farmland',
                sigma: 6.0,
                desc: 'Open terrain, sparse buildings (3GPP RMa)',
                clutter: 'RURAL' as EnvironmentClutter
              },
              {
                id: 'SUBURBAN' as const,
                name: 'Sub-Urban',
                sigma: 7.0,
                desc: 'Low-rise residential, moderate tree foliage',
                clutter: 'SUBURBAN' as EnvironmentClutter
              },
              {
                id: 'URBAN' as const,
                name: 'Urban Macro',
                sigma: 8.5,
                desc: 'Medium-density commercial / residential (3GPP UMa)',
                clutter: 'URBAN' as EnvironmentClutter
              },
              {
                id: 'DENSE_URBAN' as const,
                name: 'Dense Urban',
                sigma: 10.0,
                desc: 'High-rise street canyons, heavy blockage',
                clutter: 'DENSE_URBAN' as EnvironmentClutter
              }
            ];

            const activeEnv = inputs.shadowFadingEnvironment ?? (
              Math.abs(inputs.shadowFadingStdDevDb - 6.0) < 0.2 ? 'RURAL' :
              Math.abs(inputs.shadowFadingStdDevDb - 7.0) < 0.2 ? 'SUBURBAN' :
              Math.abs(inputs.shadowFadingStdDevDb - 8.5) < 0.2 ? 'URBAN' :
              Math.abs(inputs.shadowFadingStdDevDb - 10.0) < 0.2 ? 'DENSE_URBAN' : 'CUSTOM'
            );

            return (
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg space-y-4">
                {/* Header with Title and Real-Time MAPL impact summary */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-100 flex items-center gap-1.5 font-mono">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <span>LOG-NORMAL SHADOW FADING & SHADOW FADING MARGIN (dB)</span>
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Defines log-normal standard deviation (σ_SF) based on urban/rural clutter environments, deriving the Shadow Fading Margin (M_SF = z·σ) which directly deducts from MAPL.
                    </p>
                  </div>

                  {/* Real-time computed Shadow Fading Margin Badge */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-cyan-800/80 rounded-md text-xs font-mono shadow-xs">
                    <span className="text-slate-400">Effective M_SF:</span>
                    <span className="text-cyan-300 font-bold text-sm">
                      +{currentMargin.toFixed(1)} dB
                    </span>
                    <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-2">
                      z={currentZ.toFixed(2)} · σ={inputs.shadowFadingStdDevDb.toFixed(1)}dB
                    </span>
                  </div>
                </div>

                {/* Urban / Rural Environment Presets Selector */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Define Standard Deviation by Urban / Rural Environment:</span>
                    </label>
                    <span className="text-[10px] font-mono text-cyan-400">
                      Target P_cov: {inputs.coverageProbability}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {envPresets.map((env) => {
                      const envMargin = calculateShadowFadingMargin(env.sigma, inputs.coverageProbability);
                      const isSelected = activeEnv === env.id && Math.abs(inputs.shadowFadingStdDevDb - env.sigma) < 0.15;
                      return (
                        <button
                          key={env.id}
                          type="button"
                          onClick={() => {
                            update({
                              shadowFadingStdDevDb: env.sigma,
                              shadowFadingMarginDb: envMargin,
                              shadowFadingEnvironment: env.id,
                              environmentClutter: env.clutter
                            });
                          }}
                          className={`p-2.5 rounded-lg border text-left transition-all relative ${
                            isSelected
                              ? 'bg-cyan-950/70 border-cyan-500 shadow-sm shadow-cyan-950 text-slate-100 ring-1 ring-cyan-500/50'
                              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-xs font-mono font-bold text-slate-200">
                              {env.name}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              isSelected ? 'bg-cyan-900/80 text-cyan-200' : 'bg-slate-800 text-slate-400'
                            }`}>
                              σ = {env.sigma.toFixed(1)} dB
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">
                            {env.desc}
                          </div>
                          <div className="mt-1 text-[10px] font-mono font-semibold text-cyan-300 flex items-center justify-between">
                            <span>M_SF: +{envMargin.toFixed(1)} dB</span>
                            {isSelected && <span className="text-emerald-400 text-[10px]">● Active</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Input Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
                  {/* 1. Dedicated 'Shadow Fading Margin (dB)' Input Field (Requested by User) */}
                  <div className="bg-slate-900/90 border-2 border-cyan-700/60 rounded-lg p-3 flex flex-col justify-between relative overflow-hidden group shadow-md">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1">
                          <Gauge className="w-3.5 h-3.5 text-cyan-400 inline" />
                          Shadow Fading Margin (dB)
                        </label>
                        <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950 border border-cyan-800 px-1.5 py-0.5 rounded">
                          +{currentMargin.toFixed(1)} dB
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mb-2">
                        Direct margin deducted from DL & UL MAPL (M_SF = z · σ_SF)
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="30"
                          step="0.1"
                          value={currentMargin.toFixed(1)}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value));
                            const impliedSigma = calculateStdDevFromMargin(val, inputs.coverageProbability);
                            update({
                              shadowFadingMarginDb: val,
                              shadowFadingStdDevDb: impliedSigma,
                              shadowFadingEnvironment: 'CUSTOM'
                            });
                          }}
                          className="w-full bg-slate-950 border border-cyan-700 rounded px-2.5 py-1.5 text-xs text-cyan-200 font-mono font-bold focus:border-cyan-400 focus:outline-none"
                          placeholder="e.g. 13.9"
                        />
                        <span className="text-xs text-cyan-300 font-mono font-bold">dB</span>
                      </div>

                      {/* Sync button to reset to theoretical z * sigma */}
                      <button
                        type="button"
                        onClick={() => {
                          const theoretical = calculateShadowFadingMargin(inputs.shadowFadingStdDevDb, inputs.coverageProbability);
                          update({ shadowFadingMarginDb: theoretical });
                        }}
                        className="w-full flex items-center justify-center gap-1 text-[10px] font-mono text-cyan-400/90 hover:text-cyan-200 bg-cyan-950/50 hover:bg-cyan-950/80 border border-cyan-800/60 rounded py-1 transition-colors"
                        title="Synchronize margin with z·σ standard formula"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Reset to z·σ (+{calculatedMargin.toFixed(1)} dB)</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Log-Normal Standard Deviation (sigma_SF) */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                          Log-Normal Std Dev (σ_SF)
                        </label>
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          {inputs.shadowFadingStdDevDb.toFixed(1)} dB
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mb-2">
                        Fading spread sigma based on environment
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="16"
                          step="0.1"
                          value={inputs.shadowFadingStdDevDb.toFixed(1)}
                          onChange={(e) => {
                            const val = Math.max(0.5, Number(e.target.value));
                            const newMargin = calculateShadowFadingMargin(val, inputs.coverageProbability);
                            update({
                              shadowFadingStdDevDb: val,
                              shadowFadingMarginDb: newMargin,
                              shadowFadingEnvironment: 'CUSTOM'
                            });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                        />
                        <span className="text-xs text-slate-400 font-mono">dB</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="14"
                        step="0.1"
                        value={inputs.shadowFadingStdDevDb}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const newMargin = calculateShadowFadingMargin(val, inputs.coverageProbability);
                          update({
                            shadowFadingStdDevDb: val,
                            shadowFadingMarginDb: newMargin,
                            shadowFadingEnvironment: 'CUSTOM'
                          });
                        }}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* 3. Target Edge Coverage Probability (P_cov) */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                          Coverage Probability (P_cov)
                        </label>
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          {inputs.coverageProbability}%
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mb-2">
                        Edge reliability: Gaussian factor z = {currentZ.toFixed(2)}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <input
                        type="range"
                        min="80"
                        max="98"
                        step="1"
                        value={inputs.coverageProbability}
                        onChange={(e) => {
                          const prob = Number(e.target.value);
                          const newMargin = calculateShadowFadingMargin(inputs.shadowFadingStdDevDb, prob);
                          update({
                            coverageProbability: prob,
                            shadowFadingMarginDb: newMargin
                          });
                        }}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>80% (0.84)</span>
                        <span>90% (1.28)</span>
                        <span>95% (1.64)</span>
                        <span>98% (2.05)</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Interference & IoT Margin */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                          Interference Margin (DL / UL)
                        </label>
                        <span className="text-xs font-mono font-bold text-slate-200">
                          {inputs.interferenceMarginDb} / {inputs.iotMarginDb} dB
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mb-2">
                        Downlink inter-cell load & Uplink IoT
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <input
                        type="range"
                        min="0"
                        max="6"
                        step="0.5"
                        value={inputs.interferenceMarginDb}
                        onChange={(e) => update({ interferenceMarginDb: Number(e.target.value) })}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>0 dB (Clean)</span>
                        <span>3 dB (Typical)</span>
                        <span>5 dB (Heavy)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mathematical MAPL Impact Card */}
                <div className="bg-slate-900/80 border border-cyan-900/50 rounded-lg p-3 text-xs font-mono">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-slate-300 font-semibold">
                        Impact on Final MAPL Calculation:
                      </span>
                      <span className="text-cyan-300 font-bold">
                        -{currentMargin.toFixed(1)} dB directly deducted from both Downlink & Uplink budgets
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      System Bottleneck: <span className="text-amber-300 font-semibold">{lbResult.bottleneck === 'UL_LIMITED' ? 'Uplink Limited' : lbResult.bottleneck === 'DL_LIMITED' ? 'Downlink Limited' : 'Balanced'}</span> (Δ {lbResult.bottleneckDeltaDb.toFixed(1)} dB)
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2.5 pt-2 border-t border-slate-800 text-[11px]">
                    <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                      <span className="text-slate-500 block">DL MAPL (UE Rx):</span>
                      <span className="text-cyan-400 font-bold text-xs">{lbResult.dlMaplDb.toFixed(1)} dB</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                      <span className="text-slate-500 block">UL MAPL ({inputs.technology === '4G' ? 'eNB' : 'gNB'} Rx):</span>
                      <span className="text-emerald-400 font-bold text-xs">{lbResult.ulMaplDb.toFixed(1)} dB</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                      <span className="text-slate-500 block">System Limiting MAPL:</span>
                      <span className="text-amber-400 font-bold text-xs">{lbResult.systemMaplDb.toFixed(1)} dB</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                      <span className="text-slate-500 block">Calculated Cell Range:</span>
                      <span className="text-slate-200 font-bold text-xs">{lbResult.maxCellRangeKm.toFixed(3)} km ({lbResult.maxCellRangeMeters} m)</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

            {/* Fast / Multipath Fading Margins (DL & UL) */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div>
                  <span className="text-xs font-semibold text-slate-200 font-mono flex items-center gap-1.5">
                    <span>MULTIPATH / FAST FADING MARGIN (SMALL-SCALE FADING)</span>
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Accounts for Rayleigh/Rician constructive and destructive multi-path interference dips in urban & clutter scattering.
                  </p>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono">
                  <span className="text-slate-400">Fading Reserve:</span>
                  <span className="text-cyan-300 font-semibold">DL {inputs.dlFadingMarginDb ?? 2.0} dB</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-emerald-300 font-semibold">UL {inputs.ulFadingMarginDb ?? 2.5} dB</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Downlink Fading Margin */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded p-2.5">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
                      <span>DL Fading Margin (gNB → UE)</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-cyan-300">
                      {(inputs.dlFadingMarginDb ?? 2.0).toFixed(1)} dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="0.5"
                    value={inputs.dlFadingMarginDb ?? 2.0}
                    onChange={(e) => update({ dlFadingMarginDb: Number(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[
                      { label: '0 dB (None/AWGN)', val: 0.0 },
                      { label: '1.0 dB (LOS/Rician)', val: 1.0 },
                      { label: '2.0 dB (Typical DL)', val: 2.0 },
                      { label: '3.5 dB (Rayleigh NLOS)', val: 3.5 }
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => update({ dlFadingMarginDb: preset.val })}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          Math.abs((inputs.dlFadingMarginDb ?? 2.0) - preset.val) < 0.05
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Uplink Fading Margin */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded p-2.5">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
                      <span>UL Fading Margin (UE → gNB)</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-300">
                      {(inputs.ulFadingMarginDb ?? 2.5).toFixed(1)} dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="0.5"
                    value={inputs.ulFadingMarginDb ?? 2.5}
                    onChange={(e) => update({ ulFadingMarginDb: Number(e.target.value) })}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[
                      { label: '0 dB (None/AWGN)', val: 0.0 },
                      { label: '1.5 dB (LOS/Low Doppler)', val: 1.5 },
                      { label: '2.5 dB (Typical UL)', val: 2.5 },
                      { label: '4.0 dB (High Multipath)', val: 4.0 }
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => update({ ulFadingMarginDb: preset.val })}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          Math.abs((inputs.ulFadingMarginDb ?? 2.5) - preset.val) < 0.05
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
          </div>
        </div>
      )}

      {/* SECTION 5: CARRIER AGGREGATION (CA) */}
      {activeSection === 'ca' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-md">
            <div>
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <span>3GPP Carrier Aggregation (CA) Mode</span>
                {inputs.caEnabled ? (
                  <span className="text-[10px] text-emerald-400 font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
                    ENABLED
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-800">
                    DISABLED (Single CC)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Aggregate contiguous or non-contiguous carriers across 3GPP FDD / TDD spectrum.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={inputs.caEnabled}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  update({
                    caEnabled: enabled,
                    caCarriersCount: enabled ? Math.max(2, inputs.carriers.length) : 1
                  });
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {inputs.caEnabled && (
            <div className="space-y-3">
              {/* Preset Combos */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  Popular 3GPP Verified CA Combination
                </label>
                <select
                  aria-label="Popular 3GPP Verified CA Combination"
                  onChange={(e) => {
                    const combo = POPULAR_CA_COMBOS.find(c => c.id === e.target.value);
                    if (combo) {
                      const newCarriers = combo.bands.map((bName, i) => {
                        const bandObj = TELECOM_BANDS.find(b => b.band === bName) || TELECOM_BANDS[0];
                        return {
                          id: `cc_${i + 1}`,
                          band: bName,
                          bandwidthMHz: combo.bws[i],
                          freqMHz: bandObj.dlFreqMHz,
                          mimo: inputs.mimoMode,
                          txPowerDbm: inputs.bsTxPowerDbm,
                          isPrimary: i === 0
                        };
                      });
                      update({
                        band: combo.bands[0],
                        bandwidthMHz: combo.bws[0],
                        carriers: newCarriers,
                        caCarriersCount: newCarriers.length
                      });
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                  defaultValue=""
                >
                  <option value="" disabled>Select standard 3GPP CA combination...</option>
                  {POPULAR_CA_COMBOS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Carrier list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Aggregated Component Carriers ({inputs.carriers.length} CC)</span>
                  <button
                    onClick={() => {
                      if (inputs.carriers.length >= 5) return;
                      const nextBand = TELECOM_BANDS[inputs.carriers.length % TELECOM_BANDS.length];
                      const newC = {
                        id: `cc_${Date.now()}`,
                        band: nextBand.band,
                        bandwidthMHz: nextBand.bandwidthsMHz[0],
                        freqMHz: nextBand.dlFreqMHz,
                        mimo: '4x4' as MimoMode,
                        txPowerDbm: 49,
                        isPrimary: false
                      };
                      update({
                        carriers: [...inputs.carriers, newC],
                        caCarriersCount: inputs.carriers.length + 1
                      });
                    }}
                    disabled={inputs.carriers.length >= 5}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Carrier (Max 5CC)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {inputs.carriers.map((c, idx) => {
                    const bObj = TELECOM_BANDS.find(b => b.band === c.band) || TELECOM_BANDS[0];
                    return (
                      <div
                        key={c.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-slate-950/60 border border-slate-800 rounded-md text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            idx === 0 ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {idx === 0 ? 'Pcell (Primary)' : `Scell ${idx} (Secondary)`}
                          </span>
                          <span className="text-slate-100 font-semibold">{c.band}</span>
                          <span className="text-slate-400">({bObj.dlFreqMHz} MHz)</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">BW:</span>
                            <select
                              value={c.bandwidthMHz}
                              onChange={(e) => {
                                const newBw = Number(e.target.value);
                                const updated = inputs.carriers.map((item, i) =>
                                  i === idx ? { ...item, bandwidthMHz: newBw } : item
                                );
                                update({ carriers: updated });
                              }}
                              className="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-slate-100 text-xs"
                            >
                              {bObj.bandwidthsMHz.map(bw => (
                                <option key={bw} value={bw}>{bw} MHz</option>
                              ))}
                            </select>
                          </div>

                          {idx > 0 && (
                            <button
                              onClick={() => {
                                const filtered = inputs.carriers.filter((_, i) => i !== idx);
                                update({
                                  carriers: filtered,
                                  caCarriersCount: filtered.length
                                });
                              }}
                              className="text-slate-500 hover:text-rose-400 p-1"
                              title="Remove Component Carrier"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
