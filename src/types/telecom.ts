/**
 * Telecom Engineering Types & Interfaces for 4G/5G Link Budget
 * Compliant with 3GPP TS 36.101, TS 38.101, TS 38.901, TS 38.306
 */

export type TechnologyType = '4G' | '5G_SA' | '5G_NSA';
export type DuplexMode = 'FDD' | 'TDD';
export type MimoMode = 'SISO' | '2x2' | '4x4' | '8x8' | '16TR' | '32TR' | '64TR';
export type UeType = 'HANDSET_STD' | 'HANDSET_HPUE' | 'INDOOR_CPE' | 'OUTDOOR_CPE';
export type EnvironmentClutter = 'DENSE_URBAN' | 'URBAN' | 'SUBURBAN' | 'RURAL';
export type IndoorOutdoorScenario = 'OUTDOOR_LOS' | 'OUTDOOR_NLOS' | 'IN_VEHICLE' | 'INDOOR_STANDARD' | 'INDOOR_DEEP';
export type PropagationModelType = 'SPM' | '3GPP_UMA' | '3GPP_UMI' | '3GPP_RMA' | 'COST231_HATA' | 'FSPL';

export interface BandInfo {
  band: string;
  name: string;
  duplex: DuplexMode;
  tech: '4G' | '5G' | 'BOTH';
  dlFreqMHz: number; // Center frequency for DL
  ulFreqMHz: number; // Center frequency for UL
  bandwidthsMHz: number[];
  commonName: string;
  isMmWave?: boolean;
}

export interface CarrierConfig {
  id: string;
  band: string;
  bandwidthMHz: number;
  freqMHz: number;
  mimo: MimoMode;
  txPowerDbm: number;
  isPrimary: boolean;
}

export interface LinkBudgetInputs {
  technology: TechnologyType;
  duplexMode: DuplexMode;
  tddFrameRatio: string; // e.g. 'DDDSU' (4:1) or 'DSUUU' (1:3) or 'DDSUU' (3:2)
  band: string;
  bandwidthMHz: number;
  
  // Carrier Aggregation
  caEnabled: boolean;
  caCarriersCount: number;
  carriers: CarrierConfig[];

  // Modulation Capabilities
  maxDlModulation: '256QAM' | '64QAM';
  
  // Base Station (eNodeB / gNodeB)
  bsTxPowerDbm: number; // Total or per-port Tx Power (e.g. 46 dBm = 40W, 49 dBm = 80W)
  bsAntennaGainDbi: number; // e.g. 18 dBi
  bsFeederCableLossDb: number; // e.g. 1.5 dB
  mimoMode: MimoMode;
  bsHeightMeters: number; // e.g. 30m
  bsNoiseFigureDb: number; // e.g. 2.5 dB
  rsPowerAuto: boolean;
  rsPowerDbmOverride?: number;
  rsPowerBoostDb: number; // e.g. 0 to 3 dB

  // User Equipment / CPE
  ueType: UeType;
  ueTxPowerDbm: number; // 23 dBm for Handset, 26 dBm for HPUE, 27-30 dBm for CPE
  ueAntennaGainDbi: number; // 0 dBi for phone, 6-9 dBi for CPE
  ueHeightMeters: number; // 1.5m for phone, 5-10m for CPE
  ueNoiseFigureDb: number; // 7-9 dB for phone, 5-6 dB for CPE
  bodyLossDb: number; // 3 dB for phone, 0 dB for CPE

  // Propagation & Environment (SPM)
  propagationModel: PropagationModelType;
  environmentClutter: EnvironmentClutter;
  indoorOutdoorScenario: IndoorOutdoorScenario;
  spmK1?: number; // SPM Intercept (empirical)
  spmK2?: number; // SPM Slope (empirical)
  spmClutterLossDb?: number;
  
  // Margins
  coverageProbability: number; // e.g. 90%, 95%
  shadowFadingStdDevDb: number; // Log-normal fading std dev (e.g. 6 to 10 dB)
  interferenceMarginDb: number; // e.g. 2 to 4 dB
  iotMarginDb: number; // Interference over Thermal in UL (e.g. 3 dB)
  foliageLossDb: number;
  additionalPenetrationLossDb: number;
}

export interface LinkBudgetCascadeItem {
  name: string;
  dlValue: number | string;
  ulValue: number | string;
  unit: string;
  category: 'TX' | 'ANTENNA' | 'PROPAGATION' | 'MARGINS' | 'RX' | 'RESULT';
  description?: string;
}

export interface FourPointOutput {
  pointName: 'Near Cell' | 'Medium Cell range' | 'Bad radio conditions' | 'Cell edge';
  description: string;
  rangeKm: number;
  rangeMeters: number;
  pathLossDb: number;
  ssRsrpDbm: number;
  ssRssiDbm: number; // Received Signal Strength Indicator (in dBm)
  ssSinrDb: number;
  avgDlMcs: string; // Average DL Modulation and Coding Scheme (e.g. MCS 27 [256QAM])
  avgUlMcs: string; // Average UL Modulation and Coding Scheme (e.g. MCS 19 [64QAM])
  avgDlBlerPercent: number; // Average DL Block Error Rate percentage
  dlThroughputMbps: number;
  ulThroughputMbps: number;
  latencyMs: number;
  dlMcs: string;
  ulMcs: string;
  mimoLayers: number;
}

export interface LinkBudgetCalculationResult {
  dlMaplDb: number;
  ulMaplDb: number;
  systemMaplDb: number;
  bottleneck: 'DL_LIMITED' | 'UL_LIMITED' | 'BALANCED';
  bottleneckDeltaDb: number;
  maxCellRangeKm: number;
  maxCellRangeMeters: number;
  
  // Base Station Derived RF
  rsPowerDbm: number;
  bsEirpDbm: number;
  ueEirpDbm: number;
  
  // Receiver Sensitivities
  ueRxSensitivityDbm: number;
  bsRxSensitivityDbm: number;
  
  // Aggregated Margins
  shadowFadingMarginDb: number;
  totalDlMarginsDb: number;
  totalUlMarginsDb: number;
  
  // 4 Target Points Table
  fourPoints: FourPointOutput[];
  
  // Detailed Cascade Waterfall
  cascadeTable: LinkBudgetCascadeItem[];
  
  // Carrier Aggregation Summary
  caSummary: {
    totalBandwidthMHz: number;
    peakDlThroughputMbps: number;
    peakUlThroughputMbps: number;
    carrierCount: number;
  };
}
