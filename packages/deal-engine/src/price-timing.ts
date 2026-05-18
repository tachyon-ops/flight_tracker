/**
 * Price Drop Timing Intelligence — Pure Data
 *
 * Hardcoded knowledge about when airlines typically drop prices.
 * This data is used by the tracker to prioritize scan timing.
 */

export interface PriceDropWindow {
  bestDays: string[];
  bestTime: string;
  weeksOut: number[];
  notes: string;
}

export const AIRLINE_PRICE_DROP_WINDOWS: Record<string, PriceDropWindow> = {
  general: {
    bestDays: ["Tuesday", "Wednesday"],
    bestTime: "14:00-16:00 ET",
    weeksOut: [3, 6, 8],
    notes:
      "Airlines match competitors Tuesday AM. Best prices often appear Tue-Wed afternoon ET.",
  },
  united: {
    bestDays: ["Tuesday"],
    bestTime: "00:01-06:00 ET",
    weeksOut: [3, 6, 8],
    notes:
      "United announces sales Tuesday at midnight ET. Flash sales last 48-72 hours. Award sweet spots at T-21 days.",
  },
  swiss: {
    bestDays: ["Monday", "Tuesday"],
    bestTime: "09:00-12:00 CET",
    weeksOut: [4, 8, 12],
    notes:
      "SWISS/Lufthansa Group drops Monday-Tuesday European morning. 4-8 weeks out is the sweet spot for transatlantic.",
  },
};
