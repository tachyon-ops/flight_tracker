/**
 * Date Optimizer — Pure Core
 *
 * Finds the cheapest round-trip date combinations
 * from a set of candidate departure and return dates.
 */

export interface DateCombo {
  dateOut: Date;
  dateReturn: Date;
  dayOfWeekOut: string;
  dayOfWeekReturn: string;
  priceUSD: number;
  savingsVsPeak: number;
  isRedeye: boolean;
  isTueWed: boolean;
}

interface DatePriceInput {
  date: Date;
  priceUSD: number;
  isRedeye?: boolean;
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * Find the cheapest round-trip date combinations.
 *
 * @param outboundOptions - Candidate departure dates with prices
 * @param returnOptions - Candidate return dates with prices
 * @param topN - Number of results to return (default: 10)
 */
export function findDateOptimums(
  outboundOptions: DatePriceInput[],
  returnOptions: DatePriceInput[],
  topN: number = 10
): DateCombo[] {
  if (outboundOptions.length === 0 || returnOptions.length === 0) {
    return [];
  }

  const combos: DateCombo[] = [];

  for (const out of outboundOptions) {
    for (const ret of returnOptions) {
      // Return must be after departure
      if (ret.date <= out.date) continue;

      const roundTripPrice = out.priceUSD + ret.priceUSD;
      const dayOut = DAYS[out.date.getDay()]!;
      const dayRet = DAYS[ret.date.getDay()]!;
      const isTueWed =
        dayOut === "Tuesday" ||
        dayOut === "Wednesday" ||
        dayRet === "Tuesday" ||
        dayRet === "Wednesday";

      combos.push({
        dateOut: out.date,
        dateReturn: ret.date,
        dayOfWeekOut: dayOut,
        dayOfWeekReturn: dayRet,
        priceUSD: roundTripPrice,
        savingsVsPeak: 0, // Calculated after sorting
        isRedeye: out.isRedeye || ret.isRedeye || false,
        isTueWed,
      });
    }
  }

  // Sort by price ascending
  combos.sort((a, b) => a.priceUSD - b.priceUSD);

  // Calculate savings vs the most expensive combo
  const peakPrice = combos.length > 0 ? combos[combos.length - 1]!.priceUSD : 0;
  for (const combo of combos) {
    combo.savingsVsPeak = Math.round((peakPrice - combo.priceUSD) * 100) / 100;
  }

  return combos.slice(0, topN);
}
