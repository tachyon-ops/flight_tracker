import { prisma } from "@flightradar/db";
import { Header } from "@/components/Header";
import { Settings, Database, Plane, Clock, Shield } from "lucide-react";

async function getStats() {
  const totalFlights = await prisma.watchedFlight.count({ where: { active: true } });
  const totalSnapshots = await prisma.priceSnapshot.count();
  const totalDeals = await prisma.dealIntelligence.count();
  const totalAlerts = await prisma.alert.count();

  return { totalFlights, totalSnapshots, totalDeals, totalAlerts };
}

export default async function SettingsPage() {
  const stats = await getStats();

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            System status and configuration
          </p>
        </div>

        {/* ─── System Stats ─── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            System Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox
              icon={<Plane className="w-4 h-4 text-blue-400" />}
              label="Active Flights"
              value={stats.totalFlights.toString()}
            />
            <StatBox
              icon={<Database className="w-4 h-4 text-green-400" />}
              label="Price Snapshots"
              value={stats.totalSnapshots.toLocaleString()}
            />
            <StatBox
              icon={<Shield className="w-4 h-4 text-amber-400" />}
              label="Deals Found"
              value={stats.totalDeals.toString()}
            />
            <StatBox
              icon={<Clock className="w-4 h-4 text-purple-400" />}
              label="Alerts Sent"
              value={stats.totalAlerts.toString()}
            />
          </div>
        </section>

        {/* ─── Scraper Config ─── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Scraper Configuration
          </h2>
          <div className="fr-card p-4 space-y-4">
            <ConfigRow
              label="Scan Interval"
              value="Every 4 hours"
              detail="Configured via Vercel Cron"
            />
            <ConfigRow
              label="Sources"
              value="Google Flights, Kayak, Skyscanner"
              detail="3 Playwright scrapers"
            />
            <ConfigRow
              label="Database"
              value="SQLite (local)"
              detail="Migrate to Neon Postgres for production"
            />
            <ConfigRow
              label="Playwright"
              value="Chromium headless"
              detail="Installed locally"
            />
          </div>
        </section>

        {/* ─── Environment Variables ─── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Environment Variables
          </h2>
          <div className="fr-card p-4 space-y-3">
            <EnvRow name="DATABASE_URL" set={!!process.env.DATABASE_URL} />
            <EnvRow name="CRON_SECRET" set={!!process.env.CRON_SECRET} />
            <EnvRow name="TELEGRAM_BOT_TOKEN" set={!!process.env.TELEGRAM_BOT_TOKEN} />
            <EnvRow name="TELEGRAM_CHAT_ID" set={!!process.env.TELEGRAM_CHAT_ID} />
            <EnvRow name="RESEND_API_KEY" set={!!process.env.RESEND_API_KEY} />
          </div>
        </section>

        {/* ─── Danger Zone ─── */}
        <section>
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-4">
            Danger Zone
          </h2>
          <div className="fr-card p-4 border-red-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Clear All Price Data
                </p>
                <p className="text-xs text-muted-foreground">
                  Delete all price snapshots and deal intelligence records. This
                  cannot be undone.
                </p>
              </div>
              <button
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-not-allowed opacity-50"
                disabled
              >
                Reset Data
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="fr-card p-4">
      <div className="flex items-center gap-2 mb-1">{icon}</div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ConfigRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <div>
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function EnvRow({ name, set }: { name: string; set: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <code className="text-xs text-muted-foreground">{name}</code>
      <span
        className={`text-xs font-medium ${
          set ? "text-green-400" : "text-muted-foreground/50"
        }`}
      >
        {set ? "✓ Set" : "Not set"}
      </span>
    </div>
  );
}
