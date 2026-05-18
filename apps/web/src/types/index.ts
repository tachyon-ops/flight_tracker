/**
 * Domain types for the FlightRadar web app.
 * Pure type definitions — zero runtime code.
 */

export interface FlightCardData {
  id: string;
  date: string;
  dayOfWeek: string;
  priority: "P1" | "P2" | "P3";
  prices: Record<string, number>;
  lowestPrice: number;
  lowestSource: string;
  priceChange: number;
  priceChangePercent: number;
  stops: number;
  duration: string;
  airline: string;
  deepLink?: string;
}

export interface ChartDataPoint {
  date: string;
  google: number;
  kayak: number;
  skyscanner: number;
}

export interface DashboardStats {
  lowestPrice: number;
  lowestDate: string;
  lowestSource: string;
  avgPrice: number;
}

export const SOURCE_LABELS: Record<string, string> = {
  GOOGLE_FLIGHTS: "Google Flights",
  KAYAK: "Kayak",
  SKYSCANNER: "Skyscanner",
  UNITED_DIRECT: "United",
};

export const SOURCE_COLORS: Record<string, string> = {
  GOOGLE_FLIGHTS: "hsl(217 91% 60%)",
  KAYAK: "hsl(25 95% 53%)",
  SKYSCANNER: "hsl(174 72% 40%)",
  UNITED_DIRECT: "hsl(215 50% 40%)",
};
