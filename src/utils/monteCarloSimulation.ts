import { LinkBudgetCalculationResult, LinkBudgetInputs } from '../types/telecom';
import { calculatePathLoss } from './spmPropagation';
import { TELECOM_BANDS } from '../data/telecomBands';

export type UeStatus = 'SATISFIED' | 'MARGINAL' | 'OUTAGE';

export interface MonteCarloTrial {
  id: number;
  xKm: number;
  yKm: number;
  distanceKm: number;
  normalizedDistance: number;
  isIndoor: boolean;
  shadowFadingDb: number;
  penetrationLossDb: number;
  bodyLossDb: number;
  totalDlPathLossDb: number;
  totalUlPathLossDb: number;
  rsrpDbm: number;
  dlSinrDb: number;
  ulSinrDb: number;
  dlThroughputMbps: number;
  ulThroughputMbps: number;
  status: UeStatus;
  bottleneck: 'DL' | 'UL' | 'NONE';
}

export interface MonteCarloSummary {
  totalTrials: number;
  satisfiedCount: number;
  marginalCount: number;
  outageCount: number;
  coverageProbabilityPercent: number;
  outageProbabilityPercent: number;
  ulLimitedOutagePercent: number;
  dlLimitedOutagePercent: number;
  
  // Percentiles (P10 = Cell Edge, P50 = Median, P90 = Peak, Mean)
  dlThroughput: {
    p10: number;
    p50: number;
    p90: number;
    mean: number;
    max: number;
  };
  ulThroughput: {
    p10: number;
    p50: number;
    p90: number;
    mean: number;
    max: number;
  };
  dlSinr: {
    p10: number;
    p50: number;
    p90: number;
    mean: number;
  };
  ulSinr: {
    p10: number;
    p50: number;
    p90: number;
    mean: number;
  };
  rsrp: {
    p10: number;
    p50: number;
    p90: number;
    mean: number;
  };
  pathLoss: {
    p10: number;
    p50: number;
    p90: number;
    mean: number;
  };

  // CDF Data Points (0 to 100%)
  cdfThroughput: Array<{ percentile: number; dlThr: number; ulThr: number }>;
  cdfSinr: Array<{ percentile: number; dlSinr: number; ulSinr: number }>;
  cdfRsrp: Array<{ percentile: number; rsrp: number }>;

  // Histograms
  rsrpHistogram: Array<{ binStart: number; binEnd: number; count: number; percentage: number }>;
  pathLossHistogram: Array<{ binStart: number; binEnd: number; count: number; percentage: number }>;
}

export interface MonteCarloConfig {
  trialsCount: number;
  shadowFadingStdDevDb: number;
  indoorProbabilityPercent: number;
  interCellLoadPercent: number;
  spatialDistribution: 'UNIFORM_AREA' | 'UNIFORM_DISTANCE' | 'CELL_EDGE_CLUSTERED';
  seed?: number;
}

// Pseudo-random Gaussian generator using Box-Muller transform
function generateGaussian(mean: number, stdDev: number, randFn: () => number): number {
  const u1 = Math.max(1e-7, randFn());
  const u2 = randFn();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z * stdDev;
}

// Simple seeded pseudo-random generator
function createPrng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function runMonteCarloSimulation(
  result: LinkBudgetCalculationResult,
  inputs: LinkBudgetInputs,
  config: MonteCarloConfig
): { trials: MonteCarloTrial[]; summary: MonteCarloSummary } {
  const {
    trialsCount = 1500,
    shadowFadingStdDevDb = inputs.shadowFadingStdDevDb || 8.0,
    indoorProbabilityPercent = 45,
    interCellLoadPercent = 50,
    spatialDistribution = 'UNIFORM_AREA',
    seed = 42
  } = config;

  const rand = createPrng(seed);
  const currentBand = TELECOM_BANDS.find(b => b.band === inputs.band) || TELECOM_BANDS[0];
  const maxRangeKm = Math.max(0.2, result.maxCellRangeKm);
  const dlMapl = result.dlMaplDb;
  const ulMapl = result.ulMaplDb;
  const targetDlThr = result.serviceSummary.targetDlThroughputMbps;
  const targetUlThr = result.serviceSummary.targetUlThroughputMbps;
  const peakDlThr = result.fourPoints[0].dlThroughputMbps;
  const peakUlThr = result.fourPoints[0].ulThroughputMbps;
  const edgeDlThr = result.fourPoints[3].dlThroughputMbps;
  const edgeUlThr = result.fourPoints[3].ulThroughputMbps;

  const propParams = {
    freqMHz: currentBand.dlFreqMHz,
    hbMeters: inputs.bsHeightMeters,
    hmMeters: inputs.ueHeightMeters,
    model: inputs.propagationModel,
    clutter: inputs.environmentClutter,
    scenario: inputs.indoorOutdoorScenario,
    additionalPenetrationLossDb: inputs.additionalPenetrationLossDb,
    foliageLossDb: inputs.foliageLossDb,
    spmK1Override: inputs.spmK1,
    spmK2Override: inputs.spmK2
  };

  const trials: MonteCarloTrial[] = [];

  for (let i = 0; i < trialsCount; i++) {
    // Generate spatial coordinates (x, y) based on distribution
    let normR: number;
    if (spatialDistribution === 'UNIFORM_AREA') {
      // Area-weighted: proportional to radius (uniform user density per sq km)
      normR = Math.sqrt(rand());
    } else if (spatialDistribution === 'CELL_EDGE_CLUSTERED') {
      // 70% to 110% of cell range for stress testing edge
      normR = 0.65 + rand() * 0.45;
    } else {
      // Uniform distance
      normR = rand();
    }

    const theta = rand() * 2 * Math.PI;
    const distanceKm = Math.max(0.015, normR * maxRangeKm * 1.15);
    const xKm = distanceKm * Math.cos(theta);
    const yKm = distanceKm * Math.sin(theta);

    // Stochastic fading realizations
    const shadowFading = generateGaussian(0, shadowFadingStdDevDb, rand);
    const isIndoor = rand() * 100 < indoorProbabilityPercent;
    const penetrationLoss = isIndoor
      ? (inputs.indoorOutdoorScenario === 'TUNNEL_COVERAGE'
          ? generateGaussian(19.5, 2.2, rand)
          : inputs.indoorOutdoorScenario === 'INDOOR_DEEP'
          ? generateGaussian(24.0, 3.5, rand)
          : generateGaussian(14.0, 2.8, rand))
      : 0.0;
    const bodyLoss = Math.max(0.5, generateGaussian(inputs.bodyLossDb || 3.0, 1.2, rand));

    // Calculate empirical path loss
    const nominalPl = calculatePathLoss(distanceKm, propParams);
    const totalDlPathLoss = Math.max(45, nominalPl + shadowFading + penetrationLoss + bodyLoss);
    const totalUlPathLoss = Math.max(45, nominalPl + shadowFading + penetrationLoss + bodyLoss * 1.1);

    // Received RSRP (dBm)
    const rsrp = result.rsEirpDbm - totalDlPathLoss;

    // Interference penalty based on cell loading
    const interferenceNoisePenaltyDb = (interCellLoadPercent / 100) * 3.8;

    // Downlink SINR & Uplink SINR (dB)
    const normDist = distanceKm / maxRangeKm;
    let dlSinr = 27 - normDist * 28 - (shadowFading > 0 ? shadowFading * 0.45 : shadowFading * 0.25) - interferenceNoisePenaltyDb;
    dlSinr = Math.max(-10, Math.min(30, dlSinr));

    let ulSinr = 24 - normDist * 27 - (shadowFading > 0 ? shadowFading * 0.5 : shadowFading * 0.3) - interferenceNoisePenaltyDb;
    ulSinr = Math.max(-12, Math.min(28, ulSinr));

    // Dynamic Throughput calculation
    let dlThr: number;
    let ulThr: number;

    if (totalDlPathLoss > dlMapl && totalUlPathLoss > ulMapl) {
      dlThr = 0;
      ulThr = 0;
    } else {
      const dlFactor = Math.max(0, Math.min(1.0, (dlMapl - totalDlPathLoss) / (dlMapl - 60)));
      const ulFactor = Math.max(0, Math.min(1.0, (ulMapl - totalUlPathLoss) / (ulMapl - 60)));

      dlThr = Math.max(0, edgeDlThr * 0.2 + (peakDlThr - edgeDlThr * 0.2) * Math.pow(dlFactor, 1.8));
      ulThr = Math.max(0, edgeUlThr * 0.2 + (peakUlThr - edgeUlThr * 0.2) * Math.pow(ulFactor, 1.7));
    }

    // Determine status & bottleneck
    const dlOutage = totalDlPathLoss > dlMapl || dlThr < targetDlThr * 0.35;
    const ulOutage = totalUlPathLoss > ulMapl || ulThr < targetUlThr * 0.35;

    let status: UeStatus;
    let bottleneck: 'DL' | 'UL' | 'NONE' = 'NONE';

    if (dlOutage || ulOutage) {
      status = 'OUTAGE';
      bottleneck = ulOutage && !dlOutage ? 'UL' : dlOutage && !ulOutage ? 'DL' : totalUlPathLoss - ulMapl > totalDlPathLoss - dlMapl ? 'UL' : 'DL';
    } else if (dlThr < targetDlThr || ulThr < targetUlThr) {
      status = 'MARGINAL';
      bottleneck = (dlThr / targetDlThr) < (ulThr / targetUlThr) ? 'DL' : 'UL';
    } else {
      status = 'SATISFIED';
    }

    trials.push({
      id: i + 1,
      xKm,
      yKm,
      distanceKm,
      normalizedDistance: normDist,
      isIndoor,
      shadowFadingDb: Number(shadowFading.toFixed(2)),
      penetrationLossDb: Number(penetrationLoss.toFixed(2)),
      bodyLossDb: Number(bodyLoss.toFixed(2)),
      totalDlPathLossDb: Number(totalDlPathLoss.toFixed(2)),
      totalUlPathLossDb: Number(totalUlPathLoss.toFixed(2)),
      rsrpDbm: Number(rsrp.toFixed(2)),
      dlSinrDb: Number(dlSinr.toFixed(2)),
      ulSinrDb: Number(ulSinr.toFixed(2)),
      dlThroughputMbps: Number(dlThr.toFixed(2)),
      ulThroughputMbps: Number(ulThr.toFixed(2)),
      status,
      bottleneck
    });
  }

  // Statistical calculations
  const satisfiedCount = trials.filter(t => t.status === 'SATISFIED').length;
  const marginalCount = trials.filter(t => t.status === 'MARGINAL').length;
  const outageCount = trials.filter(t => t.status === 'OUTAGE').length;

  const coverageProbabilityPercent = Number(((satisfiedCount / trialsCount) * 100).toFixed(2));
  const outageProbabilityPercent = Number(((outageCount / trialsCount) * 100).toFixed(2));

  const ulLimitedOutages = trials.filter(t => t.status === 'OUTAGE' && t.bottleneck === 'UL').length;
  const dlLimitedOutages = trials.filter(t => t.status === 'OUTAGE' && t.bottleneck === 'DL').length;

  const ulLimitedOutagePercent = outageCount > 0 ? Number(((ulLimitedOutages / outageCount) * 100).toFixed(1)) : 0;
  const dlLimitedOutagePercent = outageCount > 0 ? Number(((dlLimitedOutages / outageCount) * 100).toFixed(1)) : 0;

  // Helper for percentiles
  const getPercentile = (arr: number[], p: number) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
    return Number(sorted[idx].toFixed(2));
  };
  const getMean = (arr: number[]) => {
    return Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2));
  };

  const dlThrs = trials.map(t => t.dlThroughputMbps);
  const ulThrs = trials.map(t => t.ulThroughputMbps);
  const dlSinrs = trials.map(t => t.dlSinrDb);
  const ulSinrs = trials.map(t => t.ulSinrDb);
  const rsrps = trials.map(t => t.rsrpDbm);
  const pls = trials.map(t => t.totalDlPathLossDb);

  // Generate CDF curves (100 points)
  const cdfThroughput: Array<{ percentile: number; dlThr: number; ulThr: number }> = [];
  const cdfSinr: Array<{ percentile: number; dlSinr: number; ulSinr: number }> = [];
  const cdfRsrp: Array<{ percentile: number; rsrp: number }> = [];

  for (let p = 1; p <= 99; p++) {
    cdfThroughput.push({
      percentile: p,
      dlThr: getPercentile(dlThrs, p),
      ulThr: getPercentile(ulThrs, p)
    });
    cdfSinr.push({
      percentile: p,
      dlSinr: getPercentile(dlSinrs, p),
      ulSinr: getPercentile(ulSinrs, p)
    });
    cdfRsrp.push({
      percentile: p,
      rsrp: getPercentile(rsrps, p)
    });
  }

  // RSRP Histogram (12 bins)
  const minRsrp = Math.floor(Math.min(...rsrps));
  const maxRsrp = Math.ceil(Math.max(...rsrps));
  const rsrpBinWidth = Math.max(2, Math.ceil((maxRsrp - minRsrp) / 12));
  const rsrpHistogram: Array<{ binStart: number; binEnd: number; count: number; percentage: number }> = [];

  for (let b = minRsrp; b < maxRsrp; b += rsrpBinWidth) {
    const cnt = rsrps.filter(v => v >= b && v < b + rsrpBinWidth).length;
    rsrpHistogram.push({
      binStart: b,
      binEnd: b + rsrpBinWidth,
      count: cnt,
      percentage: Number(((cnt / trialsCount) * 100).toFixed(1))
    });
  }

  // Path Loss Histogram (12 bins)
  const minPl = Math.floor(Math.min(...pls));
  const maxPl = Math.ceil(Math.max(...pls));
  const plBinWidth = Math.max(3, Math.ceil((maxPl - minPl) / 12));
  const pathLossHistogram: Array<{ binStart: number; binEnd: number; count: number; percentage: number }> = [];

  for (let b = minPl; b < maxPl; b += plBinWidth) {
    const cnt = pls.filter(v => v >= b && v < b + plBinWidth).length;
    pathLossHistogram.push({
      binStart: b,
      binEnd: b + plBinWidth,
      count: cnt,
      percentage: Number(((cnt / trialsCount) * 100).toFixed(1))
    });
  }

  const summary: MonteCarloSummary = {
    totalTrials: trialsCount,
    satisfiedCount,
    marginalCount,
    outageCount,
    coverageProbabilityPercent,
    outageProbabilityPercent,
    ulLimitedOutagePercent,
    dlLimitedOutagePercent,
    dlThroughput: {
      p10: getPercentile(dlThrs, 10),
      p50: getPercentile(dlThrs, 50),
      p90: getPercentile(dlThrs, 90),
      mean: getMean(dlThrs),
      max: Number(Math.max(...dlThrs).toFixed(2))
    },
    ulThroughput: {
      p10: getPercentile(ulThrs, 10),
      p50: getPercentile(ulThrs, 50),
      p90: getPercentile(ulThrs, 90),
      mean: getMean(ulThrs),
      max: Number(Math.max(...ulThrs).toFixed(2))
    },
    dlSinr: {
      p10: getPercentile(dlSinrs, 10),
      p50: getPercentile(dlSinrs, 50),
      p90: getPercentile(dlSinrs, 90),
      mean: getMean(dlSinrs)
    },
    ulSinr: {
      p10: getPercentile(ulSinrs, 10),
      p50: getPercentile(ulSinrs, 50),
      p90: getPercentile(ulSinrs, 90),
      mean: getMean(ulSinrs)
    },
    rsrp: {
      p10: getPercentile(rsrps, 10),
      p50: getPercentile(rsrps, 50),
      p90: getPercentile(rsrps, 90),
      mean: getMean(rsrps)
    },
    pathLoss: {
      p10: getPercentile(pls, 10),
      p50: getPercentile(pls, 50),
      p90: getPercentile(pls, 90),
      mean: getMean(pls)
    },
    cdfThroughput,
    cdfSinr,
    cdfRsrp,
    rsrpHistogram,
    pathLossHistogram
  };

  return { trials, summary };
}
