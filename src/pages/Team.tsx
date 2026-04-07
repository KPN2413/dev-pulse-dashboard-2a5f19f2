import React, { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { cn } from "@/lib/utils";
import { Search, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type SortKey = "name" | "commits" | "prsOpened" | "prsReviewed" | "avgCycleTimeHours" | "avgReviewTurnaroundHours";

export default function TeamPage() {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("commits");
  const [sortAsc, setSortAsc] = useState(false);

  const { loading, teamStats } = useDashboardData("", "30d");

  const stats = useMemo(() => {
    let data = [...teamStats];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(t => t.user.name.toLowerCase().includes(q) || t.user.email.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      const av = sortKey === "name" ? a.user.name : a[sortKey];
      const bv = sortKey === "name" ? b.user.name : b[sortKey];
      if (typeof av === "string") return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return data;
  }, [search, sortKey, sortAsc, teamStats]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th className="pb-3 pr-4 font-medium cursor-pointer select-none" onClick={() => toggleSort(field)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn("h-3 w-3", sortKey === field ? "text-primary" : "text-muted-foreground/50")} />
      </span>
    </th>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Team</h1>
            <p className="text-sm text-muted-foreground">{stats.length} team members</p>
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 animate-fade-in overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <SortHeader label="Name" field="name" />
                <th className="pb-3 pr-4 font-medium">Role</th>
                <SortHeader label="Commits" field="commits" />
                <SortHeader label="PRs Opened" field="prsOpened" />
                <SortHeader label="PRs Reviewed" field="prsReviewed" />
                <SortHeader label="Avg Cycle Time" field="avgCycleTimeHours" />
                <SortHeader label="Avg Review Time" field="avgReviewTurnaroundHours" />
              </tr>
            </thead>
            <tbody>
              {stats.map(t => (
                <tr key={t.user.id} className="border-b border-border/50 last:border-0">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {t.user.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="font-medium">{t.user.name}</p>
                        <p className="text-xs text-muted-foreground">{t.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      t.user.role === "OWNER" ? "bg-accent/10 text-accent" :
                      t.user.role === "ADMIN" ? "bg-primary/10 text-primary" :
                      "bg-muted text-muted-foreground"
                    )}>{t.user.role}</span>
                  </td>
                  <td className="py-3 pr-4 font-mono">{t.commits}</td>
                  <td className="py-3 pr-4 font-mono">{t.prsOpened}</td>
                  <td className="py-3 pr-4 font-mono">{t.prsReviewed}</td>
                  <td className="py-3 pr-4 font-mono">{t.avgCycleTimeHours}h</td>
                  <td className="py-3 font-mono">{t.avgReviewTurnaroundHours}h</td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No team members found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
