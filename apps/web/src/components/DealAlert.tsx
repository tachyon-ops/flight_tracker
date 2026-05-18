import { AlertTriangle, ExternalLink } from "lucide-react";

interface DealAlertProps {
  date: string;
  dayOfWeek: string;
  dropPercent: number;
  price: number;
  source: string;
  deepLink?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  GOOGLE_FLIGHTS: "Google Flights",
  KAYAK: "Kayak",
  SKYSCANNER: "Skyscanner",
};

function buildFallbackUrl(date: string): string {
  const d = date.replace(/-/g, "");
  return `https://www.google.com/travel/flights?q=flights+from+ZRH+to+XNA+on+${d}`;
}

export function DealAlert({
  date,
  dayOfWeek,
  dropPercent,
  price,
  source,
  deepLink,
}: DealAlertProps) {
  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const sourceLabel = SOURCE_LABELS[source] ?? source;
  const bookingUrl = deepLink || buildFallbackUrl(date);

  return (
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
            {dateLabel} ({dayOfWeek}) dropped{" "}
            <span className="fr-price-down font-semibold">
              {dropPercent.toFixed(1)}%
            </span>{" "}
            to{" "}
            <span className="text-foreground font-semibold">${price}</span> on{" "}
            {sourceLabel} — Tuesday departures are historically cheapest.
          </p>
        </div>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity no-underline whitespace-nowrap"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View Deal
        </a>
      </div>
    </div>
  );
}
