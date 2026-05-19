import { prisma } from "@flightradar/db";
import { Header } from "@/components/Header";
import { SOURCE_LABELS, SOURCE_COLORS } from "@/types";

// ─── Data Fetching ───────────────────────────────────────────

async function getCalendarData() {
  const flights = await prisma.watchedFlight.findMany({
    where: { active: true },
    include: {
      priceSnapshots: {
        orderBy: { scrapedAt: "desc" },
        take: 3, // Latest per source
      },
    },
    orderBy: { dateOut: "asc" },
  });

  return flights.map((flight) => {
    const latestBySource: Record<string, number> = {};
    for (const snap of flight.priceSnapshots) {
      if (!latestBySource[snap.source]) {
        latestBySource[snap.source] = snap.priceUSD;
      }
    }
    const prices = Object.values(latestBySource);
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;

    return {
      id: flight.id,
      dateOut: flight.dateOut,
      priority: flight.priority,
      origin: flight.origin,
      destination: flight.destination,
      carrier: flight.carrier,
      lowestPrice: Math.round(lowestPrice),
      prices: latestBySource,
    };
  });
}

// ─── Page ────────────────────────────────────────────────────

export default async function CalendarPage() {
  const flights = await getCalendarData();

  // Group flights by month
  const grouped: Record<string, typeof flights> = {};
  for (const flight of flights) {
    const key = flight.dateOut.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
    if (!grouped[key]) grouped[key] = [];
    grouped[key]!.push(flight);
  }

  // Find the absolute cheapest for highlighting
  const cheapest = flights.length > 0
    ? flights.reduce((min, f) => (f.lowestPrice < min.lowestPrice ? f : min))
    : null;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar View</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All tracked dates at a glance — sorted chronologically
          </p>
        </div>

        {Object.entries(grouped).map(([month, monthFlights]) => (
          <section key={month}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              {month}
            </h2>
            <div className="space-y-2">
              {monthFlights.map((flight) => {
                const isCheapest = cheapest?.id === flight.id;
                const dateObj = flight.dateOut;
                const dayNum = dateObj.getDate();
                const dayName = dateObj.toLocaleDateString("en-US", {
                  weekday: "short",
                });
                const isTueWed = dayName === "Tue" || dayName === "Wed";

                return (
                  <div
                    key={flight.id}
                    className={`fr-card p-4 flex items-center gap-4 ${
                      isCheapest ? "fr-glow ring-1 ring-primary/30" : ""
                    }`}
                  >
                    {/* Date block */}
                    <div className="flex flex-col items-center w-14 shrink-0">
                      <span className="text-2xl font-bold text-foreground">
                        {dayNum}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          isTueWed
                            ? "fr-price-down"
                            : "text-muted-foreground"
                        }`}
                      >
                        {dayName}
                        {isTueWed && " ★"}
                      </span>
                    </div>

                    {/* Route */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {flight.origin} → {flight.destination}
                        </span>
                        <PriorityDot priority={flight.priority} />
                        {isCheapest && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            Best Price
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {Object.entries(flight.prices).map(([source, price]) => (
                          <span
                            key={source}
                            className="flex items-center gap-1 text-xs text-muted-foreground"
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{
                                background: SOURCE_COLORS[source] || "#666",
                              }}
                            />
                            ${Math.round(price)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-foreground">
                        ${flight.lowestPrice}
                      </p>
                      <p className="text-xs text-muted-foreground">lowest</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {flights.length === 0 && (
          <div className="fr-card p-12 text-center">
            <p className="text-muted-foreground">
              No flights tracked yet. Add flights from the Radar page.
            </p>
          </div>
        )}
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
