import type { FlightScraper, ScraperConfig, ScraperResult } from "./types";

/**
 * Utility: Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Kayak Scraper
 *
 * Third-party APIs:
 *   - Kayak.com via Playwright browser automation
 *     URL pattern: https://www.kayak.com/flights/ZRH-XNA/2026-06-24
 *     auth: None (public page)
 *     rate limits: Aggressive bot detection — requires careful timing
 *     failure modes handled: Bot challenge, page timeout, empty results,
 *                            layout changes
 */
export class KayakScraper implements FlightScraper {
  readonly name = "Kayak";
  readonly sourceId = "KAYAK";

  async scrape(config: ScraperConfig): Promise<ScraperResult[]> {
    const { chromium } = await import("playwright");

    const dateOut = formatDate(config.dateOut);
    const dateReturn = config.dateReturn
      ? formatDate(config.dateReturn)
      : undefined;

    const url = this.buildSearchUrl(
      config.origin,
      config.destination,
      dateOut,
      dateReturn
    );

    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const context = await browser.newContext({
        userAgent: this.randomUserAgent(),
        viewport: { width: 1440, height: 900 },
        locale: "en-US",
      });

      const page = await context.newPage();

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await randomDelay(3000, 5000);

      // Check for bot challenge
      const isChallenged = await page
        .locator('text="verify you are a human"')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (isChallenged) {
        console.warn("[KayakScraper] Bot challenge detected — skipping");
        return [];
      }

      // Wait for results
      await page
        .waitForSelector('[class*="resultInner"], [class*="nrc6"], [data-resultid]', {
          timeout: 20000,
        })
        .catch(() => null);

      await randomDelay(2000, 3000);

      const results = await page.evaluate(() => {
        const flights: Array<{
          price: number;
          airline: string;
          stops: number;
          duration: string;
        }> = [];

        const resultCards = document.querySelectorAll(
          '[class*="resultInner"], [class*="nrc6"], [class*="resultWrapper"]'
        );

        resultCards.forEach((card) => {
          try {
            // Price
            const priceEl = card.querySelector(
              '[class*="price-text"], [class*="f8F1"], [class*="price"]'
            );
            const priceText =
              priceEl?.textContent?.replace(/[^0-9.]/g, "") || "";
            const price = parseFloat(priceText);
            if (isNaN(price) || price === 0) return;

            // Airline
            const airlineEl = card.querySelector(
              '[class*="codeshares"], [class*="c_cgF"]'
            );
            const airline = airlineEl?.textContent?.trim() || "Unknown";

            // Stops
            const stopsEl = card.querySelector(
              '[class*="stops"], [class*="JWEO"]'
            );
            const stopsText = stopsEl?.textContent?.toLowerCase() || "";
            const stops = stopsText.includes("nonstop")
              ? 0
              : parseInt(stopsText.replace(/[^0-9]/g, "")) || 1;

            // Duration
            const durationEl = card.querySelector(
              '[class*="duration"], [class*="xdW8"]'
            );
            const duration = durationEl?.textContent?.trim() || "";

            flights.push({ price, airline, stops, duration });
          } catch {
            // Skip malformed
          }
        });

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
        flightNumbers: [],
        deepLink: url,
        scrapedAt: now,
      }));
    } catch (error) {
      console.error("[KayakScraper] Scrape failed:", error);
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
    if (dateReturn) {
      return `https://www.kayak.com/flights/${origin}-${destination}/${dateOut}/${dateReturn}?sort=bestflight_a`;
    }
    return `https://www.kayak.com/flights/${origin}-${destination}/${dateOut}?sort=bestflight_a`;
  }

  private randomUserAgent(): string {
    const agents = [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
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
