import { prisma } from "@flightradar/db";
import { NextResponse } from "next/server";

/**
 * GET /api/flights/[id]/prices — Price history for a specific flight
 *
 * Query params:
 *   - days: number of days of history (default: 30)
 *   - source: filter by source (optional)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get("days") || "30");
    const source = url.searchParams.get("source");

    const since = new Date();
    since.setDate(since.getDate() - days);

    const snapshots = await prisma.priceSnapshot.findMany({
      where: {
        flightId: id,
        scrapedAt: { gte: since },
        ...(source ? { source } : {}),
      },
      orderBy: { scrapedAt: "asc" },
    });

    // Group by date for chart consumption
    const grouped: Record<
      string,
      Record<string, number>
    > = {};

    for (const snap of snapshots) {
      const dateKey = snap.scrapedAt.toISOString().split("T")[0]!;
      if (!grouped[dateKey]) {
        grouped[dateKey] = {};
      }
      // Keep the lowest price per source per day
      const sourceKey = snap.source.toLowerCase().replace(/_/g, "");
      if (
        !grouped[dateKey]![sourceKey] ||
        snap.priceUSD < grouped[dateKey]![sourceKey]!
      ) {
        grouped[dateKey]![sourceKey] = snap.priceUSD;
      }
    }

    const chartData = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, sources]) => ({
        date,
        ...sources,
      }));

    return NextResponse.json({ snapshots, chartData });
  } catch (error) {
    console.error("[API] GET /api/flights/[id]/prices failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch price history" },
      { status: 500 }
    );
  }
}
