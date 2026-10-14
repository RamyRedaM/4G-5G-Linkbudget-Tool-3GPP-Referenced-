/**
 * Telecom Engineering Types & Interfaces for 4G/5G Link Budget
 * Compliant with 3GPP TS 36.101, TS 38.101, TS 38.901, TS 38.306
 */

export type TechnologyType = '4G' | '5G_SA' | '5G_NSA';
export type DuplexMode = 'FDD' | 'TDD';
export type MimoMode = 'SISO' | '2x2' | '4x4' | '8x8' | '16TR' | '32TR' | '64TR';
export type UeType = 
  | 'HANDSET_STD' 
  | 'HANDSET_HPUE' 
  | 'INDOOR_CPE' 
  | 'OUTDOOR_CPE'
  | 'INDUSTRIAL_IOT'
  | 'VEHICULAR_CPE'
  | 'MMWAVE_CPE'
  | 'REDCAP_DEVICE';

export type UeMimoMode = '1T1R' | '1T2R' | '1T4R' | '2T2R' | '2T4R' | '4T4R' | '4T8R';

export type UeCategory = 
  | 'REL18_ADVANCED'  // 5G-Advanced Rel-18 Ultra Flagship (4x4 DL / 2Tx-4Tx UL / 1024QAM / AI Beamforming)
  | 'REL16_FLAGSHIP'  // 5G NR Rel-16/17 Flagship Smartphone (4x4 DL / 2Tx UL / 256QAM)
  | 'REL15_STANDARD'  // 5G NR Rel-15 Standard Smartphone (4x4 DL / 1Tx UL / 256QAM)
  | 'HPUE_CLASS2'     // 5G High-Power UE Power Class 2 (26 dBm / 2Tx UL MIMO)
  | 'FWA_CPE_PRO'     // 5G FWA High-Gain Outdoor Rooftop CPE (4T4R / 27-30 dBm / 9-12 dBi)
  | 'FWA_CPE_INDOOR'  // 5G FWA Indoor Desktop CPE (2T4R / 26 dBm / 4 dBi)
  | 'INDUSTRY_4_0'    // 5G Industrial Rugged Terminal / Private 5G URLLC (2T4R / 26 dBm / 5 dBi)
  | 'MMWAVE_PREMIUM'  // 5G mmWave High-Capacity Fixed Terminal (FR2 Power Class 1 / 4x4 / 18 dBi)
  | 'REDCAP_REL17'    // 5G RedCap Rel-17 Mid-Tier Device (1T2R / 20-23 dBm / 64QAM)
  | 'LTE_CAT18_GIGA'  // 4G LTE-A Pro Cat 18/20 Gigabit (4x4 DL / 2Tx UL / 256QAM)
  | 'LTE_CAT16_GIGA'  // 4G LTE-A Cat 16+ Gigabit LTE (4x4 DL / 2Tx UL)
  | 'LTE_CAT4_STD'    // 4G LTE Cat 4 Legacy (2x2 DL / 1Tx UL - 150/50 Mbps)
  | 'LTE_CATM1_IOT';  // Cellular IoT Cat-M1 / NB-IoT (1T1R / 23 dBm / 1.4 MHz)
export type EnvironmentClutter = 'DENSE_URBAN' | 'URBAN' | 'SUBURBAN' | 'RURAL';
export type IndoorOutdoorScenario = 'OUTDOOR_LOS' | 'OUTDOOR_NLOS' | 'IN_VEHICLE' | 'INDOOR_STANDARD' | 'TUNNEL_COVERAGE' | 'INDOOR_DEEP';
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

export type OverheadMode = '38306_DEFAULT' | 'DETAILED';
export type DmrsConfigType = 'TYPE_1' | 'TYPE_2';
export type CsiRsMultiplexingType = 'noCDM' | 'fd-CDM2' | 'cdm4-FD2-TD2' | 'cdm8-FD2-TD4';
export type CsiRsResourceType = 'PERIODIC' | 'SEMI_PERSISTENT' | 'APERIODIC';

// Interference Modeling (4G & 5G Link Budget - 3GPP TR 36.942 / TR 38.901 / ITU-R M.2412)
export type InterferenceScenarioType = 'NEIGHBORING_CELLS' | 'ISOLATED_CELL';
export type InterferenceHexLayoutTiers = 1 | 2; // 1 tier = 7 sites (18 neighbor sectors), 2 tiers = 19 sites (54 neighbor sectors)
export type InterferenceMarginMethod =
  | '3GPP_GEOMETRY_MULTITIER' // 3GPP TR 36.942 / TR 38.901 Hexagonal Multi-Tier Geometry Coupling
  | 'VENDOR_LOAD_COUPLING'   // Industry Best Practice (Ericsson/Nokia/Huawei): -10*log10(1 - η·ρ)
  | 'ITU_R_INR_SCALING'       // ITU-R M.2412 Interference-over-Thermal (INR) Model: 10*log10(1 + INR_max·(η/100)^γ)
  | 'SINR_DESENSITIZATION';   // 3GPP Effective Receiver Desensitization / SINR Degradation

export interface InterferenceCalculationSummary {
  scenario: InterferenceScenarioType;
  tiers: InterferenceHexLayoutTiers;
  totalSites: number; // 7 or 19
  totalNeighborSectors: number; // 18 or 54
  isdMeters: number;
  isdMultiplier: number;
  neighborLoadPercent: number;
  intraCellLoadPercent: number;
  method: InterferenceMarginMethod;
  methodName: string;
  methodFormula: string;
  technology: '4G' | '5G';
  
  // Technology Specific Factors
  crsLoadFloorPercent: number; // 4G LTE CRS floor (~14.3% effective continuous power) vs 5G 0% (lean carrier)
  effectiveDlTrafficLoadPercent: number; // Traffic + reference signal effective DL load
  beamformingIsolationDb: number; // 5G beamforming spatial filtering isolation gain (3.0 to 6.5 dB) vs 4G 0 dB
  intraCellMimoLeakageDb: number; // 5G MU-MIMO inter-layer leakage / 4G ICI
  ulInterToIntraRatioF: number; // 3GPP fractional power control f-factor (0.55 macro)
  
  // Detailed Calculation Results
  calculatedDlInterferenceMarginDb: number; // Pure calculated DL margin from model
  calculatedUlIotMarginDb: number;          // Pure calculated UL IoT margin from model
  pessimisticMarginOffsetDb: number;       // User pessimistic add-on
  effectiveDlInterferenceMarginDb: number; // calculated + pessimistic
  effectiveUlIotMarginDb: number;          // calculated + pessimistic
  geometryFactorDb: number;                // Serving-to-Interference geometry at cell edge (dB)
  totalInrLinear: number;                  // Interference-to-Noise Ratio (I/N)
  totalInrDb: number;
  dlMaplImpactDb: number;
  dlEdgeNeighbourToServingDb?: number; // neighbour-to-serving power ratio at the cell edge, full load (before beamforming isolation)
  dlEdgeInterferenceToSignalRatio?: number; // η_DL · F_edge · G_iso (linear): I/S at the cell edge at the current load
  dlInterferenceLimited?: boolean; // required DL SINR not reachable at the cell edge at this load
  ulMaplImpactDb: number;
}

export interface OverheadSummary {
  mode: OverheadMode;
  frequencyRange: 'FR1' | 'FR2';
  dlOverheadRatio: number; // e.g. 0.14 or calculated detailed ratio
  ulOverheadRatio: number; // e.g. 0.08 or calculated detailed ratio
  dlOverheadPercent: number; // e.g. 14.0%
  ulOverheadPercent: number; // e.g. 8.0%
  breakdown: {
    ssbPercent: number;
    pdcchPercent: number;
    dmrsDlPercent: number;
    csiRsPercent: number;
    trsPercent: number;
    ptrsDlPercent: number;
    dmrsUlPercent: number;
    pucchPercent: number;
    srsPercent: number;
    ptrsUlPercent: number;
    csiRsCdmReductionPercent?: number; // % reduction in CSI-RS overhead achieved via orthogonal CDM codes
  };
  csiRsMultiplexing?: CsiRsMultiplexingType;
  csiRsResourceType?: CsiRsResourceType;
  csiRsPorts?: number;
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
  tddFrameRatio: string; // e.g. 'DDDSU' (4:1) or 'DSUUU' (1:3) or 'DDSUU' (3:2) or 'CUSTOM'
  customTddDlPercent?: number; // User Defined TDD DL ratio (%) when tddFrameRatio === 'CUSTOM' (e.g. 75%)
  customTddUlPercent?: number; // User Defined TDD UL ratio (%) when tddFrameRatio === 'CUSTOM' (e.g. 25%)
  band: string;
  bandwidthMHz: number;
  subcarrierSpacingKhz?: number; // SCS in kHz (e.g. 15, 30, 60, 120)
  frequencyMHz?: number; // Center frequency in MHz (auto-derived from band or editable)
  
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
  bsMechanicalTiltDeg?: number; // Base station mechanical downtilt in degrees: -2° to 15° (default 2°)
  bsElectricalTiltDeg?: number; // Base station electrical / RET downtilt in degrees: 0° to 14° (default 4°)
  bsVerticalBeamwidthDeg?: number; // Base station antenna 3dB vertical beamwidth in degrees: 4° to 15° (default 7°)
  residualBlerTargetPercent?: number; // Target residual BLER: default 10% (can be set by user, e.g. 1% to 30%)
  dmrsSymbolsPerSlot?: number; // PDSCH/PUSCH DMRS symbols per slot: 1, 2, or 3 (default 1)
  numberOfBeams?: number; // Number of active beams: 1 to 8 (default 1)
  ssbPeriodicityMs?: number; // SSB periodicity in ms: 10, 20, 40, 80, 160 (default 20)
  rsPowerAuto: boolean;
  rsPowerDbmOverride?: number;
  rsPowerBoostDb: number; // e.g. 0 to 3 dB

  // User Equipment / CPE
  ueType: UeType;
  ueCategory?: UeCategory;
  ueMimoMode: UeMimoMode; // 1Tx2Rx, 1Tx4Rx, 2Tx2Rx, 2Tx4Rx, 4Tx4Rx
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
  coverageProbabilityType?: 'AREA' | 'EDGE'; // coverageProbability is over the cell area (default) or at the cell edge
  shadowFadingSigmaMode?: 'AUTO_TR38901' | 'MANUAL'; // AUTO: σ from TR 38.901 Table 7.4.1-1 for 3GPP models (default for them)
  bsAntennaGainIncludesArrayGain?: boolean; // true: BS antenna gain is the AAU beam gain (includes array gain); default true for AAU configs
  shadowFadingMarginDb?: number; // Shadow Fading Margin (dB): user-defined or calculated from log-normal std dev (sigma) based on urban/rural environments
  shadowFadingEnvironment?: 'RURAL' | 'SUBURBAN' | 'URBAN' | 'DENSE_URBAN' | 'TUNNEL' | 'CUSTOM'; // Environment profile for log-normal std dev
  dlFadingMarginDb?: number; // Downlink multipath/fast fading margin (e.g. 1.0 to 6.0 dB, default 2.0 dB)
  ulFadingMarginDb?: number; // Uplink multipath/fast fading margin (e.g. 1.0 to 6.0 dB, default 2.5 dB)
  interferenceMarginDb: number; // e.g. 2 to 4 dB
  iotMarginDb: number; // Interference over Thermal in UL (e.g. 3 dB)
  interferenceMarginMode?: 'DYNAMIC_3GPP' | 'MANUAL'; // 'DYNAMIC_3GPP' (hex grid load coupling) or 'MANUAL' (direct dB entry)
  applyAntennaTiltLossToMapl?: boolean; // When true, deducts antenna vertical pattern loss A_V(θ_edge) from cell-edge MAPL (TR 38.901 Table 7.3-1)
  foliageLossDb: number;
  additionalPenetrationLossDb: number;

  // Interference & Cell Loading Engine (3GPP TR 36.942 / TR 38.901 / ITU-R M.2412)
  interferenceScenario?: InterferenceScenarioType; // 'NEIGHBORING_CELLS' (default) | 'ISOLATED_CELL'
  interferenceHexTiers?: InterferenceHexLayoutTiers; // 1 (7 sites / 18 sectors) | 2 (19 sites / 54 sectors)
  interferenceIsdMeters?: number; // Inter-Site Distance (m), editable (nominally 1.5 * cell range)
  interferenceIsdMultiplier?: number; // ISD multiplier relative to Cell Range (default 1.5)
  neighborCellLoadPercent?: number; // Average neighboring cell load factor [%]: 0% to 100% (default 50%)
  intraCellLoadPercent?: number; // Current cell load factor [%]: 0% to 100% (default 50%)
  interferenceMethod?: InterferenceMarginMethod; // Calculation formula / planning tool model
  interferencePessimisticMarginDb?: number; // User-defined pessimistic safety margin added to calculated value (dB)
  interferenceAutoSyncIsd?: boolean; // When true, ISD automatically scales with cell range * multiplier

  // Systems Overhead & Receiver Noise Figures (3GPP Rel-15/16/17)
  dlNoiseFigureDb?: number; // Deprecated, ignored: the UE noise figure (ueNoiseFigureDb) is used
  ulNoiseFigureDb?: number; // Deprecated, ignored: the BS noise figure (bsNoiseFigureDb) is used
  csiRsReportsPerPeriod?: number; // Number of CSI-RS reports within report period: 1 to 5
  csiRsCaPeriodicitySlots?: number; // CSI-RS for CA periodicity (slots): 10, 20, 40, 80

  // 5G Overheads Configuration (3GPP TS 38.306 Table 4.1.2-1 & Detailed TS 38.211/38.214)
  overheadMode?: OverheadMode; // '38306_DEFAULT' (default) | 'DETAILED'
  customDlOverhead?: number; // Optional override e.g. 0.14
  customUlOverhead?: number; // Optional override e.g. 0.08
  pdcchCoresetSymbols?: number; // CORESET duration in symbols: 1, 2, or 3 (default 2)
  dmrsConfigType?: DmrsConfigType; // 'TYPE_1' (6 REs/RB) | 'TYPE_2' (4 REs/RB) (default 'TYPE_1')
  dmrsAdditionalPositions?: number; // 0, 1, 2, 3 (default 1)
  csiRsEnabled?: boolean; // CSI-RS enabled (default true)
  csiRsDensity?: number; // RE density: 0.5, 1, 3 RE/RB (default 1)
  csiRsMultiplexing?: CsiRsMultiplexingType; // 3GPP TS 38.211 CDM Type: 'noCDM' | 'fd-CDM2' | 'cdm4-FD2-TD2' | 'cdm8-FD2-TD4'
  csiRsResourceType?: CsiRsResourceType; // 'PERIODIC' | 'SEMI_PERSISTENT' | 'APERIODIC'
  csiRsPorts?: number; // CSI-RS antenna ports: 1, 2, 4, 8, 16, 32 (default 4)
  zpCsiRsRateMatching?: boolean; // PDSCH rate matching around Zero-Power CSI-RS (default true)
  trsEnabled?: boolean; // Tracking Reference Signal (TRS) (default true)
  trsPeriodicityMs?: number; // TRS periodicity: 10, 20, 40, 80 ms (default 20)
  ptrsEnabled?: boolean; // Phase Tracking Reference Signal (PTRS, auto for FR2 mmWave)
  ptrsTimeDensity?: number; // L_PTRS: 1, 2, 4 symbols (default 1)
  ptrsFreqDensity?: number; // K_PTRS: 2, 4 RBs (default 2)

  // Receiver Sensitivity & Cell Edge Service (3GPP TS 38.101/104, TS 36.101/104, TS 26.114, TS 36.211, TS 22.179)
  serviceProfile?: ServiceProfileType; // Pull down menu: MBB_PS_DATA | VONR_5G | VOLTE_4G | NBIOT_4G | REDCAP_5G | MCX_PUBLIC_SAFETY
  cellEdgeService?: 'PS_DATA' | 'VOLTE_VONR' | 'CUSTOM'; // Legacy compatibility

  // MBB PS DATA Cell-Edge Service Values (User defined DL / UL Thrpt at cell edge)
  targetDlCellEdgeThroughputMbps?: number; // e.g. 2.0 Mbps (default 1.0 - 2.0 Mbps)
  targetUlCellEdgeThroughputMbps?: number; // e.g. 0.512 Mbps (512 kbps)

  // VoNR 5G Specifics (requirements as per 3GPP Specs for VoNR Codecs)
  vonrCodec?: VoNrCodec; // EVS 13.2 kbps (default), EVS 24.4, AMR-WB 12.65, etc.
  vonrSlotAggregation?: number; // 1, 2, 4, 8 slots (default 4)

  // VoLTE 4G / 5G NSA Specifics (requirements as per 3GPP Specs for VoLTE Codecs)
  volteCodec?: VoLteCodec; // AMR-WB 12.65 kbps (default), AMR-WB 23.85, AMR-NB 12.2, EVS 13.2
  volteTtiBundling?: boolean; // TTI Bundling (4 consecutive 1ms subframes, ~4-6 dB UL gain, default true)

  // NB-IoT for 4G (In-band, Out-of-band / Standalone, or Guard-band as per 3GPP Specs)
  nbiotDeploymentMode?: NbIoTDeploymentMode; // 'IN_BAND' | 'GUARD_BAND' | 'STANDALONE'
  nbiotScs?: NbIoTSubcarrierSpacing; // '15KHZ_MULTI' (12 tones) | '15KHZ_SINGLE' (1 tone) | '3_75KHZ_SINGLE' (1 tone)
  nbiotCeLevel?: NbIoTCeLevel; // 'CE_LEVEL_0' (Normal) | 'CE_LEVEL_1' (Robust) | 'CE_LEVEL_2' (Extreme)
  nbiotTargetRateKbps?: number; // e.g. 2.4 kbps, 15.6 kbps, 64 kbps
  nbiotPowerClassDbm?: number; // 23 dBm (Class 3) or 14 dBm (Class 5/6)

  // RedCap for 5G (requirements as per 3GPP Rel-17 Specs for NR Reduced Capability)
  redcapProfile?: RedCapProfile; // 'WEARABLE' | 'INDUSTRIAL_SENSOR' | 'VIDEO_SURVEILLANCE' | 'CUSTOM_REDCAP'
  redcapTargetDlMbps?: number; // Target DL rate e.g. 2.0 - 10.0 Mbps
  redcapTargetUlMbps?: number; // Target UL rate e.g. 0.5 - 5.0 Mbps
  redcapRxBranches?: 1 | 2; // 1 Rx (single antenna) or 2 Rx (dual antenna)

  // MCX / PS - Public Safety User Defined Profiles (requirements as per 3GPP Specs)
  mcxProfile?: McxProfile; // 'MCPTT' (voice) | 'MCVIDEO' (video) | 'MCDATA' (data) | 'CUSTOM_MCX'
  mcxTargetDlMbps?: number; // Target DL throughput (Mbps)
  mcxTargetUlMbps?: number; // Target UL throughput (Mbps)
  mcxTargetLatencyMs?: number; // Target Latency (ms) for Custom Public Safety Profile (e.g. 15-50 ms)
  mcxReliabilityTargetPercent?: number; // 99.0% or 99.9% (drives residual BLER to 1% or 0.1%)
  mcxHpueEnabled?: boolean; // HPUE Power Class 2 (26 dBm)

  // Direct Overrides (Optional manual fine-tuning)
  dlRequiredSnrDb?: number; // Required SNR at cell edge in DL (dB)
  ulRequiredSnrDb?: number; // Required SNR at cell edge in UL (dB)
  dlSubcarriersCount?: number; // Number of received subcarriers in DL
  ulSubcarriersCount?: number; // Number of received subcarriers in UL
}

export type ServiceProfileType = 
  | 'MBB_PS_DATA'
  | 'VONR_5G'
  | 'VOLTE_4G'
  | 'NBIOT_4G'
  | 'REDCAP_5G'
  | 'MCX_PUBLIC_SAFETY';

export type NbIoTDeploymentMode = 'IN_BAND' | 'GUARD_BAND' | 'STANDALONE';
export type NbIoTSubcarrierSpacing = '15KHZ_MULTI' | '15KHZ_SINGLE' | '3_75KHZ_SINGLE';
export type NbIoTCeLevel = 'CE_LEVEL_0' | 'CE_LEVEL_1' | 'CE_LEVEL_2';

export type VoNrCodec = 'EVS_13_2' | 'EVS_24_4' | 'AMR_WB_12_65' | 'AMR_WB_23_85' | 'AMR_NB_12_2';
export type VoLteCodec = 'AMR_WB_12_65' | 'AMR_WB_23_85' | 'AMR_NB_12_2' | 'EVS_13_2';

export type RedCapProfile = 'WEARABLE' | 'INDUSTRIAL_SENSOR' | 'VIDEO_SURVEILLANCE' | 'CUSTOM_REDCAP';
export type McxProfile = 'MCPTT' | 'MCVIDEO' | 'MCDATA' | 'CUSTOM_MCX';

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
  ssSinrDb: number; // DL SINR at the design coverage probability
  ulSinrDb?: number; // UL SINR at the design coverage probability
  avgDlMcs: string; // Average DL Modulation and Coding Scheme (e.g. MCS 27 [256QAM])
  avgUlMcs: string; // Average UL Modulation and Coding Scheme (e.g. MCS 19 [64QAM])
  avgDlBlerPercent: number; // Average DL Block Error Rate percentage
  dlThroughputMbps: number;
  ulThroughputMbps: number;
  latencyMs: number;
  dlMcs: string;
  ulMcs: string;
  mimoLayers: number;
  sectorDlThroughputMbps?: number;
  isDlCappedByHandset?: boolean;
  ueCatCapped?: boolean;
  ueCatLimitMbps?: { dl: number; ul: number; catName: string };
}

export interface MimoSummary {
  bsMimoMode: MimoMode;
  bsDlLayers: number;
  bsUlLayers: number;
  ueMimoMode: UeMimoMode;
  ueTxAntennas: number;
  ueRxAntennas: number;
  effectiveDlLayers: number;
  effectiveUlLayers: number;
  isDlCappedByHandset: boolean;
  handsetCappingReason?: string;
  muMimoMultiplier: number;
  sectorDlThroughputNearMbps: number;
}

export interface LinkBudgetCalculationResult {
  dlMaplDb: number;
  ulMaplDb: number;
  systemMaplDb: number;
  bottleneck: 'DL_LIMITED' | 'UL_LIMITED' | 'BALANCED';
  bottleneckDeltaDb: number;
  maxCellRangeKm: number;
  maxCellRangeMeters: number;
  cellEdgePatternLossAppliedDb?: number;
  ueCategoryLimitSummary?: { category: UeCategory; maxDlMbps: number; maxUlMbps: number; isCapped: boolean };
  
  // Base Station Derived RF
  rsPowerDbm: number;
  rsEirpDbm: number;
  bsEirpDbm: number;
  ueEirpDbm: number;
  
  // Receiver Sensitivities
  ueRxSensitivityDbm: number;
  bsRxSensitivityDbm: number;
  
  // Aggregated Margins
  shadowFadingMarginDb: number;
  dlFadingMarginDb: number;
  ulFadingMarginDb: number;
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

  // Systems Overhead (3GPP Rel-15/16/17/18 Control Channel Engineering)
  avgPdcchOverheadPercent: number; // Average PDCCH overhead (%): dynamic function of 3GPP parameters (can exceed 10%)
  avgPucchOverheadPercent: number; // Average PUCCH overhead (%): dynamic function of 3GPP parameters (can exceed 20%)
  overheadSummary: OverheadSummary; // 3GPP TS 38.306 standard & detailed overhead breakdown

  // Antenna Tilt & Coverage Geometry (3GPP TR 38.901 / TR 36.814)
  antennaTiltSummary: {
    mechanicalTiltDeg: number;
    electricalTiltDeg: number;
    totalTiltDeg: number;
    verticalBeamwidthDeg: number;
    mainBeamGroundDistanceMeters: number;
    innerCoverageDistanceMeters: number;
    outerCoverageDistanceMeters: number;
    cellEdgePatternLossDb: number;
    optimalTiltDeg: number;
  };

  // Receiver Sensitivity 3GPP Breakdown (DL at UE side & UL at eNB/gNB side)
  rxSensitivityBreakdown: {
    dl: {
      thermalNoisePerSubcarrierDbm: number;
      receivedSubcarriers: number;
      noiseFigureDb: number;
      thermalNoiseFloorDbm: number;
      requiredSnrDb: number;
      rxDiversityGainDb: number;
      sensitivityDbm: number;
      serviceName: string;
      scsKhz: number;
    };
    ul: {
      thermalNoisePerSubcarrierDbm: number;
      receivedSubcarriers: number;
      allocatedPrbs: number;
      noiseFigureDb: number;
      thermalNoiseFloorDbm: number;
      requiredSnrDb: number;
      rxGainDb: number;
      sensitivityDbm: number;
      serviceName: string;
      scsKhz: number;
    };
  };

  // Cell Edge Service Profile Details (Calculated based on selected service & user inputs)
  serviceSummary: {
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
    calculatedEdgeRangeKm: number;
    calculatedEdgeRangeMeters: number;
    standardReference: string;
  };

  // Interference Calculation Summary (3GPP TR 36.942 / TR 38.901 / ITU-R M.2412)
  interferenceSummary: InterferenceCalculationSummary;
  coverageProbabilityType?: 'AREA' | 'EDGE';
  coverageEdgeProbabilityPercent?: number; // cell-edge probability the shadow fading margin is based on
  coverageAreaProbabilityPercent?: number; // equivalent area coverage (Jakes)
  effectiveGaussianZ?: number; // Gaussian z-score corresponding to the cell-edge coverage probability
  pathLossExponentAtEdge?: number;
  dlSinrModel?: import('../utils/linkBudgetCalculator').DlSinrModel; // DL SINR vs path loss / distance (shared with charts)
  effectiveShadowFadingStdDevDb?: number; // σ actually used for the shadow fading margin
  shadowFadingSigmaSource?: string; // where σ came from (TR 38.901 table or user input)
  maxCellRangeCapped?: boolean; // true when R_max is limited by the propagation model validity range
  configWarnings?: string[]; // configuration warnings (undefined bandwidth / SCS, model range cap)
  mimoSummary?: MimoSummary; // Base station vs UE spatial architecture & MU-MIMO summary
}
