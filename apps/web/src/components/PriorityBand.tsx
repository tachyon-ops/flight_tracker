import { FlightCard } from "./FlightCard";
import type { FlightCardData } from "@/types";

const PRIORITY_STYLES = {
  P1: { bg: "hsl(0 90% 64% / 0.15)", text: "hsl(0 90% 64%)" },
  P2: { bg: "hsl(38 92% 50% / 0.15)", text: "hsl(38 92% 50%)" },
  P3: { bg: "hsl(210 40% 50% / 0.15)", text: "hsl(210 40% 50%)" },
};

const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
};

interface PriorityBandProps {
  priority: "P1" | "P2" | "P3";
  label: string;
  description: string;
  flights: FlightCardData[];
  columns?: number;
}

export function PriorityBand({
  priority,
  label,
  description,
  flights,
  columns = 3,
}: PriorityBandProps) {
  const style = PRIORITY_STYLES[priority];
  const gridCols = GRID_COLS[Math.min(columns, 4)] ?? GRID_COLS[3];

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-wide uppercase"
          style={{ background: style.bg, color: style.text }}
        >
          {priority}
        </span>
        <h2 className="text-lg font-semibold text-foreground">
          {label} — {description}
        </h2>
      </div>
      <div className={`grid ${gridCols} gap-4`}>
        {flights.map((flight) => (
          <FlightCard key={flight.id} flight={flight} />
        ))}
      </div>
    </section>
  );
}
