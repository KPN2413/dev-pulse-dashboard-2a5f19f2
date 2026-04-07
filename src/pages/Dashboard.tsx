import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendChart } from "@/components/charts/TrendChart";
import { ContributorChart } from "@/components/charts/ContributorChart";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { DateRange } from "@/types";
import { GitPullRequest, Clock, Activity, Eye, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const ranges: { value: DateRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

export default function DashboardPage() {
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const {
    loading, repos, metrics, trendData, recentPrs, recentDeploys,
    getAuthorName, getRepoName, contributorData,
  } = useDashboardData(selectedRepo, dateRange);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Engineering metrics overview</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedRepo}
              onChange={e => setSelectedRepo(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Repositories</option>
              {repos.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
            <div className="flex rounded-lg border border-input bg-background">
              {ranges.map(r => (
                <button
                  key={r.value}
                  onClick={() => setDateRange(r.value)}
                  className={cn("px-3 py-2 text-sm transition-colors", dateRange === r.value ? "bg-primary text-primary-foreground rounded-lg" : "text-muted-foreground hover:text-foreground")}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard icon={GitPullRequest} title="Total PRs" value={metrics.totalPrs} trend={{ value: 12, positive: true }} />
          <MetricCard icon={Clock} title="Avg Cycle Time" value={`${metrics.avgCycleTimeHours}h`} subtitle="Open → Merge" trend={{ value: 8, positive: false }} />
          <MetricCard icon={Activity} title="Commit Frequency" value={`${metrics.commitFrequency}/wk`} trend={{ value: 5, positive: true }} />
          <MetricCard icon={Eye} title="Review Turnaround" value={`${metrics.avgReviewTurnaroundHours}h`} trend={{ value: 15, positive: false }} />
          <MetricCard icon={Rocket} title="Deploy Frequency" value={`${metrics.deploymentFrequency}/wk`} trend={{ value: 3, positive: true }} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TrendChart data={trendData} dataKey="prs" title="Pull Requests" color="hsl(217, 91%, 60%)" />
          <TrendChart data={trendData} dataKey="commits" title="Commits" color="hsl(262, 83%, 58%)" />
          <TrendChart data={trendData} dataKey="cycleTime" title="Cycle Time (hours)" color="hsl(38, 92%, 50%)" unit="h" />
          <ContributorChart data={contributorData} />
        </div>

        <div className="glass-card rounded-xl p-5 animate-fade-in">
          <h3 className="text-sm font-semibold mb-4">Recent Pull Requests</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">#</th>
                  <th className="pb-3 pr-4 font-medium">Title</th>
                  <th className="pb-3 pr-4 font-medium">Author</th>
                  <th className="pb-3 pr-4 font-medium">Repo</th>
                  <th className="pb-3 pr-4 font-medium">State</th>
                  <th className="pb-3 font-medium">Cycle Time</th>
                </tr>
              </thead>
              <tbody>
                {recentPrs.map(pr => (
                  <tr key={pr.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 pr-4 text-muted-foreground">{pr.number}</td>
                    <td className="py-3 pr-4 font-medium max-w-xs truncate">{pr.title}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{getAuthorName(pr.author_id)}</td>
                    <td className="py-3 pr-4 text-muted-foreground font-mono text-xs">{getRepoName(pr.repository_id)}</td>
                    <td className="py-3 pr-4">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        pr.state === "merged" ? "bg-success/10 text-success" :
                        pr.state === "open" ? "bg-primary/10 text-primary" :
                        "bg-muted text-muted-foreground"
                      )}>{pr.state.toUpperCase()}</span>
                    </td>
                    <td className="py-3 text-muted-foreground">{pr.cycle_time_minutes ? `${(pr.cycle_time_minutes / 60).toFixed(1)}h` : "—"}</td>
                  </tr>
                ))}
                {recentPrs.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No pull requests yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 animate-fade-in">
          <h3 className="text-sm font-semibold mb-4">Recent Deployments</h3>
          <div className="space-y-3">
            {recentDeploys.map(d => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={cn("h-2 w-2 rounded-full",
                    d.status === "success" ? "bg-success" :
                    d.status === "failure" ? "bg-destructive" :
                    d.status === "in_progress" ? "bg-warning" : "bg-muted-foreground"
                  )} />
                  <span className="text-sm font-medium">{getRepoName(d.repository_id)}</span>
                  <span className="text-xs text-muted-foreground font-mono">{d.environment}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("text-xs font-medium",
                    d.status === "success" ? "text-success" :
                    d.status === "failure" ? "text-destructive" : "text-muted-foreground"
                  )}>{d.status.toUpperCase()}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(d.deployed_at), "MMM dd, HH:mm")}</span>
                </div>
              </div>
            ))}
            {recentDeploys.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No deployments yet</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
