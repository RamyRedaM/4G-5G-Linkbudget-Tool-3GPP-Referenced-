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
 * Fraction of the cell AREA with signal above threshold, given the cell-EDGE coverage probability (Jakes, 1974):
 * F_u = ½·[1 − erf(a) + exp((1 − 2ab)/b²)·(1 − erf((1 − ab)/b))], a = −z_edge/√2, b = 10·n·log10(e)/(σ·√2),
 * with n the path-loss exponent near the cell edge and σ the shadow fading standard deviation.
 */
export function jakesAreaCoverage(edgeProbabilityPercent: number, sigmaDb: number, pathLossExponent: number): number {
  if (sigmaDb < 0.1) return edgeProbabilityPercent >= 50 ? 100 : 0;
  const z = getGaussianZ(edgeProbabilityPercent);
  const a = -z / Math.SQRT2;
  const b = (10 * Math.max(1.5, pathLossExponent) * Math.LOG10E) / (sigmaDb * Math.SQRT2);
  const fu = 0.5 * (1 - erf(a) + Math.exp((1 - 2 * a * b) / (b * b)) * (1 - erf((1 - a * b) / b)));
  return Math.min(100, Math.max(0, fu * 100));
}

/** Cell-edge coverage probability (%) that gives the requested AREA coverage probability (inverse of jakesAreaCoverage). */
export function edgeProbabilityForAreaCoverage(areaProbabilityPercent: number, sigmaDb: number, pathLossExponent: number): number {
  if (sigmaDb < 0.1) return 50;
  let lo = 50;
  let hi = 99.9;
  if (jakesAreaCoverage(lo, sigmaDb, pathLossExponent) >= areaProbabilityPercent) return lo;
  if (jakesAreaCoverage(hi, sigmaDb, pathLossExponent) <= areaProbabilityPercent) return hi;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (jakesAreaCoverage(mid, sigmaDb, pathLossExponent) < areaProbabilityPercent) lo = mid; else hi = mid;
  }
  return Number(((lo + hi) / 2).toFixed(2));
}

/** Error function (Abramowitz & Stegun 7.1.26, |error| < 1.5e-7). */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}

/** Local path-loss exponent n at distance d (km): PL slope over d/1.2 … 1.2·d divided by 10·log10(1.44). */
export function getPathLossExponent(distKm: number, params: PropagationParams): number {
  const d = Math.max(0.05, distKm);
  return (calculatePathLoss(d * 1.2, params) - calculatePathLoss(d / 1.2, params)) / (10 * Math.log10(1.44));
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

/**
 * Outdoor-to-indoor / in-car penetration loss (dB), TR 38.901 §7.4.3 (mean values):
 * - INDOOR_STANDARD: low-loss O2I model, PL_tw = 5 - 10·log10(0.3·10^(-L_glass/10) + 0.7·10^(-L_concrete/10))
 * - INDOOR_DEEP:     high-loss O2I model, PL_tw = 5 - 10·log10(0.7·10^(-L_IIRglass/10) + 0.3·10^(-L_concrete/10))
 *   with L_glass = 2 + 0.2·f, L_IIRglass = 23 + 0.3·f, L_concrete = 5 + 4·f (f in GHz),
 *   plus indoor loss PL_in = 0.5·d_2D-in, d_2D-in = min of two U(0, 25 m) (U(0, 10 m) for RMa), mean 25/3 m (10/3 m).
 * - IN_VEHICLE: car penetration loss, mean 9 dB (§7.4.3.2)
 * - TUNNEL_COVERAGE: not modelled by TR 38.901; portal / aperture coupling loss from industry studies.
 */
export function getBuildingPenetrationLoss(
  scenario: IndoorOutdoorScenario,
  freqMHz: number,
  model?: PropagationModelType
): number {
  const fGhz = Math.max(0.5, freqMHz / 1000);
  const lGlass = 2 + 0.2 * fGhz;
  const lIirGlass = 23 + 0.3 * fGhz;
  const lConcrete = 5 + 4 * fGhz;
  const meanIndoorDistanceM = model === '3GPP_RMA' ? 10 / 3 : 25 / 3;
  const plIn = 0.5 * meanIndoorDistanceM;
  switch (scenario) {
    case 'OUTDOOR_LOS':
    case 'OUTDOOR_NLOS':
      return 0.0;
    case 'IN_VEHICLE':
      return 9.0;
    case 'INDOOR_STANDARD':
      return 5 - 10 * Math.log10(0.3 * Math.pow(10, -lGlass / 10) + 0.7 * Math.pow(10, -lConcrete / 10)) + plIn;
    case 'INDOOR_DEEP':
      return 5 - 10 * Math.log10(0.7 * Math.pow(10, -lIirGlass / 10) + 0.3 * Math.pow(10, -lConcrete / 10)) + plIn;
    case 'TUNNEL_COVERAGE':
      // Inside Tunnel Coverage: portal penetration & entrance transition coupling loss (~18-24 dB)
      // 3GPP TR 38.901 HST In-Tunnel, ITU-R P.1411 & CommScope/RFS radiating cable / portal studies
      return 18.0 + Math.min(6.0, 2.2 * Math.log10(fGhz + 1));
    default:
      return 0.0;
  }
}

/** Standard deviation of the penetration loss (dB): TR 38.901 §7.4.3 σ_P (low-loss 4.4, high-loss 6.5, car 5). */
export function getPenetrationLossSigmaDb(scenario: IndoorOutdoorScenario): number {
  switch (scenario) {
    case 'INDOOR_STANDARD': return 4.4;
    case 'INDOOR_DEEP': return 6.5;
    case 'IN_VEHICLE': return 5.0;
    default: return 0.0;
  }
}

/**
 * Shadow fading standard deviation from TR 38.901 Table 7.4.1-1 for the 3GPP models (null for SPM / Hata / FSPL):
 * UMa LOS 4 / NLOS 6 dB, UMi LOS 4 / NLOS 7.82 dB, RMa LOS 6 dB (beyond the breakpoint; 4 dB before it) / NLOS 8 dB.
 * Indoor and in-car users take the NLOS value combined with the penetration-loss σ_P: σ = sqrt(σ_SF² + σ_P²).
 */
export function getTr38901ShadowFadingSigmaDb(
  model: PropagationModelType,
  scenario: IndoorOutdoorScenario
): number | null {
  const isLos = scenario === 'OUTDOOR_LOS';
  let sigmaSf: number;
  switch (model) {
    case '3GPP_UMA': sigmaSf = isLos ? 4.0 : 6.0; break;
    case '3GPP_UMI': sigmaSf = isLos ? 4.0 : 7.82; break;
    case '3GPP_RMA': sigmaSf = isLos ? 6.0 : 8.0; break;
    default: return null;
  }
  const sigmaP = getPenetrationLossSigmaDb(scenario);
  return Number(Math.sqrt(sigmaSf * sigmaSf + sigmaP * sigmaP).toFixed(2));
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
  const penetrationLoss = getBuildingPenetrationLoss(params.scenario, fMhz, params.model);
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
