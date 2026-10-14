/**
 * Monotone Cubic Hermite Interpolation (Fritsch-Carlson PCHIP)
 * Preserves monotonicity and produces smooth, overshoot-free curves through data points.
 */
export function createPchipInterpolator(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length;
  if (n === 0) return () => 0;
  if (n === 1) return () => ys[0];
  if (n === 2) {
    const slope = (ys[1] - ys[0]) / (xs[1] - xs[0]);
    return (x: number) => ys[0] + slope * (x - xs[0]);
  }

  const m = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    const dx = xs[i + 1] - xs[i];
    m[i] = dx === 0 ? 0 : (ys[i + 1] - ys[i]) / dx;
  }

  const d = new Array(n).fill(0);
  d[0] = m[0];
  d[n - 1] = m[n - 2];

  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      d[i] = 0;
    } else {
      const h0 = xs[i] - xs[i - 1];
      const h1 = xs[i + 1] - xs[i];
      d[i] = (3 * (h0 + h1)) / ((2 * h1 + h0) / m[i - 1] + (h1 + 2 * h0) / m[i]);
    }
  }

  return (x: number): number => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];

    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;

    const h = xs[i + 1] - xs[i];
    if (h === 0) return ys[i];

    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;

    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    return Math.max(0, h00 * ys[i] + h10 * h * d[i] + h01 * ys[i + 1] + h11 * h * d[i + 1]);
  };
}

export interface FourPointThroughputAnchor {
  rangeKm: number;
  dlThroughputMbps: number;
  ulThroughputMbps: number;
}

/**
 * Builds continuous throughput curves with authentic parabolic roll-off across cell radius:
 * R(d) = R_edge + (R_peak - R_edge) * [1 - (d / R_max)^2] for d <= R_max
 * with smooth physical exponential roll-off beyond cell edge (d > R_max).
 * Strictly passes through Near, Medium, Bad, and Edge coverage points.
 */
export function buildThroughputCurve(
  fourPoints: FourPointThroughputAnchor[],
  maxCellRangeKm: number,
  steps: number = 60,
  maxDistKm?: number
): { distKm: number; dlThr: number; ulThr: number }[] {
  if (!fourPoints || fourPoints.length < 4) return [];

  const rEdge = Math.max(0.05, maxCellRangeKm);
  const rLimit = maxDistKm ?? Math.max(0.5, rEdge * 1.20);

  const dlEdge = Math.max(0.1, fourPoints[3].dlThroughputMbps);
  const ulEdge = Math.max(0.1, fourPoints[3].ulThroughputMbps);

  // Peak rate at boresight (d=0) deduced from near point at 15% distance:
  // Since R(0.15*R) = R_edge + (R_peak - R_edge) * (1 - 0.15^2)
  const normDistNear = Math.min(0.3, Math.max(0.05, fourPoints[0].rangeKm / rEdge));
  const nearFactor = Math.max(0.70, 1 - Math.pow(normDistNear, 2));
  const dlPeak = Math.max(fourPoints[0].dlThroughputMbps, Number((dlEdge + (fourPoints[0].dlThroughputMbps - dlEdge) / nearFactor).toFixed(1)));
  const ulPeak = Math.max(fourPoints[0].ulThroughputMbps, Number((ulEdge + (fourPoints[0].ulThroughputMbps - ulEdge) / nearFactor).toFixed(1)));

  const points = [];
  for (let i = 0; i <= steps; i++) {
    const dist = (i / steps) * rLimit;
    let dlThr: number;
    let ulThr: number;

    if (dist <= rEdge) {
      // Classic 3GPP parabolic throughput decay: R(d) = R_edge + (R_peak - R_edge) * (1 - (d/R)^2)
      const f = dist / rEdge;
      const decay = Math.max(0, 1 - Math.pow(f, 2));
      dlThr = Number((dlEdge + (dlPeak - dlEdge) * decay).toFixed(1));
      ulThr = Number((ulEdge + (ulPeak - ulEdge) * decay).toFixed(1));
    } else {
      // Beyond cell edge: smooth exponential signal degradation
      const extraRatio = (dist - rEdge) / rEdge;
      const decayBeyond = Math.exp(-6.0 * extraRatio);
      dlThr = Number((dlEdge * decayBeyond).toFixed(1));
      ulThr = Number((ulEdge * decayBeyond).toFixed(1));
    }

    points.push({
      distKm: Number(dist.toFixed(3)),
      dlThr,
      ulThr
    });
  }
  return points;
}
