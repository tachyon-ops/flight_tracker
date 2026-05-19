import { prisma } from "@flightradar/db";
import { scrapeAll } from "@flightradar/scrapers";
import { detectErrorFare } from "@flightradar/deal-engine";
import { NextResponse } from "next/server";
import { notify } from "@/lib/notifications";

/**
 * Vercel Cron Job — Automated price scanning
 *
 * Configured in vercel.json with schedule: "0 every-4h * * *"
 * (path: /api/cron/scan)
 *
 * Runs every 4 hours. Scans all active flights across all sources,
 * stores results, and checks for error fares.
 */
export async function GET(request: Request) {
  // Verify cron secret in production
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const flights = await prisma.watchedFlight.findMany({
      where: { active: true },
      include: {
        priceSnapshots: {
          orderBy: { scrapedAt: "desc" },
          take: 50, // Last 50 for error fare detection
        },
      },
    });

    if (flights.length === 0) {
      return NextResponse.json({ message: "No active flights" });
    }

    const results = [];
    const alerts = [];

    for (const flight of flights) {
      console.log(
        `[Cron] Scanning ${flight.origin}→${flight.destination} on ${flight.dateOut.toISOString().split("T")[0]}`
      );

      const scrapeResults = await scrapeAll({
        origin: flight.origin,
        destination: flight.destination,
        dateOut: flight.dateOut,
        dateReturn: flight.dateReturn ?? undefined,
        cabin: "ECONOMY",
      });

      let saved = 0;
      let lowestPrice = Infinity;
      let lowestSource = "";

      for (const sourceResult of scrapeResults) {
        for (const price of sourceResult.results) {
          await prisma.priceSnapshot.create({
            data: {
              flightId: flight.id,
              source: price.source,
              priceUSD: price.priceUSD,
              currency: "USD",
              cabin: price.cabin,
              stops: price.stops,
              durationMin: price.durationMin,
              airline: price.airline,
              flightNumbers: price.flightNumbers
                ? JSON.stringify(price.flightNumbers)
                : null,
              deepLink: price.deepLink,
              scrapedAt: price.scrapedAt,
            },
          });
          saved++;

          if (price.priceUSD < lowestPrice) {
            lowestPrice = price.priceUSD;
            lowestSource = price.source;
          }
        }
      }

      // Run error fare detection
      if (lowestPrice < Infinity && flight.priceSnapshots.length >= 2) {
        const errorFareResult = detectErrorFare(
          flight.priceSnapshots.map((s) => ({
            priceUSD: s.priceUSD,
            source: s.source,
          })),
          lowestPrice,
          lowestSource
        );

        if (errorFareResult.isErrorFare) {
          alerts.push({
            flightId: flight.id,
            route: `${flight.origin}→${flight.destination}`,
            date: flight.dateOut.toISOString().split("T")[0],
            type: "ERROR_FARE_DETECTED",
            price: lowestPrice,
            source: lowestSource,
            confidence: errorFareResult.confidence,
            reason: errorFareResult.reason,
          });

          // Store the deal intelligence record
          await prisma.dealIntelligence.create({
            data: {
              type: "ERROR_FARE",
              origin: flight.origin,
              destination: flight.destination,
              priceUSD: lowestPrice,
              normalPriceUSD: errorFareResult.medianPrice,
              discountPct: errorFareResult.dropPercent * 100,
              source: lowestSource,
              bookingUrl: scrapeResults.find((r) => r.source === lowestSource)
                ?.results[0]?.deepLink ?? "",
              confidence: errorFareResult.confidence,
              notes: errorFareResult.reason,
            },
          });

          // Send notification
          await notify({
            route: `${flight.origin}→${flight.destination}`,
            date: flight.dateOut.toISOString().split("T")[0]!,
            currentPrice: lowestPrice,
            previousPrice: errorFareResult.medianPrice,
            dropPercent: errorFareResult.dropPercent * 100,
            source: lowestSource,
            bookingUrl: scrapeResults.find((r) => r.source === lowestSource)
              ?.results[0]?.deepLink,
            isErrorFare: true,
          });
        }
      }

      results.push({
        flightId: flight.id,
        route: `${flight.origin}→${flight.destination}`,
        date: flight.dateOut.toISOString().split("T")[0],
        pricesSaved: saved,
        lowestPrice: lowestPrice === Infinity ? null : lowestPrice,
      });

      // Delay between flights to avoid detection
      await new Promise((r) => setTimeout(r, 2000 + Math.random() * 3000));
    }

    return NextResponse.json({
      scannedAt: new Date().toISOString(),
      flightsScanned: flights.length,
      results,
      alerts,
    });
  } catch (error) {
    console.error("[Cron] Scan failed:", error);
    return NextResponse.json({ error: "Cron scan failed" }, { status: 500 });
  }
}
