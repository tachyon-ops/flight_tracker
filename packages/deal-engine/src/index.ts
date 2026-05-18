/**
 * @flightradar/deal-engine — Hack intelligence logic
 *
 * Pure functions that analyze price data to detect deals.
 * No I/O — all data is passed in, decisions are returned.
 */

export { detectErrorFare, type ErrorFareResult } from "./error-fare-detector";
export { findDateOptimums, type DateCombo } from "./date-optimizer";
export {
  AIRLINE_PRICE_DROP_WINDOWS,
  type PriceDropWindow,
} from "./price-timing";
