import { LinkBudgetInputs } from '../types/telecom';

export interface TelecomPreset {
  id: string;
  name: string;
  techBadge: string;
  description: string;
  inputs: LinkBudgetInputs;
}

export const TELECOM_PRESETS: TelecomPreset[] = [
  {
    id: '5g_n78_64tr_urban',
    name: '5G NR n78 (3.5 GHz) 100MHz 64TR Massive MIMO',
    techBadge: '5G TDD Urban',
    description: 'Flagship mid-band C-Band deployment with 64T64R AAU, 200W total Tx power, DDDSU frame pattern.',
    inputs: {
      technology: '5G_SA',
      duplexMode: 'TDD',
      tddFrameRatio: 'DDDSU',
      band: 'n78',
      bandwidthMHz: 100,
      caEnabled: false,
      caCarriersCount: 1,
      carriers: [
        { id: 'cc1', band: 'n78', bandwidthMHz: 100, freqMHz: 3500, mimo: '64TR', txPowerDbm: 53, isPrimary: true }
      ],
      maxDlModulation: '256QAM',
      bsTxPowerDbm: 53.0, // 200W
      bsAntennaGainDbi: 24.5,
      bsFeederCableLossDb: 0.5,
      mimoMode: '64TR',
      bsHeightMeters: 30,
      bsNoiseFigureDb: 2.5,
      rsPowerAuto: true,
      rsPowerBoostDb: 0.0,
      ueType: 'HANDSET_STD',
      ueTxPowerDbm: 23.0,
      ueAntennaGainDbi: 0.0,
      ueHeightMeters: 1.5,
      ueNoiseFigureDb: 8.0,
      bodyLossDb: 3.0,
      propagationModel: 'SPM',
      environmentClutter: 'URBAN',
      indoorOutdoorScenario: 'OUTDOOR_LOS',
      coverageProbability: 95,
      shadowFadingStdDevDb: 8.0,
      interferenceMarginDb: 3.0,
      iotMarginDb: 3.0,
      foliageLossDb: 0.0,
      additionalPenetrationLossDb: 0.0
    }
  },
  {
    id: '5g_n28_coverage_rural',
    name: '5G NR n28 (700 MHz) 20MHz FDD Low-Band Coverage',
    techBadge: '5G FDD Rural',
    description: 'Wide-area umbrella coverage layer using 700 MHz APT, 80W 4T4R RRU, rural propagation.',
    inputs: {
      technology: '5G_SA',
      duplexMode: 'FDD',
      tddFrameRatio: 'DDDSU',
      band: 'n28',
      bandwidthMHz: 20,
      caEnabled: false,
      caCarriersCount: 1,
      carriers: [
        { id: 'cc1', band: 'n28', bandwidthMHz: 20, freqMHz: 780.5, mimo: '4x4', txPowerDbm: 49, isPrimary: true }
      ],
      maxDlModulation: '256QAM',
      bsTxPowerDbm: 49.0, // 80W
      bsAntennaGainDbi: 16.5,
      bsFeederCableLossDb: 1.5,
      mimoMode: '4x4',
      bsHeightMeters: 45,
      bsNoiseFigureDb: 2.2,
      rsPowerAuto: true,
      rsPowerBoostDb: 0.0,
      ueType: 'HANDSET_STD',
      ueTxPowerDbm: 23.0,
      ueAntennaGainDbi: 0.0,
      ueHeightMeters: 1.5,
      ueNoiseFigureDb: 7.5,
      bodyLossDb: 3.0,
      propagationModel: '3GPP_RMA',
      environmentClutter: 'RURAL',
      indoorOutdoorScenario: 'OUTDOOR_LOS',
      coverageProbability: 90,
      shadowFadingStdDevDb: 6.0,
      interferenceMarginDb: 2.0,
      iotMarginDb: 2.5,
      foliageLossDb: 0.0,
      additionalPenetrationLossDb: 0.0
    }
  },
  {
    id: '5g_ca_capacity_combo',
    name: '5G NR CA: n78 (100MHz) + n28 (20MHz) Dual-Carrier',
    techBadge: '5G CA High Capacity',
    description: 'Carrier Aggregation combining n78 (3.5 GHz) high-throughput capacity with n28 (700 MHz) coverage.',
    inputs: {
      technology: '5G_SA',
      duplexMode: 'TDD',
      tddFrameRatio: 'DDDSU',
      band: 'n78',
      bandwidthMHz: 100,
      caEnabled: true,
      caCarriersCount: 2,
      carriers: [
        { id: 'cc1', band: 'n78', bandwidthMHz: 100, freqMHz: 3500, mimo: '64TR', txPowerDbm: 53, isPrimary: true },
        { id: 'cc2', band: 'n28', bandwidthMHz: 20, freqMHz: 780.5, mimo: '4x4', txPowerDbm: 49, isPrimary: false }
      ],
      maxDlModulation: '256QAM',
      bsTxPowerDbm: 53.0,
      bsAntennaGainDbi: 24.5,
      bsFeederCableLossDb: 0.5,
      mimoMode: '64TR',
      bsHeightMeters: 30,
      bsNoiseFigureDb: 2.5,
      rsPowerAuto: true,
      rsPowerBoostDb: 0.0,
      ueType: 'HANDSET_HPUE',
      ueTxPowerDbm: 26.0, // HPUE Class 2
      ueAntennaGainDbi: 0.0,
      ueHeightMeters: 1.5,
      ueNoiseFigureDb: 8.0,
      bodyLossDb: 3.0,
      propagationModel: 'SPM',
      environmentClutter: 'URBAN',
      indoorOutdoorScenario: 'OUTDOOR_LOS',
      coverageProbability: 95,
      shadowFadingStdDevDb: 8.0,
      interferenceMarginDb: 3.0,
      iotMarginDb: 3.0,
      foliageLossDb: 0.0,
      additionalPenetrationLossDb: 0.0
    }
  },
  {
    id: '4g_b3_20mhz_4x4',
    name: '4G LTE B3 (1800 MHz) 20MHz 4x4 MIMO Urban',
    techBadge: '4G FDD Urban',
    description: 'Standard 4G LTE capacity site on 1800 DCS with 4x4 MIMO, 80W total Tx power.',
    inputs: {
      technology: '4G',
      duplexMode: 'FDD',
      tddFrameRatio: 'LTE_CFG2',
      band: 'B3',
      bandwidthMHz: 20,
      caEnabled: false,
      caCarriersCount: 1,
      carriers: [
        { id: 'cc1', band: 'B3', bandwidthMHz: 20, freqMHz: 1842.5, mimo: '4x4', txPowerDbm: 49, isPrimary: true }
      ],
      maxDlModulation: '256QAM',
      bsTxPowerDbm: 49.0, // 80W
      bsAntennaGainDbi: 18.0,
      bsFeederCableLossDb: 1.5,
      mimoMode: '4x4',
      bsHeightMeters: 30,
      bsNoiseFigureDb: 2.5,
      rsPowerAuto: true,
      rsPowerBoostDb: 0.0,
      ueType: 'HANDSET_STD',
      ueTxPowerDbm: 23.0,
      ueAntennaGainDbi: 0.0,
      ueHeightMeters: 1.5,
      ueNoiseFigureDb: 8.0,
      bodyLossDb: 3.0,
      propagationModel: 'COST231_HATA',
      environmentClutter: 'URBAN',
      indoorOutdoorScenario: 'OUTDOOR_LOS',
      coverageProbability: 90,
      shadowFadingStdDevDb: 8.0,
      interferenceMarginDb: 3.0,
      iotMarginDb: 3.0,
      foliageLossDb: 0.0,
      additionalPenetrationLossDb: 0.0
    }
  },
  {
    id: '5g_fwa_mmwave_cpe',
    name: '5G mmWave n258 (26 GHz) 400MHz Fixed Wireless Access (FWA)',
    techBadge: '5G mmWave FWA',
    description: 'High-speed Fixed Wireless Access with High-Gain Outdoor Directional CPE (27 dBm Tx, 9 dBi Gain).',
    inputs: {
      technology: '5G_SA',
      duplexMode: 'TDD',
      tddFrameRatio: 'DDDSU',
      band: 'n258',
      bandwidthMHz: 400,
      caEnabled: false,
      caCarriersCount: 1,
      carriers: [
        { id: 'cc1', band: 'n258', bandwidthMHz: 400, freqMHz: 26000, mimo: '32TR', txPowerDbm: 46, isPrimary: true }
      ],
      maxDlModulation: '256QAM',
      bsTxPowerDbm: 46.0, // 40W
      bsAntennaGainDbi: 28.0,
      bsFeederCableLossDb: 0.5,
      mimoMode: '32TR',
      bsHeightMeters: 20,
      bsNoiseFigureDb: 4.5,
      rsPowerAuto: true,
      rsPowerBoostDb: 0.0,
      ueType: 'OUTDOOR_CPE',
      ueTxPowerDbm: 27.0, // CPE high power
      ueAntennaGainDbi: 9.0, // High-gain directional CPE
      ueHeightMeters: 6.0, // Rooftop mount
      ueNoiseFigureDb: 6.0,
      bodyLossDb: 0.0,
      propagationModel: '3GPP_UMI',
      environmentClutter: 'URBAN',
      indoorOutdoorScenario: 'OUTDOOR_LOS',
      coverageProbability: 95,
      shadowFadingStdDevDb: 6.0,
      interferenceMarginDb: 2.0,
      iotMarginDb: 2.0,
      foliageLossDb: 0.0,
      additionalPenetrationLossDb: 0.0
    }
  }
];
