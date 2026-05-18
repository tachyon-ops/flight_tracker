/**
 * Error Fare Detection — Pure Core
 *
 * Analyzes price snapshots to identify potential error fares.
 * No I/O — receives data, returns decisions.
 */

export interface ErrorFareResult {
  isErrorFare: boolean;
  confidence: number; // 0-1
  medianPrice: number;
  latestPrice: number;
  dropPercent: number;
  singleSourceAnomaly: boolean;
  reason: string;
}

interface PriceInput {
  priceUSD: number;
  source: string;
}

/**
 * Calculate the median of a number array.
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Detect whether the latest price snapshot is a potential error fare.
 *
 * Algorithm:
 *   1. Calculate median price across all historical snapshots
 *   2. Compare latest price against the median
 *   3. Flag if:
 *      - Drop > 40% below median
 *      - Transcontinental price under $200 when median > $600
 *      - Only one source shows the anomalously low price (single-source signal)
 *
 * @param snapshots - Historical price data (must have at least 2 entries)
 * @param latestPrice - The most recent price to evaluate
 * @param latestSource - The source of the latest price
 */
export function detectErrorFare(
  snapshots: PriceInput[],
  latestPrice: number,
  latestSource: string
): ErrorFareResult {
  if (snapshots.length < 2) {
    return {
      isErrorFare: false,
      confidence: 0,
      medianPrice: latestPrice,
      latestPrice,
      dropPercent: 0,
      singleSourceAnomaly: false,
      reason: "Insufficient data — need at least 2 snapshots",
    };
  }

  const median = calculateMedian(snapshots.map((s) => s.priceUSD));
  const dropPercent = median > 0 ? (median - latestPrice) / median : 0;

  // Check if only one source shows the low price
  const lowPriceThreshold = median * 0.7;
  const sourcesWithLowPrice = new Set(
    snapshots
      .filter((s) => s.priceUSD < lowPriceThreshold)
      .map((s) => s.source)
  );
  if (latestPrice < lowPriceThreshold) {
    sourcesWithLowPrice.add(latestSource);
  }
  const singleSourceAnomaly = sourcesWithLowPrice.size === 1;

  // Decision logic
  let isErrorFare = false;
  let confidence = 0;
  let reason = "Price within normal range";

  if (dropPercent > 0.4) {
    isErrorFare = true;
    confidence = Math.min(0.95, 0.7 + dropPercent * 0.5);
    reason = `${Math.round(dropPercent * 100)}% below median ($${median.toFixed(0)})`;
  }

  if (latestPrice < 200 && median > 600) {
    isErrorFare = true;
    confidence = Math.max(confidence, 0.9);
    reason = `Transcontinental under $200 (median: $${median.toFixed(0)})`;
  }

  if (singleSourceAnomaly && dropPercent > 0.25) {
    confidence = Math.max(confidence, 0.85);
    if (!isErrorFare && dropPercent > 0.3) {
      isErrorFare = true;
      reason = `Single-source anomaly: ${latestSource} — ${Math.round(dropPercent * 100)}% below median`;
    }
  }

  return {
    isErrorFare,
    confidence: Math.round(confidence * 100) / 100,
    medianPrice: Math.round(median * 100) / 100,
    latestPrice,
    dropPercent: Math.round(dropPercent * 100) / 100,
    singleSourceAnomaly,
    reason,
  };
}
