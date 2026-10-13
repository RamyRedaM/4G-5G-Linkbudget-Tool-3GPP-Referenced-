import { LinkBudgetCalculationResult, LinkBudgetInputs } from '../types/telecom';

export function exportLinkBudgetCsv(result: LinkBudgetCalculationResult, inputs: LinkBudgetInputs) {
  const lines: string[] = [];

  lines.push('=== 4G-5G LKB (3GPP Ref) Ver 1.33.6 by RamyREDA ===');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Technology: ${inputs.technology}`);
  lines.push(`Band: ${inputs.band} (${inputs.duplexMode})`);
  if (inputs.duplexMode === 'TDD') {
    if (inputs.tddFrameRatio === 'CUSTOM') {
      lines.push(`TDD Frame Ratio: Customized TDD (${inputs.customTddDlPercent ?? 75}% DL / ${inputs.customTddUlPercent ?? 25}% UL)`);
    } else {
      lines.push(`TDD Frame Ratio: ${inputs.tddFrameRatio}`);
    }
  }
  lines.push(`Bandwidth: ${inputs.bandwidthMHz} MHz`);
  lines.push(`Max DL Modulation: ${inputs.maxDlModulation || '256QAM'}`);
  if (inputs.technology !== '4G') {
    lines.push(`Residual BLER Target: ${inputs.residualBlerTargetPercent ?? 10}%`);
    lines.push(`5G DMRS Symbols/Slot: ${inputs.dmrsSymbolsPerSlot ?? 1}`);
    lines.push(`5G Number of Beams: ${inputs.numberOfBeams ?? 1}`);
    lines.push(`5G SSB Periodicity: ${inputs.ssbPeriodicityMs ?? 20} ms`);
    lines.push(`5G CSI-RS Reports / Period: ${inputs.csiRsReportsPerPeriod ?? 2}`);
    lines.push(`5G CSI-RS for CA Periodicity: ${inputs.csiRsCaPeriodicitySlots ?? 20} slots`);
  } else {
    lines.push(`4G LTE Reference Signals: 4-Port CRS & SC-FDMA DMRS (3GPP Defaults)`);
  }
  lines.push(`Cell Edge Service Profile: ${result.serviceSummary.displayName}`);
  lines.push(`Target Cell Edge Throughput: DL ${result.serviceSummary.targetDlThroughputFormatted} / UL ${result.serviceSummary.targetUlThroughputFormatted}`);
  if (result.serviceSummary.targetLatencyFormatted) {
    lines.push(`Target Cell Edge Latency: ${result.serviceSummary.targetLatencyFormatted}`);
  }
  lines.push(`Service 3GPP Reference: ${result.serviceSummary.standardReference}`);
  lines.push(`Propagation Model: ${inputs.propagationModel} (${inputs.environmentClutter})`);
  lines.push(`Coverage Probability: ${inputs.coverageProbability}%`);
  lines.push(`Log-Normal Fading Std Dev (sigma): ${inputs.shadowFadingStdDevDb.toFixed(1)} dB`);
  lines.push(`Shadow Fading Margin (M_SF): ${result.shadowFadingMarginDb.toFixed(1)} dB`);
  lines.push(`DL Fading Margin: ${result.dlFadingMarginDb.toFixed(1)} dB`);
  lines.push(`UL Fading Margin: ${result.ulFadingMarginDb.toFixed(1)} dB`);
  if (result.interferenceSummary) {
    lines.push(`Interference Scenario: ${result.interferenceSummary.scenario === 'ISOLATED_CELL' ? 'Isolated Single Cell (0 dB)' : `${result.interferenceSummary.tiers}-Tier Hexagonal (${result.interferenceSummary.totalSites} sites, ${result.interferenceSummary.totalNeighborSectors} sectors, ISD=${result.interferenceSummary.isdMeters}m)`}`);
    lines.push(`Interference Modeling Method: ${result.interferenceSummary.methodName}`);
    lines.push(`Neighbor Cell Load / Intra-Cell Load: ${result.interferenceSummary.neighborLoadPercent}% / ${result.interferenceSummary.intraCellLoadPercent}%`);
    lines.push(`DL Interference Margin: ${result.interferenceSummary.effectiveDlInterferenceMarginDb.toFixed(1)} dB (Calculated: ${result.interferenceSummary.calculatedDlInterferenceMarginDb.toFixed(1)} dB + Pessimistic: ${result.interferenceSummary.pessimisticMarginOffsetDb.toFixed(1)} dB)`);
    lines.push(`UL IoT Noise Rise Margin: ${result.interferenceSummary.effectiveUlIotMarginDb.toFixed(1)} dB (Calculated: ${result.interferenceSummary.calculatedUlIotMarginDb.toFixed(1)} dB + Pessimistic: ${result.interferenceSummary.pessimisticMarginOffsetDb.toFixed(1)} dB)`);
  }
  lines.push(`DL Noise Figure: ${(inputs.dlNoiseFigureDb ?? inputs.ueNoiseFigureDb ?? 7.0).toFixed(1)} dB`);
  lines.push(`UL Noise Figure: ${(inputs.ulNoiseFigureDb ?? inputs.bsNoiseFigureDb ?? 4.0).toFixed(1)} dB`);
  lines.push(`DL Thermal Noise per Subcarrier: ${result.rxSensitivityBreakdown.dl.thermalNoisePerSubcarrierDbm.toFixed(2)} dBm/SC (${result.rxSensitivityBreakdown.dl.scsKhz} kHz SCS)`);
  lines.push(`DL Received Subcarriers: ${result.rxSensitivityBreakdown.dl.receivedSubcarriers} SCs`);
  lines.push(`DL Required SNR @ Cell Edge: ${result.rxSensitivityBreakdown.dl.requiredSnrDb.toFixed(1)} dB`);
  lines.push(`DL UE Receiver Sensitivity: ${result.ueRxSensitivityDbm.toFixed(1)} dBm`);
  lines.push(`UL Thermal Noise per Subcarrier: ${result.rxSensitivityBreakdown.ul.thermalNoisePerSubcarrierDbm.toFixed(2)} dBm/SC (${result.rxSensitivityBreakdown.ul.scsKhz} kHz SCS)`);
  lines.push(`UL Allocated Subcarriers: ${result.rxSensitivityBreakdown.ul.receivedSubcarriers} SCs (${result.rxSensitivityBreakdown.ul.allocatedPrbs} PRBs)`);
  lines.push(`UL Required SNR @ Cell Edge: ${result.rxSensitivityBreakdown.ul.requiredSnrDb.toFixed(1)} dB`);
  lines.push(`UL ${inputs.technology === '4G' ? 'eNodeB' : 'gNodeB'} Receiver Sensitivity: ${result.bsRxSensitivityDbm.toFixed(1)} dBm`);
  lines.push(`Average PDCCH Overhead: ${result.avgPdcchOverheadPercent.toFixed(2)}% (PDSCH Impact: -${result.avgPdcchOverheadPercent.toFixed(2)}%)`);
  lines.push(`Average PUCCH Overhead: ${result.avgPucchOverheadPercent.toFixed(2)}% (PUSCH Impact: -${result.avgPucchOverheadPercent.toFixed(2)}%)`);
  lines.push(`System MAPL: ${result.systemMaplDb.toFixed(1)} dB (DL MAPL: ${result.dlMaplDb.toFixed(1)} dB, UL MAPL: ${result.ulMaplDb.toFixed(1)} dB)`);
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
