import {
  EnvironmentClutter,
  IndoorOutdoorScenario,
  PropagationModelType
} from '../types/telecom';

/**
 * Standard Propagation Model (SPM) and 3GPP TR 38.901 RF Propagation Engines
 * with Log-Normal Shadow Fading (Gaussian standard deviation sigma)
 */

export interface PropagationParams {
  freqMHz: number;
  hbMeters: number; // Base station antenna height (meters)
  hmMeters: number; // UE antenna height (meters)
  model: PropagationModelType;
  clutter: EnvironmentClutter;
  scenario: IndoorOutdoorScenario;
  additionalPenetrationLossDb?: number;
  foliageLossDb?: number;
  spmK1Override?: number;
  spmK2Override?: number;
  
  // Log-normal Shadow Fading Parameters
  shadowFadingStdDevDb?: number; // Standard deviation (sigma) in dB (typically 4.0 - 12.0 dB)
  coverageProbability?: number; // Target cell-edge coverage probability (e.g. 90%, 95%)
  includeShadowFading?: boolean; // Whether to include log-normal margin in effective path loss
}

/**
 * Exact inverse normal CDF (quantile function) using rational approximation
 */
export function getGaussianZ(probabilityPercent: number): number {
  const p = Math.max(0.5, Math.min(0.999, probabilityPercent / 100));
  const t = Math.sqrt(-2 * Math.log(1 - p));
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;
  return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
}

/**
 * Calculate the log-normal shadow fading margin in dB:
 * M_SF = z * sigma_SF
 */
export function calculateShadowFadingMargin(
  stdDevSigmaDb: number,
  coverageProbPercent: number = 95
): number {
  const sigma = Math.max(0, stdDevSigmaDb);
  const z = getGaussianZ(coverageProbPercent);
  return Number((z * sigma).toFixed(2));
}

/**
 * Inverse calculation: determine equivalent log-normal standard deviation (sigma) from margin and coverage probability
 */
export function calculateStdDevFromMargin(
  marginDb: number,
  coverageProbPercent: number = 95
): number {
  const z = getGaussianZ(coverageProbPercent);
  if (z <= 0) return 0;
  return Number((Math.max(0, marginDb) / z).toFixed(2));
}

export function getBuildingPenetrationLoss(scenario: IndoorOutdoorScenario, freqMHz: number): number {
  const fGhz = Math.max(0.7, freqMHz / 1000);
  switch (scenario) {
    case 'OUTDOOR_LOS':
      return 0.0;
    case 'OUTDOOR_NLOS':
      return 0.0;
    case 'IN_VEHICLE':
      // 3GPP vehicle penetration: 9 dB + 0.5 * f_GHz
      return 8.0 + Math.min(6.0, 0.5 * fGhz);
    case 'INDOOR_STANDARD':
      // Standard residential/office (plasterboard, standard glass) ~ 12-16 dB
      return 12.0 + Math.min(8.0, 1.2 * Math.log10(fGhz + 1));
    case 'TUNNEL_COVERAGE':
      // Inside Tunnel Coverage: portal penetration & entrance transition coupling loss (~18-24 dB)
      // 3GPP TR 38.901 HST In-Tunnel, ITU-R P.1411 & CommScope/RFS radiating cable / portal studies
      return 18.0 + Math.min(6.0, 2.2 * Math.log10(fGhz + 1));
    case 'INDOOR_DEEP':
      // Deep indoor / high-loss commercial (thermal IRR glass, reinforced concrete) ~ 22-30 dB
      return 22.0 + Math.min(10.0, 2.5 * Math.log10(fGhz + 1));
    default:
      return 0.0;
  }
}

export function getClutterOffsetDb(clutter: EnvironmentClutter): number {
  switch (clutter) {
    case 'DENSE_URBAN':
      return 4.0;
    case 'URBAN':
      return 0.0;
    case 'SUBURBAN':
      return -7.5;
    case 'RURAL':
      return -18.0;
    default:
      return 0.0;
  }
}

const SPEED_OF_LIGHT = 3.0e8;
const RMA_BUILDING_HEIGHT_M = 5.0;
const RMA_STREET_WIDTH_M = 20.0;

/**
 * UMa / UMi LOS breakpoint distance d'BP = 4 * h'BS * h'UT * fc / c (TR 38.901 Table 7.4.1-1 note 1),
 * with effective antenna heights h' = h - hE and environment height hE = 1 m.
 */
export function getUmaUmiBreakpointMeters(hbMeters: number, hmMeters: number, fGhz: number): number {
  const hBsEff = Math.max(0.1, hbMeters - 1.0);
  const hUtEff = Math.max(0.1, hmMeters - 1.0);
  return (4 * hBsEff * hUtEff * fGhz * 1e9) / SPEED_OF_LIGHT;
}

export interface PropagationModelValidity {
  maxDistanceKm: number;
  reference: string;
}

/**
 * Maximum 2D distance for which a propagation model is defined. Returns null for models without a fixed limit
 * (FSPL, and SPM which is calibrated per network).
 */
export function getPropagationModelValidity(
  model: PropagationModelType,
  scenario: IndoorOutdoorScenario
): PropagationModelValidity | null {
  switch (model) {
    case '3GPP_UMA':
      return { maxDistanceKm: 5, reference: 'TR 38.901 UMa: 10 m ≤ d2D ≤ 5 km' };
    case '3GPP_UMI':
      return { maxDistanceKm: 5, reference: 'TR 38.901 UMi: 10 m ≤ d2D ≤ 5 km' };
    case '3GPP_RMA':
      return scenario === 'OUTDOOR_LOS'
        ? { maxDistanceKm: 10, reference: 'TR 38.901 RMa LOS: 10 m ≤ d2D ≤ 10 km' }
        : { maxDistanceKm: 5, reference: 'TR 38.901 RMa NLOS: 10 m ≤ d2D ≤ 5 km' };
    case 'COST231_HATA':
      return { maxDistanceKm: 20, reference: 'COST-231 Hata: 1 km ≤ d ≤ 20 km' };
    default:
      return null;
  }
}

/**
 * Calculate path loss in dB for a given 2D distance in kilometers.
 * Supports both median path loss and effective path loss with Log-Normal Shadowing.
 */
export function calculatePathLoss(
  distKm: number,
  params: PropagationParams
): number {
  const d = Math.max(0.01, distKm); // minimum 10m to avoid singularity
  const fMhz = params.freqMHz;
  const fGhz = fMhz / 1000;
  const hb = Math.max(10, params.hbMeters);
  const hm = Math.max(1, params.hmMeters);

  let rawPl = 0;

  switch (params.model) {
    case 'SPM': {
      // Standard Propagation Model (calibrated modified Cost-231 / Hata for RF planning tools)
      // PL_median = K1 + K2*log10(d_km) + K3*log10(hb) + K5*log10(d_km)*log10(hb) + K_clutter
      const k1 = params.spmK1Override ?? (144.2 + 25.5 * Math.log10(Math.max(0.7, fGhz)));
      const k2 = params.spmK2Override ?? (44.9 - 6.55 * Math.log10(hb));
      const k3 = -13.82;
      const k5 = -6.55;
      const clutterLoss = getClutterOffsetDb(params.clutter);

      rawPl = k1 + k2 * Math.log10(d) + k3 * Math.log10(hb) + k5 * Math.log10(d) * Math.log10(hb) + clutterLoss;
      break;
    }

    case '3GPP_UMA': {
      // 3GPP TR 38.901 Urban Macro (UMa), Table 7.4.1-1
      const d2dMeters = d * 1000;
      const d3dMeters = Math.sqrt(Math.pow(d2dMeters, 2) + Math.pow(hb - hm, 2));
      // Dual-slope LOS: PL1 up to the breakpoint d'BP, PL2 beyond it
      const dBpMeters = getUmaUmiBreakpointMeters(hb, hm, fGhz);
      const plLos = d2dMeters <= dBpMeters
        ? 28.0 + 22.0 * Math.log10(d3dMeters) + 20.0 * Math.log10(fGhz)
        : 28.0 + 40.0 * Math.log10(d3dMeters) + 20.0 * Math.log10(fGhz)
          - 9.0 * Math.log10(dBpMeters * dBpMeters + Math.pow(hb - hm, 2));
      const plNlos = 13.54 + 39.08 * Math.log10(d3dMeters) + 20.0 * Math.log10(fGhz) - 0.6 * (hm - 1.5);
      
      if (params.scenario === 'OUTDOOR_LOS') {
        rawPl = plLos;
      } else {
        rawPl = Math.max(plLos, plNlos) + (params.clutter === 'DENSE_URBAN' ? 3.0 : params.clutter === 'SUBURBAN' ? -4.0 : 0);
      }
      break;
    }

    case '3GPP_UMI': {
      // 3GPP TR 38.901 Urban Micro Street Canyon (UMi), Table 7.4.1-1
      const d2dMeters = d * 1000;
      const d3dMeters = Math.sqrt(Math.pow(d2dMeters, 2) + Math.pow(hb - hm, 2));
      // Dual-slope LOS: PL1 up to the breakpoint d'BP, PL2 beyond it
      const dBpMeters = getUmaUmiBreakpointMeters(hb, hm, fGhz);
      const plLos = d2dMeters <= dBpMeters
        ? 32.4 + 21.0 * Math.log10(d3dMeters) + 20.0 * Math.log10(fGhz)
        : 32.4 + 40.0 * Math.log10(d3dMeters) + 20.0 * Math.log10(fGhz)
          - 9.5 * Math.log10(dBpMeters * dBpMeters + Math.pow(hb - hm, 2));
      const plNlos = 22.4 + 35.3 * Math.log10(d3dMeters) + 21.3 * Math.log10(fGhz) - 0.3 * (hm - 1.5);

      if (params.scenario === 'OUTDOOR_LOS') {
        rawPl = plLos;
      } else {
        rawPl = Math.max(plLos, plNlos);
      }
      break;
    }

    case '3GPP_RMA': {
      // 3GPP TR 38.901 Rural Macro (RMa), Table 7.4.1-1, default h = 5 m avg. building height, W = 20 m street width
      const h = RMA_BUILDING_HEIGHT_M;
      const w = RMA_STREET_WIDTH_M;
      const d2dMeters = d * 1000;
      const d3dMeters = Math.sqrt(d2dMeters * d2dMeters + Math.pow(hb - hm, 2));
      const pl1 = (d3d: number) => 20.0 * Math.log10((40 * Math.PI * d3d * fGhz) / 3)
        + Math.min(0.03 * Math.pow(h, 1.72), 10) * Math.log10(d3d)
        - Math.min(0.044 * Math.pow(h, 1.72), 14.77)
        + 0.002 * Math.log10(h) * d3d;
      // Breakpoint d_BP = 2*pi*h_BS*h_UT*fc/c
      const dBpMeters = (2 * Math.PI * hb * hm * fGhz * 1e9) / SPEED_OF_LIGHT;
      const plLos = d2dMeters <= dBpMeters
        ? pl1(d3dMeters)
        : pl1(dBpMeters) + 40.0 * Math.log10(d3dMeters / dBpMeters);
      const plNlos = 161.04 - 7.1 * Math.log10(w) + 7.5 * Math.log10(h)
        - (24.37 - 3.7 * Math.pow(h / hb, 2)) * Math.log10(hb)
        + (43.42 - 3.1 * Math.log10(hb)) * (Math.log10(d3dMeters) - 3)
        + 20 * Math.log10(fGhz)
        - (3.2 * Math.pow(Math.log10(11.75 * hm), 2) - 4.97);

      rawPl = params.scenario === 'OUTDOOR_LOS' ? plLos : Math.max(plLos, plNlos);
      break;
    }

    case 'COST231_HATA': {
      // Cost-231 Hata Model (1500 - 2000 MHz, extensible to Sub-3G)
      const aHm = (1.1 * Math.log10(fMhz) - 0.7) * hm - (1.56 * Math.log10(fMhz) - 0.8);
      const cm = params.clutter === 'DENSE_URBAN' ? 3.0 : 0.0;
      rawPl = 46.3 + 33.9 * Math.log10(fMhz) - 13.82 * Math.log10(hb) - aHm + (44.9 - 6.55 * Math.log10(hb)) * Math.log10(d) + cm;
      if (params.clutter === 'SUBURBAN') rawPl -= 8.0;
      if (params.clutter === 'RURAL') rawPl -= 17.0;
      break;
    }

    case 'FSPL':
    default: {
      // Free Space Path Loss: 32.44 + 20*log10(f_MHz) + 20*log10(d_km)
      rawPl = 32.44 + 20 * Math.log10(fMhz) + 20 * Math.log10(d);
      break;
    }
  }

  // Add environment scenarios: building penetration, foliage, additional planning margin
  const penetrationLoss = getBuildingPenetrationLoss(params.scenario, fMhz);
  const foliageLoss = params.foliageLossDb ?? 0;
  const extraLoss = params.additionalPenetrationLossDb ?? 0;

  // Log-normal shadow fading margin (if explicitly requested to compute effective path loss)
  let shadowFadingMargin = 0;
  if (params.includeShadowFading && params.shadowFadingStdDevDb !== undefined) {
    shadowFadingMargin = calculateShadowFadingMargin(
      params.shadowFadingStdDevDb,
      params.coverageProbability ?? 95
    );
  }

  return rawPl + penetrationLoss + foliageLoss + extraLoss + shadowFadingMargin;
}

/**
 * Invert propagation model using binary search to find exact cell range in Km for a target Maximum Allowable Path Loss (MAPL)
 */
export function calculateDistanceForPathLoss(
  targetPlDb: number,
  params: PropagationParams
): number {
  if (targetPlDb <= 40) return 0.01;

  let low = 0.005; // 5 meters
  let high = 50.0; // 50 km

  // Expand high bound if rural or free space
  if (params.clutter === 'RURAL' || params.model === 'FSPL') {
    high = 100.0;
  }

  // Never extrapolate a model beyond its validity range: the range is capped at the model limit
  const validity = getPropagationModelValidity(params.model, params.scenario);
  if (validity) {
    high = Math.min(high, validity.maxDistanceKm);
    if (calculatePathLoss(high, params) <= targetPlDb) {
      return high;
    }
  }

  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    const pl = calculatePathLoss(mid, params);
    if (Math.abs(pl - targetPlDb) < 0.02) {
      return mid;
    }
    if (pl < targetPlDb) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}
