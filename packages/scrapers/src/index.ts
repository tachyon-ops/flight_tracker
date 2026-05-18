/**
 * @flightradar/scrapers — Flight price data fetchers
 *
 * Each scraper implements the FlightScraper port.
 * The adapter is the only place that knows about the vendor.
 */

export type { FlightScraper, ScraperResult, ScraperConfig } from "./types";
export { GoogleFlightsScraper } from "./google-flights";
export { KayakScraper } from "./kayak";
export { SkyscannerScraper } from "./skyscanner";
export { scrapeAll } from "./orchestrator";
