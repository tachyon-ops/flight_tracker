"use client";

import {
  TrendingDown,
  TrendingUp,
  Minus,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

interface FlightData {
  id: string;
  date: string;
  dayOfWeek: string;
  priority: "P1" | "P2" | "P3";
  prices: Record<string, number>;
  lowestPrice: number;
  lowestSource: string;
  priceChange: number;
  priceChangePercent: number;
  stops: number;
  duration: string;
  airline: string;
  deepLink?: string;
}

const SOURCE_COLORS: Record<string, string> = {
  GOOGLE_FLIGHTS: "hsl(217 91% 60%)",
  KAYAK: "hsl(25 95% 53%)",
  SKYSCANNER: "hsl(174 72% 40%)",
  UNITED_DIRECT: "hsl(215 50% 40%)",
};

const SOURCE_LABELS: Record<string, string> = {
  GOOGLE_FLIGHTS: "Google",
  KAYAK: "Kayak",
  SKYSCANNER: "Sky",
  UNITED_DIRECT: "United",
};

// Build a fallback Google Flights search URL from the flight date
function buildFallbackUrl(date: string): string {
  // ZRH → XNA route with the flight date
  const d = date.replace(/-/g, "");
  return `https://www.google.com/travel/flights?q=flights+from+ZRH+to+XNA+on+${d}`;
}

export function FlightCard({ flight }: { flight: FlightData }) {
  const [expanded, setExpanded] = useState(false);
  const bookingUrl = flight.deepLink || buildFallbackUrl(flight.date);
  const isDown = flight.priceChange < 0;
  const isUp = flight.priceChange > 0;

  // Format date nicely
  const dateObj = new Date(flight.date + "T00:00:00");
  const monthDay = dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="fr-card p-4 flex flex-col gap-3 group">
      {/* ─── Header: Date + Day ─── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-foreground">{monthDay}</p>
          <p className="text-xs text-muted-foreground">{flight.dayOfWeek}</p>
        </div>
        <PriorityBadge priority={flight.priority} />
      </div>

      {/* ─── Price + Trend ─── */}
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold tracking-tight text-foreground">
          ${flight.lowestPrice}
        </span>
        <div className="flex items-center gap-0.5 mb-1">
          {isDown && (
            <>
              <TrendingDown className="w-4 h-4 fr-price-down" />
              <span className="text-sm font-semibold fr-price-down">
                {flight.priceChangePercent.toFixed(1)}%
              </span>
            </>
          )}
          {isUp && (
            <>
              <TrendingUp className="w-4 h-4 fr-price-up" />
              <span className="text-sm font-semibold fr-price-up">
                +{flight.priceChangePercent.toFixed(1)}%
              </span>
            </>
          )}
          {!isDown && !isUp && (
            <Minus className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* ─── Source comparison ─── */}
      <div className="flex items-center gap-2">
        {Object.entries(flight.prices).map(([source, price]) => (
          <div
            key={source}
            className="flex items-center gap-1 text-xs text-muted-foreground"
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: SOURCE_COLORS[source] || "#666" }}
            />
            <span>
              {SOURCE_LABELS[source] || source}
            </span>
            <span className="font-medium text-foreground/80">
              ${price}
            </span>
          </div>
        ))}
      </div>

      {/* ─── Flight details ─── */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-3">
        <div className="flex items-center gap-3">
          <span>{flight.airline}</span>
          <span>·</span>
          <span>{flight.stops === 0 ? "Nonstop" : `${flight.stops} stop`}</span>
          <span>·</span>
          <span>{flight.duration}</span>
        </div>
      </div>

      {/* ─── Actions ─── */}
      <div className="flex items-center gap-2">
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-[0.98] no-underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Book Now
        </a>
        <button
          className="flex items-center justify-center px-3 py-2 text-xs text-muted-foreground rounded-lg hover:bg-muted/50 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* ─── Expanded: price history ─── */}
      {expanded && (
        <div className="border-t border-border/40 pt-3 mt-1">
          <p className="text-xs text-muted-foreground mb-2">
            Price history for this date coming soon...
          </p>
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: "P1" | "P2" | "P3" }) {
  const colors = {
    P1: { bg: "hsl(0 90% 64% / 0.12)", text: "hsl(0 90% 64%)" },
    P2: { bg: "hsl(38 92% 50% / 0.12)", text: "hsl(38 92% 50%)" },
    P3: { bg: "hsl(210 40% 50% / 0.12)", text: "hsl(210 40% 50%)" },
  };
  const c = colors[priority];

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase"
      style={{ background: c.bg, color: c.text }}
    >
      {priority}
    </span>
  );
}
