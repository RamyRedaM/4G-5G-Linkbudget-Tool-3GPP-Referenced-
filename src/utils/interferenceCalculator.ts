import {
  LinkBudgetInputs,
  InterferenceCalculationSummary,
  InterferenceScenarioType,
  InterferenceHexLayoutTiers,
  InterferenceMarginMethod
} from '../types/telecom';

/**
 * 3GPP TR 36.942 / TR 38.901 / ITU-R M.2412 Interference & Cell Loading Calculator
 * Models inter-cell interference from hexagonal multi-tier layouts (1 or 2 tiers)
 * and intra-cell loading effects (scheduling, MU-MIMO leakage, IoT noise rise)
 * for both 4G LTE and 5G NR link budgets.
 */
export function calculateInterferenceSummary(
  inputs: LinkBudgetInputs,
  cellRangeMeters: number,
  dlFreqMHz: number,
  isMmWave: boolean,
  requiredDlSinrDb: number = -4.5
): InterferenceCalculationSummary {
  const is5G = inputs.technology === '5G_SA' || inputs.technology === '5G_NSA';
  const scenario: InterferenceScenarioType = inputs.interferenceScenario ?? 'NEIGHBORING_CELLS';
  const tiers: InterferenceHexLayoutTiers = inputs.interferenceHexTiers ?? 1;
  const totalSites = tiers === 1 ? 7 : 19;
  const totalNeighborSectors = tiers === 1 ? 18 : 54;

  const isdMultiplier = inputs.interferenceIsdMultiplier ?? 1.5;
  const effectiveCellRange = Math.max(100, cellRangeMeters || 1000);
  const isdMeters = inputs.interferenceIsdMeters !== undefined && inputs.interferenceIsdMeters > 0
    ? inputs.interferenceIsdMeters
    : Math.round(isdMultiplier * effectiveCellRange);

  const neighborLoadPercent = Math.min(100, Math.max(0, inputs.neighborCellLoadPercent ?? 50));
  const intraCellLoadPercent = Math.min(100, Math.max(0, inputs.intraCellLoadPercent ?? 50));
  const method: InterferenceMarginMethod = inputs.interferenceMethod ?? 'VENDOR_LOAD_COUPLING';
  const pessimisticMarginOffsetDb = inputs.interferencePessimisticMarginDb ?? 0.0;

  // 1. Technology Specific Factors
  // 4G LTE: Continuous CRS broadcast floor across full bandwidth (~14.3% effective continuous load)
  // 5G NR: Lean carrier architecture (no continuous CRS, only periodic SSB bursts ~1.2%)
  const crsLoadFloorPercent = is5G ? 0.0 : 14.3;
  const effectiveDlTrafficLoadPercent = is5G
    ? Math.min(100, Number((1.2 + 0.988 * neighborLoadPercent).toFixed(1)))
    : Math.min(100, Number((14.3 + (1 - 0.143) * neighborLoadPercent).toFixed(1)));

  // 5G Beamforming Spatial Filtering & Isolation Gain (TR 38.901 / vendor studies):
  // Narrow beam transmissions reduce average inter-cell interference power seen at cell edge.
  // 4G uses broad sector coverage (0 dB isolation gain).
  let beamformingIsolationDb = 0.0;
  if (is5G) {
    const numBeams = inputs.numberOfBeams ?? 4;
    // Spatial beamforming gain scales logarithmically with beam count & massive MIMO aperture
    const baseIso = 3.0 + 1.2 * Math.log2(Math.max(1, Math.min(8, numBeams)));
    const mimoBonus = inputs.mimoMode === '8x8' ? 1.0 : inputs.mimoMode === '4x4' ? 0.5 : 0.0;
    beamformingIsolationDb = Number(Math.min(6.5, baseIso + mimoBonus).toFixed(1));
  }

  // Intra-cell MU-MIMO spatial precoding leakage (5G) / Doppler ICI (4G):
  const intraCellMimoLeakageDb = is5G
    ? Number((1.6 * Math.pow(intraCellLoadPercent / 100, 2)).toFixed(2))
    : Number((0.2 * (intraCellLoadPercent / 100)).toFixed(2));

  // 3GPP Uplink inter-to-intra cell interference ratio (f-factor, TR 36.942 §5.1 / TR 38.901):
  const ulInterToIntraRatioF = 0.55;

  // 2. Geometry coupling factor for hexagonal layout (normalized to ISD = 1.5 * R):
  // R = cellRange, ISD = Inter-Site Distance
  const normalizedIsdRatio = isdMeters / effectiveCellRange;
  // Tier 1 geometric coupling:
  const rho1 = Math.min(0.85, 0.68 * Math.pow(1.5 / Math.max(0.6, normalizedIsdRatio), 1.8));
  // Tier 2 geometric coupling:
  const rho2 = isMmWave ? 0.0 : (0.16 * Math.pow(1.5 / Math.max(0.6, normalizedIsdRatio), 1.8));
  const rhoGeo = Number(Math.min(0.92, Math.max(0.15, tiers === 1 ? rho1 : (rho1 + rho2))).toFixed(3));

  // 3. Scenario Calculation
  let calculatedDlInterferenceMarginDb = 0.0;
  let calculatedUlIotMarginDb = 0.0;
  let totalInrLinear = 0.0;
  let geometryFactorDb = 99.0;
  let methodName = '';
  let methodFormula = '';

  if (scenario === 'ISOLATED_CELL') {
    // Isolated Cell: No neighboring interferers
    calculatedDlInterferenceMarginDb = 0.0;
    // Minimal uplink noise rise only under high current cell loading (>75%)
    calculatedUlIotMarginDb = intraCellLoadPercent > 75 ? 0.3 : 0.0;
    totalInrLinear = 0.0;
    geometryFactorDb = 99.0;
    methodName = 'Isolated Single Cell (Zero External Interference)';
    methodFormula = 'IM_DL = 0.0 dB · IM_UL = 0.0 dB (Thermal Noise Floor Only)';
  } else {
    // Neighboring Cells: Hexagonal Multi-Tier Grid
    const linBfIso = Math.pow(10, -beamformingIsolationDb / 10);

    switch (method) {
      case 'VENDOR_LOAD_COUPLING': {
        methodName = 'Vendor Load-Coupling Model (Ericsson / Nokia / Huawei Link Budget)';
        methodFormula = 'IM_DL = -10·log10(1 - η_DL·ρ·G_iso) · IM_UL = -10·log10(1 - (η_intra·0.45 + η_neigh·0.40·ρ))';

        const xDl = Math.min(0.86, (effectiveDlTrafficLoadPercent / 100) * rhoGeo * linBfIso);
        calculatedDlInterferenceMarginDb = Number((
          -10 * Math.log10(Math.max(0.01, 1 - xDl)) + intraCellMimoLeakageDb * 0.2
        ).toFixed(1));

        const xUl = Math.min(0.85, (intraCellLoadPercent / 100) * 0.45 + (neighborLoadPercent / 100) * 0.40 * rhoGeo);
        calculatedUlIotMarginDb = Number((
          -10 * Math.log10(Math.max(0.01, 1 - xUl))
        ).toFixed(1));

        totalInrLinear = Number((xDl / Math.max(0.01, 1 - xDl)).toFixed(2));
        geometryFactorDb = Number((10 * Math.log10(Math.max(0.01, 1 / (rhoGeo * (effectiveDlTrafficLoadPercent / 100))))).toFixed(1));
        break;
      }

      case '3GPP_GEOMETRY_MULTITIER': {
        methodName = '3GPP TR 36.942 / TR 38.901 Hexagonal Multi-Tier Monte Carlo Geometry';
        methodFormula = 'INR_DL = (1.5R/ISD)^α · ρ_geo · η_DL · G_iso · Γ_0 · IM = 10·log10(1 + INR)';

        const alphaPl = isMmWave ? 3.8 : 3.5;
        const geomDistanceFactor = Math.pow(1.5 / Math.max(0.6, normalizedIsdRatio), alphaPl);
        const inrDl = geomDistanceFactor * rhoGeo * (effectiveDlTrafficLoadPercent / 100) * linBfIso * 2.3;
        calculatedDlInterferenceMarginDb = Number((
          10 * Math.log10(1 + inrDl) + intraCellMimoLeakageDb * 0.25
        ).toFixed(1));

        const inrUl = ((intraCellLoadPercent / 100) * 0.48 + (neighborLoadPercent / 100) * ulInterToIntraRatioF * rhoGeo) * 2.2;
        calculatedUlIotMarginDb = Number((
          10 * Math.log10(1 + inrUl)
        ).toFixed(1));

        totalInrLinear = Number(inrDl.toFixed(2));
        geometryFactorDb = Number((-10 * Math.log10(Math.max(0.01, inrDl / 2.3))).toFixed(1));
        break;
      }

      case 'ITU_R_INR_SCALING': {
        methodName = 'ITU-R M.2412 Interference-over-Thermal (INR) Model';
        methodFormula = 'INR = INR_max · (η/100)^1.15 · (1.5R/ISD)^2.2 · G_iso · IM = 10·log10(1 + INR)';

        const inrMaxDb = tiers === 1 ? 3.5 : 5.0;
        const linInrMax = Math.pow(10, inrMaxDb / 10);
        const inrDl = linInrMax * Math.pow(effectiveDlTrafficLoadPercent / 100, 1.15) * Math.pow(1.5 / Math.max(0.6, normalizedIsdRatio), 2.2) * linBfIso;
        calculatedDlInterferenceMarginDb = Number((
          10 * Math.log10(1 + inrDl) + intraCellMimoLeakageDb * 0.15
        ).toFixed(1));

        const inrUl = linInrMax * Math.pow(0.5 * (intraCellLoadPercent / 100) + 0.5 * (neighborLoadPercent / 100), 1.1);
        calculatedUlIotMarginDb = Number((
          10 * Math.log10(1 + inrUl)
        ).toFixed(1));

        totalInrLinear = Number(inrDl.toFixed(2));
        geometryFactorDb = Number((10 * Math.log10(Math.max(0.01, 1 / (inrDl / linInrMax)))).toFixed(1));
        break;
      }

      case 'SINR_DESENSITIZATION': {
        methodName = '3GPP Effective Receiver Desensitization / SINR Degradation';
        methodFormula = 'IM_DL = 10·log10(1 + I_inter/N_0) + ΔI_intra · IM_UL = 10·log10(1 + I_total/N_0)';

        const inrDl = 1.9 * (effectiveDlTrafficLoadPercent / 100) * rhoGeo * linBfIso;
        calculatedDlInterferenceMarginDb = Number((
          10 * Math.log10(1 + inrDl) + intraCellMimoLeakageDb * 0.3
        ).toFixed(1));

        const inrUl = 1.8 * (0.55 * (intraCellLoadPercent / 100) + 0.45 * (neighborLoadPercent / 100) * rhoGeo);
        calculatedUlIotMarginDb = Number((
          10 * Math.log10(1 + inrUl)
        ).toFixed(1));

        totalInrLinear = Number(inrDl.toFixed(2));
        geometryFactorDb = Number((10 * Math.log10(Math.max(0.01, 1 / (inrDl / 1.9)))).toFixed(1));
        break;
      }
    }
  }

  // DL interference margin tied to the cell-edge signal level (load-coupling form, used by every method).
  // At the cell edge of a contiguous hexagonal layout (ISD = 1.5 R) the neighbour sectors arrive with about the same
  // power as the serving one: neighbour-to-serving ratio F_edge ≈ +3.5 dB (two equidistant first-tier sectors plus
  // the rest of tier 1), +3.8 dB with tier 2, scaled by (1.5 R / ISD)^3.5 for sparser grids. With I/S = η_DL·F_edge·G_iso,
  // the SINR target γ is met at the edge when S/N = γ / (1 - η·F·G·γ), i.e. IM_DL = -10·log10(1 - η·F·G·γ).
  const dlEdgeNeighbourToServingDb = Number((
    (tiers === 1 ? 3.5 : 3.8) + 35 * Math.log10(1.5 / Math.max(0.6, normalizedIsdRatio))
  ).toFixed(1));
  const dlEdgeInterferenceToSignalRatio = scenario === 'ISOLATED_CELL'
    ? 0
    : (effectiveDlTrafficLoadPercent / 100) * Math.pow(10, dlEdgeNeighbourToServingDb / 10) * Math.pow(10, -beamformingIsolationDb / 10);
  const xGamma = dlEdgeInterferenceToSignalRatio * Math.pow(10, requiredDlSinrDb / 10);
  const dlInterferenceLimited = xGamma >= 0.95;
  if (scenario !== 'ISOLATED_CELL') {
    calculatedDlInterferenceMarginDb = Number((
      (dlInterferenceLimited ? 13.0 : -10 * Math.log10(1 - xGamma)) + intraCellMimoLeakageDb * 0.2
    ).toFixed(1));
    totalInrLinear = Number((dlInterferenceLimited ? 19 : xGamma / (1 - xGamma)).toFixed(2));
    geometryFactorDb = Number((beamformingIsolationDb - dlEdgeNeighbourToServingDb).toFixed(1));
    methodFormula = `DL (all methods): IM_DL = -10·log10(1 - η_DL·F_edge·G_iso·γ_req) | UL from this method: ${methodFormula}`;
  }

  // 4. Effective Margins with user pessimistic offset
  const effectiveDlInterferenceMarginDb = Number(
    Math.max(0, calculatedDlInterferenceMarginDb + pessimisticMarginOffsetDb).toFixed(1)
  );
  const effectiveUlIotMarginDb = Number(
    Math.max(0, calculatedUlIotMarginDb + pessimisticMarginOffsetDb).toFixed(1)
  );
  const totalInrDb = totalInrLinear > 0 ? Number((10 * Math.log10(totalInrLinear)).toFixed(1)) : -99.0;

  return {
    scenario,
    tiers,
    totalSites,
    totalNeighborSectors,
    isdMeters,
    isdMultiplier,
    neighborLoadPercent,
    intraCellLoadPercent,
    method,
    methodName,
    methodFormula,
    technology: is5G ? '5G' : '4G',
    crsLoadFloorPercent,
    effectiveDlTrafficLoadPercent,
    beamformingIsolationDb,
    intraCellMimoLeakageDb,
    ulInterToIntraRatioF,
    calculatedDlInterferenceMarginDb,
    calculatedUlIotMarginDb,
    pessimisticMarginOffsetDb,
    effectiveDlInterferenceMarginDb,
    effectiveUlIotMarginDb,
    geometryFactorDb,
    totalInrLinear,
    totalInrDb,
    dlMaplImpactDb: effectiveDlInterferenceMarginDb,
    dlEdgeNeighbourToServingDb,
    dlEdgeInterferenceToSignalRatio: Number(dlEdgeInterferenceToSignalRatio.toFixed(4)),
    dlInterferenceLimited,
    ulMaplImpactDb: effectiveUlIotMarginDb
  };
}
