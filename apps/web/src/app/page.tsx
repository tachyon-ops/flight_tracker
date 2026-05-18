import { prisma } from "@flightradar/db";
import { Header } from "@/components/Header";
import { PriorityBand } from "@/components/PriorityBand";
import { PriceChartSection } from "@/components/PriceChartSection";
import { StatsGrid } from "@/components/StatsGrid";
import { DealAlert } from "@/components/DealAlert";
import type { FlightCardData } from "@/types";
import { SOURCE_LABELS } from "@/types";

// ─── Data Fetching (Server Component) ────────────────────────

async function getFlights(): Promise<{
  p1: FlightCardData[];
  p2: FlightCardData[];
  chartData: Array<{ date: string; google: number; kayak: number; skyscanner: number }>;
  stats: { lowestPrice: number; lowestDate: string; lowestSource: string; avgPrice: number };
}> {
  const flights = await prisma.watchedFlight.findMany({
    where: { active: true },
    include: {
      priceSnapshots: {
        orderBy: { scrapedAt: "desc" },
      },
    },
    orderBy: [{ priority: "asc" }, { dateOut: "asc" }],
  });

  const p1: FlightCardData[] = [];
  const p2: FlightCardData[] = [];
  let globalLowest = Infinity;
  let globalLowestDate = "";
  let globalLowestSource = "";
  let allPrices: number[] = [];

  // Aggregate chart data across all flights (last 14 days)
  const chartMap: Record<string, { google: number[]; kayak: number[]; skyscanner: number[] }> = {};

  for (const flight of flights) {
    const snapshots = flight.priceSnapshots;

    // Get latest price per source
    const latestBySource: Record<string, { price: number; snap: typeof snapshots[0] }> = {};
    for (const snap of snapshots) {
      if (!latestBySource[snap.source] || snap.scrapedAt > latestBySource[snap.source]!.snap.scrapedAt) {
        latestBySource[snap.source] = { price: snap.priceUSD, snap };
      }
    }

    // Build prices map
    const prices: Record<string, number> = {};
    for (const [source, data] of Object.entries(latestBySource)) {
      prices[source] = Math.round(data.price);
    }

    // Find lowest
    const priceValues = Object.values(prices);
    const lowest = priceValues.length > 0 ? Math.min(...priceValues) : 0;
    const lowestSourceEntry = Object.entries(prices).find(([, v]) => v === lowest);

    // Calculate price change (compare latest vs 24h ago)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentPrices = snapshots.filter((s) => s.scrapedAt >= yesterday).map((s) => s.priceUSD);
    const olderPrices = snapshots.filter((s) => s.scrapedAt < yesterday && s.scrapedAt >= new Date(yesterday.getTime() - 24 * 60 * 60 * 1000)).map((s) => s.priceUSD);
    const avgRecent = recentPrices.length > 0 ? recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length : lowest;
    const avgOlder = olderPrices.length > 0 ? olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length : avgRecent;
    const priceChange = Math.round(avgRecent - avgOlder);
    const priceChangePercent = avgOlder > 0 ? ((avgRecent - avgOlder) / avgOlder) * 100 : 0;

    // Track global stats
    allPrices.push(lowest);
    if (lowest < globalLowest) {
      globalLowest = lowest;
      globalLowestDate = flight.dateOut.toISOString().split("T")[0]!;
      globalLowestSource = lowestSourceEntry ? lowestSourceEntry[0] : "";
    }

    // Get first snapshot info for stops/duration
    const firstSnap = snapshots[0];

    const dateStr = flight.dateOut.toISOString().split("T")[0]!;
    const dayOfWeek = flight.dateOut.toLocaleDateString("en-US", { weekday: "long" });

    const card: FlightCardData = {
      id: flight.id,
      date: dateStr,
      dayOfWeek,
      priority: flight.priority as "P1" | "P2" | "P3",
      prices,
      lowestPrice: lowest,
      lowestSource: lowestSourceEntry ? lowestSourceEntry[0] : "",
      priceChange,
      priceChangePercent: Math.round(priceChangePercent * 10) / 10,
      stops: firstSnap?.stops ?? 1,
      duration: firstSnap?.durationMin ? `${Math.floor(firstSnap.durationMin / 60)}h ${firstSnap.durationMin % 60}m` : "~12h",
      airline: firstSnap?.airline ?? flight.carrier ?? "United Airlines",
      deepLink: firstSnap?.deepLink ?? undefined,
    };

    if (flight.priority === "P1") p1.push(card);
    else p2.push(card);

    // Build chart data
    for (const snap of snapshots) {
      const dateKey = snap.scrapedAt.toISOString().split("T")[0]!;
      if (!chartMap[dateKey]) {
        chartMap[dateKey] = { google: [], kayak: [], skyscanner: [] };
      }
      const sourceKey = snap.source === "GOOGLE_FLIGHTS" ? "google" : snap.source === "KAYAK" ? "kayak" : "skyscanner";
      chartMap[dateKey]![sourceKey]?.push(snap.priceUSD);
    }
  }

  // Average chart data per day
  const chartData = Object.entries(chartMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, sources]) => ({
      date,
      google: sources.google.length > 0 ? Math.round(sources.google.reduce((a, b) => a + b, 0) / sources.google.length) : 0,
      kayak: sources.kayak.length > 0 ? Math.round(sources.kayak.reduce((a, b) => a + b, 0) / sources.kayak.length) : 0,
      skyscanner: sources.skyscanner.length > 0 ? Math.round(sources.skyscanner.reduce((a, b) => a + b, 0) / sources.skyscanner.length) : 0,
    }));

  const avgPrice = allPrices.length > 0 ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length) : 0;

  return {
    p1,
    p2,
    chartData,
    stats: {
      lowestPrice: globalLowest === Infinity ? 0 : globalLowest,
      lowestDate: globalLowestDate,
      lowestSource: SOURCE_LABELS[globalLowestSource] ?? globalLowestSource,
      avgPrice,
    },
  };
}

// ─── Page ────────────────────────────────────────────────────

export default async function DashboardPage() {
  const { p1, p2, chartData, stats } = await getFlights();

  // Find biggest drop for deal alert
  const allCards = [...p1, ...p2];
  const biggestDrop = allCards
    .filter((c) => c.priceChange < 0)
    .sort((a, b) => a.priceChange - b.priceChange)[0];

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* ─── Deal Alert ─── */}
        {biggestDrop && (
          <DealAlert
            date={biggestDrop.date}
            dayOfWeek={biggestDrop.dayOfWeek}
            dropPercent={Math.abs(biggestDrop.priceChangePercent)}
            price={biggestDrop.lowestPrice}
            source={biggestDrop.lowestSource}
            deepLink={biggestDrop.deepLink}
          />
        )}

        {/* ─── P1 Priority Band ─── */}
        {p1.length > 0 && (
          <PriorityBand
            priority="P1"
            label="High Priority"
            description={`June ${p1.map((f) => new Date(f.date + "T00:00:00").getDate()).join(", ")}`}
            flights={p1}
            columns={p1.length}
          />
        )}

        {/* ─── P2 Priority Band ─── */}
        {p2.length > 0 && (
          <PriorityBand
            priority="P2"
            label="Medium Priority"
            description={p2.map((f) => {
              const d = new Date(f.date + "T00:00:00");
              return `${d.toLocaleDateString("en-US", { month: "short" })} ${d.getDate()}`;
            }).join(", ")}
            flights={p2}
            columns={Math.min(p2.length, 4)}
          />
        )}

        {/* ─── Price Trend Chart ─── */}
        <PriceChartSection data={chartData} />

        {/* ─── Quick Stats ─── */}
        <StatsGrid
          lowestPrice={stats.lowestPrice}
          lowestDate={stats.lowestDate}
          lowestSource={stats.lowestSource}
          avgPrice={stats.avgPrice}
        />
      </main>
    </div>
  );
}
