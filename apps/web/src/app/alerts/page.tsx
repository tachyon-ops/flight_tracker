import { prisma } from "@flightradar/db";
import { Header } from "@/components/Header";
import { Bell, BellOff, Trash2 } from "lucide-react";

async function getAlerts() {
  const alerts = await prisma.alert.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Get recent price drops as pseudo-alerts
  const flights = await prisma.watchedFlight.findMany({
    where: { active: true },
    include: {
      priceSnapshots: {
        orderBy: { scrapedAt: "desc" },
        take: 10,
      },
    },
  });

  const priceAlerts = flights
    .map((flight) => {
      const snaps = flight.priceSnapshots;
      if (snaps.length < 2) return null;
      const latest = snaps[0]!;
      const previous = snaps[3]; // ~1 day ago
      if (!previous) return null;

      const change = latest.priceUSD - previous.priceUSD;
      const changePct = (change / previous.priceUSD) * 100;

      if (Math.abs(changePct) < 2) return null;

      return {
        id: `price-${flight.id}`,
        type: change < 0 ? "PRICE_DROP" : "PRICE_INCREASE",
        route: `${flight.origin}→${flight.destination}`,
        date: flight.dateOut.toISOString().split("T")[0],
        price: Math.round(latest.priceUSD),
        previousPrice: Math.round(previous.priceUSD),
        changePct: Math.round(changePct * 10) / 10,
        source: latest.source,
        timestamp: latest.scrapedAt.toISOString(),
      };
    })
    .filter(Boolean);

  return { alerts, priceAlerts };
}

export default async function AlertsPage() {
  const { alerts, priceAlerts } = await getAlerts();

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Price change notifications and deal alerts
          </p>
        </div>

        {/* ─── Price Change Alerts ─── */}
        <section className="space-y-2">
          {priceAlerts.map(
            (alert) =>
              alert && (
                <div key={alert.id} className="fr-card p-4 flex items-center gap-4">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${
                      alert.type === "PRICE_DROP"
                        ? "bg-green-500/10"
                        : "bg-red-500/10"
                    }`}
                  >
                    {alert.type === "PRICE_DROP" ? (
                      <Bell className="w-5 h-5 text-green-400" />
                    ) : (
                      <BellOff className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {alert.route} · {alert.date}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${alert.previousPrice} →{" "}
                      <span
                        className={
                          alert.type === "PRICE_DROP"
                            ? "fr-price-down font-semibold"
                            : "fr-price-up font-semibold"
                        }
                      >
                        ${alert.price}
                      </span>{" "}
                      ({alert.changePct > 0 ? "+" : ""}
                      {alert.changePct}%)
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(alert.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )
          )}

          {priceAlerts.length === 0 && alerts.length === 0 && (
            <div className="fr-card p-12 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No alerts yet. Price changes will appear here after scans.
              </p>
            </div>
          )}
        </section>

        {/* ─── Notification Setup Teaser ─── */}
        <section className="fr-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            🔔 Notification Setup
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Configure Telegram or email notifications to get alerted instantly
            when prices drop.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-border/40 bg-muted/20">
              <p className="text-sm font-medium text-foreground">Telegram Bot</p>
              <p className="text-xs text-muted-foreground mt-1">
                Set <code className="text-primary">TELEGRAM_BOT_TOKEN</code> and{" "}
                <code className="text-primary">TELEGRAM_CHAT_ID</code> in your
                environment.
              </p>
            </div>
            <div className="p-3 rounded-lg border border-border/40 bg-muted/20">
              <p className="text-sm font-medium text-foreground">Email (Resend)</p>
              <p className="text-xs text-muted-foreground mt-1">
                Set <code className="text-primary">RESEND_API_KEY</code> to
                receive email price alerts.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
