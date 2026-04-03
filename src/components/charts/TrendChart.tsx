import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendDataPoint } from "@/types";

interface TrendChartProps {
  data: TrendDataPoint[];
  dataKey: keyof TrendDataPoint;
  title: string;
  color?: string;
  unit?: string;
}

export function TrendChart({ data, dataKey, title, color = "hsl(217, 91%, 60%)", unit = "" }: TrendChartProps) {
  return (
    <div className="glass-card rounded-xl p-5 animate-fade-in">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${String(dataKey)}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" strokeOpacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(222, 22%, 11%)", border: "1px solid hsl(220, 20%, 18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(220, 14%, 92%)" }}
              formatter={(value: number) => [`${value}${unit}`, title]}
            />
            <Area type="monotone" dataKey={dataKey as string} stroke={color} fill={`url(#gradient-${String(dataKey)})`} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
