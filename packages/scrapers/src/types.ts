/**
 * Port: FlightScraper
 *
 * Every scraper adapter implements this interface.
 * The domain depends on this port; the adapters implement it.
 */

export interface ScraperConfig {
  /** Origin airport IATA code */
  origin: string;
  /** Destination airport IATA code */
  destination: string;
  /** Outbound date */
  dateOut: Date;
  /** Return date (optional for one-way) */
  dateReturn?: Date;
  /** Cabin class */
  cabin?: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
  /** Number of passengers */
  passengers?: number;
}

export interface ScraperResult {
  /** Source identifier */
  source: string;
  /** Price in USD */
  priceUSD: number;
  /** Price in original currency */
  rawPriceLocal?: number;
  /** Original booking currency */
  bookingCurrency?: string;
  /** Cabin class */
  cabin: string;
  /** Number of stops */
  stops: number;
  /** Total duration in minutes */
  durationMin?: number;
  /** Operating airline */
  airline?: string;
  /** Flight numbers */
  flightNumbers?: string[];
  /** Direct booking URL */
  deepLink?: string;
  /** When this was scraped */
  scrapedAt: Date;
}

export interface FlightScraper {
  /** Human-readable source name */
  readonly name: string;
  /** Source identifier for database storage */
  readonly sourceId: string;
  /** Fetch prices for a given route and date */
  scrape(config: ScraperConfig): Promise<ScraperResult[]>;
}
