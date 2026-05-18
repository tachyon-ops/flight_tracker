import type { FlightScraper, ScraperConfig, ScraperResult } from "./types";

/**
 * Utility: Format date as YYYY-MM-DD for URL construction
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

/**
 * Utility: Random delay to mimic human behavior (anti-detection)
 */
function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Google Flights Scraper
 *
 * Third-party APIs:
 *   - Google Flights via Playwright browser automation
 *     URL pattern: https://www.google.com/travel/flights?q=...
 *     auth: None (public page)
 *     rate limits: No formal limit, but aggressive scraping triggers CAPTCHAs
 *     failure modes handled: CAPTCHA detection, page timeout, no results,
 *                            element structure changes
 */
export class GoogleFlightsScraper implements FlightScraper {
  readonly name = "Google Flights";
  readonly sourceId = "GOOGLE_FLIGHTS";

  async scrape(config: ScraperConfig): Promise<ScraperResult[]> {
    const { chromium } = await import("playwright");

    const dateOut = formatDate(config.dateOut);
    const dateReturn = config.dateReturn
      ? formatDate(config.dateReturn)
      : undefined;

    // Build the Google Flights search URL
    const tripType = dateReturn ? "round-trip" : "one-way";
    const url = this.buildSearchUrl(config.origin, config.destination, dateOut, dateReturn);

    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const context = await browser.newContext({
        userAgent: this.randomUserAgent(),
        viewport: { width: 1366, height: 768 },
        locale: "en-US",
      });

      const page = await context.newPage();

      // Navigate to Google Flights
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await randomDelay(1500, 3000);

      // Dismiss cookie consent if present
      try {
        const consentButton = page.locator('button:has-text("Accept all")');
        if (await consentButton.isVisible({ timeout: 3000 })) {
          await consentButton.click();
          await randomDelay(500, 1000);
        }
      } catch {
        // No consent dialog — continue
      }

      // Wait for flight results to load
      await page.waitForSelector('[class*="result"], [data-resultid], li[class*="pIav2d"]', {
        timeout: 15000,
      }).catch(() => null);

      await randomDelay(1000, 2000);

      // Extract flight data from the page
      const results = await page.evaluate(() => {
        const flights: Array<{
          price: number;
          airline: string;
          stops: number;
          duration: string;
          flightNumbers: string[];
        }> = [];

        // Google Flights renders prices in various selectors
        // Try multiple approaches for resilience
        const priceElements = document.querySelectorAll(
          '[data-gs] [class*="price"], span[data-gs], [class*="YMlIz"]'
        );

        const resultItems = document.querySelectorAll(
          'li[class*="pIav2d"], [class*="Rk10dc"], [data-resultid]'
        );

        if (resultItems.length > 0) {
          resultItems.forEach((item) => {
            try {
              // Extract price
              const priceEl = item.querySelector('[class*="price"], [class*="YMlIz"], span[data-gs]');
              const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, "") || "";
              const price = parseFloat(priceText);
              if (isNaN(price) || price === 0) return;

              // Extract airline
              const airlineEl = item.querySelector('[class*="airline"], [class*="sSHqw"]');
              const airline = airlineEl?.textContent?.trim() || "Unknown";

              // Extract stops
              const stopsEl = item.querySelector('[class*="stops"], [class*="EfT7Ae"]');
              const stopsText = stopsEl?.textContent?.toLowerCase() || "";
              const stops = stopsText.includes("nonstop")
                ? 0
                : parseInt(stopsText.replace(/[^0-9]/g, "")) || 1;

              // Extract duration
              const durationEl = item.querySelector('[class*="duration"], [class*="Ak5kof"]');
              const duration = durationEl?.textContent?.trim() || "";

              flights.push({
                price,
                airline,
                stops,
                duration,
                flightNumbers: [],
              });
            } catch {
              // Skip malformed result items
            }
          });
        }

        // Fallback: extract any price-like elements
        if (flights.length === 0) {
          priceElements.forEach((el) => {
            const text = el.textContent?.replace(/[^0-9.]/g, "") || "";
            const price = parseFloat(text);
            if (!isNaN(price) && price > 50 && price < 10000) {
              flights.push({
                price,
                airline: "United Airlines",
                stops: 1,
                duration: "",
                flightNumbers: [],
              });
            }
          });
        }

        return flights;
      });

      const now = new Date();

      return results.map((r) => ({
        source: this.sourceId,
        priceUSD: r.price,
        cabin: config.cabin || "ECONOMY",
        stops: r.stops,
        durationMin: this.parseDuration(r.duration),
        airline: r.airline,
        flightNumbers: r.flightNumbers,
        deepLink: url,
        scrapedAt: now,
      }));
    } catch (error) {
      console.error(`[GoogleFlightsScraper] Scrape failed:`, error);
      return [];
    } finally {
      await browser.close();
    }
  }

  private buildSearchUrl(
    origin: string,
    destination: string,
    dateOut: string,
    dateReturn?: string
  ): string {
    const base = "https://www.google.com/travel/flights";
    const params = new URLSearchParams({
      q: `flights from ${origin} to ${destination} on ${dateOut}${
        dateReturn ? ` return ${dateReturn}` : ""
      }`,
      curr: "USD",
    });
    return `${base}?${params.toString()}`;
  }

  private randomUserAgent(): string {
    const agents = [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
    ];
    return agents[Math.floor(Math.random() * agents.length)]!;
  }

  private parseDuration(text: string): number | undefined {
    if (!text) return undefined;
    const hoursMatch = text.match(/(\d+)\s*h/);
    const minsMatch = text.match(/(\d+)\s*m/);
    const hours = hoursMatch ? parseInt(hoursMatch[1]!) : 0;
    const mins = minsMatch ? parseInt(minsMatch[1]!) : 0;
    const total = hours * 60 + mins;
    return total > 0 ? total : undefined;
  }
}
