"use client";

import { PriceChart } from "./PriceChart";

interface PriceChartSectionProps {
  data: Array<{
    date: string;
    google: number;
    kayak: number;
    skyscanner: number;
  }>;
}

export function PriceChartSection({ data }: PriceChartSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          Price Trend — Last 14 Days
        </h2>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="w-3 h-0.5 rounded-full"
              style={{ background: "hsl(217 91% 60%)" }}
            />
            Google Flights
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-3 h-0.5 rounded-full"
              style={{ background: "hsl(25 95% 53%)" }}
            />
            Kayak
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-3 h-0.5 rounded-full"
              style={{ background: "hsl(174 72% 40%)" }}
            />
            Skyscanner
          </span>
        </div>
      </div>
      <div className="fr-card p-6">
        <PriceChart data={data} />
      </div>
    </section>
  );
}
