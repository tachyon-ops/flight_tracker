import { prisma } from "@flightradar/db";
import { Header } from "@/components/Header";
import { AIRLINE_PRICE_DROP_WINDOWS } from "@flightradar/deal-engine";
import { TrendingDown, Zap, Clock, Globe, AlertTriangle } from "lucide-react";
import { SOURCE_LABELS, SOURCE_COLORS } from "@/types";

// ─── Data Fetching ───────────────────────────────────────────

async function getDeals() {
  // Get stored deal intelligence
  const deals = await prisma.dealIntelligence.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Get airport alternatives
  const alternatives = await prisma.airportAlternative.findMany({
    orderBy: { netSavingsUSD: "desc" },
  });

  // Get flights with significant price drops
  const flights = await prisma.watchedFlight.findMany({
    where: { active: true },
    include: {
      priceSnapshots: {
        orderBy: { scrapedAt: "desc" },
        take: 20,
      },
    },
  });

  // Calculate drops for each flight
  const priceDrops = flights.map((flight) => {
    const snaps = flight.priceSnapshots;
    if (snaps.length < 2) return null;

    const latest = snaps[0]!;
    const prices = snaps.map((s) => s.priceUSD);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const dropPct = ((avg - latest.priceUSD) / avg) * 100;

    return {
      id: flight.id,
      route: `${flight.origin}→${flight.destination}`,
      date: flight.dateOut.toISOString().split("T")[0],
      priority: flight.priority,
      currentPrice: Math.round(latest.priceUSD),
      avgPrice: Math.round(avg),
      dropPercent: Math.round(dropPct * 10) / 10,
      source: latest.source,
    };
  }).filter(Boolean).sort((a, b) => b!.dropPercent - a!.dropPercent);

  return { deals, alternatives, priceDrops };
}

// ─── Page ────────────────────────────────────────────────────

export default async function DealsPage() {
  const { deals, alternatives, priceDrops } = await getDeals();
  const windows = AIRLINE_PRICE_DROP_WINDOWS;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Deal Intelligence Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Error fares, price drops, airport alternatives, and timing
            strategies
          </p>
        </div>

        {/* ─── Price Drops ─── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-foreground">
              Current Price Drops
            </h2>
          </div>
          <div className="space-y-2">
            {priceDrops.map(
              (drop) =>
                drop && (
                  <div key={drop.id} className="fr-card p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {drop.route}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {drop.date}
                        </span>
                        <PriorityDot priority={drop.priority} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Average ${drop.avgPrice} →{" "}
                        <span className="fr-price-down font-semibold">
                          ${drop.currentPrice}
                        </span>{" "}
                        on {SOURCE_LABELS[drop.source] || drop.source}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-lg font-bold ${
                          drop.dropPercent > 0
                            ? "fr-price-down"
                            : "fr-price-up"
                        }`}
                      >
                        {drop.dropPercent > 0 ? "-" : "+"}
                        {Math.abs(drop.dropPercent)}%
                      </span>
                    </div>
                  </div>
                )
            )}
            {priceDrops.length === 0 && (
              <div className="fr-card p-8 text-center text-muted-foreground text-sm">
                No significant price drops detected yet.
              </div>
            )}
          </div>
        </section>

        {/* ─── Error Fare Alerts ─── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">
              Error Fare Detections
            </h2>
          </div>
          <div className="space-y-2">
            {deals.map((deal) => (
              <div key={deal.id} className="fr-card p-4 fr-glow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-semibold text-foreground">
                        {deal.type.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded font-medium">
                        {Math.round((deal.confidence ?? 0) * 100)}% confident
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {deal.origin}→{deal.destination} · ${Math.round(deal.priceUSD)}{" "}
                      (normal: ${Math.round(deal.normalPriceUSD ?? 0)}) ·{" "}
                      {deal.notes}
                    </p>
                  </div>
                  {deal.bookingUrl && (
                    <a
                      href={deal.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500 text-white hover:opacity-90 transition-opacity no-underline"
                    >
                      Book Now
                    </a>
                  )}
                </div>
              </div>
            ))}
            {deals.length === 0 && (
              <div className="fr-card p-8 text-center text-muted-foreground text-sm">
                No error fares detected yet. The system checks automatically
                every scan.
              </div>
            )}
          </div>
        </section>

        {/* ─── Airport Alternatives ─── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-foreground">
              Nearby Airport Savings
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alternatives.map((alt) => (
              <div key={alt.id} className="fr-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {alt.alternative}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {alt.driveMins}min drive · ${Math.round(alt.transferCostUSD)} transfer cost
                    </p>
                  </div>
                  <span
                    className={`text-lg font-bold ${
                      alt.netSavingsUSD > 0 ? "fr-price-down" : "fr-price-up"
                    }`}
                  >
                    {alt.netSavingsUSD > 0 ? "+" : ""}${Math.round(alt.netSavingsUSD)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Price Timing Strategy ─── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-foreground">
              When to Buy
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(windows).map(([airline, window]) => (
              <div key={airline} className="fr-card p-4">
                <p className="text-sm font-semibold text-foreground capitalize mb-2">
                  {airline === "general" ? "General Strategy" : airline}
                </p>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <p>
                    <span className="text-foreground font-medium">Best days:</span>{" "}
                    {window.bestDays.join(", ")}
                  </p>
                  <p>
                    <span className="text-foreground font-medium">Best time:</span>{" "}
                    {window.bestTime}
                  </p>
                  <p>
                    <span className="text-foreground font-medium">Sweet spot:</span>{" "}
                    {window.weeksOut.join("-")} weeks out
                  </p>
                  <p className="text-muted-foreground/70 italic mt-1">
                    {window.notes}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    P1: "hsl(0 90% 64%)",
    P2: "hsl(38 92% 50%)",
    P3: "hsl(210 40% 50%)",
  };
  return (
    <span
      className="w-2 h-2 rounded-full"
      style={{ background: colors[priority] || "#666" }}
    />
  );
}
