"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";

interface PriceChartProps {
  data: Array<{
    date: string;
    google: number;
    kayak: number;
    skyscanner: number;
  }>;
}

const SOURCE_COLORS = {
  google: "hsl(217 91% 60%)",
  kayak: "hsl(25 95% 53%)",
  skyscanner: "hsl(174 72% 40%)",
};

export function PriceChart({ data }: PriceChartProps) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="gradGoogle" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.15} />
              <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(232 15% 18%)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "hsl(240 5% 65%)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "hsl(232 15% 18%)" }}
            tickFormatter={(value: string) => {
              const d = new Date(value + "T00:00:00");
              return d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            }}
          />
          <YAxis
            tick={{ fill: "hsl(240 5% 65%)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => `$${value}`}
            domain={["auto", "auto"]}
            width={55}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "hsl(240 5% 65%)", strokeWidth: 1, strokeDasharray: "4 4" }}
          />
          <Area
            type="monotone"
            dataKey="google"
            fill="url(#gradGoogle)"
            stroke="none"
          />
          <Line
            type="monotone"
            dataKey="google"
            stroke={SOURCE_COLORS.google}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              fill: SOURCE_COLORS.google,
              stroke: "hsl(232 20% 8%)",
              strokeWidth: 2,
            }}
            name="Google Flights"
          />
          <Line
            type="monotone"
            dataKey="kayak"
            stroke={SOURCE_COLORS.kayak}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              fill: SOURCE_COLORS.kayak,
              stroke: "hsl(232 20% 8%)",
              strokeWidth: 2,
            }}
            name="Kayak"
          />
          <Line
            type="monotone"
            dataKey="skyscanner"
            stroke={SOURCE_COLORS.skyscanner}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              fill: SOURCE_COLORS.skyscanner,
              stroke: "hsl(232 20% 8%)",
              strokeWidth: 2,
            }}
            name="Skyscanner"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;

  const dateStr = new Date(label + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="fr-card p-3 min-w-[160px] shadow-xl">
      <p className="text-xs font-medium text-foreground mb-2">{dateStr}</p>
      {payload.map((entry: any) => (
        <div
          key={entry.name}
          className="flex items-center justify-between gap-4 text-xs"
        >
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: entry.color }}
            />
            {entry.name}
          </span>
          <span className="font-semibold text-foreground">
            ${entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}
