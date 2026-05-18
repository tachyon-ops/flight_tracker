import type { FlightScraper, ScraperConfig, ScraperResult } from "./types";
import { GoogleFlightsScraper } from "./google-flights";
import { KayakScraper } from "./kayak";
import { SkyscannerScraper } from "./skyscanner";

/**
 * All available scrapers, ordered by reliability.
 */
const ALL_SCRAPERS: FlightScraper[] = [
  new GoogleFlightsScraper(),
  new KayakScraper(),
  new SkyscannerScraper(),
];

export interface ScrapeAllResult {
  source: string;
  results: ScraperResult[];
  error?: string;
  durationMs: number;
}

/**
 * Orchestrate scraping across all sources for a given flight.
 *
 * Runs scrapers sequentially with delays between them to avoid
 * triggering rate limits. Each scraper failure is isolated —
 * one failing does not stop the others.
 */
export async function scrapeAll(
  config: ScraperConfig,
  scrapers: FlightScraper[] = ALL_SCRAPERS
): Promise<ScrapeAllResult[]> {
  const results: ScrapeAllResult[] = [];

  for (const scraper of scrapers) {
    const start = Date.now();
    try {
      console.log(`[Orchestrator] Scraping ${scraper.name}...`);
      const scraperResults = await scraper.scrape(config);
      results.push({
        source: scraper.sourceId,
        results: scraperResults,
        durationMs: Date.now() - start,
      });
      console.log(
        `[Orchestrator] ${scraper.name}: ${scraperResults.length} results in ${Date.now() - start}ms`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`[Orchestrator] ${scraper.name} failed: ${message}`);
      results.push({
        source: scraper.sourceId,
        results: [],
        error: message,
        durationMs: Date.now() - start,
      });
    }

    // Delay between scrapers to avoid detection patterns
    if (scrapers.indexOf(scraper) < scrapers.length - 1) {
      const delay = Math.floor(Math.random() * 3000) + 2000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return results;
}
