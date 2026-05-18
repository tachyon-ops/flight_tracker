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
 * Skyscanner Scraper
 *
 * Third-party APIs:
 *   - Skyscanner via Playwright browser automation
 *     URL pattern: https://www.skyscanner.com/transport/flights/zrh/xna/YYMMDD/
 *     auth: None (public page)
 *     rate limits: Moderate bot detection
 *     failure modes handled: Redirect, page load timeout,
 *                            interstitial overlays, empty results
 */
export class SkyscannerScraper implements FlightScraper {
  readonly name = "Skyscanner";
  readonly sourceId = "SKYSCANNER";

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
        viewport: { width: 1366, height: 768 },
        locale: "en-US",
      });

      const page = await context.newPage();

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await randomDelay(3000, 5000);

      // Dismiss cookie banner
      try {
        const cookieButton = page.locator(
          'button:has-text("Accept"), button[id*="accept"]'
        );
        if (await cookieButton.isVisible({ timeout: 3000 })) {
          await cookieButton.click();
          await randomDelay(500, 1000);
        }
      } catch {
        // No cookie dialog
      }

      // Wait for flight results
      await page
        .waitForSelector(
          '[class*="FlightsResults"], [class*="ResultsSummary"], [class*="TicketBody"]',
          { timeout: 20000 }
        )
        .catch(() => null);

      await randomDelay(2000, 4000);

      const results = await page.evaluate(() => {
        const flights: Array<{
          price: number;
          airline: string;
          stops: number;
          duration: string;
        }> = [];

        const tickets = document.querySelectorAll(
          '[class*="TicketBody"], [class*="FlightInfoContainer"], [class*="EcoTicketWrapper"]'
        );

        tickets.forEach((ticket) => {
          try {
            // Price
            const priceEl = ticket.querySelector(
              '[class*="Price"], [class*="price"], span[class*="BpkText"]'
            );
            const priceText =
              priceEl?.textContent?.replace(/[^0-9.]/g, "") || "";
            const price = parseFloat(priceText);
            if (isNaN(price) || price === 0) return;

            // Airline
            const airlineEl = ticket.querySelector(
              '[class*="carrier"], [class*="LogoImage"], [class*="airline"]'
            );
            const airline =
              airlineEl?.getAttribute("alt") ||
              airlineEl?.textContent?.trim() ||
              "Unknown";

            // Stops
            const stopsEl = ticket.querySelector(
              '[class*="stops"], [class*="LegInfo"]'
            );
            const stopsText = stopsEl?.textContent?.toLowerCase() || "";
            const stops = stopsText.includes("direct")
              ? 0
              : parseInt(stopsText.replace(/[^0-9]/g, "")) || 1;

            // Duration
            const durationEl = ticket.querySelector(
              '[class*="duration"], [class*="LegDuration"]'
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
      console.error("[SkyscannerScraper] Scrape failed:", error);
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
    // Skyscanner uses YYMMDD format in URLs
    const outFormatted = dateOut.replace(/-/g, "").slice(2); // "260624"
    const base = `https://www.skyscanner.com/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${outFormatted}/`;

    if (dateReturn) {
      const retFormatted = dateReturn.replace(/-/g, "").slice(2);
      return `${base}${retFormatted}/?adultsv2=1&cabinclass=economy&currency=USD`;
    }
    return `${base}?adultsv2=1&cabinclass=economy&currency=USD`;
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
