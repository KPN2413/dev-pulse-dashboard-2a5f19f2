import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ContributorChartProps {
  data: { name: string; commits: number; prs: number }[];
}

export function ContributorChart({ data }: ContributorChartProps) {
  return (
    <div className="glass-card rounded-xl p-5 animate-fade-in">
      <h3 className="text-sm font-semibold mb-4">Contributor Activity</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" strokeOpacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(220, 10%, 46%)" tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(222, 22%, 11%)", border: "1px solid hsl(220, 20%, 18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(220, 14%, 92%)" }} />
            <Bar dataKey="commits" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} name="Commits" />
            <Bar dataKey="prs" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} name="PRs" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
