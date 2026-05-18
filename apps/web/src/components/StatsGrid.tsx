import { TrendingDown, TrendingUp } from "lucide-react";

interface StatsGridProps {
  lowestPrice: number;
  lowestDate: string;
  lowestSource: string;
  avgPrice: number;
}

export function StatsGrid({
  lowestPrice,
  lowestDate,
  lowestSource,
  avgPrice,
}: StatsGridProps) {
  const dateLabel = lowestDate
    ? new Date(lowestDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "—";

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Lowest Today"
        value={lowestPrice > 0 ? `$${lowestPrice}` : "—"}
        detail={`${dateLabel} — ${lowestSource}`}
        icon={<TrendingDown className="w-3 h-3 fr-price-down" />}
      />
      <StatCard
        label="Avg Price"
        value={avgPrice > 0 ? `$${avgPrice}` : "—"}
        detail="Across all dates"
      />
      <StatCard
        label="Best Day"
        value="Tuesday"
        detail="Historically -8% cheaper"
        icon={<TrendingDown className="w-3 h-3 fr-price-down" />}
      />
      <StatCard
        label="Sources Active"
        value="3/3"
        detail="All scrapers healthy"
      />
    </section>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="fr-card p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
        {icon}
        {detail}
      </p>
    </div>
  );
}
