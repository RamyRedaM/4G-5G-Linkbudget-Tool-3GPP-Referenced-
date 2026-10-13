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
  McxProfile,
  OverheadMode,
  DmrsConfigType,
  CsiRsMultiplexingType,
  CsiRsResourceType,
  InterferenceScenarioType,
  InterferenceHexLayoutTiers,
  InterferenceMarginMethod
} from '../types/telecom';
import { TELECOM_BANDS, TDD_FRAME_PATTERNS, POPULAR_CA_COMBOS } from '../data/telecomBands';
import {
  Radio,
  Sliders,
  Layers,
  Smartphone,
  Trees,
  Settings2,
  Target,
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
  CheckCircle2,
  Compass
} from 'lucide-react';
import { calculateControlOverheads, calculateLinkBudget, calculate5GOverhead } from '../utils/linkBudgetCalculator';
import {
  calculateShadowFadingMargin,
  calculateStdDevFromMargin,
  getGaussianZ,
  getBuildingPenetrationLoss
} from '../utils/spmPropagation';

interface InputPanelProps {
  inputs: LinkBudgetInputs;
  onChange: (inputs: LinkBudgetInputs) => void;
}

export const InputPanel: React.FC<InputPanelProps> = ({ inputs, onChange }) => {
  const [activeSection, setActiveSection] = useState<'tech' | 'service' | 'bs' | 'ue' | 'spm' | 'advanced' | 'ca'>('tech');

  const overheads = calculateControlOverheads(inputs);
  const lbResult = calculateLinkBudget(inputs);
  const { rxSensitivityBreakdown, serviceSummary, overheadSummary, antennaTiltSummary, interferenceSummary } = lbResult;
  const is5G = inputs.technology !== '4G';

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
  const currentTechBands = TELECOM_BANDS.filter(b => {
    if (inputs.technology === '4G') {
      return b.tech === '4G' || b.tech === 'BOTH';
    } else {
      return b.tech === '5G' || b.tech === 'BOTH';
    }
  });
  const availableBands = currentTechBands.filter(b => b.duplex === inputs.duplexMode);
  const otherDuplexMode: DuplexMode = inputs.duplexMode === 'TDD' ? 'FDD' : 'TDD';
  const otherBands = currentTechBands.filter(b => b.duplex === otherDuplexMode);

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
    let nf = 7.5;
    let height = 1.5;
    let mimoMode: UeMimoMode = inputs.ueMimoMode || (inputs.technology === '4G' ? '1T2R' : '2T4R');

    switch (ueType) {
      case 'HANDSET_STD':
        power = 23; gain = 0; bodyLoss = 3; nf = 7.5; height = 1.5;
        mimoMode = inputs.ueMimoMode || (inputs.technology === '4G' ? '1T2R' : '2T4R');
        break;
      case 'HANDSET_HPUE':
        power = 26; gain = 0; bodyLoss = 3; nf = 7.5; height = 1.5;
        mimoMode = '2T4R';
        break;
      case 'INDOOR_CPE':
        power = 26; gain = 4; bodyLoss = 0; nf = 6.0; height = 2.0;
        mimoMode = inputs.ueMimoMode && inputs.ueMimoMode.startsWith('4T') ? '4T4R' : '2T4R';
        break;
      case 'OUTDOOR_CPE':
        power = 29; gain = 11; bodyLoss = 0; nf = 5.0; height = 8.0;
        mimoMode = '4T4R';
        break;
      case 'INDUSTRIAL_IOT':
        power = 26; gain = 5; bodyLoss = 0; nf = 6.0; height = 2.5;
        mimoMode = '2T4R';
        break;
      case 'VEHICULAR_CPE':
        power = 26; gain = 4; bodyLoss = 0; nf = 6.0; height = 2.0;
        mimoMode = '2T4R';
        break;
      case 'MMWAVE_CPE':
        power = 33; gain = 18; bodyLoss = 0; nf = 8.5; height = 6.0;
        mimoMode = '4T4R';
        break;
      case 'REDCAP_DEVICE':
        power = 23; gain = 0; bodyLoss = 2; nf = 8.5; height = 1.2;
        mimoMode = '1T2R';
        break;
    }

    update({
      ueType,
      ueTxPowerDbm: power,
      ueAntennaGainDbi: gain,
      bodyLossDb: bodyLoss,
      ueNoiseFigureDb: nf,
      dlNoiseFigureDb: nf,
      ueHeightMeters: height,
      ueMimoMode: mimoMode
    });
  };

  const handleUeCategoryChange = (cat: UeCategory) => {
    switch (cat) {
      case 'REL18_ADVANCED':
        update({
          ueCategory: cat,
          ueType: 'HANDSET_STD',
          ueMimoMode: '4T4R',
          ueTxPowerDbm: 23,
          ueAntennaGainDbi: 0,
          bodyLossDb: 3,
          ueNoiseFigureDb: 7.0,
          dlNoiseFigureDb: 7.0,
          ueHeightMeters: 1.5
        });
        break;
      case 'REL16_FLAGSHIP':
        update({
          ueCategory: cat,
          ueType: 'HANDSET_STD',
          ueMimoMode: '2T4R',
          ueTxPowerDbm: 23,
          ueAntennaGainDbi: 0,
          bodyLossDb: 3,
          ueNoiseFigureDb: 7.5,
          dlNoiseFigureDb: 7.5,
          ueHeightMeters: 1.5
        });
        break;
      case 'REL15_STANDARD':
        update({
          ueCategory: cat,
          ueType: 'HANDSET_STD',
          ueMimoMode: '1T4R',
          ueTxPowerDbm: 23,
          ueAntennaGainDbi: 0,
          bodyLossDb: 3,
          ueNoiseFigureDb: 8.0,
          dlNoiseFigureDb: 8.0,
          ueHeightMeters: 1.5
        });
        break;
      case 'HPUE_CLASS2':
        update({
          ueCategory: cat,
          ueType: 'HANDSET_HPUE',
          ueMimoMode: '2T4R',
          ueTxPowerDbm: 26,
          ueAntennaGainDbi: 0,
          bodyLossDb: 3,
          ueNoiseFigureDb: 7.5,
          dlNoiseFigureDb: 7.5,
          ueHeightMeters: 1.5
        });
        break;
      case 'FWA_CPE_PRO':
        update({
          ueCategory: cat,
          ueType: 'OUTDOOR_CPE',
          ueMimoMode: '4T4R',
          ueTxPowerDbm: 29,
          ueAntennaGainDbi: 12,
          bodyLossDb: 0,
          ueNoiseFigureDb: 5.0,
          dlNoiseFigureDb: 5.0,
          ueHeightMeters: 8.0
        });
        break;
      case 'FWA_CPE_INDOOR':
        update({
          ueCategory: cat,
          ueType: 'INDOOR_CPE',
          ueMimoMode: '2T4R',
          ueTxPowerDbm: 26,
          ueAntennaGainDbi: 4,
          bodyLossDb: 0,
          ueNoiseFigureDb: 6.0,
          dlNoiseFigureDb: 6.0,
          ueHeightMeters: 2.0
        });
        break;
      case 'INDUSTRY_4_0':
        update({
          ueCategory: cat,
          ueType: 'INDUSTRIAL_IOT',
          ueMimoMode: '2T4R',
          ueTxPowerDbm: 26,
          ueAntennaGainDbi: 5,
          bodyLossDb: 0,
          ueNoiseFigureDb: 6.0,
          dlNoiseFigureDb: 6.0,
          ueHeightMeters: 2.5
        });
        break;
      case 'MMWAVE_PREMIUM':
        update({
          ueCategory: cat,
          ueType: 'MMWAVE_CPE',
          ueMimoMode: '4T4R',
          ueTxPowerDbm: 33,
          ueAntennaGainDbi: 18,
          bodyLossDb: 0,
          ueNoiseFigureDb: 8.5,
          dlNoiseFigureDb: 8.5,
          ueHeightMeters: 6.0
        });
        break;
      case 'REDCAP_REL17':
        update({
          ueCategory: cat,
          ueType: 'REDCAP_DEVICE',
          ueMimoMode: '1T2R',
          ueTxPowerDbm: 23,
          ueAntennaGainDbi: 0,
          bodyLossDb: 2,
          ueNoiseFigureDb: 8.5,
          dlNoiseFigureDb: 8.5,
          ueHeightMeters: 1.2
        });
        break;
      case 'LTE_CAT18_GIGA':
        update({
          ueCategory: cat,
          ueType: 'HANDSET_STD',
          ueMimoMode: '2T4R',
          ueTxPowerDbm: 23,
          ueAntennaGainDbi: 0,
          bodyLossDb: 3,
          ueNoiseFigureDb: 7.5,
          dlNoiseFigureDb: 7.5,
          ueHeightMeters: 1.5
        });
        break;
      case 'LTE_CAT16_GIGA':
        update({
          ueCategory: cat,
          ueType: 'HANDSET_STD',
          ueMimoMode: '2T4R',
          ueTxPowerDbm: 23,
          ueAntennaGainDbi: 0,
          bodyLossDb: 3,
          ueNoiseFigureDb: 8.0,
          dlNoiseFigureDb: 8.0,
          ueHeightMeters: 1.5
        });
        break;
      case 'LTE_CAT4_STD':
        update({
          ueCategory: cat,
          ueType: 'HANDSET_STD',
          ueMimoMode: '1T2R',
          ueTxPowerDbm: 23,
          ueAntennaGainDbi: 0,
          bodyLossDb: 3,
          ueNoiseFigureDb: 9.0,
          dlNoiseFigureDb: 9.0,
          ueHeightMeters: 1.5
        });
        break;
      case 'LTE_CATM1_IOT':
        update({
          ueCategory: cat,
          ueType: 'REDCAP_DEVICE',
          ueMimoMode: '1T1R',
          ueTxPowerDbm: 23,
          ueAntennaGainDbi: 0,
          bodyLossDb: 0,
          ueNoiseFigureDb: 9.0,
          dlNoiseFigureDb: 9.0,
          ueHeightMeters: 1.0
        });
        break;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      {/* Tab Navigation for Input Groups */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-950/70 border border-slate-800 rounded-lg mb-5 overflow-x-auto text-xs">
        {/* Tab 1: Carrier & Spectrum */}
        <button
          onClick={() => setActiveSection('tech')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeSection === 'tech'
              ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>1. Carrier & Spectrum</span>
          <span className="hidden xl:inline text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-900 border border-slate-700/80 text-cyan-300 ml-1">
            {inputs.technology} · {inputs.band} ({inputs.bandwidthMHz}M)
          </span>
        </button>

        {/* Tab 2: Service Profile & QoS */}
        <button
          onClick={() => setActiveSection('service')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeSection === 'service'
              ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>2. Service Profile & QoS</span>
          <span className="hidden xl:inline text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-900 border border-slate-700/80 text-cyan-300 ml-1">
            {serviceSummary.displayName.split(' ')[0]} ({serviceSummary.calculatedEdgeRangeKm >= 1 ? `${serviceSummary.calculatedEdgeRangeKm.toFixed(2)}km` : `${serviceSummary.calculatedEdgeRangeMeters}m`})
          </span>
        </button>

        {/* Tab 3: Base Station */}
        <button
          onClick={() => setActiveSection('bs')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeSection === 'bs'
              ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>3. Base Station (gNB/eNB)</span>
          <span className="hidden xl:inline text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-900 border border-slate-700/80 text-cyan-300 ml-1">
            {inputs.bsTxPowerDbm}dBm · {inputs.mimoMode} · Tilt {((inputs.bsMechanicalTiltDeg ?? 2) + (inputs.bsElectricalTiltDeg ?? 4)).toFixed(1)}°
          </span>
        </button>

        {/* Tab 4: UE / Terminal & CPE */}
        <button
          onClick={() => setActiveSection('ue')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeSection === 'ue'
              ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>4. UE / Terminal & CPE</span>
          <span className="hidden xl:inline text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-900 border border-slate-700/80 text-cyan-300 ml-1">
            {inputs.ueType === 'HANDSET_STD' ? 'Handset' : inputs.ueType === 'HANDSET_HPUE' ? 'HPUE' : inputs.ueType === 'INDOOR_CPE' ? 'Indoor CPE' : inputs.ueType === 'OUTDOOR_CPE' ? 'Outdoor CPE' : inputs.ueType === 'INDUSTRIAL_IOT' ? 'Industrial' : inputs.ueType === 'VEHICULAR_CPE' ? 'Vehicular' : inputs.ueType === 'MMWAVE_CPE' ? 'mmWave' : 'RedCap'} · {inputs.ueTxPowerDbm}dBm · {inputs.ueMimoMode || '2T4R'}
          </span>
        </button>

        {/* Tab 5: SPM & Environment */}
        <button
          onClick={() => setActiveSection('spm')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeSection === 'spm'
              ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trees className="w-3.5 h-3.5" />
          <span>5. Propagation & Clutter</span>
          <span className="hidden xl:inline text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-900 border border-slate-700/80 text-cyan-300 ml-1">
            {inputs.propagationModel} · {inputs.environmentClutter}
          </span>
        </button>

        {/* Tab 6: Advanced RF & Overheads */}
        <button
          onClick={() => setActiveSection('advanced')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeSection === 'advanced'
              ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>6. Advanced RF & Overheads</span>
          <span className="hidden xl:inline text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-900 border border-slate-700/80 text-cyan-300 ml-1">
            {inputs.technology === '4G' ? `PDCCH ${overheads.avgPdcchOverheadPercent.toFixed(1)}%` : `5G OH: ${overheadSummary?.dlOverheadPercent.toFixed(0)}% DL / ${overheadSummary?.ulOverheadPercent.toFixed(0)}% UL`}
          </span>
        </button>

        {/* Tab 7: Carrier Aggregation (CA) */}
        <button
          onClick={() => setActiveSection('ca')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeSection === 'ca'
              ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>7. Carrier Aggregation (CA)</span>
          {inputs.caEnabled ? (
            <span className="hidden xl:inline text-[10px] px-1.5 py-0.5 rounded font-mono bg-cyan-950 border border-cyan-700/80 text-cyan-300 ml-1">
              {inputs.carriers.length}CC Active
            </span>
          ) : (
            <span className="hidden xl:inline text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-900 border border-slate-700/80 text-slate-400 ml-1">
              Disabled
            </span>
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
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                <span>3GPP Operating Band</span>
                <span className="text-[11px] text-cyan-400 font-normal">
                  {selectedBandInfo.band} · {selectedBandInfo.duplex} ({selectedBandInfo.dlFreqMHz} MHz)
                </span>
              </label>
              <select
                value={inputs.band}
                onChange={(e) => handleBandChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <optgroup label={`${inputs.duplexMode} Operating Bands (${availableBands.length})`}>
                  {availableBands.map((b) => (
                    <option key={b.band} value={b.band}>
                      {b.name} - {b.commonName}
                    </option>
                  ))}
                </optgroup>
                {otherBands.length > 0 && (
                  <optgroup label={`${otherDuplexMode} Operating Bands [Switches Duplex] (${otherBands.length})`}>
                    {otherBands.map((b) => (
                      <option key={b.band} value={b.band}>
                        {b.name} - {b.commonName}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: SERVICE PROFILE & QOS REQUIREMENTS */}
      {activeSection === 'service' && (
        <div className="space-y-4">
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
                <span>Current Service Profile (Choose from below):</span>
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

                {/* CUSTOM PUBLIC SAFETY PROFILE USER DEFINED PARAMETERS */}
                {inputs.mcxProfile === 'CUSTOM_MCX' && (
                  <div className="mt-3 pt-3 border-t border-rose-900/60 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-xs font-mono text-rose-300 font-semibold flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-rose-400" />
                        Custom Public Safety User Defined Parameters (Inputs to Link Budget)
                      </span>
                      <span className="text-[10px] text-rose-400/80 font-mono">
                        QoS Bearer Requirements · 3GPP TS 22.179 / TS 23.379
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Box 1: DL Throughput */}
                      <div className="bg-slate-950/80 border border-rose-800/70 rounded-md p-2.5">
                        <label className="block text-[11px] font-mono text-slate-300 mb-1 flex justify-between items-center">
                          <span className="font-semibold text-rose-200">DL Throughput</span>
                          <span className="text-cyan-300 font-bold tabular-nums">
                            {(inputs.mcxTargetDlMbps ?? 1.0) >= 1 ? `${(inputs.mcxTargetDlMbps ?? 1.0).toFixed(2)} Mbps` : `${Math.round((inputs.mcxTargetDlMbps ?? 1.0) * 1000)} kbps`}
                          </span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0.01"
                            max="100"
                            value={inputs.mcxTargetDlMbps ?? 1.0}
                            onChange={(e) => update({ mcxTargetDlMbps: Math.max(0.01, Number(e.target.value)) })}
                            className="w-full bg-slate-900 border border-rose-700/60 rounded px-2.5 py-1.5 text-xs text-rose-200 font-mono focus:border-rose-400 focus:outline-none"
                            placeholder="1.0"
                          />
                          <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 font-mono">Mbps</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {[0.128, 0.256, 0.5, 1.0, 2.0, 5.0].map((rate) => (
                            <button
                              key={rate}
                              type="button"
                              onClick={() => update({ mcxTargetDlMbps: rate })}
                              className={`px-1.5 py-0.5 text-[9px] font-mono rounded border transition-colors ${
                                (inputs.mcxTargetDlMbps ?? 1.0) === rate
                                  ? 'bg-rose-950 border-rose-500 text-rose-200 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {rate >= 1 ? `${rate}M` : `${Math.round(rate * 1000)}k`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Box 2: UL Throughput */}
                      <div className="bg-slate-950/80 border border-rose-800/70 rounded-md p-2.5">
                        <label className="block text-[11px] font-mono text-slate-300 mb-1 flex justify-between items-center">
                          <span className="font-semibold text-rose-200">UL Throughput</span>
                          <span className="text-emerald-300 font-bold tabular-nums">
                            {(inputs.mcxTargetUlMbps ?? 1.0) >= 1 ? `${(inputs.mcxTargetUlMbps ?? 1.0).toFixed(2)} Mbps` : `${Math.round((inputs.mcxTargetUlMbps ?? 1.0) * 1000)} kbps`}
                          </span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0.01"
                            max="50"
                            value={inputs.mcxTargetUlMbps ?? 1.0}
                            onChange={(e) => update({ mcxTargetUlMbps: Math.max(0.01, Number(e.target.value)) })}
                            className="w-full bg-slate-900 border border-rose-700/60 rounded px-2.5 py-1.5 text-xs text-rose-200 font-mono focus:border-rose-400 focus:outline-none"
                            placeholder="1.0"
                          />
                          <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 font-mono">Mbps</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {[0.064, 0.128, 0.256, 0.5, 1.0, 2.0].map((rate) => (
                            <button
                              key={rate}
                              type="button"
                              onClick={() => update({ mcxTargetUlMbps: rate })}
                              className={`px-1.5 py-0.5 text-[9px] font-mono rounded border transition-colors ${
                                (inputs.mcxTargetUlMbps ?? 1.0) === rate
                                  ? 'bg-rose-950 border-rose-500 text-rose-200 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {rate >= 1 ? `${rate}M` : `${Math.round(rate * 1000)}k`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Box 3: Latency */}
                      <div className="bg-slate-950/80 border border-rose-800/70 rounded-md p-2.5">
                        <label className="block text-[11px] font-mono text-slate-300 mb-1 flex justify-between items-center">
                          <span className="font-semibold text-rose-200">Latency (Delay)</span>
                          <span className="text-amber-300 font-bold tabular-nums">
                            {(inputs.mcxTargetLatencyMs ?? 25.0).toFixed(1)} ms
                          </span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="1"
                            min="1"
                            max="200"
                            value={inputs.mcxTargetLatencyMs ?? 25.0}
                            onChange={(e) => update({ mcxTargetLatencyMs: Math.max(1, Number(e.target.value)) })}
                            className="w-full bg-slate-900 border border-rose-700/60 rounded px-2.5 py-1.5 text-xs text-rose-200 font-mono focus:border-rose-400 focus:outline-none"
                            placeholder="25"
                          />
                          <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 font-mono">ms</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {[10, 15, 20, 25, 40, 60].map((lat) => (
                            <button
                              key={lat}
                              type="button"
                              onClick={() => update({ mcxTargetLatencyMs: lat })}
                              className={`px-1.5 py-0.5 text-[9px] font-mono rounded border transition-colors ${
                                (inputs.mcxTargetLatencyMs ?? 25.0) === lat
                                  ? 'bg-rose-950 border-rose-500 text-rose-200 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {lat}ms
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono flex flex-wrap items-center justify-between pt-1 border-t border-slate-800/80">
                      <span>
                        Derived Demodulation SNR: DL <strong className="text-cyan-300">{serviceSummary.dlRequiredSnrDb.toFixed(1)} dB</strong> · UL <strong className="text-emerald-300">{serviceSummary.ulRequiredSnrDb.toFixed(1)} dB</strong> ({serviceSummary.dlAllocatedPrbs} DL / {serviceSummary.ulAllocatedPrbs} UL PRBs)
                      </span>
                      <span className="text-rose-300 font-semibold">
                        Calculated Cell Edge Range: {serviceSummary.calculatedEdgeRangeKm >= 1 ? `${serviceSummary.calculatedEdgeRangeKm.toFixed(3)} km` : `${serviceSummary.calculatedEdgeRangeMeters} m`}
                      </span>
                    </div>
                  </div>
                )}
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
        </div>
      )}

      {/* SECTION 1 CONTINUED: CARRIER & SPECTRUM (Bandwidth, Modulation, TDD Frame) */}
      {activeSection === 'tech' && (
        <div className="space-y-4">
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
        </div>
      )}

      {/* SECTION 6: ADVANCED RF, OVERHEADS & RECEIVER SENSITIVITY */}
      {activeSection === 'advanced' && (
        <div className="space-y-4">
          {/* 5G NR 3GPP Overhead & Physical Layer Configuration (TS 38.306 / TS 38.211 / TS 38.214) */}
          {inputs.technology !== '4G' ? (
            <div className="space-y-4 pt-1">
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-4 space-y-3 font-mono shadow-md">
                {/* Header and Mode Selector Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                          5G Overhead Configuration (3GPP TS 38.306 / TS 38.211)
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                          overheadSummary.frequencyRange === 'FR2'
                            ? 'bg-purple-950/80 text-purple-300 border-purple-700/80'
                            : 'bg-cyan-950/80 text-cyan-300 border-cyan-700/80'
                        }`}>
                          {overheadSummary.frequencyRange === 'FR2' ? 'FR2 mmWave (>24 GHz)' : 'FR1 Sub-6 GHz (≤7.125 GHz)'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Controls physical layer resource element overhead (OH) in 3GPP data rate equation: Rate ∝ (1 - OH)
                      </p>
                    </div>
                  </div>

                  {/* Overhead Mode Switcher: 38.306 Default vs Detailed */}
                  <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg gap-1">
                    <button
                      type="button"
                      onClick={() => update({ overheadMode: '38306_DEFAULT' })}
                      className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                        (inputs.overheadMode ?? '38306_DEFAULT') === '38306_DEFAULT'
                          ? 'bg-cyan-900 border border-cyan-400 text-cyan-100 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Default 38.306 Values
                    </button>
                    <button
                      type="button"
                      onClick={() => update({ overheadMode: 'DETAILED' })}
                      className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                        inputs.overheadMode === 'DETAILED'
                          ? 'bg-cyan-900 border border-cyan-400 text-cyan-100 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Detailed Mode (Components)
                    </button>
                  </div>
                </div>

                {/* Mode 1: 3GPP TS 38.306 Default Overhead Mode */}
                {(inputs.overheadMode ?? '38306_DEFAULT') === '38306_DEFAULT' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Downlink Overhead Card */}
                      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                            DL Overhead (OH_DL)
                          </span>
                          <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                            {overheadSummary.frequencyRange === 'FR2' ? 'FR2 Default: 0.18' : 'FR1 Default: 0.14'}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-cyan-300">
                            {(overheadSummary.dlOverheadRatio * 100).toFixed(1)}%
                          </span>
                          <span className="text-xs text-slate-400">
                            (OH = {overheadSummary.dlOverheadRatio.toFixed(2)})
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {overheadSummary.frequencyRange === 'FR2'
                            ? '3GPP standard mmWave allocation for PBCH, PDCCH, DMRS, TRS, PTRS'
                            : '3GPP standard Sub-6GHz allocation for PBCH, PDCCH, DMRS, CSI-RS'}
                        </p>
                        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800 flex justify-between">
                          <span>PDSCH Data Multiplier:</span>
                          <span className="text-slate-200 font-semibold">{(1 - overheadSummary.dlOverheadRatio).toFixed(2)}×</span>
                        </div>
                      </div>

                      {/* Uplink Overhead Card */}
                      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                            UL Overhead (OH_UL)
                          </span>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                            {overheadSummary.frequencyRange === 'FR2' ? 'FR2 Default: 0.10' : 'FR1 Default: 0.08'}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-emerald-300">
                            {(overheadSummary.ulOverheadRatio * 100).toFixed(1)}%
                          </span>
                          <span className="text-xs text-slate-400">
                            (OH = {overheadSummary.ulOverheadRatio.toFixed(2)})
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {overheadSummary.frequencyRange === 'FR2'
                            ? '3GPP standard mmWave allocation for PUSCH DMRS, PUCCH, SRS, PTRS'
                            : '3GPP standard Sub-6GHz allocation for PUSCH DMRS, PUCCH, SRS'}
                        </p>
                        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800 flex justify-between">
                          <span>PUSCH Data Multiplier:</span>
                          <span className="text-slate-200 font-semibold">{(1 - overheadSummary.ulOverheadRatio).toFixed(2)}×</span>
                        </div>
                      </div>

                      {/* 3GPP Specification Reference & Switch Option */}
                      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg space-y-2 flex flex-col justify-between">
                        <div>
                          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>3GPP TS 38.306 Table 4.1.2-1</span>
                          </span>
                          <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                            Standard physical overhead constants calibrated by 3GPP to reflect close real-world DL/UL user throughput.
                          </p>
                        </div>
                        <div className="pt-2 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => update({ overheadMode: 'DETAILED' })}
                            className="w-full text-center text-[10px] py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
                          >
                            Configure Detailed Components (SSB, CORESET, DMRS, etc.) →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Mode 2: Detailed Component Overhead Mode */
                  <div className="space-y-3.5">
                    <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded text-[11px] text-slate-300 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-cyan-300 font-semibold flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Detailed Component Overheads (3GPP TS 38.211 / TS 38.214):</span>
                      </span>
                      <span className="text-slate-400">
                        Granular RE calculations for SSB, PDCCH CORESET, DMRS, CSI-RS, TRS, PTRS
                      </span>
                    </div>

                    {/* 6 Components Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {/* 1. SSB (Synchronization Signal Block) */}
                      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 space-y-1.5 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] uppercase font-bold text-slate-300">1. SSB Bursts</label>
                            <span className="text-[10px] text-cyan-400 font-bold font-mono">{overheadSummary.breakdown.ssbPercent.toFixed(2)}%</span>
                          </div>
                          <div className="space-y-1">
                            <div>
                              <span className="text-[9px] text-slate-400 block">Periodicity:</span>
                              <select
                                value={inputs.ssbPeriodicityMs ?? 20}
                                onChange={(e) => update({ ssbPeriodicityMs: Number(e.target.value) })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100 font-mono"
                              >
                                <option value="5">5 ms (High sync rate)</option>
                                <option value="10">10 ms</option>
                                <option value="20">20 ms (Default 3GPP)</option>
                                <option value="40">40 ms</option>
                                <option value="80">80 ms</option>
                                <option value="160">160 ms (Low power)</option>
                              </select>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 block">Beams (3GPP L_max):</span>
                              <select
                                value={inputs.numberOfBeams ?? 1}
                                onChange={(e) => update({ numberOfBeams: Number(e.target.value) })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[10px] text-slate-100 font-mono"
                              >
                                <option value="1">1 Beam - Single SSB / Quasi-Omni (L_max=4/8, ssb-PositionsInBurst)</option>
                                <option value="2">2 Beams - 2 SSB Sweeps (Case A/B/C shortBitmap)</option>
                                <option value="3">3 Beams - 3 SSB Sweeps (ssb-PositionsInBurst 3 beams)</option>
                                <option value="4">4 Beams - 4 SSB Sweeps (Sub-3GHz L_max=4 max, Case A/B)</option>
                                <option value="5">5 Beams - 5 SSB Sweeps (3-6GHz mediumBitmap 5 beams)</option>
                                <option value="6">6 Beams - 6 SSB Sweeps (3-6GHz mediumBitmap 6 beams)</option>
                                <option value="7">7 Beams - 7 SSB Sweeps (3-6GHz mediumBitmap 7 beams)</option>
                                <option value="8">8 Beams - 8 SSB Sweeps (3-6GHz L_max=8 max, Case C mediumBitmap)</option>
                                {overheadSummary.frequencyRange === 'FR2' && <option value="16">16 Beams - 16 SSB Sweeps (FR2 Case D/E longBitmap)</option>}
                                {overheadSummary.frequencyRange === 'FR2' && <option value="32">32 Beams - 32 SSB Sweeps (FR2 Case D/E longBitmap)</option>}
                                {overheadSummary.frequencyRange === 'FR2' && <option value="64">64 Beams - 64 SSB Sweeps (FR2 L_max=64 max, Case D/E)</option>}
                              </select>
                            </div>
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-500 block border-t border-slate-800/60 pt-1">4 sym × 20 RBs · Impacts PDCCH</span>
                      </div>

                      {/* 2. PDCCH CORESET Symbols */}
                      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 space-y-1.5 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] uppercase font-bold text-slate-300">2. PDCCH CORESET</label>
                            <span className="text-[10px] text-cyan-400 font-bold font-mono">{overheadSummary.breakdown.pdcchPercent.toFixed(2)}%</span>
                          </div>
                          <div className="space-y-1">
                            <div>
                              <span className="text-[9px] text-slate-400 block">CORESET Duration:</span>
                              <select
                                value={inputs.pdcchCoresetSymbols ?? 2}
                                onChange={(e) => update({ pdcchCoresetSymbols: Number(e.target.value) })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100 font-mono"
                              >
                                <option value="1">1 Symbol (Low / -1.8% OH)</option>
                                <option value="2">2 Symbols (Default 3GPP)</option>
                                <option value="3">3 Symbols (High load / +2.2% OH)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-500 block border-t border-slate-800/60 pt-1">Control search spaces · 1-3 sym</span>
                      </div>

                      {/* 3. DMRS Configuration */}
                      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 space-y-1.5 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] uppercase font-bold text-slate-300">3. DMRS Config</label>
                            <span className="text-[10px] text-cyan-400 font-bold font-mono">{overheadSummary.breakdown.dmrsDlPercent.toFixed(2)}%</span>
                          </div>
                          <div className="space-y-1">
                            <div>
                              <span className="text-[9px] text-slate-400 block">Config Type:</span>
                              <select
                                value={inputs.dmrsConfigType ?? 'TYPE_1'}
                                onChange={(e) => update({ dmrsConfigType: e.target.value as DmrsConfigType })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100 font-mono"
                              >
                                <option value="TYPE_1">Type 1 (6 REs/RB)</option>
                                <option value="TYPE_2">Type 2 (4 REs/RB)</option>
                              </select>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 block">Symbols / Slot:</span>
                              <select
                                value={inputs.dmrsSymbolsPerSlot ?? 1}
                                onChange={(e) => update({ dmrsSymbolsPerSlot: Number(e.target.value), dmrsAdditionalPositions: Math.max(0, Number(e.target.value) - 1) })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100 font-mono"
                              >
                                <option value="1">1 Symbol (pos 0 - low speed)</option>
                                <option value="2">2 Symbols (pos 1 - nominal)</option>
                                <option value="3">3 Symbols (pos 2 - high speed)</option>
                                <option value="4">4 Symbols (pos 3 - high Doppler)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-500 block border-t border-slate-800/60 pt-1">Demod pilots · DL & UL impact</span>
                      </div>

                      {/* 4. CSI-RS Configuration & Multiplexing */}
                      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 space-y-1.5 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-1">
                              <label className="text-[10px] uppercase font-bold text-slate-300">4. CSI-RS</label>
                              {(overheadSummary.breakdown.csiRsCdmReductionPercent ?? 0) > 0 && (
                                <span className="text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-1 py-0.2 rounded font-mono font-semibold">
                                  -{overheadSummary.breakdown.csiRsCdmReductionPercent}% CDM
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-cyan-400 font-bold font-mono">{overheadSummary.breakdown.csiRsPercent.toFixed(2)}%</span>
                          </div>
                          <div className="space-y-1">
                            <div className="grid grid-cols-2 gap-1">
                              <div>
                                <span className="text-[9px] text-slate-400 block">State:</span>
                                <select
                                  value={(inputs.csiRsEnabled ?? true) ? 'true' : 'false'}
                                  onChange={(e) => update({ csiRsEnabled: e.target.value === 'true' })}
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-1 py-1 text-[10px] text-slate-100 font-mono"
                                >
                                  <option value="true">Active</option>
                                  <option value="false">Off (0%)</option>
                                </select>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 block">Density:</span>
                                <select
                                  value={inputs.csiRsDensity ?? 1.0}
                                  onChange={(e) => update({ csiRsDensity: Number(e.target.value) })}
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-1 py-1 text-[10px] text-slate-100 font-mono"
                                >
                                  <option value="0.5">0.5 RE/RB</option>
                                  <option value="1">1.0 RE/RB</option>
                                  <option value="3">3.0 RE/RB</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 block">CDM Multiplexing:</span>
                              <select
                                value={inputs.csiRsMultiplexing || ((inputs.csiRsPorts ?? 4) >= 8 ? 'cdm4-FD2-TD2' : 'fd-CDM2')}
                                onChange={(e) => update({ csiRsMultiplexing: e.target.value as CsiRsMultiplexingType })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-1 py-1 text-[10px] text-slate-100 font-mono"
                              >
                                <option value="noCDM">noCDM (1 Port / 1 RE)</option>
                                <option value="fd-CDM2">fd-CDM2 (2 Ports / Freq OCC)</option>
                                <option value="cdm4-FD2-TD2">cdm4-FD2-TD2 (4 Ports / 2F×2T)</option>
                                <option value="cdm8-FD2-TD4">cdm8-FD2-TD4 (8 Ports / 2F×4T)</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              <div>
                                <span className="text-[9px] text-slate-400 block">Ports:</span>
                                <select
                                  value={inputs.csiRsPorts ?? 4}
                                  onChange={(e) => update({ csiRsPorts: Number(e.target.value) })}
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-1 py-1 text-[10px] text-slate-100 font-mono"
                                >
                                  <option value="1">1 Port</option>
                                  <option value="2">2 Ports</option>
                                  <option value="4">4 Ports</option>
                                  <option value="8">8 Ports</option>
                                  <option value="16">16 Ports</option>
                                  <option value="32">32 Ports</option>
                                </select>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 block">Resource:</span>
                                <select
                                  value={inputs.csiRsResourceType || 'PERIODIC'}
                                  onChange={(e) => update({ csiRsResourceType: e.target.value as CsiRsResourceType })}
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-1 py-1 text-[10px] text-slate-100 font-mono"
                                >
                                  <option value="PERIODIC">Periodic</option>
                                  <option value="SEMI_PERSISTENT">Semi-Pers</option>
                                  <option value="APERIODIC">Aperiodic</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-500 block border-t border-slate-800/60 pt-1 truncate">TS 38.211 OCC · Drives PUCCH</span>
                      </div>

                      {/* 5. TRS (Tracking Reference Signal) */}
                      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] uppercase font-bold text-slate-300">5. TRS (Sync)</label>
                          <span className="text-[10px] text-cyan-400 font-bold">{overheadSummary.breakdown.trsPercent.toFixed(2)}%</span>
                        </div>
                        <div className="space-y-1">
                          <div>
                            <span className="text-[9px] text-slate-400 block">State:</span>
                            <select
                              value={(inputs.trsEnabled ?? true) ? 'true' : 'false'}
                              onChange={(e) => update({ trsEnabled: e.target.value === 'true' })}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100 font-mono"
                            >
                              <option value="true">Active (Enabled)</option>
                              <option value="false">Disabled (0%)</option>
                            </select>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block">Periodicity:</span>
                            <select
                              value={inputs.trsPeriodicityMs ?? 20}
                              onChange={(e) => update({ trsPeriodicityMs: Number(e.target.value) })}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100 font-mono"
                            >
                              <option value="10">10 ms</option>
                              <option value="20">20 ms (Default)</option>
                              <option value="40">40 ms</option>
                              <option value="80">80 ms</option>
                            </select>
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-500 block">4 sym / 2 slots burst</span>
                      </div>

                      {/* 6. PTRS (Phase Tracking Reference Signal) */}
                      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] uppercase font-bold text-slate-300">6. PTRS (Phase)</label>
                          <span className="text-[10px] text-cyan-400 font-bold">{overheadSummary.breakdown.ptrsDlPercent.toFixed(2)}%</span>
                        </div>
                        <div className="space-y-1">
                          <div>
                            <span className="text-[9px] text-slate-400 block">State:</span>
                            <select
                              value={(inputs.ptrsEnabled ?? (overheadSummary.frequencyRange === 'FR2')) ? 'true' : 'false'}
                              onChange={(e) => update({ ptrsEnabled: e.target.value === 'true' })}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100 font-mono"
                            >
                              <option value="true">Active (mmWave/High MCS)</option>
                              <option value="false">Disabled (0%)</option>
                            </select>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block">Time Density (L_PTRS):</span>
                            <select
                              value={inputs.ptrsTimeDensity ?? 1}
                              onChange={(e) => update({ ptrsTimeDensity: Number(e.target.value) })}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100 font-mono"
                            >
                              <option value="1">Every 1 symbol</option>
                              <option value="2">Every 2 symbols</option>
                              <option value="4">Every 4 symbols</option>
                            </select>
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-500 block">Phase noise correction</span>
                      </div>
                    </div>

                    {/* Detailed Aggregation Summary Bar */}
                    <div className="p-3 bg-slate-900/90 border border-cyan-800/60 rounded-lg flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Total DL Physical OH:</span>
                          <span className="text-base font-bold text-cyan-300 font-mono">
                            {overheadSummary.dlOverheadPercent.toFixed(2)}%
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            (OH_DL = {overheadSummary.dlOverheadRatio.toFixed(4)})
                          </span>
                        </div>
                        <div className="border-l border-slate-800 pl-3">
                          <span className="text-[10px] text-slate-400 block uppercase">Total UL Physical OH:</span>
                          <span className="text-base font-bold text-emerald-300 font-mono">
                            {overheadSummary.ulOverheadPercent.toFixed(2)}%
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            (OH_UL = {overheadSummary.ulOverheadRatio.toFixed(4)})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-950 border border-slate-800 px-2 py-1 rounded">
                          PDSCH Multiplier: {(1 - overheadSummary.dlOverheadRatio).toFixed(3)}×
                        </span>
                        <button
                          type="button"
                          onClick={() => update({ overheadMode: '38306_DEFAULT' })}
                          className="text-[10px] py-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                        >
                          Reset to 38.306 Standard Defaults
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Physical Layer Numerology & Residual BLER Targets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
                {/* 1. Residual BLER Target */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                      placeholder="10"
                    />
                    <span className="text-xs text-slate-400 font-mono">%</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                    HARQ outer-loop residual target (Default: 10%)
                  </span>
                </div>

                {/* 2. Subcarrier Spacing & Numerology Info Card */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                      SCS Numerology & Frame
                    </span>
                    <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950 border border-cyan-800 px-1.5 py-0.5 rounded">
                      μ = {overheadSummary.frequencyRange === 'FR2' ? '3 (120 kHz)' : '1 (30 kHz)'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
                    Slot duration: {overheadSummary.frequencyRange === 'FR2' ? '0.125 ms (8 slots/subframe)' : '0.5 ms (2 slots/subframe)'} · 14 OFDM symbols per slot.
                  </p>
                  <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800 flex justify-between">
                    <span>Frame length: 10 ms</span>
                    <span className="text-cyan-300 font-semibold">{overheadSummary.frequencyRange === 'FR2' ? '80 slots/frame' : '20 slots/frame'}</span>
                  </div>
                </div>
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

                {/* 5. Average PDCCH overhead (%) - CALCULATED (Uncapped, can exceed 10%) */}
                <div className={`rounded-lg p-3 flex flex-col justify-between relative overflow-hidden transition-all duration-300 group ${
                  overheads.avgPdcchOverheadPercent > 10
                    ? 'bg-amber-950/30 border-2 border-amber-500/80 shadow-lg shadow-amber-950/50'
                    : 'bg-slate-950/90 border border-cyan-800/60 shadow-md shadow-cyan-950/30 hover:border-cyan-600/80'
                }`}>
                  <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-xl pointer-events-none ${
                    overheads.avgPdcchOverheadPercent > 10 ? 'bg-amber-500/15' : 'bg-cyan-500/10'
                  }`} />
                  <div>
                    <div className="flex justify-between items-center mb-1 gap-1">
                      <span className={`text-[11px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5 ${
                        overheads.avgPdcchOverheadPercent > 10 ? 'text-amber-300' : 'text-cyan-300'
                      }`}>
                        <Gauge className={`w-3.5 h-3.5 inline shrink-0 ${
                          overheads.avgPdcchOverheadPercent > 10 ? 'text-amber-400 animate-pulse' : 'text-cyan-400'
                        }`} />
                        Avg PDCCH Overhead
                      </span>
                      {overheads.avgPdcchOverheadPercent > 10 ? (
                        <span className="text-[10px] font-mono font-bold text-amber-200 bg-amber-950/90 border border-amber-500/70 px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                          &gt; 10% High
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/90 border border-cyan-700/60 px-1.5 py-0.5 rounded shrink-0">
                          Uncapped Dynamic
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mb-2">
                      3GPP dynamic function of BW, Beams, CA & DMRS
                    </p>
                  </div>

                  <div className={`border rounded p-2 text-center transition-colors my-1 ${
                    overheads.avgPdcchOverheadPercent > 10
                      ? 'bg-amber-950/50 border-amber-700/60'
                      : 'bg-slate-900/90 border-cyan-900/60'
                  }`}>
                    <div className={`text-xl font-mono font-bold tabular-nums ${
                      overheads.avgPdcchOverheadPercent > 10 ? 'text-amber-300' : 'text-cyan-300'
                    }`}>
                      {overheads.avgPdcchOverheadPercent.toFixed(2)}%
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                        overheads.avgPdcchOverheadPercent > 10 ? 'bg-amber-400' : 'bg-cyan-400'
                      }`}></span>
                      <span className="font-semibold text-slate-300">
                        PDSCH Traffic Share: -{overheads.avgPdcchOverheadPercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* 3GPP Driver Factors Tags */}
                  <div className="mt-1 pt-1.5 border-t border-slate-800/80 flex flex-wrap gap-1 text-[9px] font-mono text-slate-400">
                    <span className="bg-slate-900/80 border border-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                      BW: {inputs.bandwidthMHz}MHz
                    </span>
                    <span className="bg-slate-900/80 border border-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                      Beams: {inputs.numberOfBeams ?? 1}
                    </span>
                    <span className="bg-slate-900/80 border border-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                      CORESET: {inputs.pdcchCoresetSymbols ?? 2}sym
                    </span>
                    <span className="bg-slate-900/80 border border-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                      DMRS: {inputs.dmrsSymbolsPerSlot ?? 1}sym
                    </span>
                    <span className="bg-slate-900/80 border border-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                      CA: {inputs.caEnabled ? (inputs.caCarriersCount || 1) : 1}CC
                    </span>
                    {inputs.csiRsResourceType === 'APERIODIC' && (
                      <span className="bg-slate-900/80 border border-cyan-800/80 px-1.5 py-0.5 rounded text-cyan-300">
                        Aperiodic DCI Trigger
                      </span>
                    )}
                  </div>
                </div>

                {/* 6. Average PUCCH overhead (%) - CALCULATED (Uncapped, can exceed 20%) */}
                <div className={`rounded-lg p-3 flex flex-col justify-between relative overflow-hidden transition-all duration-300 group ${
                  overheads.avgPucchOverheadPercent > 20
                    ? 'bg-rose-950/30 border-2 border-rose-500/80 shadow-lg shadow-rose-950/50'
                    : 'bg-slate-950/90 border border-emerald-800/60 shadow-md shadow-emerald-950/30 hover:border-emerald-600/80'
                }`}>
                  <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-xl pointer-events-none ${
                    overheads.avgPucchOverheadPercent > 20 ? 'bg-rose-500/15' : 'bg-emerald-500/10'
                  }`} />
                  <div>
                    <div className="flex justify-between items-center mb-1 gap-1">
                      <span className={`text-[11px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5 ${
                        overheads.avgPucchOverheadPercent > 20 ? 'text-rose-300' : 'text-emerald-300'
                      }`}>
                        <Gauge className={`w-3.5 h-3.5 inline shrink-0 ${
                          overheads.avgPucchOverheadPercent > 20 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                        }`} />
                        Avg PUCCH Overhead
                      </span>
                      {overheads.avgPucchOverheadPercent > 20 ? (
                        <span className="text-[10px] font-mono font-bold text-rose-200 bg-rose-950/90 border border-rose-500/70 px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping inline-block" />
                          &gt; 20% Rare Peak
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-700/60 px-1.5 py-0.5 rounded shrink-0">
                          Uncapped Dynamic
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mb-2">
                      3GPP dynamic function of CSI, CA slots & TDD
                    </p>
                  </div>

                  <div className={`border rounded p-2 text-center transition-colors my-1 ${
                    overheads.avgPucchOverheadPercent > 20
                      ? 'bg-rose-950/50 border-rose-700/60'
                      : 'bg-slate-900/90 border-emerald-900/60'
                  }`}>
                    <div className={`text-xl font-mono font-bold tabular-nums ${
                      overheads.avgPucchOverheadPercent > 20 ? 'text-rose-300' : 'text-emerald-300'
                    }`}>
                      {overheads.avgPucchOverheadPercent.toFixed(2)}%
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                        overheads.avgPucchOverheadPercent > 20 ? 'bg-rose-400' : 'bg-emerald-400'
                      }`}></span>
                      <span className="font-semibold text-slate-300">
                        PUSCH Traffic Share: -{overheads.avgPucchOverheadPercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* 3GPP Driver Factors Tags */}
                  <div className="mt-1 pt-1.5 border-t border-slate-800/80 flex flex-wrap gap-1 text-[9px] font-mono text-slate-400">
                    <span className="bg-slate-900/80 border border-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                      TDD: {inputs.duplexMode === 'TDD' ? inputs.tddFrameRatio : 'FDD'}
                    </span>
                    <span className="bg-slate-900/80 border border-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                      CSI: {inputs.csiRsReportsPerPeriod ?? 2} rpts
                    </span>
                    <span className="bg-slate-900/80 border border-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                      Period: {inputs.csiRsCaPeriodicitySlots ?? 20} slots
                    </span>
                    <span className="bg-slate-900/80 border border-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                      Ports: {inputs.csiRsPorts ?? 4}P ({inputs.csiRsMultiplexing || 'fd-CDM2'})
                    </span>
                    <span className="bg-slate-900/80 border border-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                      CA: {inputs.caEnabled ? (inputs.caCarriersCount || 1) : 1}CC
                    </span>
                    <span className="bg-slate-900/80 border border-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                      BLER: {inputs.residualBlerTargetPercent ?? 10}%
                    </span>
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

                  {/* 3. Average PDCCH overhead (%) - CALCULATED (Uncapped, can exceed 10%) */}
                  <div className={`rounded-lg p-3.5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 group ${
                    overheads.avgPdcchOverheadPercent > 10
                      ? 'bg-amber-950/30 border-2 border-amber-500/80 shadow-lg shadow-amber-950/50'
                      : 'bg-slate-950/90 border border-cyan-800/60 shadow-md shadow-cyan-950/30 hover:border-cyan-600/80'
                  }`}>
                    <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-xl pointer-events-none ${
                      overheads.avgPdcchOverheadPercent > 10 ? 'bg-amber-500/15' : 'bg-cyan-500/10'
                    }`} />
                    <div>
                      <div className="flex justify-between items-center mb-1 gap-1">
                        <span className={`text-xs font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5 ${
                          overheads.avgPdcchOverheadPercent > 10 ? 'text-amber-300' : 'text-cyan-300'
                        }`}>
                          <Gauge className={`w-3.5 h-3.5 inline shrink-0 ${
                            overheads.avgPdcchOverheadPercent > 10 ? 'text-amber-400 animate-pulse' : 'text-cyan-400'
                          }`} />
                          Avg PDCCH Overhead
                        </span>
                        {overheads.avgPdcchOverheadPercent > 10 ? (
                          <span className="text-[10px] font-mono font-bold text-amber-200 bg-amber-950/90 border border-amber-500/70 px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                            &gt; 10% High
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/90 border border-cyan-700/60 px-1.5 py-0.5 rounded shrink-0">
                            Uncapped Dynamic
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mb-2">
                        3GPP LTE Control Region (1-4 OFDM symbols)
                      </p>
                    </div>
                    <div className={`border rounded p-2 text-center transition-colors my-1 ${
                      overheads.avgPdcchOverheadPercent > 10
                        ? 'bg-amber-950/50 border-amber-700/60'
                        : 'bg-slate-900/90 border-cyan-900/60'
                    }`}>
                      <div className={`text-xl font-mono font-bold tabular-nums ${
                        overheads.avgPdcchOverheadPercent > 10 ? 'text-amber-300' : 'text-cyan-300'
                      }`}>
                        {overheads.avgPdcchOverheadPercent.toFixed(2)}%
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                          overheads.avgPdcchOverheadPercent > 10 ? 'bg-amber-400' : 'bg-cyan-400'
                        }`}></span>
                        <span className="font-semibold text-slate-300">
                          PDSCH Traffic Share: -{overheads.avgPdcchOverheadPercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Average PUCCH overhead (%) - CALCULATED (Uncapped, can exceed 20%) */}
                  <div className={`rounded-lg p-3.5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 group ${
                    overheads.avgPucchOverheadPercent > 20
                      ? 'bg-rose-950/30 border-2 border-rose-500/80 shadow-lg shadow-rose-950/50'
                      : 'bg-slate-950/90 border border-emerald-800/60 shadow-md shadow-emerald-950/30 hover:border-emerald-600/80'
                  }`}>
                    <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-xl pointer-events-none ${
                      overheads.avgPucchOverheadPercent > 20 ? 'bg-rose-500/15' : 'bg-emerald-500/10'
                    }`} />
                    <div>
                      <div className="flex justify-between items-center mb-1 gap-1">
                        <span className={`text-xs font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5 ${
                          overheads.avgPucchOverheadPercent > 20 ? 'text-rose-300' : 'text-emerald-300'
                        }`}>
                          <Gauge className={`w-3.5 h-3.5 inline shrink-0 ${
                            overheads.avgPucchOverheadPercent > 20 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                          }`} />
                          Avg PUCCH Overhead
                        </span>
                        {overheads.avgPucchOverheadPercent > 20 ? (
                          <span className="text-[10px] font-mono font-bold text-rose-200 bg-rose-950/90 border border-rose-500/70 px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping inline-block" />
                            &gt; 20% Rare Peak
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-700/60 px-1.5 py-0.5 rounded shrink-0">
                            Uncapped Dynamic
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mb-2">
                        3GPP LTE PUCCH Edge PRBs (Format 1/2/3)
                      </p>
                    </div>
                    <div className={`border rounded p-2 text-center transition-colors my-1 ${
                      overheads.avgPucchOverheadPercent > 20
                        ? 'bg-rose-950/50 border-rose-700/60'
                        : 'bg-slate-900/90 border-emerald-900/60'
                    }`}>
                      <div className={`text-xl font-mono font-bold tabular-nums ${
                        overheads.avgPucchOverheadPercent > 20 ? 'text-rose-300' : 'text-emerald-300'
                      }`}>
                        {overheads.avgPucchOverheadPercent.toFixed(2)}%
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                          overheads.avgPucchOverheadPercent > 20 ? 'bg-rose-400' : 'bg-emerald-400'
                        }`}></span>
                        <span className="font-semibold text-slate-300">
                          PUSCH Traffic Share: -{overheads.avgPucchOverheadPercent.toFixed(2)}%
                        </span>
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

      {/* SECTION 3: BASE STATION (eNodeB / gNodeB) */}
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

          {/* Antenna Mechanical & Electrical Tilts (3GPP TR 38.901 §7.3 / 36.814) */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-200">
                  Antenna Mechanical & Electrical Tilts
                </span>
                <span className="text-[10px] bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-mono px-2 py-0.5 rounded-full">
                  3GPP TR 38.901 §7.3 / AISG RET
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Total Downtilt:</span>
                <span className="font-bold text-cyan-300 bg-cyan-950 border border-cyan-800/80 px-2 py-0.5 rounded shadow-xs">
                  θ_total = {((inputs.bsMechanicalTiltDeg ?? 2.0) + (inputs.bsElectricalTiltDeg ?? 4.0)).toFixed(1)}°
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Mechanical Downtilt */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                      Mechanical Downtilt (θ_mech)
                    </label>
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      {(inputs.bsMechanicalTiltDeg ?? 2.0).toFixed(1)}°
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mb-2">
                    Bracket physical mounting angle (-2° to +15°)
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="range"
                      min="-2"
                      max="15"
                      step="0.5"
                      value={inputs.bsMechanicalTiltDeg ?? 2.0}
                      onChange={(e) => update({ bsMechanicalTiltDeg: Number(e.target.value) })}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <input
                      type="number"
                      min="-2"
                      max="15"
                      step="0.5"
                      value={inputs.bsMechanicalTiltDeg ?? 2.0}
                      onChange={(e) => update({ bsMechanicalTiltDeg: Number(e.target.value) })}
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono text-center focus:border-cyan-400 focus:outline-none"
                    />
                    <span className="text-xs text-slate-400 font-mono">°</span>
                  </div>
                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap gap-1 text-[9px] font-mono">
                    {[-2, 0, 2, 4, 8].map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => update({ bsMechanicalTiltDeg: deg })}
                        className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                          (inputs.bsMechanicalTiltDeg ?? 2.0) === deg
                            ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {deg > 0 ? `+${deg}°` : `${deg}°`} {deg === -2 ? '(Uptilt)' : deg === 0 ? '(Flat)' : deg === 2 ? '(Macro)' : deg === 4 ? '(Urban)' : '(Mast)'}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-[9px] text-slate-500 font-mono pt-2 border-t border-slate-900 mt-2 block">
                  Tilts physical array & all side lobes simultaneously.
                </span>
              </div>

              {/* 2. Electrical Downtilt (RET) */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                      Electrical Tilt (RET θ_elec)
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {(inputs.bsElectricalTiltDeg ?? 4.0).toFixed(1)}°
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mb-2">
                    Phase-shifted Remote Electrical Tilt (0° to +14°)
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="range"
                      min="0"
                      max="14"
                      step="0.5"
                      value={inputs.bsElectricalTiltDeg ?? 4.0}
                      onChange={(e) => update({ bsElectricalTiltDeg: Number(e.target.value) })}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                    <input
                      type="number"
                      min="0"
                      max="14"
                      step="0.5"
                      value={inputs.bsElectricalTiltDeg ?? 4.0}
                      onChange={(e) => update({ bsElectricalTiltDeg: Number(e.target.value) })}
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono text-center focus:border-emerald-400 focus:outline-none"
                    />
                    <span className="text-xs text-slate-400 font-mono">°</span>
                  </div>
                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap gap-1 text-[9px] font-mono">
                    {[0, 2, 4, 6, 10].map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => update({ bsElectricalTiltDeg: deg })}
                        className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                          (inputs.bsElectricalTiltDeg ?? 4.0) === deg
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {deg}° {deg === 0 ? '(0° RET)' : deg === 2 ? '(Rural)' : deg === 4 ? '(Urban)' : deg === 6 ? '(Dense)' : '(Micro)'}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-[9px] text-slate-500 font-mono pt-2 border-t border-slate-900 mt-2 block">
                  Preserves horizontal pattern symmetry with ≥20dB upper sidelobe suppression.
                </span>
              </div>

              {/* 3. Vertical Beamwidth (3dB HPBW) */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                      Vertical 3dB Beamwidth (θ_3dB)
                    </label>
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      {(inputs.bsVerticalBeamwidthDeg ?? 7.0).toFixed(1)}°
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mb-2">
                    Elevation Half-Power Beamwidth (HPBW)
                  </p>
                  <select
                    value={inputs.bsVerticalBeamwidthDeg ?? 7.0}
                    onChange={(e) => update({ bsVerticalBeamwidthDeg: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none mb-2"
                  >
                    <option value="5">5.0° (High-Gain 64TR Massive MIMO)</option>
                    <option value="6.5">6.5° (Standard Macro Array)</option>
                    <option value="7">7.0° (Default 3GPP Macro Specification)</option>
                    <option value="8.5">8.5° (Mid-Band Sector Antenna)</option>
                    <option value="10">10.0° (Low-Band / Compact Antenna)</option>
                    <option value="12">12.0° (Micro / Small Cell Wide Beam)</option>
                  </select>
                </div>
                <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-900 flex justify-between">
                  <span>Elevation Envelope:</span>
                  <span className="text-slate-300 font-semibold">±{((inputs.bsVerticalBeamwidthDeg ?? 7.0) / 2).toFixed(1)}° to 3dB roll-off</span>
                </div>
              </div>
            </div>

            {/* 4. Coverage Geometry & 3D Radiation Pattern Insight Card */}
            <div className="bg-slate-900/90 border border-cyan-800/60 rounded-xl p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-200">
                    Tilt Coverage Geometry & 3D Vertical Pattern Footprint
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => update({
                      bsElectricalTiltDeg: Math.max(0, Math.min(14, Number((antennaTiltSummary.optimalTiltDeg - (inputs.bsMechanicalTiltDeg ?? 2.0)).toFixed(1))))
                    })}
                    className="text-[10px] font-mono py-1 px-2.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-600/80 text-cyan-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Apply Optimal Tilt ({antennaTiltSummary.optimalTiltDeg}°)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                {/* Metric 1: Main Beam Ground Intercept */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 block uppercase">Main Beam Intercept:</span>
                  <div className="text-base font-bold text-cyan-300 mt-0.5">
                    {antennaTiltSummary.mainBeamGroundDistanceMeters} m
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    Boresight on ground d_center
                  </span>
                </div>

                {/* Metric 2: 3dB Coverage Footprint */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 block uppercase">3dB Ground Footprint:</span>
                  <div className="text-base font-bold text-emerald-300 mt-0.5">
                    {antennaTiltSummary.innerCoverageDistanceMeters}m – {antennaTiltSummary.outerCoverageDistanceMeters}m
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    Half-power beam span
                  </span>
                </div>

                {/* Metric 3: Cell Edge Pattern Loss */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 block uppercase">Cell-Edge Pattern Loss:</span>
                  <div className={`text-base font-bold mt-0.5 ${
                    antennaTiltSummary.cellEdgePatternLossDb > 6
                      ? 'text-amber-400'
                      : antennaTiltSummary.cellEdgePatternLossDb < 0.5
                      ? 'text-cyan-300'
                      : 'text-emerald-300'
                  }`}>
                    -{antennaTiltSummary.cellEdgePatternLossDb} dB
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    At R_max = {lbResult.maxCellRangeKm.toFixed(2)} km
                  </span>
                </div>

                {/* Metric 4: Theoretical Optimal Tilt */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 block uppercase">Recommended Tilt:</span>
                  <div className="text-base font-bold text-cyan-300 mt-0.5">
                    {antennaTiltSummary.optimalTiltDeg}°
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    θ_opt = arctan(Δh/R) + θ_3dB/2
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 font-mono bg-slate-950/50 border border-slate-800 rounded px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>
                    Mechanical Tilt: <strong className="text-slate-200">{(inputs.bsMechanicalTiltDeg ?? 2.0).toFixed(1)}°</strong> + Electrical RET: <strong className="text-slate-200">{(inputs.bsElectricalTiltDeg ?? 4.0).toFixed(1)}°</strong> = Effective: <strong className="text-cyan-300">{((inputs.bsMechanicalTiltDeg ?? 2.0) + (inputs.bsElectricalTiltDeg ?? 4.0)).toFixed(1)}°</strong>
                  </span>
                </div>
                <span className="text-slate-500">
                  {antennaTiltSummary.cellEdgePatternLossDb > 6
                    ? '⚠️ High downtilt: Main beam lands close to tower; cell edge experiences antenna pattern roll-off.'
                    : antennaTiltSummary.cellEdgePatternLossDb < 0.8
                    ? '✅ Shallow downtilt: Maximum cell radius coverage; watch for adjacent cell interference.'
                    : '✅ Optimal coverage illumination: Balanced cell-edge SNR with reduced inter-cell interference.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: USER EQUIPMENT & CPE */}
      {activeSection === 'ue' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* UE Category Selection */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                <span>UE Device Category / 3GPP Tier</span>
                <span className="text-[10px] text-cyan-400 font-normal">TS 38.306 / 36.306</span>
              </label>
              <select
                value={inputs.ueCategory || (inputs.technology === '4G' ? 'LTE_CAT16_GIGA' : 'REL16_FLAGSHIP')}
                onChange={(e) => handleUeCategoryChange(e.target.value as UeCategory)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <optgroup label="5G NR & 5G-Advanced (3GPP Rel-15 to Rel-18)">
                  <option value="REL18_ADVANCED">5G-Advanced Rel-18 Ultra Flagship (4x4 DL / 2-4Tx UL / 1024QAM Ready)</option>
                  <option value="REL16_FLAGSHIP">5G NR Rel-16/17 Flagship (4x4 DL / 2Tx UL MIMO / 256QAM DL)</option>
                  <option value="REL15_STANDARD">5G NR Rel-15 Standard Smartphone (4x4 DL / 1Tx UL / 256QAM DL)</option>
                  <option value="HPUE_CLASS2">5G High-Power UE (HPUE Class 2 - 26 dBm / 2Tx UL MIMO)</option>
                  <option value="FWA_CPE_PRO">5G FWA High-Gain Outdoor Rooftop CPE (4T4R / 29 dBm / 12 dBi)</option>
                  <option value="FWA_CPE_INDOOR">5G FWA Indoor Desktop CPE Gateway (2T4R / 26 dBm / 4 dBi)</option>
                  <option value="INDUSTRY_4_0">5G Industrial Rugged Terminal / Private 5G URLLC (2T4R / 26 dBm)</option>
                  <option value="MMWAVE_PREMIUM">5G mmWave Fixed Wireless Terminal (FR2 Power Class 1 / 18 dBi)</option>
                  <option value="REDCAP_REL17">5G RedCap Rel-17 Mid-Tier / Sensor (1T2R / 20-23 dBm / 64QAM)</option>
                </optgroup>
                <optgroup label="4G LTE & Cellular IoT (3GPP Rel-8 to Rel-15)">
                  <option value="LTE_CAT18_GIGA">4G LTE-A Pro Cat 18/20 Gigabit Smartphone (4x4 DL / 2Tx UL)</option>
                  <option value="LTE_CAT16_GIGA">4G LTE-A Cat 16 Gigabit Terminal (4x4 DL / 2Tx UL)</option>
                  <option value="LTE_CAT4_STD">4G LTE Cat 4 Standard Legacy Handset (2x2 DL / 1Tx UL)</option>
                  <option value="LTE_CATM1_IOT">Cellular IoT Cat-M1 / NB-IoT M2M (1T1R / 23 dBm / Narrowband)</option>
                </optgroup>
              </select>
            </div>

            {/* UE MIMO Mode (1T1R, 1T2R, 1T4R, 2T2R, 2T4R, 4T4R, 4T8R) */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                <span>UE MIMO Mode (Tx/Rx Antennas)</span>
                <span className="text-[10px] text-emerald-400 font-normal">TS 38.211 / 38.214</span>
              </label>
              <select
                value={inputs.ueMimoMode || (inputs.technology === '4G' ? '1T2R' : '2T4R')}
                onChange={(e) => update({ ueMimoMode: e.target.value as UeMimoMode })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="1T1R">1Tx 1Rx (Rank 1 UL SISO / 1-Layer DL - RedCap/IoT Baseline)</option>
                <option value="1T2R">1Tx 2Rx (Rank 1 UL SISO / 2-Layer DL)</option>
                <option value="1T4R">1Tx 4Rx (Rank 1 UL SISO / 4-Layer DL + 2.5dB Div Gain)</option>
                <option value="2T2R">2Tx 2Rx (Rank 2 UL MIMO [2x UL Thrpt] / 2-Layer DL)</option>
                <option value="2T4R">2Tx 4Rx (Rank 2 UL MIMO [2x UL Thrpt] / 4-Layer DL + 2.5dB Div Gain)</option>
                <option value="4T4R">4Tx 4Rx (Rank 4 UL MIMO [4x UL Thrpt] / 4-Layer DL + 2.5dB Div Gain)</option>
                <option value="4T8R">4Tx 8Rx (Rank 4 UL MIMO [4x UL Thrpt] / 8-Layer DL Array + 4.5dB Div Gain)</option>
              </select>
            </div>

            {/* UE Terminal Form Factor */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                <span>UE Terminal Form Factor</span>
                <span className="text-[10px] text-amber-400 font-normal">TS 38.101-1 / 2</span>
              </label>
              <select
                value={inputs.ueType}
                onChange={(e) => handleUeTypeChange(e.target.value as UeType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="HANDSET_STD">Standard Mobile Handset (Power Class 3 - 23 dBm)</option>
                <option value="HANDSET_HPUE">High-Power Mobile UE (HPUE Power Class 2 - 26 dBm / 400 mW)</option>
                <option value="INDOOR_CPE">Indoor FWA Desktop CPE Gateway (26 dBm / 4 dBi Gain)</option>
                <option value="OUTDOOR_CPE">Outdoor High-Gain Rooftop CPE (27-30 dBm / 9-12 dBi Gain)</option>
                <option value="INDUSTRIAL_IOT">Industrial 5G Rugged Gateway / Private URLLC (26 dBm / 5 dBi)</option>
                <option value="VEHICULAR_CPE">Vehicular / First Responder Roof Terminal (26-28 dBm / 4 dBi)</option>
                <option value="MMWAVE_CPE">5G mmWave Fixed Wireless Terminal (33-43 dBm EIRP / 18 dBi)</option>
                <option value="REDCAP_DEVICE">5G RedCap Wearable / Industrial Sensor (Power Class 3/4 - 20-23 dBm)</option>
              </select>
            </div>
          </div>

          {/* UE 3GPP Specification & Physical Architecture Status Strip */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs font-mono space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
                <span className="text-slate-200 font-semibold">
                  Uplink Spatial Architecture: <span className="text-emerald-400 font-bold">{inputs.ueMimoMode?.startsWith('4T') ? '4Tx (Quad Streams - Rank 4 SU-MIMO)' : inputs.ueMimoMode?.startsWith('2T') ? '2Tx (Dual Streams - Rank 2 SU-MIMO)' : '1Tx (Single Stream - Rank 1 SISO)'}</span>
                </span>
              </div>
              <span className="text-cyan-400 font-semibold">
                {inputs.ueMimoMode?.startsWith('4T') ? '⚡ +300% Peak UL Speed Potential (4x UL MIMO)' : inputs.ueMimoMode?.startsWith('2T') ? '⚡ +100% Peak UL Speed Potential (2x UL MIMO)' : 'Standard Single-Stream Uplink (Capped)'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800/60">
                <span className="text-slate-500 block text-[10px] uppercase">3GPP Power Class</span>
                <span className="text-amber-300 font-bold">
                  {inputs.ueTxPowerDbm >= 30 ? 'Class 1 (30-33 dBm)' : inputs.ueTxPowerDbm >= 28 ? 'Class 1.5 (28-29 dBm)' : inputs.ueTxPowerDbm >= 25 ? 'Class 2 HPUE (26 dBm)' : inputs.ueTxPowerDbm >= 22 ? 'Class 3 (23 dBm Std)' : inputs.ueTxPowerDbm >= 19 ? 'Class 4 (20 dBm RedCap)' : 'Class 5 (14 dBm Low)'}
                </span>
              </div>

              <div className="bg-slate-900/80 p-2 rounded border border-slate-800/60">
                <span className="text-slate-500 block text-[10px] uppercase">DL Diversity Gain</span>
                <span className="text-cyan-300 font-bold">
                  {inputs.ueMimoMode?.endsWith('8R') ? '+4.5 dB (8Rx MMSE-IRC)' : inputs.ueMimoMode?.endsWith('4R') ? '+2.5 dB (4Rx MMSE-IRC)' : inputs.ueMimoMode?.endsWith('1R') ? '-2.5 dB (1Rx SISO)' : '0.0 dB (2Rx Baseline)'}
                </span>
              </div>

              <div className="bg-slate-900/80 p-2 rounded border border-slate-800/60">
                <span className="text-slate-500 block text-[10px] uppercase">SRS Switching</span>
                <span className="text-slate-200 font-bold">
                  {inputs.ueMimoMode?.endsWith('4R') || inputs.ueMimoMode?.endsWith('8R') ? '1T4R / 2T4R Supported' : '1T2R / 2T2R Supported'}
                </span>
              </div>

              <div className="bg-slate-900/80 p-2 rounded border border-slate-800/60">
                <span className="text-slate-500 block text-[10px] uppercase">UL Full Power Mode</span>
                <span className="text-emerald-300 font-bold">
                  {inputs.ueMimoMode?.startsWith('1T') ? 'Mode 1 (Single Port)' : 'Mode 2 (Balanced PAs)'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Max UE TX Power */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  UE Max TX Power (P_max)
                </label>
                <span className="text-xs font-mono font-semibold text-emerald-400">
                  {inputs.ueTxPowerDbm} dBm ({Math.round(Math.pow(10, (inputs.ueTxPowerDbm - 30) / 10) * 1000)} mW)
                </span>
              </div>
              <input
                type="range"
                min="14"
                max="33"
                step="0.5"
                value={inputs.ueTxPowerDbm}
                onChange={(e) => update({ ueTxPowerDbm: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>14 dBm (Cl.5)</span>
                <span>20 dBm (Cl.4)</span>
                <span>23 dBm (Cl.3 std)</span>
                <span>26 dBm (HPUE)</span>
                <span>29 dBm (Cl.1.5)</span>
                <span>33 dBm (Cl.1)</span>
              </div>
            </div>

            {/* UE Antenna Gain */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  UE Antenna Gain (G_ue)
                </label>
                <span className="text-xs font-mono font-semibold text-slate-200">
                  {inputs.ueAntennaGainDbi} dBi
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="0.5"
                value={inputs.ueAntennaGainDbi}
                onChange={(e) => update({ ueAntennaGainDbi: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>0 dBi (Phone)</span>
                <span>4 dBi (Indoor CPE)</span>
                <span>11 dBi (Outdoor High Gain)</span>
                <span>18-24 dBi (mmWave Array)</span>
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
                max="25"
                step="0.5"
                value={inputs.ueHeightMeters}
                onChange={(e) => update({ ueHeightMeters: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>1.5m (Handset)</span>
                <span>2m (Indoor CPE)</span>
                <span>8m (Rooftop CPE)</span>
                <span>15-25m (Tower/Mast)</span>
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
                <span>2.0 dB (Wearable)</span>
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
                max="14"
                step="0.5"
                value={inputs.dlNoiseFigureDb ?? inputs.ueNoiseFigureDb ?? 7}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  update({ dlNoiseFigureDb: val, ueNoiseFigureDb: val });
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>5.0 dB (High-Tier CPE)</span>
                <span>7.0-7.5 dB (3GPP Default)</span>
                <span>8.5-9 dB (RedCap/Budget)</span>
                <span>10-12 dB (mmWave)</span>
              </div>
            </div>

            {/* Uplink Transmission Scheme Summary */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-md p-2.5 text-xs font-mono flex flex-col justify-between">
              <div>
                <div className="text-slate-400 mb-1">UL Transmission & Standards:</div>
                <div className="text-slate-200 font-semibold">
                  {inputs.ueMimoMode?.startsWith('4T') ? '4Tx Codebook / Non-Codebook Multiplexing' : inputs.ueMimoMode?.startsWith('2T') ? '2Tx Codebook / Non-Codebook Multiplexing' : '1Tx Single Port Port-0 SISO'}
                </div>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                3GPP TS 38.214 §6.1.1 · TS 38.101-1 Table 6.2.1-1 · TS 38.306 UE Capability Engineering.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: SPM PROPAGATION & ENVIRONMENT */}
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
                <option value="TUNNEL_COVERAGE">Inside Tunnel Coverage (~18-24 dB)</option>
                <option value="INDOOR_DEEP">Deep Indoor / Low-E Glass & Concrete (~22-28 dB)</option>
              </select>
            </div>
          </div>

          {/* Inside Tunnel Coverage Modeling Deep-Dive Callout */}
          {inputs.indoorOutdoorScenario === 'TUNNEL_COVERAGE' && (() => {
            const currentFreq = selectedBandInfo?.dlFreqMHz || 2100;
            const tunnelPenetration = getBuildingPenetrationLoss('TUNNEL_COVERAGE', currentFreq);
            return (
              <div className="p-4 bg-slate-950/90 border border-cyan-800/80 rounded-lg space-y-3 font-mono shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>3GPP & INDUSTRY TUNNEL PROPAGATION MODELING (TR 38.901 HST & ITU-R)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Portal / Aperture Coupling Loss:</span>
                    <span className="text-xs font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-700">
                      +{tunnelPenetration.toFixed(2)} dB
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                  {/* Waveguide & Attenuation */}
                  <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800 space-y-1">
                    <div className="text-cyan-400 font-bold flex items-center gap-1">
                      <span>1. Waveguide Mode Attenuation</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[10px]">
                      At cellular frequencies ({currentFreq} MHz), straight tunnels act as oversized dielectric waveguides. Near-zone features multimode interference; far-zone exhibits low longitudinal attenuation (α ≈ 0.015 - 0.04 dB/m / 15-40 dB/km).
                    </p>
                  </div>

                  {/* Shadow Fading & Presets */}
                  <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800 space-y-1.5">
                    <div className="text-cyan-400 font-bold flex items-center justify-between">
                      <span>2. Shadow Fading (Slow Fading)</span>
                      <span className="text-[10px] text-slate-400">σ: 5.5 dB vs 3.0 dB</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[10px]">
                      Confined concrete/rock walls eliminate external clutter scatter. 3GPP HST standard models vehicular blockage with σ = 5.5 dB, or σ = 3.0 dB with Leaky Coaxial Feeder.
                    </p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const margin = calculateShadowFadingMargin(5.5, inputs.coverageProbability);
                          update({
                            shadowFadingStdDevDb: 5.5,
                            shadowFadingMarginDb: margin,
                            shadowFadingEnvironment: 'TUNNEL'
                          });
                        }}
                        className={`text-[9px] px-2 py-1 rounded border transition-all ${
                          Math.abs(inputs.shadowFadingStdDevDb - 5.5) < 0.2
                            ? 'bg-cyan-900 border-cyan-400 text-cyan-200'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-cyan-600'
                        }`}
                      >
                        Apply σ = 5.5 dB (HST)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const margin = calculateShadowFadingMargin(3.0, inputs.coverageProbability);
                          update({
                            shadowFadingStdDevDb: 3.0,
                            shadowFadingMarginDb: margin,
                            shadowFadingEnvironment: 'CUSTOM'
                          });
                        }}
                        className={`text-[9px] px-2 py-1 rounded border transition-all ${
                          Math.abs(inputs.shadowFadingStdDevDb - 3.0) < 0.2
                            ? 'bg-cyan-900 border-cyan-400 text-cyan-200'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-cyan-600'
                        }`}
                      >
                        Apply σ = 3.0 dB (Leaky DAS)
                      </button>
                    </div>
                  </div>

                  {/* Fast Fading & Leaky Feeder */}
                  <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800 space-y-1">
                    <div className="text-cyan-400 font-bold">
                      <span>3. Fast Fading & Small-Scale Physics</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[10px]">
                      Rician fading dominates LOS & leaky feeder (K ≈ 8-12 dB). Degrades to Rayleigh around curves or vehicle shadowing. In high-speed rail (HST), Doppler shift reaches ±1 kHz at 3.5 GHz.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Log-Normal Shadow Fading & Margins Panel */}
          {(() => {
            const calculatedMargin = calculateShadowFadingMargin(inputs.shadowFadingStdDevDb, inputs.coverageProbability);
            const currentMargin = (inputs.shadowFadingMarginDb !== undefined && inputs.shadowFadingMarginDb !== null && !isNaN(inputs.shadowFadingMarginDb))
              ? inputs.shadowFadingMarginDb
              : calculatedMargin;
            const currentZ = getGaussianZ(inputs.coverageProbability);

            const envPresets = [
              {
                id: 'TUNNEL' as const,
                name: 'Inside Tunnel',
                sigma: 5.5,
                desc: 'Confined waveguide, train/vehicular blockage (3GPP HST)',
                clutter: 'URBAN' as EnvironmentClutter
              },
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
              Math.abs(inputs.shadowFadingStdDevDb - 5.5) < 0.2 ? 'TUNNEL' :
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
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

                  {/* 4. Interference & IoT Margin (3GPP TR 36.942 / TR 38.901 / ITU-R M.2412) */}
                  <div className="md:col-span-3 bg-slate-900/70 border border-slate-800 rounded-lg p-4 space-y-4 shadow-md">
                    {/* Header with Title, Tech Badge & Live Values */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-bold flex items-center gap-1.5">
                            Interference & Cell Loading Engine (3GPP Ref)
                          </h4>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${
                            is5G
                              ? 'bg-cyan-950/80 border-cyan-800 text-cyan-300'
                              : 'bg-amber-950/80 border-amber-800 text-amber-300'
                          }`}>
                            {is5G ? '5G NR · Lean Carrier (0% CRS) + Beamforming Spatial Filtering' : '4G LTE · Continuous CRS Floor (14.3%) + SC-FDMA UL (f=0.55)'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Hexagonal multi-tier co-channel interference & intra-cell loading effects impacting DL & UL MAPL
                        </p>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-2.5 py-1.5 rounded-md">
                        <span className="text-[10px] text-slate-400 font-mono uppercase">Effective Margins:</span>
                        <span className="text-xs font-mono font-bold text-cyan-300">
                          DL {interferenceSummary.effectiveDlInterferenceMarginDb.toFixed(1)} dB
                        </span>
                        <span className="text-slate-600">/</span>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          UL IoT {interferenceSummary.effectiveUlIotMarginDb.toFixed(1)} dB
                        </span>
                      </div>
                    </div>

                    {/* Top Row: Scenario Dropdown, Hexagonal Tiers, ISD (Editable & Sync), Method Dropdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                      {/* Control 1: Interference Scenario (Pull Down Menu) */}
                      <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-lg space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-semibold uppercase block">
                          1. Interference from Neighboring Cells
                        </label>
                        <select
                          value={inputs.interferenceScenario ?? 'NEIGHBORING_CELLS'}
                          onChange={(e) => {
                            const sc = e.target.value as InterferenceScenarioType;
                            update({
                              interferenceScenario: sc,
                              interferenceMarginDb: sc === 'ISOLATED_CELL' ? 0.0 : interferenceSummary.effectiveDlInterferenceMarginDb,
                              iotMarginDb: sc === 'ISOLATED_CELL' ? 0.0 : interferenceSummary.effectiveUlIotMarginDb
                            });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none cursor-pointer"
                        >
                          <option value="NEIGHBORING_CELLS">Yes — Neighboring interferers (Networked Grid)</option>
                          <option value="ISOLATED_CELL">No — Isolated (Single Cell / Clean RF)</option>
                        </select>
                        <span className="text-[10px] text-slate-500 block">
                          {inputs.interferenceScenario === 'ISOLATED_CELL'
                            ? 'Isolated single cell: 0 dB inter-cell interference'
                            : 'Hexagonal multi-site cluster interference active'}
                        </span>
                      </div>

                      {/* Control 2: Hexagonal Layout & Tiers */}
                      <div className={`bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-lg space-y-1.5 ${
                        inputs.interferenceScenario === 'ISOLATED_CELL' ? 'opacity-40 pointer-events-none' : ''
                      }`}>
                        <label className="text-[10px] text-slate-400 font-semibold uppercase block">
                          2. Hexagonal Multi-Tier Layout
                        </label>
                        <select
                          value={inputs.interferenceHexTiers ?? 1}
                          onChange={(e) => update({ interferenceHexTiers: Number(e.target.value) as InterferenceHexLayoutTiers })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none cursor-pointer"
                        >
                          <option value={1}>1 Tier (7 sites · 18 neighbor sectors)</option>
                          <option value={2}>2 Tiers (19 sites · 54 neighbor sectors)</option>
                        </select>
                        <span className="text-[10px] text-slate-500 block">
                          {inputs.interferenceHexTiers === 2
                            ? '19 sites (1 serving + 18 neighbors = 54 co-channel sectors)'
                            : '7 sites (1 serving + 6 neighbors = 18 co-channel sectors)'}
                        </span>
                      </div>

                      {/* Control 3: Inter-Site Distance (ISD) - Editable with sync */}
                      <div className={`bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-lg space-y-1.5 ${
                        inputs.interferenceScenario === 'ISOLATED_CELL' ? 'opacity-40 pointer-events-none' : ''
                      }`}>
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] text-slate-400 font-semibold uppercase block">
                            3. Inter-Site Distance (ISD)
                          </label>
                          <span className="text-[10px] text-cyan-400 font-bold">
                            {(interferenceSummary.isdMeters / 1000).toFixed(2)} km
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="100"
                            max="50000"
                            step="50"
                            value={inputs.interferenceIsdMeters ?? Math.round(1.5 * (lbResult.maxCellRangeMeters || 1000))}
                            onChange={(e) => update({ interferenceIsdMeters: Math.max(50, Number(e.target.value)) })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                            placeholder="m"
                          />
                          <span className="text-[10px] text-slate-400 font-mono">m</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-mono">
                            Ratio: {(interferenceSummary.isdMeters / Math.max(1, lbResult.maxCellRangeMeters)).toFixed(2)} × R_max
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const synced = Math.round(1.5 * Math.max(100, lbResult.maxCellRangeMeters));
                              update({ interferenceIsdMeters: synced, interferenceIsdMultiplier: 1.5 });
                            }}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono underline hover:no-underline cursor-pointer"
                            title="Reset ISD to exactly 1.5 x calculated cell range"
                          >
                            Set 1.5 × R
                          </button>
                        </div>
                      </div>

                      {/* Control 4: Interference Margin Method (3GPP Ref / Industry Best Practice) */}
                      <div className={`bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-lg space-y-1.5 ${
                        inputs.interferenceScenario === 'ISOLATED_CELL' ? 'opacity-40 pointer-events-none' : ''
                      }`}>
                        <label className="text-[10px] text-slate-400 font-semibold uppercase block">
                          4. Interference Margin Method
                        </label>
                        <select
                          value={inputs.interferenceMethod ?? 'VENDOR_LOAD_COUPLING'}
                          onChange={(e) => update({ interferenceMethod: e.target.value as InterferenceMarginMethod })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none cursor-pointer"
                        >
                          <option value="VENDOR_LOAD_COUPLING">Vendor Load-Coupling (Ericsson/Nokia/Huawei)</option>
                          <option value="3GPP_GEOMETRY_MULTITIER">3GPP TR 36.942 / TR 38.901 Hex Geometry</option>
                          <option value="ITU_R_INR_SCALING">ITU-R M.2412 Interference/Thermal (INR)</option>
                          <option value="SINR_DESENSITIZATION">3GPP Receiver Effective Desensitization</option>
                        </select>
                        <span className="text-[10px] text-slate-500 block truncate" title={interferenceSummary.methodName}>
                          {interferenceSummary.methodName}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Cell Loading Controls (Neighbor DL Load & Intra-Cell Current Load) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                      {/* Control 5: Average Neighboring Cells Load [%] */}
                      <div className={`bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg space-y-2 ${
                        inputs.interferenceScenario === 'ISOLATED_CELL' ? 'opacity-40 pointer-events-none' : ''
                      }`}>
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] text-slate-300 font-semibold uppercase">
                            Average Neighboring Cells Load Factor (η_neigh)
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="5"
                              value={inputs.neighborCellLoadPercent ?? 50}
                              onChange={(e) => update({ neighborCellLoadPercent: Math.min(100, Math.max(0, Number(e.target.value))) })}
                              className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-cyan-300 font-bold font-mono text-right focus:border-cyan-400 focus:outline-none"
                            />
                            <span className="text-cyan-400 font-bold">%</span>
                          </div>
                        </div>

                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={inputs.neighborCellLoadPercent ?? 50}
                          onChange={(e) => update({ neighborCellLoadPercent: Number(e.target.value) })}
                          className="w-full accent-cyan-400 cursor-pointer"
                        />

                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>0% (Empty)</span>
                          <span>30% (Light)</span>
                          <span>50% (Nominal)</span>
                          <span>70% (Busy)</span>
                          <span>100% (Full Buffer)</span>
                        </div>

                        {/* Technology-specific load notes */}
                        <div className="bg-slate-900/90 border border-slate-800 p-2 rounded text-[10px] text-slate-400 space-y-1">
                          {is5G ? (
                            <div className="text-cyan-300/90">
                              <strong>5G NR Lean Carrier:</strong> 0% continuous CRS. At {inputs.neighborCellLoadPercent ?? 50}% load, effective DL interference load is <strong>{interferenceSummary.effectiveDlTrafficLoadPercent}%</strong> (traffic + periodic SSB sweeps only).
                            </div>
                          ) : (
                            <div className="text-amber-300/90">
                              <strong>4G LTE Continuous CRS:</strong> Always-on cell reference signals provide ~14.3% continuous RF floor. At {inputs.neighborCellLoadPercent ?? 50}% traffic, effective DL interference load is <strong>{interferenceSummary.effectiveDlTrafficLoadPercent}%</strong>.
                            </div>
                          )}
                          <div className="text-slate-500">
                            {is5G
                              ? `Massive MIMO Spatial Filtering: -${interferenceSummary.beamformingIsolationDb} dB inter-cell isolation due to directional beam steering.`
                              : 'Macro broad sector antenna: 0 dB spatial beam isolation (interference illuminates entire sector).'
                            }
                          </div>
                        </div>
                      </div>

                      {/* Control 6: Intra-Cell Load (Current Cell Loading) [%] */}
                      <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] text-slate-300 font-semibold uppercase">
                            Current Cell Loading Factor (Intra-Cell η_intra)
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="5"
                              value={inputs.intraCellLoadPercent ?? 50}
                              onChange={(e) => update({ intraCellLoadPercent: Math.min(100, Math.max(0, Number(e.target.value))) })}
                              className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-emerald-300 font-bold font-mono text-right focus:border-cyan-400 focus:outline-none"
                            />
                            <span className="text-emerald-400 font-bold">%</span>
                          </div>
                        </div>

                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={inputs.intraCellLoadPercent ?? 50}
                          onChange={(e) => update({ intraCellLoadPercent: Number(e.target.value) })}
                          className="w-full accent-emerald-400 cursor-pointer"
                        />

                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>0% (Idle Cell)</span>
                          <span>30% (Moderate)</span>
                          <span>50% (Standard)</span>
                          <span>70% (High Load)</span>
                          <span>100% (Congested)</span>
                        </div>

                        {/* Technology-specific intra-cell notes */}
                        <div className="bg-slate-900/90 border border-slate-800 p-2 rounded text-[10px] text-slate-400 space-y-1">
                          {is5G ? (
                            <div className="text-cyan-300/90">
                              <strong>5G MU-MIMO Intra-Cell Pairing:</strong> Higher cell loading increases co-scheduled UEs on shared PRBs; non-ideal precoding adds <strong>+{interferenceSummary.intraCellMimoLeakageDb} dB</strong> residual spatial inter-layer leakage.
                            </div>
                          ) : (
                            <div className="text-amber-300/90">
                              <strong>4G SC-FDMA Uplink Noise Rise:</strong> Intra-cell scheduling contention and fractional power control (f=0.55) elevate base station receiver thermal noise rise (IoT).
                            </div>
                          )}
                          <div className="text-slate-500">
                            Current cell load directly affects UL Interference over Thermal (IoT) and receiver scheduling headroom.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Calculated Results, Pessimistic Adjustment & Effective MAPL Deduction */}
                    <div className="bg-slate-950/80 border border-cyan-900/40 rounded-lg p-3 space-y-3 text-xs font-mono">
                      {/* Metric Summary Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                        <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                          <span className="text-slate-500 block text-[10px] uppercase">Calculated DL Margin:</span>
                          <span className="text-cyan-400 font-bold text-sm">
                            +{interferenceSummary.calculatedDlInterferenceMarginDb.toFixed(1)} dB
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-0.5">
                            {interferenceSummary.scenario === 'ISOLATED_CELL' ? 'Isolated (0 dB)' : 'Hex multi-tier model'}
                          </span>
                        </div>

                        <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                          <span className="text-slate-500 block text-[10px] uppercase">Calculated UL IoT Margin:</span>
                          <span className="text-emerald-400 font-bold text-sm">
                            +{interferenceSummary.calculatedUlIotMarginDb.toFixed(1)} dB
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-0.5">
                            Uplink Noise Rise (IoT)
                          </span>
                        </div>

                        <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                          <span className="text-slate-500 block text-[10px] uppercase">5G Spatial Beam Isolation:</span>
                          <span className="text-purple-400 font-bold text-sm">
                            {is5G ? `-${interferenceSummary.beamformingIsolationDb.toFixed(1)} dB` : '0.0 dB (Omni)'}
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-0.5">
                            {is5G ? 'Massive MIMO narrow beams' : 'Broad sector broadcast'}
                          </span>
                        </div>

                        <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                          <span className="text-slate-500 block text-[10px] uppercase">Total Edge INR (I / N_0):</span>
                          <span className="text-amber-400 font-bold text-sm">
                            {interferenceSummary.scenario === 'ISOLATED_CELL' ? 'N/A' : `${interferenceSummary.totalInrDb.toFixed(1)} dB`}
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-0.5">
                            Interference-to-noise ratio
                          </span>
                        </div>
                      </div>

                      {/* Pessimistic Safety Margin Adjustment (User Requested: can be changed to add more value) */}
                      <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                            <label className="text-xs text-amber-300 font-semibold uppercase tracking-wider">
                              Pessimistic Safety Margin Offset (+Δ dB)
                            </label>
                            <span className="text-xs font-bold font-mono text-amber-400 bg-amber-950/80 border border-amber-800/60 px-1.5 py-0.5 rounded">
                              +{(inputs.interferencePessimisticMarginDb ?? 0.0).toFixed(1)} dB
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Add custom safety margin to the calculated interference result for conservative / worst-case planning view
                          </p>
                        </div>

                        {/* Quick preset buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {[
                            { label: '+0.0 dB (Model)', val: 0.0 },
                            { label: '+0.5 dB', val: 0.5 },
                            { label: '+1.0 dB', val: 1.0 },
                            { label: '+2.0 dB (Worst)', val: 2.0 }
                          ].map((p) => {
                            const isPSelected = (inputs.interferencePessimisticMarginDb ?? 0.0) === p.val;
                            return (
                              <button
                                key={p.label}
                                type="button"
                                onClick={() => update({
                                  interferencePessimisticMarginDb: p.val,
                                  interferenceMarginDb: Number((interferenceSummary.calculatedDlInterferenceMarginDb + p.val).toFixed(1)),
                                  iotMarginDb: Number((interferenceSummary.calculatedUlIotMarginDb + p.val).toFixed(1))
                                })}
                                className={`px-2 py-1 rounded text-[10px] font-mono transition-all cursor-pointer ${
                                  isPSelected
                                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                                    : 'bg-slate-900 border border-slate-700 text-slate-300 hover:border-slate-500'
                                }`}
                              >
                                {p.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Slider & Numerical input for Pessimistic Offset */}
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="4"
                          step="0.1"
                          value={inputs.interferencePessimisticMarginDb ?? 0.0}
                          onChange={(e) => {
                            const pVal = Number(e.target.value);
                            update({
                              interferencePessimisticMarginDb: pVal,
                              interferenceMarginDb: Number((interferenceSummary.calculatedDlInterferenceMarginDb + pVal).toFixed(1)),
                              iotMarginDb: Number((interferenceSummary.calculatedUlIotMarginDb + pVal).toFixed(1))
                            });
                          }}
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            min="0"
                            max="6"
                            step="0.1"
                            value={inputs.interferencePessimisticMarginDb ?? 0.0}
                            onChange={(e) => {
                              const pVal = Math.max(0, Number(e.target.value));
                              update({
                                interferencePessimisticMarginDb: pVal,
                                interferenceMarginDb: Number((interferenceSummary.calculatedDlInterferenceMarginDb + pVal).toFixed(1)),
                                iotMarginDb: Number((interferenceSummary.calculatedUlIotMarginDb + pVal).toFixed(1))
                              });
                            }}
                            className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-mono font-bold text-right focus:border-amber-400 focus:outline-none"
                          />
                          <span className="text-xs text-slate-400 font-mono">dB</span>
                        </div>
                      </div>

                      {/* Final Applied Margins Bar */}
                      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-slate-300">
                            Effective Applied Margins:
                          </span>
                          <span className="text-cyan-300 font-bold">
                            DL Interference = {interferenceSummary.effectiveDlInterferenceMarginDb.toFixed(1)} dB
                          </span>
                          <span className="text-slate-600">·</span>
                          <span className="text-emerald-300 font-bold">
                            UL IoT Noise Rise = {interferenceSummary.effectiveUlIotMarginDb.toFixed(1)} dB
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono">
                          Formula: <span className="text-slate-300">{interferenceSummary.methodFormula}</span>
                        </div>
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

      {/* SECTION 7: CARRIER AGGREGATION (CA) */}
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
