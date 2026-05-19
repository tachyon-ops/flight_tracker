import { prisma } from "@flightradar/db";
import { scrapeAll } from "@flightradar/scrapers";
import { NextResponse } from "next/server";

/**
 * POST /api/flights/scan — Trigger a price scan for all active flights
 *
 * Optional body: { flightId?: string } to scan a specific flight
 *
 * This endpoint runs the real scrapers (Google Flights, Kayak, Skyscanner)
 * and stores results in the database. It's designed to be called by:
 *   - The "Scan Now" button in the dashboard
 *   - A Vercel Cron job
 *   - A webhook from n8n/Make.com
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetFlightId = (body as { flightId?: string }).flightId;

    // Get flights to scan
    const flights = await prisma.watchedFlight.findMany({
      where: {
        active: true,
        ...(targetFlightId ? { id: targetFlightId } : {}),
      },
    });

    if (flights.length === 0) {
      return NextResponse.json(
        { error: "No active flights to scan" },
        { status: 404 }
      );
    }

    const scanResults = [];

    for (const flight of flights) {
      console.log(
        `[Scan] Scanning ${flight.origin}→${flight.destination} on ${flight.dateOut.toISOString().split("T")[0]}`
      );

      const results = await scrapeAll({
        origin: flight.origin,
        destination: flight.destination,
        dateOut: flight.dateOut,
        dateReturn: flight.dateReturn ?? undefined,
        cabin: "ECONOMY",
      });

      // Store results in database (with data validation)
      let saved = 0;
      for (const sourceResult of results) {
        for (const price of sourceResult.results) {
          // Validate data before saving — scrapers can return garbage
          if (price.priceUSD < 10 || price.priceUSD > 50000) continue;
          if (price.stops < 0 || price.stops > 10) continue;
          if (price.durationMin && (price.durationMin < 30 || price.durationMin > 5000)) continue;

          await prisma.priceSnapshot.create({
            data: {
              flightId: flight.id,
              source: price.source,
              priceUSD: price.priceUSD,
              currency: "USD",
              cabin: price.cabin,
              stops: Math.min(price.stops, 10),
              durationMin: price.durationMin ? Math.min(price.durationMin, 5000) : null,
              airline: price.airline?.slice(0, 100),
              flightNumbers: price.flightNumbers
                ? JSON.stringify(price.flightNumbers)
                : null,
              deepLink: price.deepLink?.slice(0, 500),
              scrapedAt: price.scrapedAt,
            },
          });
          saved++;
        }
      }

      scanResults.push({
        flightId: flight.id,
        route: `${flight.origin}→${flight.destination}`,
        date: flight.dateOut.toISOString().split("T")[0],
        sourcesScanned: results.length,
        pricesSaved: saved,
        errors: results
          .filter((r) => r.error)
          .map((r) => ({ source: r.source, error: r.error })),
      });
    }

    return NextResponse.json({
      scannedAt: new Date().toISOString(),
      flightsScanned: flights.length,
      results: scanResults,
    });
  } catch (error) {
    console.error("[API] POST /api/flights/scan failed:", error);
    return NextResponse.json(
      { error: "Scan failed" },
      { status: 500 }
    );
  }
}
