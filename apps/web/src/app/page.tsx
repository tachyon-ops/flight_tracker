import {
  Plane,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Clock,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { FlightCard } from "@/components/FlightCard";
import { PriceChart } from "@/components/PriceChart";
import { Header } from "@/components/Header";

// ─── Demo data (replaced by API calls once DB is wired) ─────

const DEMO_FLIGHTS = {
  P1: [
    {
      id: "p1-jun24",
      date: "2026-06-24",
      dayOfWeek: "Wednesday",
      priority: "P1" as const,
      prices: {
        GOOGLE_FLIGHTS: 487,
        KAYAK: 502,
        SKYSCANNER: 479,
      },
      lowestPrice: 479,
      lowestSource: "Skyscanner",
      priceChange: -23,
      priceChangePercent: -4.6,
      stops: 1,
      duration: "14h 35m",
      airline: "United Airlines",
    },
    {
      id: "p1-jun25",
      date: "2026-06-25",
      dayOfWeek: "Thursday",
      priority: "P1" as const,
      prices: {
        GOOGLE_FLIGHTS: 512,
        KAYAK: 519,
        SKYSCANNER: 508,
      },
      lowestPrice: 508,
      lowestSource: "Skyscanner",
      priceChange: 5,
      priceChangePercent: 1.0,
      stops: 1,
      duration: "15h 10m",
      airline: "United Airlines",
    },
    {
      id: "p1-jun29",
      date: "2026-06-29",
      dayOfWeek: "Sunday",
      priority: "P1" as const,
      prices: {
        GOOGLE_FLIGHTS: 499,
        KAYAK: 515,
        SKYSCANNER: 492,
      },
      lowestPrice: 492,
      lowestSource: "Skyscanner",
      priceChange: 12,
      priceChangePercent: 2.5,
      stops: 1,
      duration: "14h 50m",
      airline: "United Airlines",
    },
  ],
  P2: [
    {
      id: "p2-jun26",
      date: "2026-06-26",
      dayOfWeek: "Thursday",
      priority: "P2" as const,
      prices: {
        GOOGLE_FLIGHTS: 445,
        KAYAK: 462,
        SKYSCANNER: 439,
      },
      lowestPrice: 439,
      lowestSource: "Skyscanner",
      priceChange: -31,
      priceChangePercent: -6.6,
      stops: 1,
      duration: "14h 45m",
      airline: "United Airlines",
    },
    {
      id: "p2-jun28",
      date: "2026-06-28",
      dayOfWeek: "Saturday",
      priority: "P2" as const,
      prices: {
        GOOGLE_FLIGHTS: 578,
        KAYAK: 585,
        SKYSCANNER: 571,
      },
      lowestPrice: 571,
      lowestSource: "Skyscanner",
      priceChange: 18,
      priceChangePercent: 3.3,
      stops: 1,
      duration: "15h 20m",
      airline: "United Airlines",
    },
    {
      id: "p2-jun30",
      date: "2026-06-30",
      dayOfWeek: "Monday",
      priority: "P2" as const,
      prices: {
        GOOGLE_FLIGHTS: 468,
        KAYAK: 475,
        SKYSCANNER: 461,
      },
      lowestPrice: 461,
      lowestSource: "Skyscanner",
      priceChange: -8,
      priceChangePercent: -1.7,
      stops: 1,
      duration: "14h 40m",
      airline: "United Airlines",
    },
    {
      id: "p2-jul01",
      date: "2026-07-01",
      dayOfWeek: "Tuesday",
      priority: "P2" as const,
      prices: {
        GOOGLE_FLIGHTS: 432,
        KAYAK: 448,
        SKYSCANNER: 425,
      },
      lowestPrice: 425,
      lowestSource: "Skyscanner",
      priceChange: -42,
      priceChangePercent: -9.0,
      stops: 1,
      duration: "14h 30m",
      airline: "United Airlines",
    },
  ],
};

// Sample chart data (14 days)
function generateChartData() {
  const data = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    data.push({
      date: d.toISOString().split("T")[0]!,
      google: Math.round(490 + (Math.random() - 0.5) * 60),
      kayak: Math.round(510 + (Math.random() - 0.5) * 70),
      skyscanner: Math.round(480 + (Math.random() - 0.5) * 50),
    });
  }
  return data;
}

const CHART_DATA = generateChartData();

// ─── Page ────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* ─── Deal Alerts Banner ─── */}
        <div className="fr-card p-4 fr-glow">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <AlertTriangle className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary">
                🚨 Price drop detected!
              </p>
              <p className="text-xs text-muted-foreground">
                Jul 1 (Tue) dropped <span className="fr-price-down font-semibold">9%</span> to{" "}
                <span className="text-foreground font-semibold">$425</span> on Skyscanner — Tuesday departures are historically cheapest.
              </p>
            </div>
            <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              View Deal
            </button>
          </div>
        </div>

        {/* ─── P1 Priority Band ─── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-wide uppercase"
              style={{ background: "hsl(0 90% 64% / 0.15)", color: "hsl(0 90% 64%)" }}>
              P1
            </span>
            <h2 className="text-lg font-semibold text-foreground">
              High Priority — June 24, 25, 29
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEMO_FLIGHTS.P1.map((flight) => (
              <FlightCard key={flight.id} flight={flight} />
            ))}
          </div>
        </section>

        {/* ─── P2 Priority Band ─── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-wide uppercase"
              style={{ background: "hsl(38 92% 50% / 0.15)", color: "hsl(38 92% 50%)" }}>
              P2
            </span>
            <h2 className="text-lg font-semibold text-foreground">
              Medium Priority — June 26, 28, 30 & July 1
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {DEMO_FLIGHTS.P2.map((flight) => (
              <FlightCard key={flight.id} flight={flight} />
            ))}
          </div>
        </section>

        {/* ─── Price Trend Chart ─── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Price Trend — Last 14 Days
            </h2>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full" style={{ background: "hsl(217 91% 60%)" }} />
                Google Flights
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full" style={{ background: "hsl(25 95% 53%)" }} />
                Kayak
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full" style={{ background: "hsl(174 72% 40%)" }} />
                Skyscanner
              </span>
            </div>
          </div>
          <div className="fr-card p-6">
            <PriceChart data={CHART_DATA} />
          </div>
        </section>

        {/* ─── Quick Stats ─── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Lowest Today"
            value="$425"
            detail="Jul 1 — Skyscanner"
            trend="down"
          />
          <StatCard
            label="Avg Price"
            value="$486"
            detail="Across all dates"
            trend="neutral"
          />
          <StatCard
            label="Best Day"
            value="Tuesday"
            detail="Historically -8% cheaper"
            trend="down"
          />
          <StatCard
            label="Sources Active"
            value="3/3"
            detail="All scrapers healthy"
            trend="neutral"
          />
        </section>
      </main>
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────

function StatCard({
  label,
  value,
  detail,
  trend,
}: {
  label: string;
  value: string;
  detail: string;
  trend: "up" | "down" | "neutral";
}) {
  return (
    <div className="fr-card p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
        {trend === "down" && (
          <TrendingDown className="w-3 h-3 fr-price-down" />
        )}
        {trend === "up" && <TrendingUp className="w-3 h-3 fr-price-up" />}
        {detail}
      </p>
    </div>
  );
}
