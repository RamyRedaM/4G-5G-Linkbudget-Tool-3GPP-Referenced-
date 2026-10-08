import {
  LinkBudgetInputs,
  LinkBudgetCalculationResult,
  FourPointOutput,
  LinkBudgetCascadeItem
} from '../types/telecom';
import { TELECOM_BANDS, MIMO_CONFIGS, TDD_FRAME_PATTERNS } from '../data/telecomBands';
import {
  calculatePathLoss,
  calculateDistanceForPathLoss,
  calculateShadowFadingMargin
} from './spmPropagation';

/**
 * 3GPP Compliant 4G/5G Link Budget and Throughput Engine
 * Ref: 3GPP TS 38.101, TS 38.104, TS 38.901, TS 38.306, TS 36.101
 */

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
    const tddPattern = TDD_FRAME_PATTERNS.find(p => p.id === inputs.tddFrameRatio) || TDD_FRAME_PATTERNS[0];
    dlDutyCycle = tddPattern.dlRatio;
    ulDutyCycle = tddPattern.ulRatio;
  }

  // 2. MIMO & Beamforming Gains
  const mimoInfo = MIMO_CONFIGS[inputs.mimoMode] || MIMO_CONFIGS['2x2'];
  const dlBfGainDb = mimoInfo.dlBfGainDb;
  const ulRxGainDb = mimoInfo.ulRxGainDb;
  const dlLayers = mimoInfo.dlLayers;
  const ulLayers = mimoInfo.ulLayers;

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

  // 6. Uplink Transmitter EIRP (UE)
  // UE EIRP = UeTxPower + UeAntennaGain - BodyLoss
  const ueEirpDbm = Number((inputs.ueTxPowerDbm + inputs.ueAntennaGainDbi - inputs.bodyLossDb).toFixed(1));

  // 7. Receiver Noise & Sensitivities
  const kTB_density = -174; // dBm/Hz thermal noise density at 290K
  
  // Downlink UE Receiver Sensitivity:
  // Channel bandwidth thermal noise in dBm
  const dlChannelBwHz = inputs.bandwidthMHz * 1e6;
  const ueThermalNoiseDbm = kTB_density + 10 * Math.log10(dlChannelBwHz) + inputs.ueNoiseFigureDb;
  const dlTargetSinrCellEdgeDb = is5G ? -4.5 : -5.0; // QPSK min decodable
  const ueRxSensitivityDbm = Number((ueThermalNoiseDbm + dlTargetSinrCellEdgeDb - inputs.ueAntennaGainDbi + inputs.bodyLossDb).toFixed(1));

  // Uplink BS Receiver Sensitivity:
  // Cell edge UL is scheduled over 1 to 4 PRBs (180 kHz for 15k SCS or 360 kHz for 30k SCS)
  const ulAllocPrbs = 2; // conservative cell-edge uplink allocation
  const ulAllocBwHz = ulAllocPrbs * 12 * scsKhz * 1000;
  const bsThermalNoiseUlDbm = kTB_density + 10 * Math.log10(ulAllocBwHz) + inputs.bsNoiseFigureDb;
  const ulTargetSinrCellEdgeDb = is5G ? -4.0 : -4.5;
  const bsRxSensitivityDbm = Number((
    bsThermalNoiseUlDbm +
    inputs.iotMarginDb +
    ulTargetSinrCellEdgeDb -
    inputs.bsAntennaGainDbi +
    inputs.bsFeederCableLossDb -
    ulRxGainDb
  ).toFixed(1));

  // 8. Margins
  // Shadow Fading Margin based on log-normal fading standard deviation (sigma) and coverage probability
  // M_SF = z * sigma_SF
  const shadowFadingMarginDb = calculateShadowFadingMargin(
    inputs.shadowFadingStdDevDb,
    inputs.coverageProbability
  );
  const totalDlMarginsDb = Number((shadowFadingMarginDb + inputs.interferenceMarginDb).toFixed(1));
  const totalUlMarginsDb = Number((shadowFadingMarginDb + inputs.interferenceMarginDb).toFixed(1));

  // 9. MAPL Calculation (Maximum Allowable Path Loss)
  // DL MAPL = BS_EIRP - UE_Sensitivity - TotalDlMargins
  const dlMaplDb = Number((bsEirpDbm - ueRxSensitivityDbm - totalDlMarginsDb).toFixed(1));
  
  // UL MAPL = UE_EIRP - BS_Sensitivity - TotalUlMargins
  const ulMaplDb = Number((ueEirpDbm - bsRxSensitivityDbm - totalUlMarginsDb).toFixed(1));

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
      // Handset uplink max 64QAM, max 1-2 layers
      qm = Math.min(qm, 6);
      rank = Math.min(rank, ulLayers);
    }

    const prbs = Math.floor((bwMHz * 1000) / (12 * scsKhz) * 0.92);
    const symbolsPerSec = 14 * (scsKhz / 15) * 1000;
    const overhead = isUplink ? 0.08 : 0.14;
    const rawRateMbps = (rank * qm * dutyCycle * codeRate * (12 * prbs) * symbolsPerSec * (1 - overhead)) / 1e6;

    // Apply baseline realistic implementation margin (BLER, signaling, control channels)
    return Math.max(0.2, Number(rawRateMbps.toFixed(1)));
  };

  // 12. Calculate 4 Points as requested by User
  // Point 1: Near Cell (~15% of max distance)
  // Point 2: Medium Cell Range (~50% of max distance)
  // Point 3: Bad Radio Conditions (~82% of max distance + interference shadow)
  // Point 4: Cell Edge (100% of max distance, at System MAPL)

  const distNearKm = Math.max(0.04, Number((maxCellRangeKm * 0.15).toFixed(3)));
  const distMedKm = Math.max(0.12, Number((maxCellRangeKm * 0.50).toFixed(3)));
  const distBadKm = Math.max(0.18, Number((maxCellRangeKm * 0.82).toFixed(3)));
  const distEdgeKm = maxCellRangeKm;

  // Path loss at points
  const plNear = Number(calculatePathLoss(distNearKm, propParams).toFixed(1));
  const plMed = Number(calculatePathLoss(distMedKm, propParams).toFixed(1));
  const plBad = Number((calculatePathLoss(distBadKm, propParams) + 5.0).toFixed(1)); // +5 dB deep shadow / interference
  const plEdge = systemMaplDb;

  // SS-RSRP = Reference Signal EIRP - PathLoss (dBm)
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
  const rssiBad = Number((rsrpBad + scLogOffset + 3.8).toFixed(1)); // elevated noise/interference
  const rssiEdge = Number((rsrpEdge + scLogOffset + 1.5).toFixed(1));

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
  const dlThrNear = calculate3GPPThroughput(inputs.bandwidthMHz, sinrNear, dlLayers, dlDutyCycle, false);
  const ulThrNear = calculate3GPPThroughput(inputs.bandwidthMHz, sinrNear, ulLayers, ulDutyCycle, true);

  const dlThrMed = calculate3GPPThroughput(inputs.bandwidthMHz, sinrMed, dlLayers, dlDutyCycle, false);
  const ulThrMed = calculate3GPPThroughput(inputs.bandwidthMHz, sinrMed, ulLayers, ulDutyCycle, true);

  const dlThrBad = calculate3GPPThroughput(inputs.bandwidthMHz, sinrBad, dlLayers, dlDutyCycle, false);
  const ulThrBad = calculate3GPPThroughput(inputs.bandwidthMHz, sinrBad, ulLayers, ulDutyCycle, true);

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

  const ulMcsNearStr = 'MCS 22 (64QAM R=0.852)';
  const ulMcsMedStr = 'MCS 14 (16QAM R=0.643)';
  const ulMcsBadStr = 'MCS 7 (16QAM/QPSK)';
  const ulMcsEdgeStr = 'MCS 1 (QPSK R=0.152)';

  const fourPoints: FourPointOutput[] = [
    {
      pointName: 'Near Cell',
      description: `LOS / Near Site (Peak radio condition, highest MCS ${maxDlMod}, max MIMO rank)`,
      rangeKm: distNearKm,
      rangeMeters: Math.round(distNearKm * 1000),
      pathLossDb: plNear,
      ssRsrpDbm: rsrpNear,
      ssRssiDbm: rssiNear,
      ssSinrDb: sinrNear,
      avgDlMcs: dlMcsNearStr,
      avgUlMcs: ulMcsNearStr,
      avgDlBlerPercent: 0.8,
      dlThroughputMbps: Number((dlThrNear * (inputs.caEnabled ? caDlFactor : 1)).toFixed(1)),
      ulThroughputMbps: Number((ulThrNear * (inputs.caEnabled ? caUlFactor : 1)).toFixed(1)),
      latencyMs: latNear,
      dlMcs: maxDlMod === '256QAM' ? '256QAM (CQI 15)' : '64QAM (CQI 10)',
      ulMcs: '64QAM (CQI 12)',
      mimoLayers: dlLayers
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
      avgDlBlerPercent: 4.5,
      dlThroughputMbps: Number((dlThrMed * (inputs.caEnabled ? caDlFactor : 1)).toFixed(1)),
      ulThroughputMbps: Number((ulThrMed * (inputs.caEnabled ? caUlFactor : 1)).toFixed(1)),
      latencyMs: latMed,
      dlMcs: '64QAM (CQI 9)',
      ulMcs: '16QAM (CQI 7)',
      mimoLayers: Math.min(dlLayers, 2)
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
      avgDlBlerPercent: 14.2,
      dlThroughputMbps: dlThrBad,
      ulThroughputMbps: ulThrBad,
      latencyMs: latBad,
      dlMcs: '16QAM/QPSK (CQI 4)',
      ulMcs: 'QPSK (CQI 3)',
      mimoLayers: 1
    },
    {
      pointName: 'Cell edge',
      description: 'Sensitivity Boundary (MAPL threshold, lowest MCS QPSK, 1-layer, max HARQ retransmissions)',
      rangeKm: distEdgeKm,
      rangeMeters: Math.round(distEdgeKm * 1000),
      pathLossDb: plEdge,
      ssRsrpDbm: rsrpEdge,
      ssRssiDbm: rssiEdge,
      ssSinrDb: sinrEdge,
      avgDlMcs: dlMcsEdgeStr,
      avgUlMcs: ulMcsEdgeStr,
      avgDlBlerPercent: 10.0, // Standard 3GPP Outer-Loop Link Adaptation Target BLER
      dlThroughputMbps: dlThrEdge,
      ulThroughputMbps: ulThrEdge,
      latencyMs: latEdge,
      dlMcs: 'QPSK R=0.15 (CQI 1)',
      ulMcs: 'QPSK R=0.15 (CQI 1)',
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
      dlValue: `${inputs.ueNoiseFigureDb.toFixed(1)}`,
      ulValue: `${inputs.bsNoiseFigureDb.toFixed(1)}`,
      unit: 'dB',
      category: 'RX',
      description: 'LNA amplifier noise addition'
    },
    {
      name: 'Thermal Noise Floor (kTB + NF)',
      dlValue: `${ueThermalNoiseDbm.toFixed(1)} (Full BW)`,
      ulValue: `${bsThermalNoiseUlDbm.toFixed(1)} (${ulAllocPrbs} PRBs)`,
      unit: 'dBm',
      category: 'RX',
      description: 'Effective thermal noise power integrated over channel'
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
      name: 'Log-Normal Shadow Fading Margin',
      dlValue: `${shadowFadingMarginDb.toFixed(1)} (P=${inputs.coverageProbability}%)`,
      ulValue: `${shadowFadingMarginDb.toFixed(1)} (P=${inputs.coverageProbability}%)`,
      unit: 'dB',
      category: 'MARGINS',
      description: 'Statistical fading margin for target edge probability'
    },
    {
      name: 'Required SINR for Minimum MCS',
      dlValue: `${dlTargetSinrCellEdgeDb.toFixed(1)}`,
      ulValue: `${ulTargetSinrCellEdgeDb.toFixed(1)}`,
      unit: 'dB',
      category: 'RX',
      description: 'Signal-to-Interference-plus-Noise ratio threshold for QPSK 0.15'
    },
    {
      name: 'Receiver Sensitivity',
      dlValue: `${ueRxSensitivityDbm.toFixed(1)}`,
      ulValue: `${bsRxSensitivityDbm.toFixed(1)}`,
      unit: 'dBm',
      category: 'RX',
      description: 'Minimum required power at receiver antenna connector'
    },
    {
      name: 'Total Planning Margins',
      dlValue: `${totalDlMarginsDb.toFixed(1)}`,
      ulValue: `${totalUlMarginsDb.toFixed(1)}`,
      unit: 'dB',
      category: 'MARGINS',
      description: 'Combined shadow fading + interference allowances'
    },
    {
      name: 'Maximum Allowable Path Loss (MAPL)',
      dlValue: `${dlMaplDb.toFixed(1)}`,
      ulValue: `${ulMaplDb.toFixed(1)}`,
      unit: 'dB',
      category: 'RESULT',
      description: 'Link budget budget headroom before link drop'
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
    bsEirpDbm,
    ueEirpDbm,
    ueRxSensitivityDbm,
    bsRxSensitivityDbm,
    shadowFadingMarginDb,
    totalDlMarginsDb,
    totalUlMarginsDb,
    fourPoints,
    cascadeTable,
    caSummary: {
      totalBandwidthMHz: totalAggBwMHz,
      peakDlThroughputMbps: fourPoints[0].dlThroughputMbps,
      peakUlThroughputMbps: fourPoints[0].ulThroughputMbps,
      carrierCount: inputs.caEnabled ? Math.max(1, inputs.carriers.length) : 1
    }
  };
}
