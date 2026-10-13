import {
  TechnologyType,
  DuplexMode,
  MimoMode,
  UeType,
  UeCategory,
  EnvironmentClutter,
  IndoorOutdoorScenario,
  PropagationModelType,
  OverheadMode,
  InterferenceScenarioType,
  InterferenceHexLayoutTiers,
  InterferenceMarginMethod
} from './telecom';

// ----------------------------------------------------
// UE Class Mix
// ----------------------------------------------------
export interface UeClassConfig {
  id: string;
  name: string;
  category: UeCategory;
  type: UeType;
  txPowerDbm: number;
  antennaGainDbi: number;
  noiseFigureDb: number;
  dlMimoLayers: number;
  ulMimoLayers: number;
  percentage: number; // Share in % (sum to 100)
}

// ----------------------------------------------------
// Bins Configuration
// ----------------------------------------------------
export type BinPlacementMethod = 'UNIFORM_DISTANCE' | 'EQUAL_AREA' | 'EQUAL_PATHLOSS_STEP';

export interface BinConfig {
  binIndex: number; // 1 to N
  innerRadiusMeters: number;
  outerRadiusMeters: number;
  areaKm2: number;
  userCount: number;
  indoorProbabilityPercent: number;
  ueClassMixOverride?: string; // Optional override profile ID
  trafficProfileId?: string; // Optional traffic profile assigned to this bin
  
  // Preview metrics (pre-simulation)
  meanPathLossDb: number;
  expectedRsrpDbm: number;
  expectedSinrRangeDb: [number, number]; // [min, max]
  expectedDominantMcs: number;
}

// ----------------------------------------------------
// Traffic Profiles & Service Catalogue (3GPP TS 23.501 / TS 26.114)
// ----------------------------------------------------
export type ServiceType = 
  | 'VONR_VOLTE' 
  | 'VIDEO_CALL_VINR' 
  | 'VIDEO_STREAMING' 
  | 'WEB_BROWSING' 
  | 'CLOUD_GAMING' 
  | 'MBB_PS_DATA';

export interface ServiceDefinition {
  id: ServiceType;
  name: string;
  fiveQi: number;
  isGbr: boolean;
  priorityLevel: number; // 3GPP TS 23.501 priority (lower = higher priority)
  dlTargetRateMbps: number;
  ulTargetRateMbps: number;
  activityFactor: number; // Voice activity / session duty cycle (e.g. 0.5 for voice)
  codecName?: 'AMR-WB 12.65' | 'AMR-WB 23.85' | 'EVS 13.2' | 'EVS 24.4' | 'None';
  erlangsPerUser: number; // BHCA * MHT / 3600
  sessionDurationSec: number;
  minSinrThresholdDb: { dl: number; ul: number };
  satisfactionThresholdPercent: number; // e.g. 95%
  isAssumption: boolean;
  assumptionSource: string; // e.g. "3GPP TS 26.114 Table 5.1 / Engineering assumption"
}

export interface TrafficProfile {
  id: string;
  name: string;
  description: string;
  serviceMix: {
    serviceId: ServiceType;
    activeProbabilityPercent: number; // Probability of user being active during Busy Hour (0-100)
    targetRateDlMbps: number;
    targetRateUlMbps: number;
    weight: number;
  }[];
}

// ----------------------------------------------------
// Simulation Settings
// ----------------------------------------------------
export type SchedulerType = 'PROPORTIONAL_FAIR' | 'ROUND_ROBIN' | 'MAX_CI';
export type LinkAbstractionMethod = 'CQI_MCS_LOOKUP' | 'ATTENUATED_SHANNON';

export interface SimulationSettings {
  iterations: number; // 500 to 20,000 (default 2,000)
  seed: number; // Seeded PRNG (mulberry32)
  earlyConvergenceStop: boolean; // Stop when 95% CI of mean cell throughput < +/-1%
  scheduler: SchedulerType;
  gbrFirstPriority: boolean; // GBR services prioritized first per 5QI
  prbReservationPercent: number; // e.g. 5% to 15% reserved for control / emergency GBR
  linkAbstraction: LinkAbstractionMethod;
  shannonAlpha: number; // Attenuation factor alpha (0.60 to 0.75, default 0.65)
  shannonMaxSe: number; // Max spectral efficiency cap (e.g. 7.4 bps/Hz for 256QAM)
  rankAdaptationThresholdsDb: [number, number, number]; // SINR thresholds for Rank 2, Rank 3, Rank 4
  
  // Capacity Search Settings
  runCapacitySearch: boolean;
  targetSatisfactionPercent: number; // Target e.g. >= 95% all users satisfied
  targetVoiceSatisfactionPercent: number; // Target e.g. >= 98% voice satisfied
  
  // New Cell Range Search Settings
  runCellRangeSearch: boolean;
  rangeSearchDensityBasis: 'CONSTANT_USER_DENSITY' | 'CONSTANT_USER_COUNT';
}

// ----------------------------------------------------
// Per-User Simulation Record
// ----------------------------------------------------
export interface SimulatedUserRecord {
  id: number;
  binIndex: number;
  xMeters: number;
  yMeters: number;
  distanceMeters: number;
  azimuthDeg: number;
  isIndoor: boolean;
  ueClassId: string;
  serviceId: ServiceType;
  isActiveInBh: boolean;
  
  // Radio parameters
  pathLossDlDb: number;
  pathLossUlDb: number;
  shadowFadingDb: number;
  penetrationLossDb: number;
  bodyLossDb: number;
  dlRsrpDbm: number;
  dlSinrDb: number;
  ulSinrDb: number;
  ueTxPowerDbm: number;
  isPowerLimited: boolean;
  
  // Layer & Scheduling
  cqi: number;
  mcs: number;
  rank: number;
  spectralEfficiencyDl: number;
  allocatedPrbsDl: number;
  allocatedPrbsUl: number;
  achievedDlRateMbps: number;
  achievedUlRateMbps: number;
  
  // Quality & Satisfaction
  isSatisfied: boolean;
  violationReason?: 'OUTAGE_COVERAGE' | 'PRB_CONGESTION' | 'UL_POWER_LIMITED' | 'RATE_BELOW_TARGET' | 'NONE';
}

// ----------------------------------------------------
// Per-Bin Results
// ----------------------------------------------------
export interface BinResultSummary {
  binIndex: number;
  innerRadiusMeters: number;
  outerRadiusMeters: number;
  userCount: number;
  satisfiedCount: number;
  violatedCount: number;
  satisfactionRatePercent: number;
  
  meanDlSinrDb: number;
  meanUlSinrDb: number;
  dominantMcs: number;
  meanRank: number;
  meanDlRateMbps: number;
  meanUlRateMbps: number;
  prbUtilizationPercent: number;
  meanDistanceMeters?: number;
  meanPathLossDb?: number;
  meanRsrpDbm?: number;
  
  violationReasons: {
    outageCount: number;
    congestionCount: number;
    powerLimitedCount: number;
    rateBelowTargetCount: number;
  };
}

// ----------------------------------------------------
// Overall Simulation Results Dashboard
// ----------------------------------------------------
export interface MonteCarloDashboardResults {
  timestamp: string;
  seed: number;
  completedIterations: number;
  convergedEarly: boolean;
  durationMs: number;
  
  // KPI Cards
  totalUsersDropped: number;
  cellCapacityUsersTotal: number;
  cellCapacityUsersPerKm2: number;
  
  // Throughput & Spectral Efficiency
  meanCellThroughputDlMbps: number;
  meanCellThroughputUlMbps: number;
  ci95CellThroughputDlMbps: [number, number];
  ci95CellThroughputUlMbps: [number, number];
  peak38306ThroughputDlMbps: number; // TS 38.306 theoretical upper bound
  peak38306ThroughputUlMbps: number;
  cellSpectralEfficiencyDl: number; // bps/Hz/cell
  cellSpectralEfficiencyUl: number;
  
  // Cell-Edge & Median User Experience
  userThroughput5thPercentileDlMbps: number;
  userThroughput5thPercentileUlMbps: number;
  userThroughputMedianDlMbps: number;
  userThroughputMedianUlMbps: number;
  
  // Satisfaction & Congestion
  overallSatisfactionPercent: number;
  voiceSatisfactionPercent: number;
  prbUtilizationDlMeanPercent: number;
  prbUtilizationDlP95Percent: number;
  prbUtilizationUlMeanPercent: number;
  prbUtilizationUlP95Percent: number;
  
  // Voice Telephony Metrics
  voiceSimultaneousCallsSupported: number;
  voiceErlangsCarried: number;
  voiceBlockingProbabilityPercent: number; // Erlang-B model
  
  // Coverage & Geometry
  coverageOutagePercent: number;
  limitingFactor: 'DL_CAPACITY' | 'UL_CAPACITY' | 'UL_COVERAGE' | 'GBR_CONGESTION' | 'NONE';
  
  // Recommended New Cell Range & ISD
  recommendedCellRangeKm: number;
  recommendedIsdMeters: number;
  recommendedSitesPerKm2: number;
  cellRangeDeltaPercent: number; // % change vs LKB baseline
  
  // Fairness
  jainsFairnessIndex: number; // 0.0 to 1.0
  dlUlThroughputRatio: number;
  
  // Bins Breakdown
  binResults: BinResultSummary[];
  pathLossDiagnostics?: PathLossDiagnostics;
  
  // CDF Curves
  sinrCdf: { percentile: number; dlSinrDb: number; ulSinrDb: number }[];
  throughputCdf: { percentile: number; dlRateMbps: number; ulRateMbps: number }[];
  
  // Histograms
  mcsHistogram: { mcs: number; count: number; percentage: number }[];
  rankHistogram: { rank: number; count: number; percentage: number }[];
  
  // PRB Breakdown by Service
  prbByService: { serviceId: ServiceType; serviceName: string; dlPrbs: number; ulPrbs: number; percentage: number }[];
  
  // Capacity Search Curve (Users vs % Satisfied)
  capacityCurve: { userCount: number; satisfactionPercent: number; voiceSatisfactionPercent: number }[];
  
  // Cell Range Sensitivity Curve (Range vs Edge Satisfaction)
  cellRangeSensitivity: { rangeMeters: number; edgeSatisfactionPercent: number; cellThroughputMbps: number }[];
  
  // Convergence Plot
  convergenceTrace: { iteration: number; runningMeanDlMbps: number; ciLower: number; ciUpper: number }[];
  
  // Last Drop Polar Scatter Sample (up to 200 users for interactive visualization)
  sampleDropUsers: SimulatedUserRecord[];
}

// ----------------------------------------------------
// Assumptions & Standards Reference Entry
// ----------------------------------------------------
export interface AssumptionItem {
  id: string;
  category: '4G_TECHNOLOGY' | '5G_TECHNOLOGY' | 'PROPAGATION' | 'TRAFFIC_SERVICE' | 'SCHEDULING';
  technology: '4G' | '5G' | 'COMMON';
  name: string;
  value: string;
  standardReference: string; // 3GPP clause or ITU-R reference
  rationale: string;
  isEditable: boolean;
}

// ----------------------------------------------------
// Unit Test Results
// ----------------------------------------------------
export interface UnitTestItem {
  testName: string;
  category: string;
  inputDescription: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  standardClause: string;
}

// ----------------------------------------------------
// Path Loss Diagnostics (Monte Carlo vs LKB propagation curve)
// ----------------------------------------------------
export interface PathLossDiagnosticBin {
  binIndex: number;
  innerRadiusMeters: number;
  outerRadiusMeters: number;
  midDistanceMeters: number;
  samples: number; // user drops in this bin over all iterations
  lkbPathLossAtMidDb: number; // LKB curve at the bin mid distance
  mcMedianPathLossAtMidDb: number; // Monte Carlo median path loss at the bin mid distance
  meanMedianPathLossDb: number; // mean distance-based path loss of the users dropped in the bin
  meanTotalPathLossDb: number; // incl. shadowing, O2I penetration and body loss
  minTotalPathLossDb: number;
  maxTotalPathLossDb: number;
  meanShadowFadingDb: number; // should be ~0 dB
  stdShadowFadingDb: number; // should be ~ the configured sigma
  meanPenetrationLossDb: number;
  meanBodyLossDb: number;
  indoorPercent: number;
  maxCurveDeviationDb: number; // max |MC median + LKB scenario penetration - LKB curve| over all users in the bin
}

export interface PathLossDiagnostics {
  propagationModel: PropagationModelType;
  environmentClutter: EnvironmentClutter;
  dlFreqMHz: number;
  ulFreqMHz: number;
  lkbScenario: IndoorOutdoorScenario;
  mcOutdoorScenario: IndoorOutdoorScenario;
  lkbScenarioPenetrationDb: number; // expected LKB curve offset above the MC median curve
  configuredShadowSigmaDb: number;
  lkbShadowFadingMarginDb: number;
  lkbMaplDb: number;
  lkbMaxCellRangeMeters: number;
  maxCurveDeviationDb: number;
  curveMatches: boolean;
  lkbCurve: { distanceMeters: number; lkbPathLossDb: number; mcMedianPathLossDb: number }[];
  samplePoints: { distanceMeters: number; medianPathLossDb: number; totalPathLossDb: number; isIndoor: boolean }[]; // first 1,500 user drops
  bins: PathLossDiagnosticBin[];
}
