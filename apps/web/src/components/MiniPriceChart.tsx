"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MiniPriceChartProps {
  data: Array<Record<string, any>>;
}

const SOURCES = [
  { key: "googleflights", color: "hsl(217 91% 60%)", label: "Google" },
  { key: "kayak", color: "hsl(25 95% 53%)", label: "Kayak" },
  { key: "skyscanner", color: "hsl(174 72% 40%)", label: "Skyscanner" },
];

export function MiniPriceChart({ data }: MiniPriceChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full h-[120px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
        >
          <XAxis
            dataKey="date"
            tick={{ fill: "hsl(240 5% 55%)", fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: string) => {
              const d = new Date(value + "T00:00:00");
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }}
          />
          <YAxis
            tick={{ fill: "hsl(240 5% 55%)", fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v}`}
            width={40}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(232 20% 12%)",
              border: "1px solid hsl(232 15% 20%)",
              borderRadius: 8,
              fontSize: 11,
              padding: "6px 10px",
            }}
            labelStyle={{ color: "hsl(240 5% 65%)" }}
            itemStyle={{ color: "hsl(0 0% 90%)" }}
            formatter={(value: number) => [`$${value}`, ""]}
            labelFormatter={(label: string) => {
              const d = new Date(label + "T00:00:00");
              return d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            }}
          />
          {SOURCES.map((source) => (
            <Line
              key={source.key}
              type="monotone"
              dataKey={source.key}
              stroke={source.color}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
