import {
  LinkBudgetInputs,
  LinkBudgetCalculationResult,
  FourPointOutput,
  LinkBudgetCascadeItem,
  ServiceProfileType,
  NbIoTDeploymentMode,
  NbIoTSubcarrierSpacing,
  NbIoTCeLevel,
  VoNrCodec,
  VoLteCodec,
  RedCapProfile,
  McxProfile,
  UeMimoMode,
  OverheadSummary,
  OverheadMode,
  DmrsConfigType,
  CsiRsMultiplexingType,
  CsiRsResourceType
} from '../types/telecom';
import { TELECOM_BANDS, MIMO_CONFIGS, TDD_FRAME_PATTERNS } from '../data/telecomBands';
import {
  calculatePathLoss,
  calculateDistanceForPathLoss,
  calculateShadowFadingMargin,
  getPropagationModelValidity
} from './spmPropagation';
import { calculateInterferenceSummary } from './interferenceCalculator';

/**
 * 3GPP TS 38.306 Section 4.1.2 & TS 38.211/38.214 Physical Layer Overhead Engine
 * - 38.306 Default Mode:
 *   FR1 (Sub-6 GHz): DL Overhead = 0.14 (14%), UL Overhead = 0.08 (8%)
 *   FR2 (mmWave):    DL Overhead = 0.18 (18%), UL Overhead = 0.10 (10%)
 * - Detailed Mode:
 *   Granularly calculates SSB, PDCCH CORESET symbols, DMRS config, CSI-RS, TRS, and PTRS
 */
export function calculate5GOverhead(
  inputs: LinkBudgetInputs,
  dlFreqMHz: number,
  bwMHz: number,
  scsKhz: number,
  isMmWave: boolean
): OverheadSummary {
  const isFR2 = isMmWave || dlFreqMHz > 7125;
  const mode: OverheadMode = inputs.overheadMode || '38306_DEFAULT';

  // 1. Default 3GPP TS 38.306 Values:
  // FR1 (Sub-6 GHz): DL = 0.14 (14%), UL = 0.08 (8%)
  // FR2 (mmWave):    DL = 0.18 (18%), UL = 0.10 (10%)
  const defaultDl = isFR2 ? 0.18 : 0.14;
  const defaultUl = isFR2 ? 0.10 : 0.08;

  if (mode === '38306_DEFAULT') {
    const dlRatio = inputs.customDlOverhead ?? defaultDl;
    const ulRatio = inputs.customUlOverhead ?? defaultUl;
    return {
      mode: '38306_DEFAULT',
      frequencyRange: isFR2 ? 'FR2' : 'FR1',
      dlOverheadRatio: dlRatio,
      ulOverheadRatio: ulRatio,
      dlOverheadPercent: Number((dlRatio * 100).toFixed(1)),
      ulOverheadPercent: Number((ulRatio * 100).toFixed(1)),
      breakdown: {
        ssbPercent: isFR2 ? 1.2 : 0.45,
        pdcchPercent: isFR2 ? 4.5 : 4.0,
        dmrsDlPercent: 7.14,
        csiRsPercent: 1.0,
        trsPercent: 0.5,
        ptrsDlPercent: isFR2 ? 0.9 : 0.0,
        dmrsUlPercent: 5.0,
        pucchPercent: 2.2,
        srsPercent: 0.8,
        ptrsUlPercent: isFR2 ? 0.5 : 0.0
      }
    };
  }

  // 2. Detailed Mode Component Calculation (3GPP TS 38.211 / TS 38.214)
  const nPrb = Math.max(10, Math.floor((bwMHz * 1000) / (12 * scsKhz) * 0.92));
  const slotsPerSubframe = scsKhz / 15;
  const slotsPerMs = slotsPerSubframe;

  // A. SSB Overhead (TS 38.211 §7.4.3.1):
  // 4 symbols x 20 RBs transmitted in L_max beams every ssbPeriodicityMs
  const ssbPeriodicity = inputs.ssbPeriodicityMs ?? 20;
  const numBeams = inputs.numberOfBeams ?? (isFR2 ? 16 : 4);
  const totalSlotsInPeriod = ssbPeriodicity * slotsPerMs;
  const totalReInPeriod = totalSlotsInPeriod * 14 * (nPrb * 12);
  const ssbReInBurst = numBeams * (4 * 20 * 12);
  const ssbPercent = Number(Math.min(3.0, (ssbReInBurst / totalReInPeriod) * 100).toFixed(2));

  // B. PDCCH CORESET Symbols Overhead (TS 38.211 §7.3.2):
  // CORESET duration: 1, 2, or 3 symbols per 14-symbol slot
  const coresetSymbols = inputs.pdcchCoresetSymbols ?? (isFR2 ? 1 : 2);
  const coresetPrbRatio = Math.min(1.0, bwMHz <= 20 ? 1.0 : (48 + Math.min(48, (inputs.numberOfBeams ?? 1) * 8)) / nPrb);
  const pdcchPercent = Number(((coresetSymbols / 14) * coresetPrbRatio * 100).toFixed(2));

  // C. DMRS Configuration Overhead (TS 38.211 §7.4.1.1):
  const dmrsSymbols = inputs.dmrsSymbolsPerSlot ?? (inputs.dmrsAdditionalPositions !== undefined ? inputs.dmrsAdditionalPositions + 1 : 1);
  const dmrsType = inputs.dmrsConfigType || 'TYPE_1';
  const dmrsRePerRb = dmrsType === 'TYPE_1' ? 6 : 4;
  const dmrsDlPercent = Number(((dmrsSymbols * dmrsRePerRb) / (14 * 12) * 100).toFixed(2));

  // D. CSI-RS Overhead (TS 38.211 §7.4.1.5 & TS 38.214 §5.1.4):
  const csiEnabled = inputs.csiRsEnabled ?? true;
  const csiDensity = inputs.csiRsDensity ?? 1.0;
  const csiPorts = inputs.csiRsPorts ?? (inputs.csiRsReportsPerPeriod ? Math.min(32, inputs.csiRsReportsPerPeriod * 4) : 4);
  const csiMultiplexing: CsiRsMultiplexingType = inputs.csiRsMultiplexing || (csiPorts >= 8 ? 'cdm4-FD2-TD2' : 'fd-CDM2');
  const csiResourceType: CsiRsResourceType = inputs.csiRsResourceType || 'PERIODIC';
  const csiPeriodSlots = inputs.csiRsCaPeriodicitySlots ?? 20;

  // Orthogonal Code Division Multiplexing (CDM) group sizing:
  // noCDM: K=1; fd-CDM2: K=2 (freq); cdm4-FD2-TD2: K=4 (freq x time); cdm8-FD2-TD4: K=8 (freq x time)
  const cdmSize = csiMultiplexing === 'cdm8-FD2-TD4' ? 8 : csiMultiplexing === 'cdm4-FD2-TD2' ? 4 : csiMultiplexing === 'fd-CDM2' ? 2 : 1;
  const cdmGroups = Math.max(1, Math.ceil(csiPorts / cdmSize));
  // Total REs per RB consumed when CSI-RS transmitted:
  const cdmRePerGroup = csiMultiplexing === 'cdm8-FD2-TD4' ? 8 : csiMultiplexing === 'cdm4-FD2-TD2' ? 4 : csiMultiplexing === 'fd-CDM2' ? 2 : 1;
  const baseCsiRePerRb = cdmGroups * (cdmRePerGroup / Math.max(1, cdmSize / (csiMultiplexing === 'noCDM' ? 1 : 2))) * csiDensity;
  
  // ZP-CSI-RS Rate matching: PDSCH maps around interference measurement Zero-Power CSI-RS
  const zpRateMatchRe = (inputs.zpCsiRsRateMatching ?? true) ? 2.0 * csiDensity : 0.0;
  
  // Duty cycle / triggering factor:
  const csiDutyFactor = csiResourceType === 'PERIODIC' ? 1.0 : csiResourceType === 'SEMI_PERSISTENT' ? 0.5 : 0.2;
  const totalCsiRePerSlotOccasion = (baseCsiRePerRb + zpRateMatchRe) * csiDutyFactor;
  
  const csiRsPercent = csiEnabled
    ? Number(((totalCsiRePerSlotOccasion / (12 * 14 * csiPeriodSlots)) * 100).toFixed(2))
    : 0.0;

  // CDM spatial multiplexing efficiency / savings (% RE reduction compared to unmultiplexed ports):
  const unmultiplexedRe = csiPorts * csiDensity * csiDutyFactor;
  const csiRsCdmReductionPercent = (csiPorts > 1 && unmultiplexedRe > 0)
    ? Math.max(0, Math.min(85, Math.round(((unmultiplexedRe - totalCsiRePerSlotOccasion) / unmultiplexedRe) * 100)))
    : 0;

  // E. TRS (Tracking Reference Signal) Overhead:
  const trsEnabled = inputs.trsEnabled ?? true;
  const trsPeriodMs = inputs.trsPeriodicityMs ?? 20;
  const trsSlotsInPeriod = trsPeriodMs * slotsPerMs;
  const trsPercent = trsEnabled
    ? Number(((4 * 3) / (12 * 14 * trsSlotsInPeriod) * 100).toFixed(2))
    : 0.0;

  // F. PTRS (Phase Tracking Reference Signal) Overhead (TS 38.211 §7.4.1.7):
  const ptrsEnabled = inputs.ptrsEnabled ?? isFR2;
  const ptrsTimeDensity = inputs.ptrsTimeDensity ?? 1;
  const ptrsFreqDensity = inputs.ptrsFreqDensity ?? 2;
  const ptrsDlPercent = ptrsEnabled
    ? Number(((1 / (ptrsFreqDensity * 12 * ptrsTimeDensity)) * 100).toFixed(2))
    : 0.0;

  // Total Downlink Detailed Overhead:
  const totalDlPercent = Number((ssbPercent + pdcchPercent + dmrsDlPercent + csiRsPercent + trsPercent + ptrsDlPercent).toFixed(2));
  const dlRatio = Number((Math.min(0.50, Math.max(0.05, totalDlPercent / 100))).toFixed(4));

  // Uplink Detailed Components:
  const dmrsUlPercent = Number(((1 * 6) / (14 * 12) * 100).toFixed(2));
  const pucchPercent = Number((Math.min(8.0, Math.max(2.0, (2 / nPrb) * 100 + 1.5))).toFixed(2));
  const srsPercent = 0.75;
  const ptrsUlPercent = isFR2 && ptrsEnabled ? 0.45 : 0.0;
  const totalUlPercent = Number((dmrsUlPercent + pucchPercent + srsPercent + ptrsUlPercent).toFixed(2));
  const ulRatio = Number((Math.min(0.40, Math.max(0.04, totalUlPercent / 100))).toFixed(4));

  return {
    mode: 'DETAILED',
    frequencyRange: isFR2 ? 'FR2' : 'FR1',
    dlOverheadRatio: dlRatio,
    ulOverheadRatio: ulRatio,
    dlOverheadPercent: Number((dlRatio * 100).toFixed(1)),
    ulOverheadPercent: Number((ulRatio * 100).toFixed(1)),
    breakdown: {
      ssbPercent,
      pdcchPercent,
      dmrsDlPercent,
      csiRsPercent,
      trsPercent,
      ptrsDlPercent,
      dmrsUlPercent,
      pucchPercent,
      srsPercent,
      ptrsUlPercent,
      csiRsCdmReductionPercent
    },
    csiRsMultiplexing: csiMultiplexing,
    csiRsResourceType: csiResourceType,
    csiRsPorts: csiPorts
  };
}

export interface ControlOverheadsResult {
  avgPdcchOverheadPercent: number; // Dynamic function of 3GPP parameters (can vary & exceed 10%)
  avgPucchOverheadPercent: number; // Dynamic function of 3GPP parameters (can vary & exceed 20%)
  pdcchBreakdown: {
    basePercent: number;
    bwFactorPercent: number;
    beamFactorPercent: number;
    coresetFactorPercent: number;
    caFactorPercent: number;
    csiFactorPercent: number;
    dmrsFactorPercent: number;
    blerFactorPercent: number;
  };
  pucchBreakdown: {
    basePercent: number;
    csiReportsPercent: number;
    csiPeriodicityPercent: number;
    csiPortsPercent: number;
    caFactorPercent: number;
    tddFactorPercent: number;
    bwFactorPercent: number;
    blerFactorPercent: number;
  };
}

/**
 * Calculates dynamically average PDCCH and PUCCH overheads based on
 * 3GPP defined parameters: channel bandwidth, active beams (1-8), CORESET duration, carrier aggregation,
 * CSI-RS reporting density & ports, DMRS numerology, residual BLER, and TDD frame ratio.
 * No artificial capping: can freely exceed 10% (PDCCH) or 20% (PUCCH) to reflect
 * authentic reduction in PDSCH and PUSCH traffic shares.
 */
export function calculateControlOverheads(inputs: LinkBudgetInputs): ControlOverheadsResult {
  const is4G = inputs.technology === '4G';
  const numBeams = is4G ? 1 : (inputs.numberOfBeams ?? 1);
  const coresetSymbols = is4G ? 2 : (inputs.pdcchCoresetSymbols ?? 2);
  const dmrsSymbols = is4G ? 1 : (inputs.dmrsSymbolsPerSlot ?? 1);
  const csiReports = is4G ? 1 : (inputs.csiRsReportsPerPeriod ?? 2);
  const csiPeriodicity = is4G ? 20 : (inputs.csiRsCaPeriodicitySlots ?? 20);
  const csiPorts = inputs.csiRsPorts ?? (inputs.csiRsReportsPerPeriod ? Math.min(32, inputs.csiRsReportsPerPeriod * 4) : 4);
  const caCarriers = inputs.caEnabled ? (inputs.caCarriersCount || 1) : 1;
  const bwMHz = inputs.bandwidthMHz;

  // 1. Average PDCCH Overhead (%) - 3GPP TS 38.211 / TS 38.213 / TS 36.211
  // In narrow bandwidths or high multi-carrier / multi-beam, PDCCH CORESET PRB ratio scales up
  const bwFactor = bwMHz <= 1.4 ? 12.0 : bwMHz <= 3 ? 7.5 : bwMHz <= 5 ? 4.5 : bwMHz <= 10 ? 2.5 : bwMHz <= 20 ? 1.0 : bwMHz <= 50 ? 0.0 : -0.8;
  // Multi-beam sweeping increases PDCCH search space monitoring occasions (TS 38.213 §10)
  const beamFactor = is4G ? 0.0 : (numBeams - 1) * 0.42;
  // CORESET duration in symbols: 1 symbol (-1.4%), 2 symbols (0.0%), 3 symbols (+2.2%)
  const coresetFactor = is4G ? 0.0 : (coresetSymbols - 2) * 1.8;
  // Carrier aggregation cross-carrier & multi-carrier DCI scheduling overhead
  const caFactor = (caCarriers - 1) * 0.85;
  // CSI-RS triggering occasions on PDCCH
  const csiFactor = is4G ? 0.0 : (csiReports - 1) * 0.35 + (inputs.csiRsResourceType === 'APERIODIC' ? 0.40 : 0.0);
  // DMRS additional symbols per slot
  const dmrsFactor = is4G ? 0.0 : (dmrsSymbols - 1) * 0.50;
  // Residual BLER retransmission scheduling DCI demands
  const blerPdcchFactor = Math.max(0, ((inputs.residualBlerTargetPercent ?? 10) - 10) * 0.12);

  const rawPdcch = 4.8 + bwFactor + beamFactor + coresetFactor + caFactor + csiFactor + dmrsFactor + blerPdcchFactor;
  // Uncapped: only bounded by physical baseline (> 1.8%)
  const avgPdcchOverheadPercent = Number(Math.max(1.8, rawPdcch).toFixed(2));

  // 2. Average PUCCH Overhead (%) - 3GPP TS 38.211 / TS 38.213 / TS 38.214 & TS 36.211 / TS 36.213
  // Narrow bandwidth uplink PUCCH reservation occupies significant fraction of PRBs
  const bwPucchFactor = bwMHz <= 1.4 ? 18.0 : bwMHz <= 3 ? 12.0 : bwMHz <= 5 ? 7.5 : bwMHz <= 10 ? 4.0 : bwMHz <= 20 ? 1.5 : 0.0;
  
  // Periodic & semi-persistent CSI reporting load on PUCCH
  const csiReportsPercent = is4G ? 1.4 : csiReports * 1.35;
  const csiPeriodicityPercent = is4G ? 0.9 : (80 / csiPeriodicity) * 0.85;
  // High CSI-RS port count feedback (Type II codebook payload on PUCCH)
  const csiPortsPercent = is4G ? 0.0 : Math.max(0, (csiPorts - 4) * 0.14);
  
  // CA multi-carrier HARQ codebook (Type-1 / Type-2 PUCCH format 2/3/4)
  const caPucchFactor = (caCarriers - 1) * 2.2;
  
  // TDD frame ratio impact: fewer UL slots condense all DL HARQ-ACKs into rare UL slots
  let tddPucchFactor = 0.0;
  if (inputs.duplexMode === 'TDD') {
    if (inputs.tddFrameRatio === 'CUSTOM') {
      const dlP = inputs.customTddDlPercent ?? 75;
      const ulP = Math.max(5, inputs.customTddUlPercent ?? (100 - dlP));
      // Higher DL to UL ratio heavily concentrates PUCCH feedback load onto UL slots
      tddPucchFactor = Math.max(0.5, (dlP / ulP) * 1.35);
    } else if (inputs.tddFrameRatio === 'DDDSU') {
      tddPucchFactor = 4.5;
    } else if (inputs.tddFrameRatio === '8_2') {
      tddPucchFactor = 4.8;
    } else if (inputs.tddFrameRatio === '7_3') {
      tddPucchFactor = 2.6;
    } else if (inputs.tddFrameRatio === 'DDSUU') {
      tddPucchFactor = 1.8;
    } else if (inputs.tddFrameRatio === 'DSUUU') {
      tddPucchFactor = 0.6;
    } else {
      tddPucchFactor = 1.2;
    }
  }
  
  // BLER retransmissions and NACK generation
  const blerPucchFactor = ((inputs.residualBlerTargetPercent ?? 10) / 10) * 0.55;

  const rawPucch = is4G
    ? 4.5 + bwPucchFactor + (caCarriers - 1) * 1.8 + blerPucchFactor
    : 3.5 + bwPucchFactor + csiReportsPercent + csiPeriodicityPercent + csiPortsPercent + caPucchFactor + tddPucchFactor + blerPucchFactor;
  // Uncapped: only bounded by physical baseline (> 2.5%)
  const avgPucchOverheadPercent = Number(Math.max(2.5, rawPucch).toFixed(2));

  return {
    avgPdcchOverheadPercent,
    avgPucchOverheadPercent,
    pdcchBreakdown: {
      basePercent: 4.8,
      bwFactorPercent: bwFactor,
      beamFactorPercent: beamFactor,
      coresetFactorPercent: coresetFactor,
      caFactorPercent: caFactor,
      csiFactorPercent: csiFactor,
      dmrsFactorPercent: dmrsFactor,
      blerFactorPercent: blerPdcchFactor
    },
    pucchBreakdown: {
      basePercent: 3.5,
      csiReportsPercent,
      csiPeriodicityPercent,
      csiPortsPercent,
      caFactorPercent: caPucchFactor,
      tddFactorPercent: tddPucchFactor,
      bwFactorPercent: bwPucchFactor,
      blerFactorPercent: blerPucchFactor
    }
  };
}

export interface ResolvedServiceInfo {
  serviceProfile: ServiceProfileType;
  displayName: string;
  description: string;
  targetDlThroughputMbps: number;
  targetUlThroughputMbps: number;
  targetDlThroughputFormatted: string;
  targetUlThroughputFormatted: string;
  targetLatencyMs?: number;
  targetLatencyFormatted?: string;
  dlRequiredSnrDb: number;
  ulRequiredSnrDb: number;
  dlAllocatedSubcarriers: number;
  ulAllocatedSubcarriers: number;
  dlAllocatedPrbs: number;
  ulAllocatedPrbs: number;
  targetResidualBlerPercent: number;
  standardReference: string;
  ttiBundlingGainDb: number;
  repetitionGainDb: number;
  psdBoostDb: number;
}

export function resolveCellEdgeService(
  inputs: LinkBudgetInputs,
  is5G: boolean,
  nPrbTotal: number
): ResolvedServiceInfo {
  const profile: ServiceProfileType = inputs.serviceProfile || (
    inputs.cellEdgeService === 'VOLTE_VONR' 
      ? (is5G ? 'VONR_5G' : 'VOLTE_4G') 
      : 'MBB_PS_DATA'
  );

  let displayName = 'MBB PS DATA';
  let description = 'Mobile Broadband Packet Data at Cell Edge';
  let targetDlThroughputMbps = 2.0;
  let targetUlThroughputMbps = 0.512;
  let dlRequiredSnrDb = is5G ? -4.5 : -5.0;
  let ulRequiredSnrDb = is5G ? -4.0 : -4.5;
  let dlAllocatedSubcarriers = nPrbTotal * 12;
  let ulAllocatedSubcarriers = 24; // 2 PRBs default
  let targetResidualBlerPercent = inputs.residualBlerTargetPercent ?? 10.0;
  let standardReference = is5G ? '3GPP TS 38.306 / TS 38.101-1' : '3GPP TS 36.306 / TS 36.101';
  let ttiBundlingGainDb = 0;
  let repetitionGainDb = 0;
  let psdBoostDb = 0;
  let targetLatencyMs: number | undefined = undefined;
  let targetLatencyFormatted: string | undefined = undefined;

  switch (profile) {
    case 'MBB_PS_DATA': {
      displayName = 'MBB PS DATA (Mobile Broadband)';
      targetDlThroughputMbps = inputs.targetDlCellEdgeThroughputMbps ?? (is5G ? 2.0 : 1.0);
      targetUlThroughputMbps = inputs.targetUlCellEdgeThroughputMbps ?? (is5G ? 0.512 : 0.256);
      description = `MBB PS Data: ${targetDlThroughputMbps} Mbps DL / ${targetUlThroughputMbps >= 1 ? targetUlThroughputMbps + ' Mbps' : Math.round(targetUlThroughputMbps * 1000) + ' kbps'} UL @ Cell Edge`;
      dlAllocatedSubcarriers = inputs.dlSubcarriersCount && inputs.dlSubcarriersCount > 0
        ? inputs.dlSubcarriersCount
        : nPrbTotal * 12;
      ulAllocatedSubcarriers = inputs.ulSubcarriersCount && inputs.ulSubcarriersCount > 0
        ? inputs.ulSubcarriersCount
        : 24;

      if (inputs.dlRequiredSnrDb !== undefined) {
        dlRequiredSnrDb = inputs.dlRequiredSnrDb;
      } else {
        const baseDl = is5G ? -4.5 : -5.0;
        const thrDelta = Math.log10(Math.max(0.2, targetDlThroughputMbps / (is5G ? 2.0 : 1.0))) * 3.3;
        dlRequiredSnrDb = Number(Math.max(-8, Math.min(8, baseDl + thrDelta)).toFixed(1));
      }

      if (inputs.ulRequiredSnrDb !== undefined) {
        ulRequiredSnrDb = inputs.ulRequiredSnrDb;
      } else {
        const baseUl = is5G ? -4.0 : -4.5;
        const thrDelta = Math.log10(Math.max(0.1, targetUlThroughputMbps / (is5G ? 0.512 : 0.256))) * 3.3;
        ulRequiredSnrDb = Number(Math.max(-8, Math.min(8, baseUl + thrDelta)).toFixed(1));
      }

      targetResidualBlerPercent = inputs.residualBlerTargetPercent ?? 10.0;
      standardReference = is5G ? '3GPP TS 38.306 / TS 38.101-1' : '3GPP TS 36.306 / TS 36.101';
      break;
    }

    case 'VONR_5G': {
      displayName = 'VoNR Service in 5G (Voice over NR)';
      const codec = inputs.vonrCodec || 'EVS_13_2';
      let codecName = 'EVS-WB 13.2 kbps';
      let netRateMbps = 0.0244;
      let baseDlSnr = -6.5;
      let baseUlSnr = -6.0;

      switch (codec) {
        case 'EVS_13_2':
          codecName = 'EVS-WB 13.2 kbps (3GPP Default)';
          netRateMbps = 0.0244;
          baseDlSnr = -6.5;
          baseUlSnr = -6.0;
          break;
        case 'EVS_24_4':
          codecName = 'EVS-SWB 24.4 kbps (High Fidelity)';
          netRateMbps = 0.0360;
          baseDlSnr = -5.5;
          baseUlSnr = -5.0;
          break;
        case 'AMR_WB_12_65':
          codecName = 'AMR-WB 12.65 kbps (Rel-15 Interop)';
          netRateMbps = 0.0238;
          baseDlSnr = -6.5;
          baseUlSnr = -6.0;
          break;
        case 'AMR_WB_23_85':
          codecName = 'AMR-WB 23.85 kbps';
          netRateMbps = 0.0350;
          baseDlSnr = -5.5;
          baseUlSnr = -5.0;
          break;
        case 'AMR_NB_12_2':
          codecName = 'AMR-NB 12.2 kbps';
          netRateMbps = 0.0230;
          baseDlSnr = -7.0;
          baseUlSnr = -6.5;
          break;
      }

      const slotAgg = inputs.vonrSlotAggregation ?? 4;
      ttiBundlingGainDb = slotAgg > 1 ? Number((10 * Math.log10(slotAgg) * 0.6).toFixed(1)) : 0;
      targetDlThroughputMbps = netRateMbps;
      targetUlThroughputMbps = netRateMbps;
      dlAllocatedSubcarriers = 12; // 1 PRB for VoIP packet
      ulAllocatedSubcarriers = 12; // 1 PRB for VoIP packet
      dlRequiredSnrDb = inputs.dlRequiredSnrDb !== undefined ? inputs.dlRequiredSnrDb : baseDlSnr;
      ulRequiredSnrDb = inputs.ulRequiredSnrDb !== undefined ? inputs.ulRequiredSnrDb : Number((baseUlSnr - ttiBundlingGainDb).toFixed(1));
      targetResidualBlerPercent = 1.0; // Strict conversational QoS (5QI 1, delay < 100ms)
      description = `5G VoNR: ${codecName}, ${slotAgg}-Slot Bundling, 1 PRB (12 SCs), BLER 1%`;
      standardReference = '3GPP TS 26.114 / TS 38.101-1 (5QI 1 VoNR)';
      break;
    }

    case 'VOLTE_4G': {
      displayName = 'VoLTE Service in 4G / 5G NSA (Voice over LTE)';
      const codec = inputs.volteCodec || 'AMR_WB_12_65';
      let codecName = 'AMR-WB 12.65 kbps';
      let netRateMbps = 0.0238;
      let baseDlSnr = -6.5;
      let baseUlSnr = -5.0;

      switch (codec) {
        case 'AMR_WB_12_65':
          codecName = 'AMR-WB 12.65 kbps (HD Voice Default)';
          netRateMbps = 0.0238;
          baseDlSnr = -6.5;
          baseUlSnr = -5.0;
          break;
        case 'AMR_WB_23_85':
          codecName = 'AMR-WB 23.85 kbps (High Quality)';
          netRateMbps = 0.0350;
          baseDlSnr = -5.5;
          baseUlSnr = -4.5;
          break;
        case 'AMR_NB_12_2':
          codecName = 'AMR-NB 12.2 kbps (Standard)';
          netRateMbps = 0.0230;
          baseDlSnr = -7.0;
          baseUlSnr = -5.5;
          break;
        case 'EVS_13_2':
          codecName = 'EVS-WB 13.2 kbps over LTE';
          netRateMbps = 0.0244;
          baseDlSnr = -6.5;
          baseUlSnr = -5.0;
          break;
      }

      const ttiBundling = inputs.volteTtiBundling ?? true;
      ttiBundlingGainDb = ttiBundling ? 4.0 : 0.0;
      targetDlThroughputMbps = netRateMbps;
      targetUlThroughputMbps = netRateMbps;
      dlAllocatedSubcarriers = 12; // 1 PRB (180 kHz)
      ulAllocatedSubcarriers = 12; // 1 PRB (180 kHz)
      dlRequiredSnrDb = inputs.dlRequiredSnrDb !== undefined ? inputs.dlRequiredSnrDb : baseDlSnr;
      ulRequiredSnrDb = inputs.ulRequiredSnrDb !== undefined ? inputs.ulRequiredSnrDb : Number((baseUlSnr - ttiBundlingGainDb).toFixed(1));
      targetResidualBlerPercent = 1.0;
      description = `4G VoLTE: ${codecName}, ${ttiBundling ? '4-Subframe TTI Bundling (+4 dB UL gain)' : 'No Bundling'}, 1 PRB (180 kHz), BLER 1%`;
      standardReference = '3GPP TS 26.114 / TS 36.211 / TS 36.213 (QCI 1 VoLTE)';
      break;
    }

    case 'NBIOT_4G': {
      displayName = 'NB-IoT for 4G (Narrowband IoT - 3GPP Rel-13/14)';
      const depMode = inputs.nbiotDeploymentMode || 'IN_BAND';
      const scsMode = inputs.nbiotScs || '15KHZ_SINGLE';
      const ceLevel = inputs.nbiotCeLevel || 'CE_LEVEL_1';

      let ceRepetitions = 8;
      let ceDlSnr = -9.0;
      let ceUlSnr = -9.5;
      let targetRateMbps = 0.0156;
      let ceName = 'CE Level 1 (Robust Coverage - Rep 8, MCL 154 dB)';

      if (ceLevel === 'CE_LEVEL_0') {
        ceRepetitions = 1;
        ceDlSnr = -3.0;
        ceUlSnr = -3.0;
        targetRateMbps = 0.064;
        ceName = 'CE Level 0 (Normal Coverage - Rep 1, MCL 144 dB)';
      } else if (ceLevel === 'CE_LEVEL_2') {
        ceRepetitions = 64;
        ceDlSnr = -14.5;
        ceUlSnr = -15.0;
        targetRateMbps = 0.0024;
        ceName = 'CE Level 2 (Extreme Deep Coverage - Rep 64, MCL 164 dB)';
      }

      if (inputs.nbiotTargetRateKbps && inputs.nbiotTargetRateKbps > 0) {
        targetRateMbps = inputs.nbiotTargetRateKbps / 1000;
      }

      if (scsMode === '3_75KHZ_SINGLE') {
        ulAllocatedSubcarriers = 1;
        psdBoostDb = 16.8;
      } else if (scsMode === '15KHZ_SINGLE') {
        ulAllocatedSubcarriers = 1;
        psdBoostDb = 10.8;
      } else {
        ulAllocatedSubcarriers = 12;
        psdBoostDb = 0;
      }
      dlAllocatedSubcarriers = 12; // 1 NB-IoT PRB = 180 kHz (12 subcarriers)

      repetitionGainDb = ceRepetitions > 1 ? Number((10 * Math.log10(ceRepetitions) * 0.75).toFixed(1)) : 0;

      targetDlThroughputMbps = targetRateMbps;
      targetUlThroughputMbps = targetRateMbps;
      dlRequiredSnrDb = inputs.dlRequiredSnrDb !== undefined ? inputs.dlRequiredSnrDb : ceDlSnr;
      ulRequiredSnrDb = inputs.ulRequiredSnrDb !== undefined ? inputs.ulRequiredSnrDb : ceUlSnr;
      targetResidualBlerPercent = 10.0;

      const depName = depMode === 'IN_BAND' ? 'In-Band' : depMode === 'GUARD_BAND' ? 'Guard-Band' : 'Standalone / Out-of-Band (200 kHz)';
      description = `NB-IoT 4G: ${depName}, ${scsMode === '3_75KHZ_SINGLE' ? '3.75 kHz Single-Tone' : scsMode === '15KHZ_SINGLE' ? '15 kHz Single-Tone' : '15 kHz Multi-Tone'}, ${ceName}`;
      standardReference = '3GPP TS 36.211 / TS 36.101 Rel-13/14 NB-IoT';
      break;
    }

    case 'REDCAP_5G': {
      displayName = 'RedCap for 5G (Reduced Capability / NR-Light - Rel-17)';
      const redProfile = inputs.redcapProfile || 'INDUSTRIAL_SENSOR';
      let profName = 'Industrial Wireless Sensor';
      let dlTarget = 5.0;
      let ulTarget = 2.0;
      let baseDlSnr = -3.0;
      let baseUlSnr = -2.5;
      let ulPrbs = 4;

      switch (redProfile) {
        case 'WEARABLE':
          profName = 'Smart Wearable / Watch';
          dlTarget = 1.0;
          ulTarget = 0.5;
          baseDlSnr = -4.0;
          baseUlSnr = -3.5;
          ulPrbs = 2;
          break;
        case 'INDUSTRIAL_SENSOR':
          profName = 'Industrial Wireless Sensor & Robotics';
          dlTarget = 5.0;
          ulTarget = 2.0;
          baseDlSnr = -3.0;
          baseUlSnr = -2.5;
          ulPrbs = 4;
          break;
        case 'VIDEO_SURVEILLANCE':
          profName = 'Smart Video Surveillance / CCTV';
          dlTarget = 2.0;
          ulTarget = 5.0;
          baseDlSnr = -2.0;
          baseUlSnr = -1.5;
          ulPrbs = 8;
          break;
        case 'CUSTOM_REDCAP':
          profName = 'User Defined RedCap Profile';
          dlTarget = inputs.redcapTargetDlMbps ?? 5.0;
          ulTarget = inputs.redcapTargetUlMbps ?? 2.0;
          baseDlSnr = -3.0;
          baseUlSnr = -2.5;
          ulPrbs = 4;
          break;
      }

      if (inputs.redcapTargetDlMbps && redProfile !== 'CUSTOM_REDCAP') {
        dlTarget = inputs.redcapTargetDlMbps;
      }
      if (inputs.redcapTargetUlMbps && redProfile !== 'CUSTOM_REDCAP') {
        ulTarget = inputs.redcapTargetUlMbps;
      }

      targetDlThroughputMbps = dlTarget;
      targetUlThroughputMbps = ulTarget;
      dlAllocatedSubcarriers = Math.min(nPrbTotal, 51) * 12; // 20 MHz BWP
      ulAllocatedSubcarriers = ulPrbs * 12;
      dlRequiredSnrDb = inputs.dlRequiredSnrDb !== undefined ? inputs.dlRequiredSnrDb : baseDlSnr;
      ulRequiredSnrDb = inputs.ulRequiredSnrDb !== undefined ? inputs.ulRequiredSnrDb : baseUlSnr;
      targetResidualBlerPercent = 5.0;
      description = `5G RedCap: ${profName}, 20 MHz BWP, ${inputs.redcapRxBranches ?? 1}Rx, Target ${dlTarget} Mbps DL / ${ulTarget} Mbps UL`;
      standardReference = '3GPP Rel-17 TS 38.101-1 / TS 38.214 (NR RedCap)';
      break;
    }

    case 'MCX_PUBLIC_SAFETY': {
      displayName = 'MCX / PS - Public Safety (3GPP Mission Critical)';
      const mcProfile = inputs.mcxProfile || 'MCPTT';
      let mcName = 'MCPTT (Mission Critical Voice)';
      let dlTarget = 0.0244;
      let ulTarget = 0.0244;
      let latTarget = 25.0; // default MCX latency (ms)
      let baseDlSnr = -6.5;
      let baseUlSnr = -6.0;
      let ulPrbs = 1;

      switch (mcProfile) {
        case 'MCPTT':
          mcName = 'MCPTT (Mission Critical Push-to-Talk - QCI 65 / 5QI 65)';
          dlTarget = 0.0244;
          ulTarget = 0.0244;
          latTarget = 25.0;
          baseDlSnr = -6.5;
          baseUlSnr = -6.0;
          ulPrbs = 1;
          break;
        case 'MCVIDEO':
          mcName = 'MCVideo (Mission Critical Video - QCI 67 / 5QI 67)';
          dlTarget = 1.5;
          ulTarget = 2.0;
          latTarget = 35.0;
          baseDlSnr = -3.0;
          baseUlSnr = -2.5;
          ulPrbs = 6;
          break;
        case 'MCDATA':
          mcName = 'MCData (Mission Critical Data / Telemetry - QCI 69 / 5QI 69)';
          dlTarget = 0.256;
          ulTarget = 0.256;
          latTarget = 50.0;
          baseDlSnr = -5.0;
          baseUlSnr = -4.5;
          ulPrbs = 2;
          break;
        case 'CUSTOM_MCX':
          mcName = 'Custom Public Safety Profile (User Defined)';
          dlTarget = inputs.mcxTargetDlMbps !== undefined ? inputs.mcxTargetDlMbps : 1.0;
          ulTarget = inputs.mcxTargetUlMbps !== undefined ? inputs.mcxTargetUlMbps : 1.0;
          latTarget = inputs.mcxTargetLatencyMs !== undefined ? inputs.mcxTargetLatencyMs : 25.0;

          // Dynamically compute demodulation SNR requirement from target data rates
          const dlThrOffset = Math.log10(Math.max(0.01, dlTarget / 0.5)) * 3.3;
          const ulThrOffset = Math.log10(Math.max(0.01, ulTarget / 0.5)) * 3.3;
          baseDlSnr = Number((-5.0 + dlThrOffset).toFixed(1));
          baseUlSnr = Number((-4.5 + ulThrOffset).toFixed(1));

          // Strict latency constraint: tighter latency (< 20 ms) limits HARQ retransmissions, requiring SNR margin
          if (latTarget < 20) {
            const latPenaltyDb = Number(Math.min(2.5, (20 - latTarget) * 0.15).toFixed(1));
            baseDlSnr += latPenaltyDb;
            baseUlSnr += latPenaltyDb;
          }

          ulPrbs = Math.max(1, Math.min(nPrbTotal, Math.ceil(ulTarget / (is5G ? 0.35 : 0.25))));
          break;
      }

      if (inputs.mcxTargetDlMbps !== undefined && mcProfile !== 'CUSTOM_MCX') {
        dlTarget = inputs.mcxTargetDlMbps;
      }
      if (inputs.mcxTargetUlMbps !== undefined && mcProfile !== 'CUSTOM_MCX') {
        ulTarget = inputs.mcxTargetUlMbps;
      }
      if (inputs.mcxTargetLatencyMs !== undefined && mcProfile !== 'CUSTOM_MCX') {
        latTarget = inputs.mcxTargetLatencyMs;
      }

      targetDlThroughputMbps = dlTarget;
      targetUlThroughputMbps = ulTarget;
      targetLatencyMs = latTarget;
      targetLatencyFormatted = `${latTarget.toFixed(1)} ms`;
      dlAllocatedSubcarriers = Math.min(nPrbTotal, 50) * 12;
      ulAllocatedSubcarriers = ulPrbs * 12;
      dlRequiredSnrDb = inputs.dlRequiredSnrDb !== undefined ? inputs.dlRequiredSnrDb : baseDlSnr;
      ulRequiredSnrDb = inputs.ulRequiredSnrDb !== undefined ? inputs.ulRequiredSnrDb : baseUlSnr;
      targetResidualBlerPercent = inputs.mcxReliabilityTargetPercent ? Number((100 - inputs.mcxReliabilityTargetPercent).toFixed(2)) : 1.0;
      description = `Public Safety: ${mcName}, BLER ${targetResidualBlerPercent}%, ${dlTarget >= 1 ? dlTarget + ' Mbps' : Math.round(dlTarget * 1000) + ' kbps'} DL / ${ulTarget >= 1 ? ulTarget + ' Mbps' : Math.round(ulTarget * 1000) + ' kbps'} UL, Latency ${targetLatencyFormatted}`;
      standardReference = '3GPP TS 22.179 / TS 23.379 / TS 36.101 (Mission Critical Services)';
      break;
    }
  }

  const targetDlThroughputFormatted = targetDlThroughputMbps >= 1
    ? `${targetDlThroughputMbps.toFixed(1)} Mbps`
    : `${Math.round(targetDlThroughputMbps * 1000)} kbps`;
  const targetUlThroughputFormatted = targetUlThroughputMbps >= 1
    ? `${targetUlThroughputMbps.toFixed(1)} Mbps`
    : `${Math.round(targetUlThroughputMbps * 1000)} kbps`;

  const dlAllocatedPrbs = Math.max(1, Math.round(dlAllocatedSubcarriers / 12));
  const ulAllocatedPrbs = Math.max(1, Math.round(ulAllocatedSubcarriers / 12));

  return {
    serviceProfile: profile,
    displayName,
    description,
    targetDlThroughputMbps,
    targetUlThroughputMbps,
    targetDlThroughputFormatted,
    targetUlThroughputFormatted,
    targetLatencyMs,
    targetLatencyFormatted,
    dlRequiredSnrDb,
    ulRequiredSnrDb,
    dlAllocatedSubcarriers,
    ulAllocatedSubcarriers,
    dlAllocatedPrbs,
    ulAllocatedPrbs,
    targetResidualBlerPercent,
    standardReference,
    ttiBundlingGainDb,
    repetitionGainDb,
    psdBoostDb
  };
}

// TS 38.214 Table 5.1.3.1-1 (MCS table 1, up to 64QAM) and 5.1.3.1-2 (MCS table 2, up to 256QAM): [Qm, R x 1024]
const MCS_TABLE_1: [number, number][] = [
  [2, 120], [2, 157], [2, 193], [2, 251], [2, 308], [2, 379], [2, 449], [2, 526], [2, 602], [2, 679],
  [4, 340], [4, 378], [4, 434], [4, 490], [4, 553], [4, 616], [4, 658],
  [6, 438], [6, 466], [6, 517], [6, 567], [6, 616], [6, 666], [6, 719], [6, 772], [6, 822], [6, 873], [6, 910], [6, 948]
];
const MCS_TABLE_2: [number, number][] = [
  [2, 120], [2, 193], [2, 308], [2, 449], [2, 602],
  [4, 378], [4, 434], [4, 490], [4, 553], [4, 616], [4, 658],
  [6, 466], [6, 517], [6, 567], [6, 616], [6, 666], [6, 719], [6, 772], [6, 822], [6, 873],
  [8, 682.5], [8, 711], [8, 754], [8, 797], [8, 841], [8, 885], [8, 916.5], [8, 948]
];
// TS 38.214 Table 5.2.2.1-2 (CQI table 1) and 5.2.2.1-3 (CQI table 2), index 1..15
const CQI_TABLE_1: [number, number][] = [
  [2, 78], [2, 120], [2, 193], [2, 308], [2, 449], [2, 602], [4, 378], [4, 490], [4, 616],
  [6, 466], [6, 567], [6, 666], [6, 772], [6, 873], [6, 948]
];
const CQI_TABLE_2: [number, number][] = [
  [2, 78], [2, 193], [2, 449], [4, 378], [4, 490], [4, 616], [6, 466], [6, 567], [6, 666],
  [6, 772], [6, 873], [8, 711], [8, 797], [8, 885], [8, 948]
];

const nearestTableIndex = (table: [number, number][], qm: number, codeRate: number): number => {
  let best = -1;
  table.forEach(([q, r], i) => {
    if (q === qm && (best < 0 || Math.abs(r / 1024 - codeRate) < Math.abs(table[best][1] / 1024 - codeRate))) best = i;
  });
  return Math.max(0, best);
};
export const nearestMcsIndex = (qm: number, codeRate: number, table: 1 | 2): number =>
  nearestTableIndex(table === 2 ? MCS_TABLE_2 : MCS_TABLE_1, qm, codeRate);
export const nearestCqiIndex = (qm: number, codeRate: number, table: 1 | 2): number =>
  nearestTableIndex(table === 2 ? CQI_TABLE_2 : CQI_TABLE_1, qm, codeRate) + 1;
export const modulationName = (qm: number): string =>
  qm >= 8 ? '256QAM' : qm >= 6 ? '64QAM' : qm >= 4 ? '16QAM' : 'QPSK';
export const formatMcsLabel = (qm: number, codeRate: number, table: 1 | 2): string => {
  const idx = nearestMcsIndex(qm, codeRate, table);
  const r = (table === 2 ? MCS_TABLE_2 : MCS_TABLE_1)[idx][1] / 1024;
  return `MCS ${idx} (${modulationName(qm)} R=${r.toFixed(3)})`;
};

// Maximum transmission bandwidth configuration N_RB per channel bandwidth (MHz)
// TS 38.101-1 Table 5.3.2-1 (FR1), TS 38.101-2 Table 5.3.2-1 (FR2), TS 36.101 Table 5.6-1 (LTE)
const NR_FR1_NRB: Record<number, Record<number, number>> = {
  15: { 5: 25, 10: 52, 15: 79, 20: 106, 25: 133, 30: 160, 35: 188, 40: 216, 45: 242, 50: 270 },
  30: { 5: 11, 10: 24, 15: 38, 20: 51, 25: 65, 30: 78, 35: 92, 40: 106, 45: 119, 50: 133, 60: 162, 70: 189, 80: 217, 90: 245, 100: 273 },
  60: { 10: 11, 15: 18, 20: 24, 25: 31, 30: 38, 35: 44, 40: 51, 45: 58, 50: 65, 60: 79, 70: 93, 80: 107, 90: 121, 100: 135 }
};
const NR_FR2_NRB: Record<number, Record<number, number>> = {
  60: { 50: 66, 100: 132, 200: 264 },
  120: { 50: 32, 100: 66, 200: 132, 400: 264 }
};
const LTE_NRB: Record<number, number> = { 1.4: 6, 3: 15, 5: 25, 10: 50, 15: 75, 20: 100 };

/** SCS used by the link budget: the requested SCS when 3GPP defines it for the frequency range, else the default. */
export function resolveSubcarrierSpacingKhz(is5G: boolean, isMmWave: boolean, requestedKhz?: number): number {
  if (!is5G) return 15;
  const allowed = isMmWave ? [60, 120] : [15, 30, 60];
  return requestedKhz !== undefined && allowed.includes(requestedKhz) ? requestedKhz : (isMmWave ? 120 : 30);
}

export interface TransmissionBandwidthConfig {
  nPrb: number;
  bandwidthMHz: number; // bandwidth actually used (nearest defined one when the request is not defined)
  valid: boolean;
  supportedMHz: number[];
  reference: string;
}

export function resolveTransmissionBandwidth(
  is5G: boolean,
  isMmWave: boolean,
  scsKhz: number,
  bandwidthMHz: number
): TransmissionBandwidthConfig {
  const table = !is5G ? LTE_NRB : (isMmWave ? NR_FR2_NRB[scsKhz] ?? NR_FR2_NRB[120] : NR_FR1_NRB[scsKhz] ?? NR_FR1_NRB[30]);
  const reference = !is5G ? 'TS 36.101' : (isMmWave ? 'TS 38.101-2 (FR2)' : 'TS 38.101-1 (FR1)');
  const supportedMHz = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (table[bandwidthMHz] !== undefined) {
    return { nPrb: table[bandwidthMHz], bandwidthMHz, valid: true, supportedMHz, reference };
  }
  const nearest = supportedMHz.reduce((best, bw) => Math.abs(bw - bandwidthMHz) < Math.abs(best - bandwidthMHz) ? bw : best, supportedMHz[0]);
  return { nPrb: table[nearest], bandwidthMHz: nearest, valid: false, supportedMHz, reference };
}

export function calculateLinkBudget(inputs: LinkBudgetInputs): LinkBudgetCalculationResult {
  const currentBand = TELECOM_BANDS.find(b => b.band === inputs.band) || TELECOM_BANDS[0];
  const dlFreqMHz = currentBand.dlFreqMHz;
  const ulFreqMHz = currentBand.ulFreqMHz;
  const is5G = inputs.technology !== '4G';
  const isMmWave = currentBand.isMmWave ?? false;

  // 1. TDD / FDD Factors
  let dlDutyCycle = 1.0;
  let ulDutyCycle = 1.0;
  if (inputs.duplexMode === 'TDD') {
    if (inputs.tddFrameRatio === 'CUSTOM') {
      const customDl = (inputs.customTddDlPercent ?? 75) / 100;
      const customUl = (inputs.customTddUlPercent ?? 25) / 100;
      dlDutyCycle = Math.max(0.05, Math.min(0.95, customDl));
      ulDutyCycle = Math.max(0.05, Math.min(0.95, customUl));
    } else {
      const tddPattern = TDD_FRAME_PATTERNS.find(p => p.id === inputs.tddFrameRatio) || TDD_FRAME_PATTERNS[0];
      dlDutyCycle = tddPattern.dlRatio;
      ulDutyCycle = tddPattern.ulRatio;
    }
  }

  // 2. MIMO & Beamforming Gains
  const mimoInfo = MIMO_CONFIGS[inputs.mimoMode] || MIMO_CONFIGS['2x2'];
  
  // Base Station beamforming gain enhanced by multi-beam sweeping grid:
  // For multiple beams (1 to 8), narrow scanning beams concentrate RF energy: 10*log10(min(N_beams, 8))^0.4
  const numBeams = inputs.numberOfBeams ?? 1;
  const multiBeamGainDb = numBeams > 1 ? Number((10 * Math.log10(numBeams) * 0.45).toFixed(1)) : 0.0;
  const dlBfGainDb = Number((mimoInfo.dlBfGainDb + multiBeamGainDb).toFixed(1));
  const ulRxGainDb = Number((mimoInfo.ulRxGainDb + (numBeams > 1 ? multiBeamGainDb * 0.7 : 0)).toFixed(1));

  // UE MIMO & Antenna Architecture (1T1R, 1T2R, 1T4R, 2T2R, 2T4R, 4T4R, 4T8R)
  // 3GPP 5G NR baseline for mid-band (n78/n77/n41) supports 2Tx UL MIMO (2T4R, 2 layers); 4G LTE baseline is 1Tx (1T2R)
  const defaultUeMimo: UeMimoMode = is5G ? '2T4R' : '1T2R';
  const ueMimo = inputs.ueMimoMode || defaultUeMimo;
  const ueTxAntennas = ueMimo.startsWith('4T') ? 4 : (ueMimo.startsWith('2T') ? 2 : 1);
  const ueRxAntennas = ueMimo.endsWith('8R') ? 8 : (ueMimo.endsWith('4R') ? 4 : (ueMimo.endsWith('1R') ? 1 : 2));

  // Effective DL spatial layers: bounded by BS layers and UE Rx antennas
  const effectiveDlLayers = Math.min(mimoInfo.dlLayers, ueRxAntennas);

  // Effective UL spatial layers: bounded by BS Rx layers and UE Tx antennas
  const effectiveUlLayers = Math.min(mimoInfo.ulLayers, ueTxAntennas);

  // Diversity combining gain (MMSE-IRC / MRC) over 2Rx baseline:
  // 8Rx provides +4.5 dB, 4Rx provides +2.5 dB, 2Rx baseline 0.0 dB, 1Rx (SISO) has -2.5 dB diversity loss
  const ueRxDiversityGainDb = ueRxAntennas >= 8 ? 4.5 : (ueRxAntennas >= 4 ? 2.5 : (ueRxAntennas === 1 ? -2.5 : 0.0));

  // 3. PRB Configuration: transmission bandwidth N_RB from TS 38.101-1/-2 Table 5.3.2-1 and TS 36.101 Table 5.6-1.
  // A bandwidth / SCS combination that 3GPP does not define falls back to the nearest defined bandwidth, with a warning.
  const configWarnings: string[] = [];
  const scsKhz = resolveSubcarrierSpacingKhz(is5G, isMmWave, inputs.subcarrierSpacingKhz);
  const bwConfig = resolveTransmissionBandwidth(is5G, isMmWave, scsKhz, inputs.bandwidthMHz);
  const nPrbTotal = bwConfig.nPrb;
  if (!bwConfig.valid) {
    configWarnings.push(
      `${inputs.bandwidthMHz} MHz is not a ${bwConfig.reference} channel bandwidth at ${scsKhz} kHz SCS. ` +
      `Calculated with ${bwConfig.bandwidthMHz} MHz (${nPrbTotal} PRBs). Supported: ${bwConfig.supportedMHz.join(', ')} MHz.`
    );
  }

  // 4. Reference Signal (RS / SS-PBCH EPRE) Power
  // Total Subcarriers in channel = nPrbTotal * 12
  const totalSubcarriers = Math.max(72, nPrbTotal * 12);
  let rsPowerDbm: number;
  if (!inputs.rsPowerAuto && inputs.rsPowerDbmOverride !== undefined) {
    rsPowerDbm = inputs.rsPowerDbmOverride;
  } else {
    // 3GPP EPRE = P_tx_total - 10*log10(N_subcarrier) + boost
    rsPowerDbm = Number((inputs.bsTxPowerDbm - 10 * Math.log10(totalSubcarriers) + inputs.rsPowerBoostDb).toFixed(1));
  }

  // 5. Downlink Transmitter EIRP
  // BS EIRP = TxPower + TxAntennaGain - CableLoss + BeamformingGain
  const bsEirpDbm = Number((inputs.bsTxPowerDbm + inputs.bsAntennaGainDbi - inputs.bsFeederCableLossDb + dlBfGainDb).toFixed(1));
  const rsEirpDbm = Number((rsPowerDbm + inputs.bsAntennaGainDbi - inputs.bsFeederCableLossDb + dlBfGainDb).toFixed(1));

  // 7.5 Cell Edge Service Resolution (3GPP TS 38.101/104, TS 36.101/104, TS 26.114, TS 36.211, TS 22.179)
  const serviceResolved = resolveCellEdgeService(inputs, is5G, nPrbTotal);

  // 6. Uplink Transmitter EIRP (UE)
  // Check for HPUE (Power Class 2: 26 dBm) or NB-IoT power class
  let effectiveUeTxPowerDbm = inputs.ueTxPowerDbm;
  if (serviceResolved.serviceProfile === 'MCX_PUBLIC_SAFETY' && inputs.mcxHpueEnabled) {
    effectiveUeTxPowerDbm = Math.max(inputs.ueTxPowerDbm, 26.0); // 3GPP HPUE Power Class 2 (+26 dBm / 400mW)
  } else if (serviceResolved.serviceProfile === 'NBIOT_4G' && inputs.nbiotPowerClassDbm) {
    effectiveUeTxPowerDbm = inputs.nbiotPowerClassDbm;
  }
  const ueEirpDbm = Number((effectiveUeTxPowerDbm + inputs.ueAntennaGainDbi - inputs.bodyLossDb).toFixed(1));

  // 7. Systems Overhead & Control Channels Calculation
  const controlOverheads = calculateControlOverheads(inputs);

  // 8. Receiver Noise & 3GPP Sensitivities (TS 38.101-1 / TS 38.104 / TS 36.101 / TS 36.104)
  // Thermal Noise Power per Subcarrier (dBm/SC): P_thermal_sc = -174 + 10*log10(SCS_Hz)
  // 5G NR 30 kHz: -129.23 dBm/SC | 4G LTE / 15 kHz: -132.24 dBm/SC | mmWave 120 kHz: -123.21 dBm/SC
  const dlScsHz = scsKhz * 1000;
  const dlThermalNoisePerScDbm = Number((-174 + 10 * Math.log10(dlScsHz)).toFixed(2));

  // NB-IoT 3.75 kHz single-tone UL SCS mode
  const ulScsKhz = (serviceResolved.serviceProfile === 'NBIOT_4G' && inputs.nbiotScs === '3_75KHZ_SINGLE')
    ? 3.75
    : scsKhz;
  const ulScsHz = ulScsKhz * 1000;
  const ulThermalNoisePerScDbm = Number((-174 + 10 * Math.log10(ulScsHz)).toFixed(2));

  // Number of Received Subcarriers (N_sc) resolved by cell-edge service
  const dlReceivedSubcarriers = serviceResolved.dlAllocatedSubcarriers;
  const ulReceivedSubcarriers = serviceResolved.ulAllocatedSubcarriers;
  const ulAllocPrbs = serviceResolved.ulAllocatedPrbs;

  // Noise Figures (NF in dB)
  const dlNoiseFigure = inputs.dlNoiseFigureDb ?? (
    serviceResolved.serviceProfile === 'NBIOT_4G' ? 9.0 :
    serviceResolved.serviceProfile === 'REDCAP_5G' ? 8.0 :
    (inputs.ueNoiseFigureDb ?? 7.0)
  );
  const ulNoiseFigure = inputs.ulNoiseFigureDb ?? inputs.bsNoiseFigureDb ?? 4.0;

  // Required SNR at Cell Edge (dB) resolved from selected service
  const dlTargetSinrCellEdgeDb = serviceResolved.dlRequiredSnrDb;
  const ulTargetSinrCellEdgeDb = serviceResolved.ulRequiredSnrDb;

  // Receiver Thermal Noise Floor (dBm): P_thermal_sc + 10*log10(N_sc) + NF
  const ueThermalNoiseFloorDbm = Number((
    dlThermalNoisePerScDbm + 10 * Math.log10(dlReceivedSubcarriers) + dlNoiseFigure
  ).toFixed(2));
  const bsThermalNoiseFloorDbm = Number((
    ulThermalNoisePerScDbm + 10 * Math.log10(ulReceivedSubcarriers) + ulNoiseFigure
  ).toFixed(2));

  // Downlink UE Receiver Sensitivity (dBm):
  // Rx_Sens_DL = P_thermal_sc + 10*log10(N_sc_DL) + NF_UE + SNR_req_DL - G_rx_div
  const ueRxSensitivityDbm = Number((
    ueThermalNoiseFloorDbm + dlTargetSinrCellEdgeDb - ueRxDiversityGainDb
  ).toFixed(1));

  // Uplink BS Receiver Sensitivity (dBm at eNB in 4G / at gNB in 5G):
  // Rx_Sens_UL = P_thermal_sc + 10*log10(N_sc_UL) + NF_BS + SNR_req_UL - G_rx_combining
  const bsRxSensitivityDbm = Number((
    bsThermalNoiseFloorDbm + ulTargetSinrCellEdgeDb - ulRxGainDb
  ).toFixed(1));

  // 9. Margins
  // Shadow Fading Margin based on log-normal fading standard deviation (sigma) and coverage probability
  // 9. Margins & 3GPP Interference Engine
  // Shadow Fading Margin based on log-normal fading standard deviation (sigma) and coverage probability
  // M_SF = z * sigma_SF (or user direct input from Link Budget Configuration panel)
  const shadowFadingMarginDb = (inputs.shadowFadingMarginDb !== undefined && inputs.shadowFadingMarginDb !== null && !isNaN(inputs.shadowFadingMarginDb))
    ? Number(inputs.shadowFadingMarginDb)
    : calculateShadowFadingMargin(
        inputs.shadowFadingStdDevDb,
        inputs.coverageProbability
      );

  // Fast / Multipath Fading Margin (Rayleigh / Rician small-scale multipath allowance)
  const dlFadingMarginDb = inputs.dlFadingMarginDb ?? 2.0;
  const ulFadingMarginDb = inputs.ulFadingMarginDb ?? 2.5;

  // Tentative cell range estimation for geometric Inter-Site Distance (ISD = 1.5 * R)
  const tentativeRawMapl = Math.min(
    bsEirpDbm + inputs.ueAntennaGainDbi - inputs.bodyLossDb - ueRxSensitivityDbm - shadowFadingMarginDb - dlFadingMarginDb - 3.0,
    ueEirpDbm + inputs.bsAntennaGainDbi - inputs.bsFeederCableLossDb - bsRxSensitivityDbm - shadowFadingMarginDb - ulFadingMarginDb - 3.0
  );
  const tentativeRangeKm = calculateDistanceForPathLoss(tentativeRawMapl, {
    freqMHz: dlFreqMHz,
    hbMeters: inputs.bsHeightMeters,
    hmMeters: inputs.ueHeightMeters,
    model: inputs.propagationModel,
    clutter: inputs.environmentClutter,
    scenario: inputs.indoorOutdoorScenario,
    additionalPenetrationLossDb: inputs.additionalPenetrationLossDb,
    foliageLossDb: inputs.foliageLossDb,
    spmK1Override: inputs.spmK1,
    spmK2Override: inputs.spmK2,
    shadowFadingStdDevDb: inputs.shadowFadingStdDevDb,
    coverageProbability: inputs.coverageProbability
  });
  const tentativeCellRangeMeters = Math.max(100, Math.round(tentativeRangeKm * 1000));

  // 3GPP TR 36.942 / TR 38.901 / ITU-R M.2412 Interference Summary & Cell Loading Calculation:
  const interferenceSummary = calculateInterferenceSummary(
    inputs,
    tentativeCellRangeMeters,
    dlFreqMHz,
    isMmWave
  );

  // Use the effective calculated interference margins (which factor in scenario, layout tiers, loading, 4G CRS vs 5G beamforming, and pessimistic offsets)
  // or explicit direct input if given
  const effectiveDlInterferenceMarginDb = (inputs.interferenceScenario !== undefined)
    ? interferenceSummary.effectiveDlInterferenceMarginDb
    : Number((inputs.interferenceMarginDb ?? 3.0).toFixed(1));

  const effectiveUlIotMarginDb = (inputs.interferenceScenario !== undefined)
    ? interferenceSummary.effectiveUlIotMarginDb
    : Number((inputs.iotMarginDb ?? 3.0).toFixed(1));

  const totalDlMarginsDb = Number((shadowFadingMarginDb + effectiveDlInterferenceMarginDb + dlFadingMarginDb).toFixed(1));
  const totalUlMarginsDb = Number((shadowFadingMarginDb + effectiveUlIotMarginDb + ulFadingMarginDb).toFixed(1));

  // 10. MAPL Calculation (Maximum Allowable Path Loss)
  // DL MAPL = BS_EIRP + UE_AntennaGain - BodyLoss - UE_RxSensitivity - TotalDlMargins
  const dlMaplDb = Number((
    bsEirpDbm + inputs.ueAntennaGainDbi - inputs.bodyLossDb - ueRxSensitivityDbm - totalDlMarginsDb
  ).toFixed(1));
  
  // UL MAPL = UE_EIRP + BS_AntennaGain - BS_FeederCableLoss - BS_RxSensitivity - TotalUlMargins
  const ulMaplDb = Number((
    ueEirpDbm + inputs.bsAntennaGainDbi - inputs.bsFeederCableLossDb - bsRxSensitivityDbm - totalUlMarginsDb
  ).toFixed(1));

  // Bottleneck Determination
  let bottleneck: 'DL_LIMITED' | 'UL_LIMITED' | 'BALANCED' = 'UL_LIMITED';
  const bottleneckDeltaDb = Number(Math.abs(dlMaplDb - ulMaplDb).toFixed(1));
  if (bottleneckDeltaDb < 0.5) {
    bottleneck = 'BALANCED';
  } else if (ulMaplDb < dlMaplDb) {
    bottleneck = 'UL_LIMITED';
  } else {
    bottleneck = 'DL_LIMITED';
  }

  const systemMaplDb = Math.min(dlMaplDb, ulMaplDb);

  // 10. Maximum Cell Range via Propagation Inversion
  const propParams = {
    freqMHz: dlFreqMHz,
    hbMeters: inputs.bsHeightMeters,
    hmMeters: inputs.ueHeightMeters,
    model: inputs.propagationModel,
    clutter: inputs.environmentClutter,
    scenario: inputs.indoorOutdoorScenario,
    additionalPenetrationLossDb: inputs.additionalPenetrationLossDb,
    foliageLossDb: inputs.foliageLossDb,
    spmK1Override: inputs.spmK1,
    spmK2Override: inputs.spmK2,
    shadowFadingStdDevDb: inputs.shadowFadingStdDevDb,
    coverageProbability: inputs.coverageProbability
  };

  const maxCellRangeKm = Number(calculateDistanceForPathLoss(systemMaplDb, propParams).toFixed(3));
  const maxCellRangeMeters = Math.round(maxCellRangeKm * 1000);

  // Propagation model validity: the range is capped where the model stops being defined
  const modelValidity = getPropagationModelValidity(inputs.propagationModel, inputs.indoorOutdoorScenario);
  const maxCellRangeCapped = modelValidity !== null && maxCellRangeKm >= modelValidity.maxDistanceKm - 0.001;
  if (maxCellRangeCapped && modelValidity) {
    const plAtLimit = calculatePathLoss(modelValidity.maxDistanceKm, propParams);
    configWarnings.push(
      `Cell range capped at ${modelValidity.maxDistanceKm} km (${modelValidity.reference}). ` +
      `Path loss there is ${plAtLimit.toFixed(1)} dB, below the ${systemMaplDb.toFixed(1)} dB MAPL, so the link would reach further ` +
      `than the model is defined for. Beyond this distance use a model calibrated for it (e.g. SPM tuned with drive-test data).`
    );
  }

  // 11. 3GPP TS 38.306 Overhead & Throughput Calculation Function
  const overheadSummary = calculate5GOverhead(inputs, dlFreqMHz, inputs.bandwidthMHz, scsKhz, isMmWave);
  const maxDlMod = inputs.maxDlModulation || '256QAM';

  // 12. Base Station Antenna Tilt & Coverage Geometry (3GPP TR 38.901 / TR 36.814)
  const mechanicalTiltDeg = Number(inputs.bsMechanicalTiltDeg ?? 2.0);
  const electricalTiltDeg = Number(inputs.bsElectricalTiltDeg ?? 4.0);
  const totalTiltDeg = Number((mechanicalTiltDeg + electricalTiltDeg).toFixed(1));
  const verticalBeamwidthDeg = Number(inputs.bsVerticalBeamwidthDeg ?? 7.0);

  const deltaH = Math.max(1.0, inputs.bsHeightMeters - inputs.ueHeightMeters);
  const degToRad = Math.PI / 180;
  
  // Main beam boresight ground intercept distance:
  const mainTiltRad = Math.max(0.2, totalTiltDeg) * degToRad;
  const mainBeamGroundDistanceMeters = Math.round(deltaH / Math.tan(mainTiltRad));

  // 3dB vertical beam inner & outer ground intercepts:
  const innerTiltRad = Math.max(0.5, totalTiltDeg + verticalBeamwidthDeg / 2) * degToRad;
  const outerTiltDeg = totalTiltDeg - verticalBeamwidthDeg / 2;
  const innerCoverageDistanceMeters = Math.round(deltaH / Math.tan(innerTiltRad));
  const outerCoverageDistanceMeters = outerTiltDeg > 0.3
    ? Math.round(deltaH / Math.tan(outerTiltDeg * degToRad))
    : Math.round(maxCellRangeMeters * 1.5);

  // Cell-edge elevation angle and vertical pattern loss A_V(theta_edge) in dB (3GPP TR 38.901 Table 7.3-1):
  const cellEdgeDistanceMeters = Math.max(50, maxCellRangeMeters);
  const thetaEdgeDeg = Math.atan2(deltaH, cellEdgeDistanceMeters) / degToRad;
  const patternAngleDelta = Math.abs(thetaEdgeDeg - totalTiltDeg);
  const cellEdgePatternLossDb = Number(Math.min(25.0, 12 * Math.pow(patternAngleDelta / verticalBeamwidthDeg, 2)).toFixed(2));

  // Optimal geometric downtilt to cell edge:
  // theta_opt = arctan(deltaH / R_max) + theta_3dB / 2
  const optimalTiltDeg = Number((thetaEdgeDeg + verticalBeamwidthDeg / 2).toFixed(1));

  const antennaTiltSummary = {
    mechanicalTiltDeg,
    electricalTiltDeg,
    totalTiltDeg,
    verticalBeamwidthDeg,
    mainBeamGroundDistanceMeters,
    innerCoverageDistanceMeters,
    outerCoverageDistanceMeters,
    cellEdgePatternLossDb,
    optimalTiltDeg
  };

  // Link adaptation: SINR -> modulation order, code rate and rank
  const selectLinkAdaptation = (sinrDb: number, layers: number, isUplink: boolean) => {
    // SINR to Shannon / 3GPP spectral efficiency mapping
    // At low SINR (< -3 dB), MCS falls to QPSK rate 0.15
    // At high SINR (> 20 dB), 256QAM (rate 0.925) or 64QAM (rate 0.85) is achieved
    let qm = 2; // QPSK
    let codeRate = 0.15;
    let rank = 1;

    if (sinrDb > 20) {
      if (!isUplink && maxDlMod === '64QAM') {
        qm = 6; // Capped to 64QAM
        codeRate = 0.85;
      } else {
        qm = isUplink ? 6 : 8; // 256QAM DL or 64QAM UL
        codeRate = isUplink ? 0.85 : 0.925;
      }
      rank = layers;
    } else if (sinrDb > 14) {
      qm = 6; // 64QAM
      codeRate = 0.80;
      rank = Math.min(layers, 4);
    } else if (sinrDb > 7) {
      qm = 4; // 16QAM
      codeRate = 0.65;
      rank = Math.min(layers, 2);
    } else if (sinrDb > 1) {
      qm = 2; // QPSK
      codeRate = 0.45;
      rank = 1;
    } else {
      qm = 2; // QPSK low code rate
      codeRate = 0.18;
      rank = 1;
    }

    if (isUplink) {
      // Handset uplink max 64QAM, rank bounded by the SINR tier and effectiveUlLayers
      qm = Math.min(qm, 6);
      rank = Math.min(rank, layers, effectiveUlLayers);
    }

    return { qm, codeRate, rank };
  };

  const calculate3GPPThroughput = (
    bwMHz: number,
    sinrDb: number,
    layers: number,
    dutyCycle: number,
    isUplink: boolean
  ) => {
    const { qm, codeRate, rank } = selectLinkAdaptation(sinrDb, layers, isUplink);

    // 3GPP Physical Layer Overhead Breakdown (TS 38.306 Table 4.1.2-1 & Detailed TS 38.211/38.214)
    let totalOverhead = 0;
    if (is5G) {
      totalOverhead = isUplink ? overheadSummary.ulOverheadRatio : overheadSummary.dlOverheadRatio;
    } else {
      // 4G LTE physical overheads: CRS (4 ports ~ 14.3%), PDCCH (1-3 symbols ~ 7-14%), PUCCH
      const dmrsSymbols = inputs.dmrsSymbolsPerSlot ?? 1;
      const dmrsOh = dmrsSymbols / 14;
      const ctrlOh = isUplink
        ? (controlOverheads.avgPucchOverheadPercent / 100)
        : (controlOverheads.avgPdcchOverheadPercent / 100);
      totalOverhead = Math.min(0.70, dmrsOh + ctrlOh);
    }

    // Exact N_RB of the (validated) carrier bandwidth
    const prbs = resolveTransmissionBandwidth(is5G, isMmWave, scsKhz, bwMHz).nPrb;
    const symbolsPerSec = 14 * (scsKhz / 15) * 1000;
    
    // Target residual BLER factor: Effective throughput is scaled by (1 - Residual_BLER)
    const residualBler = (inputs.residualBlerTargetPercent ?? 10) / 100;
    const rawRateMbps = (rank * qm * dutyCycle * codeRate * (12 * prbs) * symbolsPerSec * (1 - totalOverhead) * (1 - residualBler * 0.4)) / 1e6;

    // Apply baseline realistic implementation margin (BLER, signaling, control channels)
    return Math.max(0.2, Number(rawRateMbps.toFixed(1)));
  };

  // 12. Calculate 4 Points as requested by User
  // Point 1: Near Cell (15% of max distance, peak geometry & SNR)
  // Point 2: Medium Cell Range (50% of max distance, nominal coverage)
  // Point 3: Bad Radio Conditions (78% of max distance, degraded clutter / high interference)
  // Point 4: Cell Edge (100% of max distance, MAPL sensitivity boundary R_max)

  // Proportional distances scaled strictly to cell radius R_max (guarantees monotonicity for all cell sizes)
  const distEdgeKm = Math.max(0.02, maxCellRangeKm);
  const distNearKm = Number((distEdgeKm * 0.15).toFixed(3));
  const distMedKm = Number((distEdgeKm * 0.50).toFixed(3));
  const distBadKm = Number((distEdgeKm * 0.78).toFixed(3));

  // Path loss at points computed rigorously through propagation model
  // Note strictly: plNear < plMed < plBad < plEdge
  const plNear = Number(calculatePathLoss(distNearKm, propParams).toFixed(1));
  const plMed = Number(calculatePathLoss(distMedKm, propParams).toFixed(1));
  const plEdge = Number(calculatePathLoss(distEdgeKm, propParams).toFixed(1));

  // Bad radio condition sits between Medium and Cell edge (~78% range with degraded clutter / local shadowing).
  // Strictly bounded to guarantee physical monotonicity: plMed < plBad < plEdge
  const plBadNominal = calculatePathLoss(distBadKm, propParams);
  const plBad = Number(Math.min(plEdge - 1.8, Math.max(plMed + 2.0, plBadNominal + 1.2)).toFixed(1));

  // SS-RSRP = Reference Signal EIRP - PathLoss (dBm)
  // Strictly monotonic: rsrpNear > rsrpMed > rsrpBad > rsrpEdge
  const rsrpNear = Number((rsEirpDbm - plNear).toFixed(1));
  const rsrpMed = Number((rsEirpDbm - plMed).toFixed(1));
  const rsrpBad = Number((rsEirpDbm - plBad).toFixed(1));
  const rsrpEdge = Number((rsEirpDbm - plEdge).toFixed(1));

  // SS-RSSI Calculation (in dBm) as per 3GPP TS 38.215 / TS 36.214:
  // RSSI = RSRP + 10*log10(N_sc_meas) + interference_traffic_offset
  // For 5G NR SSB: 240 subcarriers = 23.8 dB + traffic load
  // For 4G LTE: measured over PRBs
  const measSubcarriers = is5G ? 240 : Math.min(1200, nPrbTotal * 12);
  const scLogOffset = 10 * Math.log10(measSubcarriers);
  const rssiNear = Number((rsrpNear + scLogOffset + 2.4).toFixed(1));
  const rssiMed = Number((rsrpMed + scLogOffset + 1.8).toFixed(1));
  const rssiBad = Number((rsrpBad + scLogOffset + 1.5).toFixed(1));
  const rssiEdge = Number((rsrpEdge + scLogOffset + 1.0).toFixed(1));

  // SS-SINR (dB) at each point, from the same link budget as the MAPL, at the design coverage probability
  // (shadow fading and fast fading margins applied). At PL = DL / UL MAPL this gives exactly the required SNR.
  // DL: BS EIRP + UE gain - body loss - PL + UE Rx diversity gain - UE noise floor - DL interference margin - margins
  // UL: UE EIRP + BS gain - feeder loss - PL + BS Rx gain - BS noise floor - UL IoT margin - margins
  // Capped by the transmitter EVM limit (TS 38.104 / TS 36.104 Table 6.5.2-1: 3.5% for 256QAM, 8% for 64QAM)
  const dlSinrCeilingDb = maxDlMod === '256QAM' ? 29.1 : 21.9;
  const ulSinrCeilingDb = 21.9;
  const dlSinrAtPl = (pl: number) => Number(Math.min(dlSinrCeilingDb,
    bsEirpDbm + inputs.ueAntennaGainDbi - inputs.bodyLossDb - pl + ueRxDiversityGainDb
    - ueThermalNoiseFloorDbm - effectiveDlInterferenceMarginDb - shadowFadingMarginDb - dlFadingMarginDb
  ).toFixed(1));
  const ulSinrAtPl = (pl: number) => Number(Math.min(ulSinrCeilingDb,
    ueEirpDbm + inputs.bsAntennaGainDbi - inputs.bsFeederCableLossDb - pl + ulRxGainDb
    - bsThermalNoiseFloorDbm - effectiveUlIotMarginDb - shadowFadingMarginDb - ulFadingMarginDb
  ).toFixed(1));
  const sinrNear = dlSinrAtPl(plNear);
  const sinrMed = dlSinrAtPl(plMed);
  const sinrBad = dlSinrAtPl(plBad);
  const sinrEdge = dlSinrAtPl(plEdge);
  const ulSinrNear = ulSinrAtPl(plNear);
  const ulSinrMed = ulSinrAtPl(plMed);
  const ulSinrBad = ulSinrAtPl(plBad);
  const ulSinrEdge = ulSinrAtPl(plEdge);

  // Base Latency profile
  // 5G TDD slot ~ 2.5ms, typical user plane ~ 6-9 ms; Cell edge ~ 22-30 ms due to HARQ retransmissions
  // 4G FDD ~ 14 ms near; Cell edge ~ 45-55 ms
  const baseLat = is5G ? (inputs.duplexMode === 'TDD' ? 8.5 : 6.5) : 16.0;
  const latNear = Number((baseLat).toFixed(1));
  const latMed = Number((baseLat * 1.35).toFixed(1));
  const latBad = Number((baseLat * 2.1).toFixed(1));
  const latEdge = Number((baseLat * 3.4).toFixed(1));

  // Throughputs at points for Primary Carrier
  const dlThrNear = calculate3GPPThroughput(inputs.bandwidthMHz, sinrNear, effectiveDlLayers, dlDutyCycle, false);
  const ulThrNear = calculate3GPPThroughput(inputs.bandwidthMHz, ulSinrNear, effectiveUlLayers, ulDutyCycle, true);

  const dlThrMed = calculate3GPPThroughput(inputs.bandwidthMHz, sinrMed, effectiveDlLayers, dlDutyCycle, false);
  const ulThrMed = calculate3GPPThroughput(inputs.bandwidthMHz, ulSinrMed, effectiveUlLayers, ulDutyCycle, true);

  const dlThrBad = calculate3GPPThroughput(inputs.bandwidthMHz, sinrBad, effectiveDlLayers, dlDutyCycle, false);
  const ulThrBad = calculate3GPPThroughput(inputs.bandwidthMHz, ulSinrBad, effectiveUlLayers, ulDutyCycle, true);

  // Link adaptation at each point (labels and rank shown in the 4-point table)
  const dlLa = [sinrNear, sinrMed, sinrBad, sinrEdge].map(v => selectLinkAdaptation(v, effectiveDlLayers, false));
  const ulLa = [ulSinrNear, ulSinrMed, ulSinrBad, ulSinrEdge].map(v => selectLinkAdaptation(v, effectiveUlLayers, true));
  const dlMcsTable = maxDlMod === '256QAM' ? 2 : 1;

  // If CA enabled, compute aggregated multipliers for near/medium points
  let caDlFactor = 1.0;
  let caUlFactor = 1.0;
  let totalAggBwMHz = inputs.bandwidthMHz;
  if (inputs.caEnabled && inputs.carriers.length > 0) {
    totalAggBwMHz = inputs.carriers.reduce((sum, c) => sum + c.bandwidthMHz, 0);
    caDlFactor = totalAggBwMHz / inputs.bandwidthMHz;
    caUlFactor = 1.0 + (inputs.carriers.length > 1 ? 0.35 : 0); // UL CA usually 2CC max
  }

  // Modulation strings from the link adaptation at each point (TS 38.214 MCS / CQI tables)
  const dlMcsStr = dlLa.map(la => formatMcsLabel(la.qm, la.codeRate, dlMcsTable));
  const ulMcsStr = ulLa.map(la => la.rank > 1
    ? `MCS ${nearestMcsIndex(la.qm, la.codeRate, 1)} (${la.rank}x${modulationName(la.qm)} Streams)`
    : formatMcsLabel(la.qm, la.codeRate, 1));
  const dlCqiStr = dlLa.map(la => `${modulationName(la.qm)} (CQI ${nearestCqiIndex(la.qm, la.codeRate, dlMcsTable)})`);
  const ulModStr = ulLa.map(la => `${la.rank > 1 ? `${la.rank}x ` : ''}${modulationName(la.qm)} (MCS ${nearestMcsIndex(la.qm, la.codeRate, 1)})`);
  const pointSummary = (i: number) =>
    `DL rank ${dlLa[i].rank} ${modulationName(dlLa[i].qm)}, UL ${ulLa[i].rank > 1 ? `${ulLa[i].rank}x ` : ''}${modulationName(ulLa[i].qm)}`;

  const targetBler = inputs.residualBlerTargetPercent ?? 10.0;
  const blerNear = Number((targetBler * 0.08).toFixed(1));
  const blerMed = Number((targetBler * 0.45).toFixed(1));
  const blerBad = Number((targetBler * 1.42).toFixed(1));
  const blerEdge = Number(targetBler.toFixed(1));

  const isFixedRateEdgeService = ['VONR_5G', 'VOLTE_4G', 'NBIOT_4G'].includes(serviceResolved.serviceProfile);

  const fourPoints: FourPointOutput[] = [
    {
      pointName: 'Near Cell',
      description: `Near site, 15% of R_max (${pointSummary(0)})`,
      rangeKm: distNearKm,
      rangeMeters: Math.round(distNearKm * 1000),
      pathLossDb: plNear,
      ssRsrpDbm: rsrpNear,
      ssRssiDbm: rssiNear,
      ssSinrDb: sinrNear,
      ulSinrDb: ulSinrNear,
      avgDlMcs: dlMcsStr[0],
      avgUlMcs: ulMcsStr[0],
      avgDlBlerPercent: blerNear,
      dlThroughputMbps: Number((dlThrNear * (inputs.caEnabled ? caDlFactor : 1)).toFixed(1)),
      ulThroughputMbps: Number((ulThrNear * (inputs.caEnabled ? caUlFactor : 1)).toFixed(1)),
      latencyMs: serviceResolved.targetLatencyMs !== undefined ? Number((serviceResolved.targetLatencyMs * 0.4).toFixed(1)) : latNear,
      dlMcs: dlCqiStr[0],
      ulMcs: ulModStr[0],
      mimoLayers: dlLa[0].rank
    },
    {
      pointName: 'Medium Cell range',
      description: `Nominal coverage, 50% of R_max (${pointSummary(1)})`,
      rangeKm: distMedKm,
      rangeMeters: Math.round(distMedKm * 1000),
      pathLossDb: plMed,
      ssRsrpDbm: rsrpMed,
      ssRssiDbm: rssiMed,
      ssSinrDb: sinrMed,
      ulSinrDb: ulSinrMed,
      avgDlMcs: dlMcsStr[1],
      avgUlMcs: ulMcsStr[1],
      avgDlBlerPercent: blerMed,
      dlThroughputMbps: Number((dlThrMed * (inputs.caEnabled ? caDlFactor : 1)).toFixed(1)),
      ulThroughputMbps: Number((ulThrMed * (inputs.caEnabled ? caUlFactor : 1)).toFixed(1)),
      latencyMs: serviceResolved.targetLatencyMs !== undefined ? Number((serviceResolved.targetLatencyMs * 0.7).toFixed(1)) : latMed,
      dlMcs: dlCqiStr[1],
      ulMcs: ulModStr[1],
      mimoLayers: dlLa[1].rank
    },
    {
      pointName: 'Bad radio conditions',
      description: `Degraded channel, 78% of R_max with extra clutter loss (${pointSummary(2)})`,
      rangeKm: distBadKm,
      rangeMeters: Math.round(distBadKm * 1000),
      pathLossDb: plBad,
      ssRsrpDbm: rsrpBad,
      ssRssiDbm: rssiBad,
      ssSinrDb: sinrBad,
      ulSinrDb: ulSinrBad,
      avgDlMcs: dlMcsStr[2],
      avgUlMcs: ulMcsStr[2],
      avgDlBlerPercent: blerBad,
      dlThroughputMbps: dlThrBad,
      ulThroughputMbps: ulThrBad,
      latencyMs: serviceResolved.targetLatencyMs !== undefined ? Number((serviceResolved.targetLatencyMs * 0.9).toFixed(1)) : latBad,
      dlMcs: dlCqiStr[2],
      ulMcs: ulModStr[2],
      mimoLayers: dlLa[2].rank
    },
    {
      pointName: 'Cell edge',
      description: serviceResolved.description,
      rangeKm: distEdgeKm,
      rangeMeters: Math.round(distEdgeKm * 1000),
      pathLossDb: plEdge,
      ssRsrpDbm: rsrpEdge,
      ssRssiDbm: rssiEdge,
      ssSinrDb: sinrEdge,
      ulSinrDb: ulSinrEdge,
      avgDlMcs: serviceResolved.serviceProfile === 'VONR_5G' || serviceResolved.serviceProfile === 'VOLTE_4G'
        ? 'QPSK (VoIP RoHC)'
        : (serviceResolved.serviceProfile === 'NBIOT_4G' ? 'QPSK / BPSK (NPDSCH)' : dlMcsStr[3]),
      avgUlMcs: serviceResolved.serviceProfile === 'VONR_5G' || serviceResolved.serviceProfile === 'VOLTE_4G'
        ? 'QPSK (VoIP Packet)'
        : (serviceResolved.serviceProfile === 'NBIOT_4G' ? (inputs.nbiotScs === '15KHZ_MULTI' ? 'QPSK Multi-Tone' : 'BPSK/QPSK Single-Tone') : ulMcsStr[3]),
      avgDlBlerPercent: serviceResolved.targetResidualBlerPercent,
      // Fixed-rate services (voice, NB-IoT) report their service rate; others the rate at the edge SINR,
      // never below the cell-edge service target the MAPL was dimensioned for
      dlThroughputMbps: isFixedRateEdgeService
        ? serviceResolved.targetDlThroughputMbps
        : Math.max(serviceResolved.targetDlThroughputMbps, calculate3GPPThroughput(inputs.bandwidthMHz, sinrEdge, effectiveDlLayers, dlDutyCycle, false)),
      ulThroughputMbps: isFixedRateEdgeService
        ? serviceResolved.targetUlThroughputMbps
        : Math.max(serviceResolved.targetUlThroughputMbps, calculate3GPPThroughput(inputs.bandwidthMHz, ulSinrEdge, effectiveUlLayers, ulDutyCycle, true)),
      latencyMs: serviceResolved.targetLatencyMs !== undefined ? serviceResolved.targetLatencyMs : latEdge,
      dlMcs: serviceResolved.serviceProfile === 'VONR_5G' || serviceResolved.serviceProfile === 'VOLTE_4G' ? 'QPSK (VoIP RoHC)' : dlCqiStr[3],
      ulMcs: serviceResolved.serviceProfile === 'VONR_5G' || serviceResolved.serviceProfile === 'VOLTE_4G' ? 'QPSK (VoIP)' : ulModStr[3],
      mimoLayers: dlLa[3].rank
    }
  ];

  // 13. Cascade Waterfall Table (Detailed RF breakdown for Downlink & Uplink)
  const cascadeTable: LinkBudgetCascadeItem[] = [
    {
      name: 'Transmitter Tx Power',
      dlValue: `${inputs.bsTxPowerDbm.toFixed(1)} dBm (${Math.round(Math.pow(10, (inputs.bsTxPowerDbm - 30) / 10))} W)`,
      ulValue: `${inputs.ueTxPowerDbm.toFixed(1)} dBm (${Math.round(Math.pow(10, (inputs.ueTxPowerDbm - 30) / 10) * 1000)} mW)`,
      unit: 'dBm',
      category: 'TX',
      description: 'gNodeB/eNodeB total output vs UE class transmitter power'
    },
    {
      name: 'Reference Signal Power (RS/SSB EPRE)',
      dlValue: `${rsPowerDbm.toFixed(1)}`,
      ulValue: 'N/A (SRS/DMRS)',
      unit: 'dBm/RE',
      category: 'TX',
      description: 'Energy per Resource Element for SS-PBCH Block / LTE Cell-RS'
    },
    {
      name: 'Transmitter Antenna Gain',
      dlValue: `+${inputs.bsAntennaGainDbi.toFixed(1)}`,
      ulValue: `+${inputs.ueAntennaGainDbi.toFixed(1)}`,
      unit: 'dBi',
      category: 'ANTENNA',
      description: 'Directional base station antenna gain vs omni/directional UE antenna'
    },
    {
      name: 'Transmitter Feeder & Cable Losses',
      dlValue: `-${inputs.bsFeederCableLossDb.toFixed(1)}`,
      ulValue: '0.0',
      unit: 'dB',
      category: 'ANTENNA',
      description: 'RF jumper, connector, and feeder attenuation'
    },
    {
      name: 'Tx Beamforming Array Gain',
      dlValue: `+${dlBfGainDb.toFixed(1)}`,
      ulValue: '0.0',
      unit: 'dB',
      category: 'ANTENNA',
      description: 'Massive MIMO digital/analog beamforming directive gain'
    },
    {
      name: 'UE Body Loss',
      dlValue: `-${inputs.bodyLossDb.toFixed(1)}`,
      ulValue: `-${inputs.bodyLossDb.toFixed(1)}`,
      unit: 'dB',
      category: 'ANTENNA',
      description: 'Human tissue absorption / head/hand attenuation (0 dB for CPE)'
    },
    {
      name: 'Equivalent Isotropically Radiated Power (EIRP)',
      dlValue: `${bsEirpDbm.toFixed(1)}`,
      ulValue: `${ueEirpDbm.toFixed(1)}`,
      unit: 'dBm',
      category: 'TX',
      description: 'Total radiated RF energy into free space'
    },
    {
      name: 'Receiver Antenna Gain',
      dlValue: `+${inputs.ueAntennaGainDbi.toFixed(1)}`,
      ulValue: `+${inputs.bsAntennaGainDbi.toFixed(1)}`,
      unit: 'dBi',
      category: 'RX',
      description: 'Receive aperture gain'
    },
    {
      name: 'Rx Diversity / Beamforming Gain',
      dlValue: '0.0 (baseline)',
      ulValue: `+${ulRxGainDb.toFixed(1)}`,
      unit: 'dB',
      category: 'RX',
      description: 'Base station multi-antenna receive combining (MRC / IRC beamforming)'
    },
    {
      name: 'Receiver Cable / Feeder Loss',
      dlValue: '0.0',
      ulValue: `-${inputs.bsFeederCableLossDb.toFixed(1)}`,
      unit: 'dB',
      category: 'RX',
      description: 'Base station receive cable loss'
    },
    {
      name: 'Receiver Noise Figure (NF)',
      dlValue: `${dlNoiseFigure.toFixed(1)}`,
      ulValue: `${ulNoiseFigure.toFixed(1)}`,
      unit: 'dB',
      category: 'RX',
      description: 'LNA amplifier noise figure (DL UE / UL gNB/eNB)'
    },
    {
      name: 'Thermal Noise Power per Subcarrier',
      dlValue: `${dlThermalNoisePerScDbm.toFixed(2)}`,
      ulValue: `${ulThermalNoisePerScDbm.toFixed(2)}`,
      unit: 'dBm/SC',
      category: 'RX',
      description: `Thermal noise per subcarrier: -174 + 10*log10(${scsKhz} kHz SCS)`
    },
    {
      name: 'Number of Received Subcarriers',
      dlValue: `${dlReceivedSubcarriers} (${Math.round(dlReceivedSubcarriers / 12)} PRBs)`,
      ulValue: `${ulReceivedSubcarriers} (${ulAllocPrbs} PRBs)`,
      unit: 'SCs',
      category: 'RX',
      description: 'Subcarriers received for cell-edge PS Data (DL channel vs UL cell-edge PRBs)'
    },
    {
      name: 'Thermal Noise Floor (P_thermal + NF)',
      dlValue: `${ueThermalNoiseFloorDbm.toFixed(1)}`,
      ulValue: `${bsThermalNoiseFloorDbm.toFixed(1)}`,
      unit: 'dBm',
      category: 'RX',
      description: 'Integrated noise power: P_sc + 10*log10(N_sc) + NF'
    },
    {
      name: 'Required SNR at Cell Edge',
      dlValue: `${dlTargetSinrCellEdgeDb.toFixed(1)}`,
      ulValue: `${ulTargetSinrCellEdgeDb.toFixed(1)}`,
      unit: 'dB',
      category: 'RX',
      description: 'Target demodulation SNR threshold for cell-edge service (PS DL/UL Data)'
    },
    {
      name: 'Receiver Sensitivity',
      dlValue: `${ueRxSensitivityDbm.toFixed(1)}`,
      ulValue: `${bsRxSensitivityDbm.toFixed(1)}`,
      unit: 'dBm',
      category: 'RX',
      description: `3GPP Receiver sensitivity: NoiseFloor + SNR_req - Rx_gain (DL UE / UL ${is5G ? 'gNB' : 'eNB'})`
    },
    {
      name: 'PDCCH / PUCCH Control Overhead',
      dlValue: `${controlOverheads.avgPdcchOverheadPercent.toFixed(2)}% (PDCCH)`,
      ulValue: `${controlOverheads.avgPucchOverheadPercent.toFixed(2)}% (PUCCH)`,
      unit: '%',
      category: 'RESULT',
      description: '3GPP dynamic control channel overhead reducing PDSCH & PUSCH traffic share (uncapped, can exceed 10% / 20%)'
    },
    {
      name: is5G ? 'CSI-RS Reporting & Periodicity' : '4G LTE Reference Signals (CRS)',
      dlValue: is5G ? `${inputs.csiRsCaPeriodicitySlots ?? 20} slots (CA)` : '4-Port CRS (Fixed)',
      ulValue: is5G ? `${inputs.csiRsReportsPerPeriod ?? 2} rpts/period` : 'SC-FDMA DMRS (2 sym/slot)',
      unit: is5G ? 'cfg' : '3GPP Std',
      category: 'ANTENNA',
      description: is5G
        ? 'CSI-RS reporting load affecting uplink PUCCH and downlink PDCCH'
        : 'LTE standard cell-specific reference signals & uplink Demodulation RS'
    },
    {
      name: 'Interference Margin / IoT',
      dlValue: `${effectiveDlInterferenceMarginDb.toFixed(1)} dB (${interferenceSummary.scenario === 'ISOLATED_CELL' ? 'Isolated' : interferenceSummary.tiers + '-Tier ' + interferenceSummary.neighborLoadPercent + '% load'})`,
      ulValue: `${effectiveUlIotMarginDb.toFixed(1)} dB (IoT ${interferenceSummary.scenario === 'ISOLATED_CELL' ? 'Isolated' : interferenceSummary.intraCellLoadPercent + '% load'})`,
      unit: 'dB',
      category: 'MARGINS',
      description: `3GPP Inter-cell & intra-cell loading margin (${interferenceSummary.methodName})`
    },
    {
      name: 'Shadow Fading Margin (M_SF)',
      dlValue: `${shadowFadingMarginDb.toFixed(1)} dB (P=${inputs.coverageProbability}%)`,
      ulValue: `${shadowFadingMarginDb.toFixed(1)} dB (P=${inputs.coverageProbability}%)`,
      unit: 'dB',
      category: 'MARGINS',
      description: `Log-normal slow fading margin derived from urban/rural σ=${inputs.shadowFadingStdDevDb.toFixed(1)} dB at ${inputs.coverageProbability}% cell edge probability`
    },
    {
      name: 'Multipath / Fast Fading Margin',
      dlValue: `${dlFadingMarginDb.toFixed(1)}`,
      ulValue: `${ulFadingMarginDb.toFixed(1)}`,
      unit: 'dB',
      category: 'MARGINS',
      description: 'Small-scale Rayleigh / Rician multipath fading reserve for channel fading dips'
    },
    {
      name: 'Total Planning Margins',
      dlValue: `${totalDlMarginsDb.toFixed(1)}`,
      ulValue: `${totalUlMarginsDb.toFixed(1)}`,
      unit: 'dB',
      category: 'MARGINS',
      description: 'Combined shadow fading + interference + fast fading allowances'
    },
    {
      name: 'Maximum Allowable Path Loss (MAPL)',
      dlValue: `${dlMaplDb.toFixed(1)}`,
      ulValue: `${ulMaplDb.toFixed(1)}`,
      unit: 'dB',
      category: 'RESULT',
      description: 'Link budget budget headroom before link drop (Radiated EIRP - Sensitivity - Margins)'
    },
    {
      name: 'Cell-Edge Service Profile',
      dlValue: `${serviceResolved.displayName} (${serviceResolved.targetDlThroughputFormatted})`,
      ulValue: `${serviceResolved.displayName} (${serviceResolved.targetUlThroughputFormatted})`,
      unit: 'Profile',
      category: 'RESULT',
      description: `Target: ${serviceResolved.description} · Standard: ${serviceResolved.standardReference}`
    },
    {
      name: 'Required Cell Edge Distance (R_max)',
      dlValue: `${maxCellRangeKm.toFixed(3)} km (${maxCellRangeMeters.toLocaleString()} m)`,
      ulValue: `${maxCellRangeKm.toFixed(3)} km (${maxCellRangeMeters.toLocaleString()} m)`,
      unit: 'km',
      category: 'RESULT',
      description: `Calculated cell edge boundary satisfying ${serviceResolved.displayName} at P_cov=${inputs.coverageProbability}%`
    }
  ];

  return {
    dlMaplDb,
    ulMaplDb,
    systemMaplDb,
    bottleneck,
    bottleneckDeltaDb,
    maxCellRangeKm,
    maxCellRangeMeters,
    rsPowerDbm,
    rsEirpDbm,
    bsEirpDbm,
    ueEirpDbm,
    ueRxSensitivityDbm,
    bsRxSensitivityDbm,
    shadowFadingMarginDb,
    dlFadingMarginDb,
    ulFadingMarginDb,
    totalDlMarginsDb,
    totalUlMarginsDb,
    fourPoints,
    maxCellRangeCapped,
    configWarnings,
    cascadeTable,
    caSummary: {
      totalBandwidthMHz: totalAggBwMHz,
      peakDlThroughputMbps: fourPoints[0].dlThroughputMbps,
      peakUlThroughputMbps: fourPoints[0].ulThroughputMbps,
      carrierCount: inputs.caEnabled ? Math.max(1, inputs.carriers.length) : 1
    },
    avgPdcchOverheadPercent: controlOverheads.avgPdcchOverheadPercent,
    avgPucchOverheadPercent: controlOverheads.avgPucchOverheadPercent,
    overheadSummary,
    antennaTiltSummary,
    rxSensitivityBreakdown: {
      dl: {
        thermalNoisePerSubcarrierDbm: dlThermalNoisePerScDbm,
        receivedSubcarriers: dlReceivedSubcarriers,
        noiseFigureDb: dlNoiseFigure,
        thermalNoiseFloorDbm: ueThermalNoiseFloorDbm,
        requiredSnrDb: dlTargetSinrCellEdgeDb,
        rxDiversityGainDb: ueRxDiversityGainDb,
        sensitivityDbm: ueRxSensitivityDbm,
        serviceName: serviceResolved.displayName,
        scsKhz
      },
      ul: {
        thermalNoisePerSubcarrierDbm: ulThermalNoisePerScDbm,
        receivedSubcarriers: ulReceivedSubcarriers,
        allocatedPrbs: ulAllocPrbs,
        noiseFigureDb: ulNoiseFigure,
        thermalNoiseFloorDbm: bsThermalNoiseFloorDbm,
        requiredSnrDb: ulTargetSinrCellEdgeDb,
        rxGainDb: ulRxGainDb,
        sensitivityDbm: bsRxSensitivityDbm,
        serviceName: serviceResolved.displayName,
        scsKhz: ulScsKhz
      }
    },
    serviceSummary: {
      serviceProfile: serviceResolved.serviceProfile,
      displayName: serviceResolved.displayName,
      description: serviceResolved.description,
      targetDlThroughputMbps: serviceResolved.targetDlThroughputMbps,
      targetUlThroughputMbps: serviceResolved.targetUlThroughputMbps,
      targetDlThroughputFormatted: serviceResolved.targetDlThroughputFormatted,
      targetUlThroughputFormatted: serviceResolved.targetUlThroughputFormatted,
      dlRequiredSnrDb: dlTargetSinrCellEdgeDb,
      ulRequiredSnrDb: ulTargetSinrCellEdgeDb,
      dlAllocatedSubcarriers: dlReceivedSubcarriers,
      ulAllocatedSubcarriers: ulReceivedSubcarriers,
      dlAllocatedPrbs: serviceResolved.dlAllocatedPrbs,
      ulAllocatedPrbs: serviceResolved.ulAllocatedPrbs,
      targetResidualBlerPercent: serviceResolved.targetResidualBlerPercent,
      targetLatencyMs: serviceResolved.targetLatencyMs,
      targetLatencyFormatted: serviceResolved.targetLatencyFormatted,
      calculatedEdgeRangeKm: maxCellRangeKm,
      calculatedEdgeRangeMeters: maxCellRangeMeters,
      standardReference: serviceResolved.standardReference
    },
    interferenceSummary
  };
}
