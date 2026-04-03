import React, { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendChart } from "@/components/charts/TrendChart";
import { ContributorChart } from "@/components/charts/ContributorChart";
import { getDashboardMetrics, getTrendData, getTeamStats, mockPullRequests, mockDeployments, mockRepos } from "@/api/mock-data";
import { DateRange } from "@/types";
import { GitPullRequest, Clock, Activity, Eye, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const ranges: { value: DateRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

export default function DashboardPage() {
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const metrics = useMemo(() => getDashboardMetrics(selectedRepo || undefined), [selectedRepo]);
  const trendData = useMemo(() => getTrendData(dateRange, selectedRepo || undefined), [dateRange, selectedRepo]);
  const teamStats = useMemo(() => getTeamStats(), []);

  const contributorData = teamStats.slice(0, 8).map(t => ({
    name: t.user.name.split(" ")[0],
    commits: t.commits,
    prs: t.prsOpened,
  }));

  const recentPrs = mockPullRequests
    .filter(p => !selectedRepo || p.repositoryId === selectedRepo)
    .sort((a, b) => new Date(b.createdAtGitHub).getTime() - new Date(a.createdAtGitHub).getTime())
    .slice(0, 8);

  const recentDeploys = mockDeployments
    .filter(d => !selectedRepo || d.repositoryId === selectedRepo)
    .sort((a, b) => new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime())
    .slice(0, 5);

  const getAuthorName = (id: string) => teamStats.find(t => t.user.id === id)?.user.name || "Unknown";
  const getRepoName = (id: string) => mockRepos.find(r => r.id === id)?.name || "Unknown";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
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
              {mockRepos.map(r => <option key={r.id} value={r.id}>{r.fullName}</option>)}
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

        {/* Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard icon={GitPullRequest} title="Total PRs" value={metrics.totalPrs} trend={{ value: 12, positive: true }} />
          <MetricCard icon={Clock} title="Avg Cycle Time" value={`${metrics.avgCycleTimeHours}h`} subtitle="Open → Merge" trend={{ value: 8, positive: false }} />
          <MetricCard icon={Activity} title="Commit Frequency" value={`${metrics.commitFrequency}/wk`} trend={{ value: 5, positive: true }} />
          <MetricCard icon={Eye} title="Review Turnaround" value={`${metrics.avgReviewTurnaroundHours}h`} trend={{ value: 15, positive: false }} />
          <MetricCard icon={Rocket} title="Deploy Frequency" value={`${metrics.deploymentFrequency}/wk`} trend={{ value: 3, positive: true }} />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <TrendChart data={trendData} dataKey="prs" title="Pull Requests" color="hsl(217, 91%, 60%)" />
          <TrendChart data={trendData} dataKey="commits" title="Commits" color="hsl(262, 83%, 58%)" />
          <TrendChart data={trendData} dataKey="cycleTime" title="Cycle Time (hours)" color="hsl(38, 92%, 50%)" unit="h" />
          <ContributorChart data={contributorData} />
        </div>

        {/* Recent PRs */}
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
                    <td className="py-3 pr-4 text-muted-foreground">{getAuthorName(pr.authorId)}</td>
                    <td className="py-3 pr-4 text-muted-foreground font-mono text-xs">{getRepoName(pr.repositoryId)}</td>
                    <td className="py-3 pr-4">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        pr.state === "MERGED" ? "bg-success/10 text-success" :
                        pr.state === "OPEN" ? "bg-primary/10 text-primary" :
                        "bg-muted text-muted-foreground"
                      )}>{pr.state}</span>
                    </td>
                    <td className="py-3 text-muted-foreground">{pr.cycleTimeMinutes ? `${(pr.cycleTimeMinutes / 60).toFixed(1)}h` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Deployments */}
        <div className="glass-card rounded-xl p-5 animate-fade-in">
          <h3 className="text-sm font-semibold mb-4">Recent Deployments</h3>
          <div className="space-y-3">
            {recentDeploys.map(d => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={cn("h-2 w-2 rounded-full",
                    d.status === "SUCCESS" ? "bg-success" :
                    d.status === "FAILURE" ? "bg-destructive" :
                    d.status === "IN_PROGRESS" ? "bg-warning" : "bg-muted-foreground"
                  )} />
                  <span className="text-sm font-medium">{getRepoName(d.repositoryId)}</span>
                  <span className="text-xs text-muted-foreground font-mono">{d.environment}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("text-xs font-medium",
                    d.status === "SUCCESS" ? "text-success" :
                    d.status === "FAILURE" ? "text-destructive" : "text-muted-foreground"
                  )}>{d.status}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(d.deployedAt), "MMM dd, HH:mm")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
