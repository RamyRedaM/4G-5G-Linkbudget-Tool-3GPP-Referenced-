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
  UeMimoMode
} from '../types/telecom';
import { TELECOM_BANDS, MIMO_CONFIGS, TDD_FRAME_PATTERNS } from '../data/telecomBands';
import {
  calculatePathLoss,
  calculateDistanceForPathLoss,
  calculateShadowFadingMargin
} from './spmPropagation';

/**
 * 3GPP Compliant 4G/5G Link Budget and Throughput Engine
 * Ref: 3GPP TS 38.101, TS 38.104, TS 38.901, TS 38.306, TS 36.101, TS 38.211, TS 38.213
 */

export interface ControlOverheadsResult {
  avgPdcchOverheadPercent: number; // Dynamic function of 3GPP parameters (can vary & exceed 10%)
  avgPucchOverheadPercent: number; // Dynamic function of 3GPP parameters (can vary & exceed 20%)
  pdcchBreakdown: {
    basePercent: number;
    bwFactorPercent: number;
    beamFactorPercent: number;
    caFactorPercent: number;
    csiFactorPercent: number;
    dmrsFactorPercent: number;
  };
  pucchBreakdown: {
    basePercent: number;
    csiReportsPercent: number;
    csiPeriodicityPercent: number;
    caFactorPercent: number;
    tddFactorPercent: number;
    bwFactorPercent: number;
  };
}

/**
 * Calculates dynamically average PDCCH and PUCCH overheads based on
 * 3GPP defined parameters: channel bandwidth, active beams, carrier aggregation,
 * CSI-RS reporting density, DMRS numerology, residual BLER, and TDD frame ratio.
 * No artificial capping: can freely exceed 10% (PDCCH) or 20% (PUCCH) to reflect
 * authentic reduction in PDSCH and PUSCH traffic shares.
 */
export function calculateControlOverheads(inputs: LinkBudgetInputs): ControlOverheadsResult {
  const is4G = inputs.technology === '4G';
  const numBeams = is4G ? 1 : (inputs.numberOfBeams ?? 1);
  const dmrsSymbols = is4G ? 1 : (inputs.dmrsSymbolsPerSlot ?? 1);
  const csiReports = is4G ? 1 : (inputs.csiRsReportsPerPeriod ?? 2);
  const csiPeriodicity = is4G ? 20 : (inputs.csiRsCaPeriodicitySlots ?? 20);
  const caCarriers = inputs.caEnabled ? (inputs.caCarriersCount || 1) : 1;
  const bwMHz = inputs.bandwidthMHz;

  // 1. Average PDCCH Overhead (%) - 3GPP TS 38.211 / TS 38.213 / TS 36.211
  // In narrow bandwidths or high multi-carrier / multi-beam, PDCCH CORESET PRB ratio scales up
  const bwFactor = bwMHz <= 1.4 ? 12.0 : bwMHz <= 3 ? 7.5 : bwMHz <= 5 ? 4.5 : bwMHz <= 10 ? 2.5 : bwMHz <= 20 ? 1.0 : bwMHz <= 50 ? 0.0 : -0.8;
  // Multi-beam sweeping increases PDCCH search space monitoring occasions (TS 38.213 §10)
  const beamFactor = is4G ? 0.0 : (numBeams - 1) * 0.45;
  // Carrier aggregation cross-carrier & multi-carrier DCI scheduling overhead
  const caFactor = (caCarriers - 1) * 0.85;
  // CSI-RS triggering occasions on PDCCH
  const csiFactor = is4G ? 0.0 : (csiReports - 1) * 0.40;
  // DMRS additional symbols per slot
  const dmrsFactor = is4G ? 0.0 : (dmrsSymbols - 1) * 0.50;
  // Residual BLER retransmission scheduling DCI demands
  const blerPdcchFactor = Math.max(0, ((inputs.residualBlerTargetPercent ?? 10) - 10) * 0.12);

  const rawPdcch = 4.8 + bwFactor + beamFactor + caFactor + csiFactor + dmrsFactor + blerPdcchFactor;
  // Uncapped: only bounded by physical baseline (> 1.8%)
  const avgPdcchOverheadPercent = Number(Math.max(1.8, rawPdcch).toFixed(2));

  // 2. Average PUCCH Overhead (%) - 3GPP TS 38.211 / TS 38.213 / TS 38.214 & TS 36.211 / TS 36.213
  // Narrow bandwidth uplink PUCCH reservation occupies significant fraction of PRBs
  const bwPucchFactor = bwMHz <= 1.4 ? 18.0 : bwMHz <= 3 ? 12.0 : bwMHz <= 5 ? 7.5 : bwMHz <= 10 ? 4.0 : bwMHz <= 20 ? 1.5 : 0.0;
  
  // Periodic & semi-persistent CSI reporting load on PUCCH
  const csiReportsPercent = is4G ? 1.4 : csiReports * 1.35;
  const csiPeriodicityPercent = is4G ? 0.9 : (80 / csiPeriodicity) * 0.85;
  
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
    : 3.5 + bwPucchFactor + csiReportsPercent + csiPeriodicityPercent + caPucchFactor + tddPucchFactor + blerPucchFactor;
  // Uncapped: only bounded by physical baseline (> 2.5%)
  const avgPucchOverheadPercent = Number(Math.max(2.5, rawPucch).toFixed(2));

  return {
    avgPdcchOverheadPercent,
    avgPucchOverheadPercent,
    pdcchBreakdown: {
      basePercent: 4.8,
      bwFactorPercent: bwFactor,
      beamFactorPercent: beamFactor,
      caFactorPercent: caFactor,
      csiFactorPercent: csiFactor,
      dmrsFactorPercent: dmrsFactor
    },
    pucchBreakdown: {
      basePercent: 3.5,
      csiReportsPercent,
      csiPeriodicityPercent,
      caFactorPercent: caPucchFactor,
      tddFactorPercent: tddPucchFactor,
      bwFactorPercent: bwPucchFactor
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

  // 3. PRB Configuration (3GPP TS 38.101 & TS 36.104)
  const scsKhz = isMmWave ? 120 : (is5G ? 30 : 15);
  let nPrbTotal = 100;
  if (!is5G) {
    // 4G LTE PRB Table
    switch (inputs.bandwidthMHz) {
      case 1.4: nPrbTotal = 6; break;
      case 3: nPrbTotal = 15; break;
      case 5: nPrbTotal = 25; break;
      case 10: nPrbTotal = 50; break;
      case 15: nPrbTotal = 75; break;
      case 20: default: nPrbTotal = 100; break;
    }
  } else {
    // 5G NR PRBs (30 kHz SCS default for Sub-6, 120 kHz for mmWave)
    if (scsKhz === 30) {
      switch (inputs.bandwidthMHz) {
        case 5: nPrbTotal = 11; break;
        case 10: nPrbTotal = 24; break;
        case 15: nPrbTotal = 38; break;
        case 20: nPrbTotal = 51; break;
        case 25: nPrbTotal = 65; break;
        case 30: nPrbTotal = 78; break;
        case 40: nPrbTotal = 106; break;
        case 50: nPrbTotal = 133; break;
        case 60: nPrbTotal = 162; break;
        case 70: nPrbTotal = 189; break;
        case 80: nPrbTotal = 217; break;
        case 90: nPrbTotal = 245; break;
        case 100: default: nPrbTotal = 273; break;
      }
    } else if (scsKhz === 120) {
      switch (inputs.bandwidthMHz) {
        case 50: nPrbTotal = 32; break;
        case 100: nPrbTotal = 66; break;
        case 200: nPrbTotal = 132; break;
        case 400: default: nPrbTotal = 264; break;
      }
    } else {
      nPrbTotal = Math.floor((inputs.bandwidthMHz * 1000) / (12 * scsKhz) * 0.9);
    }
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

  const totalDlMarginsDb = Number((shadowFadingMarginDb + inputs.interferenceMarginDb + dlFadingMarginDb).toFixed(1));
  const totalUlMarginsDb = Number((shadowFadingMarginDb + inputs.iotMarginDb + ulFadingMarginDb).toFixed(1));

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

  // 11. Throughput Calculation Function (3GPP TS 38.306)
  // Data Rate (Mbps) = 10^-6 * sum_j(v * Qm * f * Rmax * (12*N_prb / Ts) * (1 - OH))
  const maxDlMod = inputs.maxDlModulation || '256QAM';

  const calculate3GPPThroughput = (
    bwMHz: number,
    sinrDb: number,
    layers: number,
    dutyCycle: number,
    isUplink: boolean
  ) => {
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
      // Handset uplink max 64QAM, rank bounded by effectiveUlLayers
      qm = Math.min(qm, 6);
      rank = Math.min(layers, effectiveUlLayers);
    }

    // Physical overhead breakdown according to 3GPP TS 38.211 / TS 38.214:
    // DMRS symbols per 14-symbol slot: (dmrsSymbolsPerSlot / 14)
    // SSB burst overhead: depends on number of beams (L_max) and SSB periodicity (T_ssb in ms)
    // CSI-RS, PDCCH / PUCCH, guard bands, SRS overhead
    const dmrsSymbols = inputs.dmrsSymbolsPerSlot ?? 1;
    const dmrsOh = dmrsSymbols / 14; // e.g. 1/14 ~ 7.1%, 2/14 ~ 14.3%, 3/14 ~ 21.4%
    
    // SSB overhead calculation:
    // N_beams SSBs transmitted every ssbPeriodicityMs
    const ssbPeriodicity = inputs.ssbPeriodicityMs ?? 20;
    const numBeamsOh = inputs.numberOfBeams ?? 1;
    // Each SSB occupies 4 symbols across 20 RBs (240 subcarriers)
    const slotsPerMs = scsKhz / 15;
    const totalSlotsInBurst = ssbPeriodicity * slotsPerMs;
    const ssbSymbolRatio = (numBeamsOh * 4) / (totalSlotsInBurst * 14);
    const ssbOh = isUplink ? 0 : Math.min(0.06, ssbSymbolRatio);

    // Calculated Control channel overhead: PDCCH for DL, PUCCH for UL
    // Dynamic function of 3GPP parameters that directly reduces PDSCH and PUSCH traffic share
    const ctrlOh = isUplink
      ? (controlOverheads.avgPucchOverheadPercent / 100)
      : (controlOverheads.avgPdcchOverheadPercent / 100);
    const totalOverhead = Math.min(0.75, dmrsOh + ssbOh + ctrlOh);

    const prbs = Math.floor((bwMHz * 1000) / (12 * scsKhz) * 0.92);
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

  // SS-SINR (dB)
  const sinrNear = 25.0;
  const sinrMed = 13.5;
  const sinrBad = 2.5;
  const sinrEdge = is5G ? -4.5 : -5.0;

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
  const ulThrNear = calculate3GPPThroughput(inputs.bandwidthMHz, sinrNear, effectiveUlLayers, ulDutyCycle, true);

  const dlThrMed = calculate3GPPThroughput(inputs.bandwidthMHz, sinrMed, Math.min(effectiveDlLayers, 2), dlDutyCycle, false);
  const ulThrMed = calculate3GPPThroughput(inputs.bandwidthMHz, sinrMed, Math.min(effectiveUlLayers, 2), ulDutyCycle, true);

  const dlThrBad = calculate3GPPThroughput(inputs.bandwidthMHz, sinrBad, 1, dlDutyCycle, false);
  const ulThrBad = calculate3GPPThroughput(inputs.bandwidthMHz, sinrBad, 1, ulDutyCycle, true);

  const dlThrEdge = calculate3GPPThroughput(inputs.bandwidthMHz, sinrEdge, 1, dlDutyCycle, false);
  const ulThrEdge = calculate3GPPThroughput(inputs.bandwidthMHz, sinrEdge, 1, ulDutyCycle, true);

  // If CA enabled, compute aggregated multipliers for near/medium points
  let caDlFactor = 1.0;
  let caUlFactor = 1.0;
  let totalAggBwMHz = inputs.bandwidthMHz;
  if (inputs.caEnabled && inputs.carriers.length > 0) {
    totalAggBwMHz = inputs.carriers.reduce((sum, c) => sum + c.bandwidthMHz, 0);
    caDlFactor = totalAggBwMHz / inputs.bandwidthMHz;
    caUlFactor = 1.0 + (inputs.carriers.length > 1 ? 0.35 : 0); // UL CA usually 2CC max
  }

  // Modulation Strings & BLER
  const dlMcsNearStr = maxDlMod === '256QAM' ? 'MCS 27 (256QAM R=0.925)' : 'MCS 20 (64QAM R=0.852)';
  const dlMcsMedStr = 'MCS 17 (64QAM R=0.754)';
  const dlMcsBadStr = 'MCS 9 (16QAM R=0.553)';
  const dlMcsEdgeStr = 'MCS 2 (QPSK R=0.188)';

  const ulMcsNearStr = effectiveUlLayers > 1
    ? `MCS 22 (${effectiveUlLayers}x64QAM Streams)`
    : 'MCS 22 (64QAM R=0.852)';
  const ulMcsMedStr = effectiveUlLayers > 1
    ? `MCS 14 (${effectiveUlLayers}x16QAM Streams)`
    : 'MCS 14 (16QAM R=0.643)';
  const ulMcsBadStr = 'MCS 7 (16QAM/QPSK)';
  const ulMcsEdgeStr = 'MCS 1 (QPSK R=0.152)';

  const targetBler = inputs.residualBlerTargetPercent ?? 10.0;
  const blerNear = Number((targetBler * 0.08).toFixed(1));
  const blerMed = Number((targetBler * 0.45).toFixed(1));
  const blerBad = Number((targetBler * 1.42).toFixed(1));
  const blerEdge = Number(targetBler.toFixed(1));

  const fourPoints: FourPointOutput[] = [
    {
      pointName: 'Near Cell',
      description: `LOS / Near Site (Peak radio condition, ${effectiveDlLayers}x${maxDlMod} DL, ${effectiveUlLayers}x UL)`,
      rangeKm: distNearKm,
      rangeMeters: Math.round(distNearKm * 1000),
      pathLossDb: plNear,
      ssRsrpDbm: rsrpNear,
      ssRssiDbm: rssiNear,
      ssSinrDb: sinrNear,
      avgDlMcs: dlMcsNearStr,
      avgUlMcs: ulMcsNearStr,
      avgDlBlerPercent: blerNear,
      dlThroughputMbps: Number((dlThrNear * (inputs.caEnabled ? caDlFactor : 1)).toFixed(1)),
      ulThroughputMbps: Number((ulThrNear * (inputs.caEnabled ? caUlFactor : 1)).toFixed(1)),
      latencyMs: serviceResolved.targetLatencyMs !== undefined ? Number((serviceResolved.targetLatencyMs * 0.4).toFixed(1)) : latNear,
      dlMcs: maxDlMod === '256QAM' ? '256QAM (CQI 15)' : '64QAM (CQI 10)',
      ulMcs: effectiveUlLayers > 1 ? `${effectiveUlLayers}x 64QAM (CQI 12)` : '64QAM (CQI 12)',
      mimoLayers: effectiveDlLayers
    },
    {
      pointName: 'Medium Cell range',
      description: 'Nominal Coverage Area (Typical user condition, 64QAM DL, 16QAM UL, Rank 2-4)',
      rangeKm: distMedKm,
      rangeMeters: Math.round(distMedKm * 1000),
      pathLossDb: plMed,
      ssRsrpDbm: rsrpMed,
      ssRssiDbm: rssiMed,
      ssSinrDb: sinrMed,
      avgDlMcs: dlMcsMedStr,
      avgUlMcs: ulMcsMedStr,
      avgDlBlerPercent: blerMed,
      dlThroughputMbps: Number((dlThrMed * (inputs.caEnabled ? caDlFactor : 1)).toFixed(1)),
      ulThroughputMbps: Number((ulThrMed * (inputs.caEnabled ? caUlFactor : 1)).toFixed(1)),
      latencyMs: serviceResolved.targetLatencyMs !== undefined ? Number((serviceResolved.targetLatencyMs * 0.7).toFixed(1)) : latMed,
      dlMcs: '64QAM (CQI 9)',
      ulMcs: '16QAM (CQI 7)',
      mimoLayers: Math.min(effectiveDlLayers, 2)
    },
    {
      pointName: 'Bad radio conditions',
      description: 'Degraded Channel (High inter-cell interference or deep clutter, 16QAM/QPSK)',
      rangeKm: distBadKm,
      rangeMeters: Math.round(distBadKm * 1000),
      pathLossDb: plBad,
      ssRsrpDbm: rsrpBad,
      ssRssiDbm: rssiBad,
      ssSinrDb: sinrBad,
      avgDlMcs: dlMcsBadStr,
      avgUlMcs: ulMcsBadStr,
      avgDlBlerPercent: blerBad,
      dlThroughputMbps: dlThrBad,
      ulThroughputMbps: ulThrBad,
      latencyMs: serviceResolved.targetLatencyMs !== undefined ? Number((serviceResolved.targetLatencyMs * 0.9).toFixed(1)) : latBad,
      dlMcs: '16QAM/QPSK (CQI 4)',
      ulMcs: 'QPSK (CQI 3)',
      mimoLayers: 1
    },
    {
      pointName: 'Cell edge',
      description: serviceResolved.description,
      rangeKm: distEdgeKm,
      rangeMeters: Math.round(distEdgeKm * 1000),
      pathLossDb: plEdge,
      ssRsrpDbm: rsrpEdge,
      ssRssiDbm: rssiEdge,
      ssSinrDb: dlTargetSinrCellEdgeDb,
      avgDlMcs: serviceResolved.serviceProfile === 'VONR_5G' || serviceResolved.serviceProfile === 'VOLTE_4G'
        ? 'QPSK (VoIP RoHC)'
        : (serviceResolved.serviceProfile === 'NBIOT_4G' ? 'QPSK / BPSK (NPDSCH)' : dlMcsEdgeStr),
      avgUlMcs: serviceResolved.serviceProfile === 'VONR_5G' || serviceResolved.serviceProfile === 'VOLTE_4G'
        ? 'QPSK (VoIP Packet)'
        : (serviceResolved.serviceProfile === 'NBIOT_4G' ? (inputs.nbiotScs === '15KHZ_MULTI' ? 'QPSK Multi-Tone' : 'BPSK/QPSK Single-Tone') : ulMcsEdgeStr),
      avgDlBlerPercent: serviceResolved.targetResidualBlerPercent,
      dlThroughputMbps: serviceResolved.targetDlThroughputMbps,
      ulThroughputMbps: serviceResolved.targetUlThroughputMbps,
      latencyMs: serviceResolved.targetLatencyMs !== undefined ? serviceResolved.targetLatencyMs : latEdge,
      dlMcs: serviceResolved.serviceProfile === 'VONR_5G' || serviceResolved.serviceProfile === 'VOLTE_4G' ? 'QPSK (VoIP RoHC)' : 'QPSK R=0.15 (CQI 1)',
      ulMcs: serviceResolved.serviceProfile === 'VONR_5G' || serviceResolved.serviceProfile === 'VOLTE_4G' ? 'QPSK (VoIP)' : 'QPSK R=0.15 (CQI 1)',
      mimoLayers: 1
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
      dlValue: `${inputs.interferenceMarginDb.toFixed(1)}`,
      ulValue: `${inputs.iotMarginDb.toFixed(1)} (IoT)`,
      unit: 'dB',
      category: 'MARGINS',
      description: 'Downlink inter-cell interference vs Uplink Interference over Thermal'
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
    cascadeTable,
    caSummary: {
      totalBandwidthMHz: totalAggBwMHz,
      peakDlThroughputMbps: fourPoints[0].dlThroughputMbps,
      peakUlThroughputMbps: fourPoints[0].ulThroughputMbps,
      carrierCount: inputs.caEnabled ? Math.max(1, inputs.carriers.length) : 1
    },
    avgPdcchOverheadPercent: controlOverheads.avgPdcchOverheadPercent,
    avgPucchOverheadPercent: controlOverheads.avgPucchOverheadPercent,
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
    }
  };
}
