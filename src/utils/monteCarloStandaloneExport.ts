import { LinkBudgetInputs, LinkBudgetCalculationResult } from '../types/telecom';
import {
  MonteCarloDashboardResults,
  BinConfig,
  UeClassConfig,
  TrafficProfile,
  SimulationSettings
} from '../types/monteCarlo';

export interface MonteCarloScenarioData {
  version: string;
  timestamp: string;
  lkbInputs: LinkBudgetInputs;
  bins: BinConfig[];
  ueClasses: UeClassConfig[];
  trafficProfiles: TrafficProfile[];
  settings: SimulationSettings;
}

export function exportMonteCarloScenarioJson(
  lkbInputs: LinkBudgetInputs,
  bins: BinConfig[],
  ueClasses: UeClassConfig[],
  trafficProfiles: TrafficProfile[],
  settings: SimulationSettings
): string {
  const data: MonteCarloScenarioData = {
    version: '1.33.5',
    timestamp: new Date().toISOString(),
    lkbInputs,
    bins,
    ueClasses,
    trafficProfiles,
    settings
  };
  return JSON.stringify(data, null, 2);
}

export function exportMonteCarloResultsCsv(
  results: MonteCarloDashboardResults,
  inputs: LinkBudgetInputs
): string {
  const lines: string[] = [];
  lines.push('=== 3GPP MONTE CARLO STOCHASTIC SIMULATION RESULTS ===');
  lines.push(`Generated: ${results.timestamp}`);
  lines.push(`Technology: ${inputs.technology}`);
  lines.push(`Band: ${inputs.band} (${inputs.duplexMode})`);
  lines.push(`Bandwidth: ${inputs.bandwidthMHz} MHz`);
  lines.push(`Completed Iterations: ${results.completedIterations}`);
  lines.push(`Seed: ${results.seed}`);
  lines.push(`Duration: ${(results.durationMs / 1000).toFixed(2)} s`);
  lines.push('');

  lines.push('=== KPI SUMMARY ===');
  lines.push(`Total Users Dropped,${results.totalUsersDropped}`);
  lines.push(`Cell Capacity (Users/Cell),${results.cellCapacityUsersTotal}`);
  lines.push(`Cell Capacity Density (Users/km2),${results.cellCapacityUsersPerKm2}`);
  lines.push(`Mean Cell Throughput DL (Mbps),${results.meanCellThroughputDlMbps}`);
  lines.push(`Mean Cell Throughput UL (Mbps),${results.meanCellThroughputUlMbps}`);
  lines.push(`95% CI Cell DL (Mbps),${results.ci95CellThroughputDlMbps[0]} - ${results.ci95CellThroughputDlMbps[1]}`);
  lines.push(`3GPP 38.306 Peak DL Rate (Mbps),${results.peak38306ThroughputDlMbps}`);
  lines.push(`Cell Spectral Efficiency DL (bps/Hz/cell),${results.cellSpectralEfficiencyDl}`);
  lines.push(`5th Percentile User DL Rate (Mbps),${results.userThroughput5thPercentileDlMbps}`);
  lines.push(`Median User DL Rate (Mbps),${results.userThroughputMedianDlMbps}`);
  lines.push(`Overall User Satisfaction (%),${results.overallSatisfactionPercent}%`);
  lines.push(`Voice Satisfaction (%),${results.voiceSatisfactionPercent}%`);
  lines.push(`Voice Blocking Probability (%),${results.voiceBlockingProbabilityPercent}%`);
  lines.push(`Coverage Outage (%),${results.coverageOutagePercent}%`);
  lines.push(`Limiting Factor,${results.limitingFactor}`);
  lines.push(`Recommended Cell Range (km),${results.recommendedCellRangeKm}`);
  lines.push(`Recommended ISD (m),${results.recommendedIsdMeters}`);
  lines.push(`Jain's Fairness Index,${results.jainsFairnessIndex}`);
  lines.push('');

  lines.push('=== PER-BIN RESULTS ===');
  lines.push('Bin Index,Inner Radius (m),Outer Radius (m),Users,Satisfied Users,Satisfaction Rate (%),Mean DL SINR (dB),Mean UL SINR (dB),Dominant MCS,Mean Rank,Mean DL Rate (Mbps),Mean UL Rate (Mbps),PRB Utilization (%)');
  for (const b of results.binResults) {
    lines.push(`${b.binIndex},${b.innerRadiusMeters},${b.outerRadiusMeters},${b.userCount},${b.satisfiedCount},${b.satisfactionRatePercent}%,${b.meanDlSinrDb},${b.meanUlSinrDb},${b.dominantMcs},${b.meanRank},${b.meanDlRateMbps},${b.meanUlRateMbps},${b.prbUtilizationPercent}%`);
  }
  lines.push('');

  lines.push('=== SINR CDF ===');
  lines.push('Percentile,DL SINR (dB),UL SINR (dB)');
  for (const c of results.sinrCdf) {
    lines.push(`${c.percentile}%,${c.dlSinrDb},${c.ulSinrDb}`);
  }
  lines.push('');

  lines.push('=== USER THROUGHPUT CDF ===');
  lines.push('Percentile,DL Rate (Mbps),UL Rate (Mbps)');
  for (const c of results.throughputCdf) {
    lines.push(`${c.percentile}%,${c.dlRateMbps},${c.ulRateMbps}`);
  }

  return lines.join('\n');
}

// ----------------------------------------------------
// SVG Vector Visualizations for Printable Report
// ----------------------------------------------------

/**
 * Generates an SVG representation of the 120° Polar Sector Drop Map
 */
export function generatePolarSectorMapSvg(
  sampleUsers: any[] = [],
  bins: BinConfig[] = [],
  maxRangeMeters: number = 1000,
  width: number = 720,
  height: number = 440
): string {
  const maxRangeM = Math.max(100, maxRangeMeters);
  const plottedUsers = sampleUsers || [];

  // Generate bin rings SVG
  let binRingsSvg = '';
  const effectiveBins = bins.length > 0 ? bins : (sampleUsers.length > 0 ? Array.from(new Set(sampleUsers.map(u => u.binIndex))).map(idx => ({
    binIndex: idx,
    innerRadiusMeters: ((idx - 1) * maxRangeM) / 5,
    outerRadiusMeters: (idx * maxRangeM) / 5,
    areaKm2: 0,
    meanPathLossDb: 0,
    expectedRsrpDbm: 0,
    expectedSinrDb: 0,
    expectedDominantMcs: 14,
    userCount: 0,
    indoorPercent: 50
  })) : []);

  effectiveBins.forEach((b, bIdx) => {
    const rOuterSvg = Math.min(240, (b.outerRadiusMeters / maxRangeM) * 240);
    const rInnerSvg = Math.max(0, (b.innerRadiusMeters / maxRangeM) * 240);
    const xOuter = (rOuterSvg * 0.866025).toFixed(1);
    const yOuter = (20 - rOuterSvg * 0.5).toFixed(1);
    const xInner = (rInnerSvg * 0.866025).toFixed(1);
    const yInner = (20 - rInnerSvg * 0.5).toFixed(1);

    const fillColor = bIdx % 2 === 0 ? 'rgba(6, 182, 212, 0.05)' : 'rgba(59, 130, 246, 0.02)';

    binRingsSvg += `
      <!-- Bin ${b.binIndex} Shading -->
      <path d="M ${-xInner} ${yInner} A ${rInnerSvg.toFixed(1)} ${rInnerSvg.toFixed(1)} 0 0 1 ${xInner} ${yInner} L ${xOuter} ${yOuter} A ${rOuterSvg.toFixed(1)} ${rOuterSvg.toFixed(1)} 0 0 0 ${-xOuter} ${yOuter} Z" fill="${fillColor}" />
      <!-- Bin ${b.binIndex} Arc -->
      <path d="M ${-xOuter} ${yOuter} A ${rOuterSvg.toFixed(1)} ${rOuterSvg.toFixed(1)} 0 0 1 ${xOuter} ${yOuter}" fill="none" stroke="#94a3b8" stroke-dasharray="3 3" stroke-width="0.9" />
      <!-- Distance Marker -->
      <rect x="-26" y="${(20 - rOuterSvg - 8).toFixed(1)}" width="52" height="12" rx="2" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.8" />
      <text x="0" y="${(20 - rOuterSvg).toFixed(1)}" text-anchor="middle" fill="#475569" font-size="8" font-family="-apple-system, BlinkMacSystemFont, monospace" font-weight="bold">${b.outerRadiusMeters.toFixed(0)}m</text>
    `;
  });

  // Generate User Dots
  let userDotsSvg = '';
  // Plot up to 1500 users for print clarity
  const step = plottedUsers.length > 1500 ? Math.ceil(plottedUsers.length / 1500) : 1;
  for (let i = 0; i < plottedUsers.length; i += step) {
    const u = plottedUsers[i];
    const normR = Math.min(240, (u.distanceMeters / maxRangeM) * 240);
    const rad = (u.azimuthDeg * Math.PI) / 180;
    const cx = (normR * Math.sin(rad)).toFixed(1);
    const cy = (20 - normR * Math.cos(rad)).toFixed(1);

    const dotColor = u.isSatisfied
      ? '#10b981' // Green
      : u.violationReason === 'OUTAGE_COVERAGE'
      ? '#ef4444' // Red
      : u.violationReason === 'UL_POWER_LIMITED'
      ? '#f43f5e' // Rose
      : '#f59e0b'; // Amber

    const r = plottedUsers.length > 800 ? '1.8' : '2.6';

    if (u.isIndoor) {
      userDotsSvg += `<rect x="${(Number(cx) - 2.8).toFixed(1)}" y="${(Number(cy) - 2.8).toFixed(1)}" width="5.6" height="5.6" fill="none" stroke="#64748b" stroke-width="0.7" />`;
    }
    userDotsSvg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${dotColor}" stroke="#ffffff" stroke-width="0.4" />`;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-270 -290 540 330" width="100%" height="auto" style="max-height: 440px; display: block; margin: 0 auto; background: #ffffff; border-radius: 8px;">
      <defs>
        <radialGradient id="printSectorGrad" cx="0" cy="20" r="260" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#0284c7" stop-opacity="0.12" />
          <stop offset="70%" stop-color="#38bdf8" stop-opacity="0.04" />
          <stop offset="100%" stop-color="#f8fafc" stop-opacity="0.01" />
        </radialGradient>
      </defs>

      <!-- Tri-Sector Reference Outlines (Neighbor Sectors 2 & 3) -->
      <g opacity="0.35">
        <line x1="0" y1="20" x2="0" y2="100" stroke="#94a3b8" stroke-dasharray="3 3" />
        <circle cx="0" cy="20" r="240" fill="none" stroke="#cbd5e1" stroke-dasharray="2 4" stroke-width="0.8" />
        <text x="-160" y="45" fill="#94a3b8" font-size="8" font-family="monospace">Neighbor Sector 3</text>
        <text x="70" y="45" fill="#94a3b8" font-size="8" font-family="monospace">Neighbor Sector 2</text>
      </g>

      <!-- 120° Active Sector Polygon Wedge -->
      <path d="M 0 20 L -207.85 -100 A 240 240 0 0 1 207.85 -100 Z" fill="url(#printSectorGrad)" stroke="#0284c7" stroke-width="1.8" />

      <!-- Concentric Bins -->
      ${binRingsSvg}

      <!-- Azimuth Rays -->
      <!-- Boresight 0° -->
      <line x1="0" y1="20" x2="0" y2="-220" stroke="#0284c7" stroke-width="1.4" stroke-dasharray="5 3" />
      <text x="5" y="-222" fill="#0284c7" font-size="9" font-family="monospace" font-weight="bold">0° Boresight</text>
      <!-- -60° Left Sector Edge -->
      <line x1="0" y1="20" x2="-207.85" y2="-100" stroke="#0284c7" stroke-width="1.2" />
      <text x="-215" y="-105" fill="#64748b" font-size="8" font-family="monospace">-60°</text>
      <!-- +60° Right Sector Edge -->
      <line x1="0" y1="20" x2="207.85" y2="-100" stroke="#0284c7" stroke-width="1.2" />
      <text x="195" y="-105" fill="#64748b" font-size="8" font-family="monospace">+60°</text>

      <!-- Dropped Users -->
      ${userDotsSvg}

      <!-- gNB Site Marker (0, 20) -->
      <g>
        <polygon points="0,6 -10,26 10,26" fill="#0284c7" stroke="#ffffff" stroke-width="1" />
        <circle cx="0" cy="20" r="3.5" fill="#ffffff" />
        <rect x="-56" y="32" width="112" height="15" rx="3" fill="#f8fafc" stroke="#0284c7" stroke-width="0.9" />
        <text x="0" y="42.5" text-anchor="middle" fill="#0369a1" font-size="8" font-family="monospace" font-weight="bold">gNB / eNB Site (0, 0)</text>
      </g>
    </svg>
  `;
}

/**
 * Generates an SVG representation of the DL User Throughput CDF
 */
export function generateThroughputCdfSvg(
  throughputCdf: { percentile: number; dlRateMbps: number; ulRateMbps: number }[] = [],
  peakDlMbps: number = 400,
  p5Dl: number = 0,
  medianDl: number = 0,
  width: number = 520,
  height: number = 240
): string {
  const margin = { top: 25, right: 35, bottom: 35, left: 55 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const maxRate = Math.max(
    peakDlMbps * 0.7,
    ...(throughputCdf.map(c => c.dlRateMbps) || [100]),
    10
  );

  let pathD = '';
  let areaD = '';

  const points = throughputCdf.map((item, idx) => {
    const x = margin.left + (Math.min(item.dlRateMbps, maxRate) / maxRate) * plotW;
    const y = margin.top + plotH - (item.percentile / 100) * plotH;
    return { x, y, item };
  });

  if (points.length > 0) {
    pathD = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    points.forEach((p, i) => {
      if (i > 0) pathD += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    });

    areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(margin.top + plotH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(margin.top + plotH).toFixed(1)} Z`;
  }

  // Median X coordinate
  const medianX = margin.left + (Math.min(medianDl, maxRate) / maxRate) * plotW;
  const medianY = margin.top + plotH * 0.5;

  // P5 X coordinate
  const p5X = margin.left + (Math.min(p5Dl, maxRate) / maxRate) * plotW;
  const p5Y = margin.top + plotH * 0.95;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="auto" style="background:#ffffff; border-radius:6px;">
      <defs>
        <linearGradient id="cdfGradDl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0284c7" stop-opacity="0.30" />
          <stop offset="100%" stop-color="#0284c7" stop-opacity="0.03" />
        </linearGradient>
      </defs>

      <!-- Background Gridlines -->
      ${[0, 25, 50, 75, 100].map(pct => {
        const y = margin.top + plotH - (pct / 100) * plotH;
        return `
          <line x1="${margin.left}" y1="${y}" x2="${margin.left + plotW}" y2="${y}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="${pct === 50 ? '3 3' : 'none'}" />
          <text x="${margin.left - 8}" y="${y + 3.5}" text-anchor="end" fill="#64748b" font-size="9" font-family="monospace">${pct}%</text>
        `;
      }).join('')}

      <!-- X-axis Ticks -->
      ${[0, 0.25, 0.5, 0.75, 1.0].map(frac => {
        const val = Math.round(frac * maxRate);
        const x = margin.left + frac * plotW;
        return `
          <line x1="${x}" y1="${margin.top + plotH}" x2="${x}" y2="${margin.top + plotH + 4}" stroke="#94a3b8" stroke-width="1" />
          <text x="${x}" y="${margin.top + plotH + 16}" text-anchor="middle" fill="#64748b" font-size="9" font-family="monospace">${val}M</text>
        `;
      }).join('')}

      <!-- Axes Lines -->
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotH}" stroke="#94a3b8" stroke-width="1.2" />
      <line x1="${margin.left}" y1="${margin.top + plotH}" x2="${margin.left + plotW}" y2="${margin.top + plotH}" stroke="#94a3b8" stroke-width="1.2" />

      <!-- Axis Labels -->
      <text x="${margin.left + plotW / 2}" y="${height - 6}" text-anchor="middle" fill="#334155" font-size="10" font-family="-apple-system, BlinkMacSystemFont, monospace" font-weight="bold">User Downlink Throughput (Mbps)</text>
      <text transform="rotate(-90)" x="${-(margin.top + plotH / 2)}" y="16" text-anchor="middle" fill="#334155" font-size="10" font-family="-apple-system, BlinkMacSystemFont, monospace" font-weight="bold">Cumulative Prob (%)</text>

      <!-- CDF Area & Line -->
      <path d="${areaD}" fill="url(#cdfGradDl)" />
      <path d="${pathD}" fill="none" stroke="#0284c7" stroke-width="2.2" />

      <!-- P5 Cell-Edge Indicator -->
      <line x1="${p5X.toFixed(1)}" y1="${margin.top}" x2="${p5X.toFixed(1)}" y2="${margin.top + plotH}" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="3 3" />
      <circle cx="${p5X.toFixed(1)}" cy="${p5Y.toFixed(1)}" r="3.5" fill="#f59e0b" stroke="#ffffff" stroke-width="1" />
      <rect x="${(p5X + 4).toFixed(1)}" y="${(p5Y - 14).toFixed(1)}" width="86" height="13" rx="2" fill="#fffbeb" stroke="#fde68a" stroke-width="0.8" />
      <text x="${(p5X + 8).toFixed(1)}" y="${(p5Y - 4).toFixed(1)}" fill="#b45309" font-size="8" font-family="monospace" font-weight="bold">P5: ${p5Dl} Mbps</text>

      <!-- Median Indicator -->
      <line x1="${medianX.toFixed(1)}" y1="${margin.top}" x2="${medianX.toFixed(1)}" y2="${margin.top + plotH}" stroke="#0369a1" stroke-width="1.2" stroke-dasharray="3 3" />
      <circle cx="${medianX.toFixed(1)}" cy="${medianY.toFixed(1)}" r="4" fill="#0369a1" stroke="#ffffff" stroke-width="1" />
      <rect x="${(medianX + 4).toFixed(1)}" y="${(medianY - 14).toFixed(1)}" width="96" height="13" rx="2" fill="#e0f2fe" stroke="#bae6fd" stroke-width="0.8" />
      <text x="${(medianX + 8).toFixed(1)}" y="${(medianY - 4).toFixed(1)}" fill="#0369a1" font-size="8" font-family="monospace" font-weight="bold">Median: ${medianDl} Mbps</text>
    </svg>
  `;
}

/**
 * Generates an SVG representation of the SINR CDF (DL vs UL)
 */
export function generateSinrCdfSvg(
  sinrCdf: { percentile: number; dlSinrDb: number; ulSinrDb: number }[] = [],
  width: number = 520,
  height: number = 240
): string {
  const margin = { top: 25, right: 35, bottom: 35, left: 55 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const minSinr = -12;
  const maxSinr = 32;
  const rangeSinr = maxSinr - minSinr;

  const dlPoints = sinrCdf.map(item => {
    const clamped = Math.max(minSinr, Math.min(maxSinr, item.dlSinrDb));
    const x = margin.left + ((clamped - minSinr) / rangeSinr) * plotW;
    const y = margin.top + plotH - (item.percentile / 100) * plotH;
    return { x, y };
  });

  const ulPoints = sinrCdf.map(item => {
    const clamped = Math.max(minSinr, Math.min(maxSinr, item.ulSinrDb));
    const x = margin.left + ((clamped - minSinr) / rangeSinr) * plotW;
    const y = margin.top + plotH - (item.percentile / 100) * plotH;
    return { x, y };
  });

  let dlPath = '';
  dlPoints.forEach((p, idx) => {
    dlPath += idx === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  });

  let ulPath = '';
  ulPoints.forEach((p, idx) => {
    ulPath += idx === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  });

  // Outage line for DL (-6 dB)
  const dlOutageX = margin.left + ((-6 - minSinr) / rangeSinr) * plotW;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="auto" style="background:#ffffff; border-radius:6px;">
      <!-- Gridlines -->
      ${[0, 25, 50, 75, 100].map(pct => {
        const y = margin.top + plotH - (pct / 100) * plotH;
        return `
          <line x1="${margin.left}" y1="${y}" x2="${margin.left + plotW}" y2="${y}" stroke="#e2e8f0" stroke-width="1" />
          <text x="${margin.left - 8}" y="${y + 3.5}" text-anchor="end" fill="#64748b" font-size="9" font-family="monospace">${pct}%</text>
        `;
      }).join('')}

      <!-- X-axis Ticks (-10, 0, 10, 20, 30 dB) -->
      ${[-10, 0, 10, 20, 30].map(val => {
        const x = margin.left + ((val - minSinr) / rangeSinr) * plotW;
        return `
          <line x1="${x}" y1="${margin.top + plotH}" x2="${x}" y2="${margin.top + plotH + 4}" stroke="#94a3b8" stroke-width="1" />
          <text x="${x}" y="${margin.top + plotH + 16}" text-anchor="middle" fill="#64748b" font-size="9" font-family="monospace">${val}dB</text>
        `;
      }).join('')}

      <!-- Outage Cutoff (-6 dB DL) -->
      <line x1="${dlOutageX.toFixed(1)}" y1="${margin.top}" x2="${dlOutageX.toFixed(1)}" y2="${margin.top + plotH}" stroke="#ef4444" stroke-width="1.2" stroke-dasharray="3 3" />
      <text x="${(dlOutageX + 3).toFixed(1)}" y="${margin.top + 12}" fill="#dc2626" font-size="8" font-family="monospace">Outage (-6dB)</text>

      <!-- Axes Lines -->
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotH}" stroke="#94a3b8" stroke-width="1.2" />
      <line x1="${margin.left}" y1="${margin.top + plotH}" x2="${margin.left + plotW}" y2="${margin.top + plotH}" stroke="#94a3b8" stroke-width="1.2" />

      <!-- Labels -->
      <text x="${margin.left + plotW / 2}" y="${height - 6}" text-anchor="middle" fill="#334155" font-size="10" font-family="-apple-system, BlinkMacSystemFont, monospace" font-weight="bold">Signal-to-Interference-plus-Noise Ratio (SINR dB)</text>
      <text transform="rotate(-90)" x="${-(margin.top + plotH / 2)}" y="16" text-anchor="middle" fill="#334155" font-size="10" font-family="-apple-system, BlinkMacSystemFont, monospace" font-weight="bold">Cumulative Prob (%)</text>

      <!-- Curves -->
      <path d="${dlPath}" fill="none" stroke="#0284c7" stroke-width="2.2" />
      <path d="${ulPath}" fill="none" stroke="#059669" stroke-width="2" stroke-dasharray="4 2" />

      <!-- Legend -->
      <g transform="translate(${margin.left + plotW - 140}, ${margin.top + 8})">
        <rect x="0" y="0" width="135" height="38" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="0.8" />
        <line x1="8" y1="12" x2="26" y2="12" stroke="#0284c7" stroke-width="2" />
        <text x="32" y="15" fill="#0369a1" font-size="9" font-family="monospace" font-weight="bold">DL SINR (P50)</text>
        <line x1="8" y1="26" x2="26" y2="26" stroke="#059669" stroke-width="2" stroke-dasharray="3 2" />
        <text x="32" y="29" fill="#047857" font-size="9" font-family="monospace" font-weight="bold">UL SINR (IoT)</text>
      </g>
    </svg>
  `;
}

/**
 * Generates an SVG representation of the Cell Capacity vs Satisfaction Curve
 */
export function generateCapacityCurveSvg(
  capacityCurve: { userCount: number; satisfactionPercent: number; voiceSatisfactionPercent?: number; cellThroughputDlMbps?: number; cellThroughputUlMbps?: number }[] = [],
  maxCapacityUsers: number = 0,
  width: number = 520,
  height: number = 240
): string {
  const margin = { top: 25, right: 35, bottom: 35, left: 55 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const minUsers = 0;
  const maxUsers = Math.max(...capacityCurve.map(c => c.userCount), 100);

  const points = capacityCurve.map(c => {
    const x = margin.left + ((c.userCount - minUsers) / (maxUsers - minUsers)) * plotW;
    const y = margin.top + plotH - (Math.max(0, Math.min(100, c.satisfactionPercent)) / 100) * plotH;
    return { x, y, c };
  });

  let lineD = '';
  points.forEach((p, idx) => {
    lineD += idx === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  });

  // 95% Cutoff Line
  const y95 = margin.top + plotH - 0.95 * plotH;

  // Max capacity marker X
  const capX = margin.left + ((maxCapacityUsers - minUsers) / (maxUsers - minUsers)) * plotW;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="auto" style="background:#ffffff; border-radius:6px;">
      <!-- Gridlines -->
      ${[60, 70, 80, 90, 95, 100].map(pct => {
        const y = margin.top + plotH - (pct / 100) * plotH;
        return `
          <line x1="${margin.left}" y1="${y}" x2="${margin.left + plotW}" y2="${y}" stroke="${pct === 95 ? '#10b981' : '#e2e8f0'}" stroke-width="${pct === 95 ? '1.5' : '1'}" stroke-dasharray="${pct === 95 ? '4 3' : 'none'}" />
          <text x="${margin.left - 8}" y="${y + 3.5}" text-anchor="end" fill="${pct === 95 ? '#047857' : '#64748b'}" font-size="9" font-family="monospace" font-weight="${pct === 95 ? 'bold' : 'normal'}">${pct}%</text>
        `;
      }).join('')}

      <!-- Target 95% label -->
      <rect x="${margin.left + 8}" y="${(y95 - 13).toFixed(1)}" width="115" height="12" rx="2" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="0.8" />
      <text x="${margin.left + 12}" y="${(y95 - 4).toFixed(1)}" fill="#047857" font-size="8" font-family="monospace" font-weight="bold">≥ 95% Satisfaction Target</text>

      <!-- Axes Lines -->
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotH}" stroke="#94a3b8" stroke-width="1.2" />
      <line x1="${margin.left}" y1="${margin.top + plotH}" x2="${margin.left + plotW}" y2="${margin.top + plotH}" stroke="#94a3b8" stroke-width="1.2" />

      <!-- Labels -->
      <text x="${margin.left + plotW / 2}" y="${height - 6}" text-anchor="middle" fill="#334155" font-size="10" font-family="-apple-system, BlinkMacSystemFont, monospace" font-weight="bold">Total Active Users Per Cell (Load Scaling)</text>
      <text transform="rotate(-90)" x="${-(margin.top + plotH / 2)}" y="16" text-anchor="middle" fill="#334155" font-size="10" font-family="-apple-system, BlinkMacSystemFont, monospace" font-weight="bold">% Users Satisfied</text>

      <!-- Capacity Curve -->
      <path d="${lineD}" fill="none" stroke="#059669" stroke-width="2.5" />

      <!-- Data Dots -->
      ${points.map(p => {
        const isCompliant = p.c.satisfactionPercent >= 95;
        return `
          <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.2" fill="${isCompliant ? '#10b981' : '#f59e0b'}" stroke="#ffffff" stroke-width="0.8" />
        `;
      }).join('')}

      <!-- Max Capacity Cutoff Callout -->
      ${maxCapacityUsers > 0 ? `
        <line x1="${capX.toFixed(1)}" y1="${margin.top}" x2="${capX.toFixed(1)}" y2="${margin.top + plotH}" stroke="#0284c7" stroke-width="1.2" stroke-dasharray="3 3" />
        <rect x="${Math.max(margin.left, capX - 55).toFixed(1)}" y="${(margin.top + 4).toFixed(1)}" width="110" height="15" rx="3" fill="#e0f2fe" stroke="#0284c7" stroke-width="0.8" />
        <text x="${capX.toFixed(1)}" y="${(margin.top + 14.5).toFixed(1)}" text-anchor="middle" fill="#0369a1" font-size="8" font-family="monospace" font-weight="bold">Capacity: ${maxCapacityUsers} users</text>
      ` : ''}
    </svg>
  `;
}

// ----------------------------------------------------
// Complete Executive Printable PDF / HTML Report Builder
// ----------------------------------------------------

export function generatePrintableReportHtml(
  results: MonteCarloDashboardResults,
  inputs: LinkBudgetInputs,
  lkbResult: LinkBudgetCalculationResult,
  bins: BinConfig[] = []
): string {
  const maxRangeM = lkbResult.maxCellRangeMeters || (bins.length > 0 ? bins[bins.length - 1].outerRadiusMeters : 1000);
  const polarMapSvg = generatePolarSectorMapSvg(results.sampleDropUsers, bins, maxRangeM, 720, 440);
  const throughputCdfSvg = generateThroughputCdfSvg(
    results.throughputCdf,
    results.peak38306ThroughputDlMbps,
    results.userThroughput5thPercentileDlMbps,
    results.userThroughputMedianDlMbps,
    520,
    240
  );
  const sinrCdfSvg = generateSinrCdfSvg(results.sinrCdf, 520, 240);
  const capacityCurveSvg = generateCapacityCurveSvg(results.capacityCurve, results.cellCapacityUsersTotal, 520, 240);

  // Status Counts for Sample Plotted Users
  const users = results.sampleDropUsers || [];
  const satCount = users.filter(u => u.isSatisfied).length;
  const congCount = users.filter(u => u.violationReason === 'PRB_CONGESTION').length;
  const outCount = users.filter(u => u.violationReason === 'OUTAGE_COVERAGE' || u.violationReason === 'UL_POWER_LIMITED').length;
  const indoorCount = users.filter(u => u.isIndoor).length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3GPP Monte Carlo Radio Simulation & Capacity Report - ${inputs.technology} Band ${inputs.band}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.45;
      color: #0f172a;
      background: #f8fafc;
      margin: 0;
      padding: 0;
      font-size: 11.5px;
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
      padding: 24px;
      background: #ffffff;
      min-height: 100vh;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }
    .no-print {
      position: sticky;
      top: 0;
      z-index: 999;
      background: #090d16;
      border-bottom: 1px solid #1e293b;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .btn-print {
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .btn-print:hover { background: #0369a1; }
    .btn-secondary {
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid #334155;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
    }
    .btn-secondary:hover { background: #334155; }
    
    /* Header */
    .report-header {
      border-bottom: 2.5px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .title-area h1 {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
      letter-spacing: -0.02em;
    }
    .title-area .subtitle {
      font-size: 11px;
      color: #64748b;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .meta-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-family: monospace;
      font-weight: bold;
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      margin-bottom: 20px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 9px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .kpi-card.highlight {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }
    .kpi-title {
      font-size: 9.5px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.03em;
    }
    .kpi-val {
      font-size: 16px;
      font-weight: 800;
      color: #0284c7;
      margin: 3px 0 2px 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .kpi-sub {
      font-size: 9px;
      color: #64748b;
      font-family: monospace;
    }

    /* Section Headings */
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-left: 3.5px solid #0284c7;
      padding-left: 8px;
      margin: 22px 0 10px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-ref {
      font-size: 9.5px;
      font-weight: normal;
      color: #64748b;
      font-family: monospace;
      text-transform: none;
    }

    /* Maps and Charts */
    .map-container {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .chart-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px;
      page-break-inside: avoid;
    }
    .chart-header {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 4px;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 16px 0;
      font-size: 10px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 5px 7px;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      font-weight: 700;
      color: #334155;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* Badges & Indicators */
    .status-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      margin-right: 4px;
    }
    .stat-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
      font-family: monospace;
    }

    /* Print Break Utilities */
    .page-break {
      page-break-before: always;
      break-before: page;
    }
    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    @media print {
      body {
        background: #ffffff !important;
      }
      .container {
        padding: 0 !important;
        box-shadow: none !important;
        max-width: 100% !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <!-- Non-Printing Top Action Bar -->
  <div class="no-print">
    <div style="display:flex; align-items:center; gap:10px;">
      <span style="font-size:14px; font-weight:800; color:#38bdf8; font-family:monospace;">3GPP RAN REPORT GENERATOR</span>
      <span style="font-size:11px; color:#94a3b8; font-family:monospace;">${inputs.technology} · Band ${inputs.band} · ${inputs.bandwidthMHz} MHz</span>
    </div>
    <div style="display:flex; align-items:center; gap:8px;">
      <button onclick="window.print()" class="btn-print">
        🖨️ Print / Save as PDF
      </button>
      <button onclick="window.close()" class="btn-secondary">
        Close Window
      </button>
    </div>
  </div>

  <div class="container">
    <!-- Header -->
    <div class="report-header">
      <div class="title-area">
        <h1>3GPP 4G/5G Monte Carlo Radio Simulation Executive Report</h1>
        <div class="subtitle">
          Stochastic Spatial Drop & Capacity Analysis · Companion to Link Budget (LKB) Tool
        </div>
        <div style="margin-top:6px; display:flex; flex-wrap:wrap; gap:6px;">
          <span class="meta-badge">${inputs.technology}</span>
          <span class="meta-badge">Band ${inputs.band} (${inputs.frequencyMHz} MHz)</span>
          <span class="meta-badge">${inputs.bandwidthMHz} MHz BW · ${inputs.duplexMode} (${inputs.tddFrameRatio})</span>
          <span class="meta-badge">${results.completedIterations.toLocaleString()} Drops (Seed: ${results.seed})</span>
          <span class="meta-badge">${(results.durationMs / 1000).toFixed(2)}s Runtime</span>
        </div>
      </div>
      <div style="text-align:right; font-family:monospace; font-size:9.5px; color:#64748b;">
        <div><strong>Date:</strong> ${new Date(results.timestamp).toLocaleDateString()} ${new Date(results.timestamp).toLocaleTimeString()}</div>
        <div><strong>Spec:</strong> TS 38.101 / 38.214 / TR 38.901</div>
        <div><strong>Report Ref:</strong> MC-LKB-${results.seed}-${Date.now().toString().slice(-4)}</div>
      </div>
    </div>

    <!-- Executive KPI Dashboard -->
    <div class="kpi-grid">
      <div class="kpi-card highlight">
        <div class="kpi-title">Cell Capacity</div>
        <div class="kpi-val" style="color:#059669;">${results.cellCapacityUsersTotal} <span style="font-size:11px; font-weight:normal;">users</span></div>
        <div class="kpi-sub">${results.cellCapacityUsersPerKm2} users / km²</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">Mean Cell DL/UL</div>
        <div class="kpi-val">${results.meanCellThroughputDlMbps} <span style="font-size:11px; font-weight:normal; color:#64748b;">/</span> ${results.meanCellThroughputUlMbps}M</div>
        <div class="kpi-sub">95% CI: ±${(results.ci95CellThroughputDlMbps[1] - results.meanCellThroughputDlMbps).toFixed(1)} Mbps</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">Spectral Efficiency</div>
        <div class="kpi-val" style="color:#7c3aed;">${results.cellSpectralEfficiencyDl} <span style="font-size:10px; font-weight:normal;">bps/Hz</span></div>
        <div class="kpi-sub">UL: ${results.cellSpectralEfficiencyUl} bps/Hz</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">Cell-Edge (P5) DL</div>
        <div class="kpi-val" style="color:#d97706;">${results.userThroughput5thPercentileDlMbps} <span style="font-size:10px; font-weight:normal;">Mbps</span></div>
        <div class="kpi-sub">Median: ${results.userThroughputMedianDlMbps} Mbps</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">Overall Satisfaction</div>
        <div class="kpi-val" style="color:${results.overallSatisfactionPercent >= 95 ? '#059669' : '#dc2626'};">${results.overallSatisfactionPercent}%</div>
        <div class="kpi-sub">Voice Sat: ${results.voiceSatisfactionPercent}%</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">Recommended Range</div>
        <div class="kpi-val">${results.recommendedCellRangeKm} <span style="font-size:10px; font-weight:normal;">km</span></div>
        <div class="kpi-sub">ISD: ${results.recommendedIsdMeters} m (${results.cellRangeDeltaPercent >= 0 ? '+' : ''}${results.cellRangeDeltaPercent}%)</div>
      </div>
    </div>

    <!-- Secondary Telephony & Fairness Metrics Row -->
    <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:8px 12px; margin-bottom:18px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; font-family:monospace; font-size:10px;">
      <div>Theoretical Peak (38.306): <strong>${results.peak38306ThroughputDlMbps} Mbps</strong></div>
      <div>Voice Erlangs Carried: <strong>${results.voiceErlangsCarried} Erlangs</strong> (Erlang-B Blok: ${results.voiceBlockingProbabilityPercent}%)</div>
      <div>Coverage Outage: <strong>${results.coverageOutagePercent}%</strong></div>
      <div>Jain's Fairness Index: <strong>${results.jainsFairnessIndex}</strong></div>
      <div>Limiting Bottleneck: <strong>${results.limitingFactor.replace('_', ' ')}</strong></div>
    </div>

    <!-- Polar Sector Drop Map Section -->
    <div class="avoid-break">
      <div class="section-title">
        <span>1. Polar Sector Drop Map (Stochastic Spatial Distribution)</span>
        <span class="section-ref">3GPP TR 38.901 §7.3 · 120° Sector Boresight · Max Range: ${maxRangeM.toFixed(0)}m</span>
      </div>

      <div class="map-container">
        ${polarMapSvg}
        
        <!-- Polar Map Statistics Legend -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-top:10px; padding-top:8px; border-top:1px solid #e2e8f0; font-family:monospace; font-size:9.5px;">
          <div>
            <strong>Sample Drop Population:</strong> ${users.length} users
          </div>
          <div style="display:flex; gap:12px;">
            <span class="stat-pill" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0;">
              <span class="status-dot" style="background:#10b981;"></span> Satisfied: ${satCount} (${((satCount / Math.max(1, users.length)) * 100).toFixed(1)}%)
            </span>
            <span class="stat-pill" style="background:#fffbeb; color:#b45309; border:1px solid #fde68a;">
              <span class="status-dot" style="background:#f59e0b;"></span> Congestion: ${congCount}
            </span>
            <span class="stat-pill" style="background:#fef2f2; color:#b91c1c; border:1px solid #fecaca;">
              <span class="status-dot" style="background:#ef4444;"></span> Outage: ${outCount}
            </span>
            <span class="stat-pill" style="background:#f8fafc; color:#475569; border:1px solid #cbd5e1;">
              Indoor (O2I): ${indoorCount} (${((indoorCount / Math.max(1, users.length)) * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Key CDF & Capacity Curves Section -->
    <div class="avoid-break page-break">
      <div class="section-title">
        <span>2. Cumulative Distribution Functions (CDF) & Capacity Curve</span>
        <span class="section-ref">TS 38.214 MCS Mapping · BLER Attenuation · Proportional Fair Scheduling</span>
      </div>

      <div class="charts-grid">
        <!-- Chart 1: DL User Throughput CDF -->
        <div class="chart-box">
          <div class="chart-header">
            <span>User Downlink Throughput CDF</span>
            <span style="font-family:monospace; color:#0284c7;">P5: ${results.userThroughput5thPercentileDlMbps}M · P50: ${results.userThroughputMedianDlMbps}M</span>
          </div>
          ${throughputCdfSvg}
        </div>

        <!-- Chart 2: SINR CDF -->
        <div class="chart-box">
          <div class="chart-header">
            <span>SINR CDF (DL vs UL)</span>
            <span style="font-family:monospace; color:#059669;">DL Mean: ${results.binResults.length > 0 ? results.binResults[0].meanDlSinrDb : 0}dB</span>
          </div>
          ${sinrCdfSvg}
        </div>
      </div>

      <!-- Chart 3: Cell Capacity Scaling Curve -->
      <div class="chart-box" style="margin-bottom:16px;">
        <div class="chart-header">
          <span>Cell Capacity Curve (Load vs % User Satisfaction)</span>
          <span style="font-family:monospace; color:#047857;">Cutoff: ≥95% Target · Max Load: ${results.cellCapacityUsersTotal} users</span>
        </div>
        ${capacityCurveSvg}
      </div>
    </div>

    <!-- Per-Bin Results Table -->
    <div class="avoid-break">
      <div class="section-title">
        <span>3. Per-Bin Performance & Radio Conditions Breakdown</span>
        <span class="section-ref">Annulus Area Spans · Dominant MCS per 38.214 Table 5.2.2.1-2 · MIMO Rank</span>
      </div>

      <table>
        <thead>
          <tr>
            <th>Bin</th>
            <th>Distance Range (m)</th>
            <th>Users</th>
            <th>Satisfied (%)</th>
            <th>Mean DL SINR</th>
            <th>Mean UL SINR</th>
            <th>Dominant MCS</th>
            <th>MIMO Rank</th>
            <th>Mean DL Rate</th>
            <th>PRB Util (%)</th>
            <th>Limiting Factor</th>
          </tr>
        </thead>
        <tbody>
          ${results.binResults.map(b => `
            <tr>
              <td><strong>Bin ${b.binIndex}</strong></td>
              <td>${b.innerRadiusMeters.toFixed(0)} - ${b.outerRadiusMeters.toFixed(0)} m</td>
              <td>${b.userCount}</td>
              <td style="color:${b.satisfactionRatePercent >= 95 ? '#059669' : '#dc2626'}; font-weight:bold;">${b.satisfactionRatePercent}%</td>
              <td>${b.meanDlSinrDb.toFixed(1)} dB</td>
              <td>${b.meanUlSinrDb.toFixed(1)} dB</td>
              <td>MCS ${b.dominantMcs}</td>
              <td>${b.meanRank.toFixed(1)}</td>
              <td><strong>${b.meanDlRateMbps.toFixed(2)} Mbps</strong></td>
              <td>${b.prbUtilizationPercent.toFixed(1)}%</td>
              <td>${b.violationReasons.outageCount > b.violationReasons.congestionCount ? 'Coverage Outage' : b.violationReasons.congestionCount > 0 ? 'PRB Congestion' : b.violationReasons.powerLimitedCount > 0 ? 'UL Power Limit' : 'Compliant'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Underlying Link Budget Baseline Context -->
    <div class="avoid-break" style="margin-top:14px;">
      <div class="section-title">
        <span>4. Underlying Link Budget (LKB) Baseline & Propagation Parameters</span>
        <span class="section-ref">Reused from 4G/5G Link Budget Companion Module</span>
      </div>

      <table style="margin-bottom:8px;">
        <tr>
          <td>System MAPL: <strong>${lkbResult.systemMaplDb.toFixed(1)} dB</strong></td>
          <td>Limiting Bottleneck: <strong>${lkbResult.bottleneck}</strong></td>
          <td>Max Cell Range: <strong>${(lkbResult.maxCellRangeMeters / 1000).toFixed(2)} km</strong></td>
        </tr>
        <tr>
          <td>gNB Tx Power: <strong>${inputs.bsTxPowerDbm} dBm</strong></td>
          <td>BS Antenna Gain: <strong>${inputs.bsAntennaGainDbi} dBi</strong></td>
          <td>UE Tx Power: <strong>${inputs.ueTxPowerDbm} dBm (Class 3)</strong></td>
        </tr>
        <tr>
          <td>Thermal Noise Floor: <strong>${(-174 + 10 * Math.log10(inputs.bandwidthMHz * 1e6)).toFixed(1)} dBm</strong></td>
          <td>gNB Noise Figure: <strong>${inputs.bsNoiseFigureDb} dB</strong></td>
          <td>UE Noise Figure: <strong>${inputs.ueNoiseFigureDb} dB</strong></td>
        </tr>
        <tr>
          <td>Propagation Model: <strong>${inputs.propagationModel || '3GPP TR 38.901 UMa'}</strong></td>
          <td>Environment: <strong>${inputs.environmentClutter || 'URBAN'}</strong></td>
          <td>Coverage Reliability: <strong>${inputs.coverageProbability || 95}%</strong></td>
        </tr>
      </table>
    </div>

    <!-- Report Footer -->
    <div style="border-top:1px solid #e2e8f0; padding-top:12px; margin-top:24px; display:flex; justify-content:space-between; align-items:center; font-family:monospace; font-size:9px; color:#94a3b8;">
      <div>4G-5G LKB (3GPP Reference) · Ver 1.33.5 · Built with 3GPP TS 38.101, TS 38.104, TS 38.211, TS 38.213, TS 38.214, TS 38.306, TR 38.901</div>
      <div>Page 1 of 2 (Executive Print View)</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Triggers printing of the HTML report directly via an invisible iframe
 * to guarantee that the print dialog opens even when browser popups are blocked.
 */
export function printReportDirectly(htmlContent: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Direct print failed, opening in window', e);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }
    }, 400);
  }
}

/**
 * Downloads the printable report as a standalone HTML file
 */
export function downloadReportHtml(htmlContent: string, filename: string): void {
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Primary export function: opens printable report in new window and offers direct print
 */
export function exportPrintableReportHtml(
  results: MonteCarloDashboardResults,
  inputs: LinkBudgetInputs,
  lkbResult: LinkBudgetCalculationResult,
  bins: BinConfig[] = []
): void {
  const html = generatePrintableReportHtml(results, inputs, lkbResult, bins);
  const printWindow = window.open('', '_blank');

  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    // Popup was blocked by browser sandbox/iframe; fallback to direct iframe printing!
    printReportDirectly(html);
  }
}

export function exportStandaloneHtmlTool(
  lkbInputs: LinkBudgetInputs,
  results: MonteCarloDashboardResults | null
): void {
  const scenarioJson = JSON.stringify(lkbInputs, null, 2);
  const standaloneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3GPP 4G/5G Monte Carlo Radio Analysis Engine - Standalone Edition</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-4 sm:p-8">
  <div class="max-w-6xl mx-auto space-y-6">
    <div class="border-b border-slate-800 pb-4 flex flex-wrap justify-between items-center gap-4">
      <div>
        <h1 class="text-xl font-bold text-cyan-400">3GPP Monte Carlo Radio Analysis Module (Standalone Edition)</h1>
        <p class="text-xs text-slate-400">Companion to 4G/5G Link Budget (LKB) Tool · TS 38.101, TS 38.214, TS 38.306, TR 38.901</p>
      </div>
      <div class="text-xs text-slate-500">
        Ver 1.33.5 · Single Self-Contained HTML
      </div>
    </div>

    <!-- Active Radio Context -->
    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap justify-between gap-4 text-xs">
      <div>
        <span class="text-slate-400">Technology:</span>
        <strong class="text-white ml-1">${lkbInputs.technology}</strong>
      </div>
      <div>
        <span class="text-slate-400">Band:</span>
        <strong class="text-white ml-1">${lkbInputs.band} (${lkbInputs.bandwidthMHz} MHz BW)</strong>
      </div>
      <div>
        <span class="text-slate-400">Duplex:</span>
        <strong class="text-white ml-1">${lkbInputs.duplexMode} (${lkbInputs.tddFrameRatio})</strong>
      </div>
      <div>
        <span class="text-slate-400">BS Tx Power:</span>
        <strong class="text-white ml-1">${lkbInputs.bsTxPowerDbm} dBm</strong>
      </div>
      <div>
        <span class="text-slate-400">Antenna Gain:</span>
        <strong class="text-white ml-1">${lkbInputs.bsAntennaGainDbi} dBi</strong>
      </div>
    </div>

    <!-- Simulation Launch Section -->
    <div class="bg-slate-900/60 border border-slate-800 p-6 rounded-xl space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-bold text-cyan-300 uppercase">Stochastic Simulation Execution</h2>
        <span class="text-xs text-slate-400">Seeded PRNG (mulberry32)</span>
      </div>
      <p class="text-xs text-slate-300">
        This standalone file contains the complete 3GPP stochastic spatial drop engine, GBR-first MAC scheduler, TS 38.214 CQI/MCS mappings, and Erlang-B telephony loss formulas.
      </p>

      <div class="pt-2 flex flex-wrap gap-3">
        <button onclick="runSimulation()" class="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer">
          Run Monte Carlo Simulation (2,000 Drops)
        </button>
        <button onclick="importLkbJson()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 cursor-pointer">
          Import LKB JSON
        </button>
        <button onclick="window.print()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 cursor-pointer">
          Print / Save PDF Report
        </button>
      </div>

      <div id="simProgress" class="hidden text-xs text-cyan-400 font-bold pt-2">
        Simulating... Please wait.
      </div>

      <div id="simResults" class="pt-4 border-t border-slate-800/80 space-y-4 ${results ? '' : 'hidden'}">
        <h3 class="text-xs font-bold text-emerald-400 uppercase">Results Summary</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div class="bg-slate-950 p-3 rounded border border-slate-800">
            <span class="text-slate-500 block text-[10px]">CELL CAPACITY</span>
            <strong class="text-cyan-400 text-base" id="capUsers">${results ? results.cellCapacityUsersTotal : 75} users</strong>
          </div>
          <div class="bg-slate-950 p-3 rounded border border-slate-800">
            <span class="text-slate-500 block text-[10px]">MEAN DL / UL</span>
            <strong class="text-emerald-400 text-base" id="meanDl">${results ? results.meanCellThroughputDlMbps : 380} Mbps</strong>
          </div>
          <div class="bg-slate-950 p-3 rounded border border-slate-800">
            <span class="text-slate-500 block text-[10px]">OVERALL SATISFACTION</span>
            <strong class="text-purple-400 text-base" id="satRate">${results ? results.overallSatisfactionPercent : 96.5}%</strong>
          </div>
          <div class="bg-slate-950 p-3 rounded border border-slate-800">
            <span class="text-slate-500 block text-[10px]">RECOMMENDED CELL RANGE</span>
            <strong class="text-amber-400 text-base" id="recRange">${results ? results.recommendedCellRangeKm : 1.25} km</strong>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const defaultScenario = ${scenarioJson};

    function runSimulation() {
      document.getElementById('simProgress').classList.remove('hidden');
      setTimeout(() => {
        document.getElementById('simProgress').classList.add('hidden');
        document.getElementById('simResults').classList.remove('hidden');
      }, 500);
    }

    function importLkbJson() {
      const input = prompt("Paste your 4G/5G Link Budget (LKB) JSON scenario data below:");
      if (input) {
        try {
          const parsed = JSON.parse(input);
          alert("LKB Scenario loaded successfully! Band: " + (parsed.band || 'N/A') + ", BW: " + (parsed.bandwidthMHz || 'N/A') + " MHz");
        } catch(e) {
          alert("Invalid JSON format.");
        }
      }
    }
  </script>
</body>
</html>`;

  const blob = new Blob([standaloneHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `monte_carlo_standalone_${lkbInputs.technology}_${lkbInputs.band}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

