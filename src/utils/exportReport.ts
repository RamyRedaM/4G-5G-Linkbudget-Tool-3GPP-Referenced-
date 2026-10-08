import { LinkBudgetCalculationResult, LinkBudgetInputs } from '../types/telecom';

export function exportLinkBudgetCsv(result: LinkBudgetCalculationResult, inputs: LinkBudgetInputs) {
  const lines: string[] = [];

  lines.push('=== 4G-5G LinkBudget (3GPP Referenced) by RamyREDA ===');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Technology: ${inputs.technology}`);
  lines.push(`Band: ${inputs.band} (${inputs.duplexMode})`);
  lines.push(`Bandwidth: ${inputs.bandwidthMHz} MHz`);
  lines.push(`Max DL Modulation: ${inputs.maxDlModulation || '256QAM'}`);
  lines.push(`Propagation Model: ${inputs.propagationModel} (${inputs.environmentClutter})`);
  lines.push(`Coverage Probability: ${inputs.coverageProbability}%`);
  lines.push(`System MAPL: ${result.systemMaplDb.toFixed(1)} dB`);
  lines.push(`Bottleneck: ${result.bottleneck} (Delta: ${result.bottleneckDeltaDb.toFixed(1)} dB)`);
  lines.push(`Max Cell Radius: ${result.maxCellRangeKm.toFixed(3)} km (${result.maxCellRangeMeters} meters)`);
  lines.push('');

  // 4 Points Matrix
  lines.push('=== FOUR OPERATING RADIO POINTS MATRIX ===');
  lines.push('Operating Point,Range (km),Range (m),Path Loss (dB),SS-RSRP (dBm),SS-RSSI (dBm),SS-SINR (dB),Avg DL MCS,Avg UL MCS,Avg DL BLER (%),DL Throughput (Mbps),UL Throughput (Mbps),Latency (ms)');
  
  result.fourPoints.forEach(pt => {
    lines.push([
      `"${pt.pointName}"`,
      pt.rangeKm.toFixed(3),
      pt.rangeMeters,
      pt.pathLossDb.toFixed(1),
      pt.ssRsrpDbm.toFixed(1),
      pt.ssRssiDbm.toFixed(1),
      pt.ssSinrDb.toFixed(1),
      `"${pt.avgDlMcs}"`,
      `"${pt.avgUlMcs}"`,
      `${pt.avgDlBlerPercent.toFixed(1)}%`,
      pt.dlThroughputMbps.toFixed(1),
      pt.ulThroughputMbps.toFixed(1),
      pt.latencyMs.toFixed(1)
    ].join(','));
  });

  lines.push('');
  lines.push('=== RF CASCADE WATERFALL (DOWNLINK VS UPLINK) ===');
  lines.push('Parameter,Downlink (gNB->UE),Uplink (UE->gNB),Unit,Category');

  result.cascadeTable.forEach(row => {
    lines.push([
      `"${row.name}"`,
      `"${row.dlValue}"`,
      `"${row.ulValue}"`,
      `"${row.unit}"`,
      `"${row.category}"`
    ].join(','));
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(lines.join('\n'));
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  link.setAttribute('download', `LinkBudget_${inputs.technology}_${inputs.band}_${inputs.bandwidthMHz}MHz.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
