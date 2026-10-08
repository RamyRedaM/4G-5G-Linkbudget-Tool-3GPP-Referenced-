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
      // 3GPP TR 38.901 Urban Macro (UMa)
      const d3dMeters = Math.sqrt(Math.pow(d * 1000, 2) + Math.pow(hb - hm, 2));
      const plLos = 28.0 + 22.0 * Math.log10(d3dMeters) + 20.0 * Math.log10(fGhz);
      const plNlos = 13.54 + 39.08 * Math.log10(d3dMeters) + 20.0 * Math.log10(fGhz) - 0.6 * (hm - 1.5);
      
      if (params.scenario === 'OUTDOOR_LOS') {
        rawPl = plLos;
      } else {
        rawPl = Math.max(plLos, plNlos) + (params.clutter === 'DENSE_URBAN' ? 3.0 : params.clutter === 'SUBURBAN' ? -4.0 : 0);
      }
      break;
    }

    case '3GPP_UMI': {
      // 3GPP TR 38.901 Urban Micro Street Canyon (UMi)
      const d3dMeters = Math.sqrt(Math.pow(d * 1000, 2) + Math.pow(hb - hm, 2));
      const plLos = 32.4 + 21.0 * Math.log10(d3dMeters) + 20.0 * Math.log10(fGhz);
      const plNlos = 22.4 + 35.3 * Math.log10(d3dMeters) + 21.3 * Math.log10(fGhz) - 0.3 * (hm - 1.5);

      if (params.scenario === 'OUTDOOR_LOS') {
        rawPl = plLos;
      } else {
        rawPl = Math.max(plLos, plNlos);
      }
      break;
    }

    case '3GPP_RMA': {
      // 3GPP TR 38.901 Rural Macro (RMa)
      const d3dMeters = Math.sqrt(Math.pow(d * 1000, 2) + Math.pow(hb - hm, 2));
      const plLos = 20.0 * Math.log10((40 * Math.PI * d3dMeters * fGhz) / 3) + Math.min(0.03 * Math.pow(20, 1.72), 10) * Math.log10(d3dMeters);
      const plNlos = 161.04 - 7.1 * Math.log10(25) + 7.5 * Math.log10(hb) - (24.37 - 3.7 * Math.pow(hb / 35, 2)) * Math.log10(hb)
        + (43.42 - 3.1 * Math.log10(hb)) * (Math.log10(d3dMeters) - 3) + 20 * Math.log10(fGhz);
      
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
