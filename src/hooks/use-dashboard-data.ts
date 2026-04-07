import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DateRange, DashboardMetrics, TrendDataPoint } from "@/types";
import { subDays, format } from "date-fns";

interface DbRepo {
  id: string;
  owner: string;
  name: string;
  full_name: string;
  is_active: boolean;
  webhook_configured: boolean;
  created_at: string;
  user_id: string;
  github_repo_id: string | null;
  updated_at: string;
}

interface DbPullRequest {
  id: string;
  repository_id: string;
  author_id: string | null;
  number: number;
  title: string;
  state: string;
  created_at_github: string | null;
  merged_at: string | null;
  closed_at: string | null;
  cycle_time_minutes: number | null;
  review_turnaround_minutes: number | null;
}

interface DbCommit {
  id: string;
  repository_id: string;
  author_id: string | null;
  sha: string;
  message: string | null;
  committed_at: string;
}

interface DbDeployment {
  id: string;
  repository_id: string;
  environment: string;
  status: string;
  deployed_at: string;
}

interface DbProfile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

interface DbUserRole {
  user_id: string;
  role: string;
}

export function useRepos() {
  const [repos, setRepos] = useState<DbRepo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("repositories").select("*").then(({ data }) => {
      setRepos((data as DbRepo[]) || []);
      setLoading(false);
    });
  }, []);

  return { repos, loading, setRepos };
}

export function useDashboardData(selectedRepo: string, dateRange: DateRange) {
  const [repos, setRepos] = useState<DbRepo[]>([]);
  const [prs, setPrs] = useState<DbPullRequest[]>([]);
  const [commits, setCommits] = useState<DbCommit[]>([]);
  const [deployments, setDeployments] = useState<DbDeployment[]>([]);
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [roles, setRoles] = useState<DbUserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [repoRes, prRes, commitRes, deployRes, profileRes, roleRes] = await Promise.all([
        supabase.from("repositories").select("*"),
        supabase.from("pull_requests").select("*").order("created_at_github", { ascending: false }),
        supabase.from("commits").select("*"),
        supabase.from("deployments").select("*").order("deployed_at", { ascending: false }),
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      setRepos((repoRes.data as DbRepo[]) || []);
      setPrs((prRes.data as DbPullRequest[]) || []);
      setCommits((commitRes.data as DbCommit[]) || []);
      setDeployments((deployRes.data as DbDeployment[]) || []);
      setProfiles((profileRes.data as DbProfile[]) || []);
      setRoles((roleRes.data as DbUserRole[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const filteredPrs = useMemo(() =>
    selectedRepo ? prs.filter(p => p.repository_id === selectedRepo) : prs
  , [prs, selectedRepo]);

  const filteredCommits = useMemo(() =>
    selectedRepo ? commits.filter(c => c.repository_id === selectedRepo) : commits
  , [commits, selectedRepo]);

  const filteredDeploys = useMemo(() =>
    selectedRepo ? deployments.filter(d => d.repository_id === selectedRepo) : deployments
  , [deployments, selectedRepo]);

  const metrics: DashboardMetrics = useMemo(() => {
    const merged = filteredPrs.filter(p => p.state === "merged" && p.cycle_time_minutes);
    const avgCycleTime = merged.length
      ? merged.reduce((s, p) => s + (p.cycle_time_minutes || 0), 0) / merged.length / 60
      : 0;
    const reviewed = merged.filter(p => p.review_turnaround_minutes);
    const avgReview = reviewed.length
      ? reviewed.reduce((s, p) => s + (p.review_turnaround_minutes || 0), 0) / reviewed.length / 60
      : 0;
    const weeks = Math.max(1, 13);
    return {
      totalPrs: filteredPrs.length,
      avgCycleTimeHours: +avgCycleTime.toFixed(1),
      commitFrequency: +(filteredCommits.length / weeks).toFixed(1),
      avgReviewTurnaroundHours: +avgReview.toFixed(1),
      deploymentFrequency: +(filteredDeploys.filter(d => d.status === "success").length / weeks).toFixed(1),
    };
  }, [filteredPrs, filteredCommits, filteredDeploys]);

  const trendData: TrendDataPoint[] = useMemo(() => {
    const now = new Date();
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    return Array.from({ length: days }, (_, i) => {
      const date = subDays(now, days - 1 - i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayPrs = filteredPrs.filter(p => p.created_at_github && format(new Date(p.created_at_github), "yyyy-MM-dd") === dateStr);
      const dayCommits = filteredCommits.filter(c => format(new Date(c.committed_at), "yyyy-MM-dd") === dateStr);
      const dayDeploys = filteredDeploys.filter(d => format(new Date(d.deployed_at), "yyyy-MM-dd") === dateStr);
      const mergedDay = dayPrs.filter(p => p.cycle_time_minutes);
      return {
        date: format(date, "MMM dd"),
        prs: dayPrs.length,
        commits: dayCommits.length,
        cycleTime: mergedDay.length ? +(mergedDay.reduce((s, p) => s + (p.cycle_time_minutes || 0), 0) / mergedDay.length / 60).toFixed(1) : 0,
        reviewTime: 0,
        deployments: dayDeploys.length,
      } as TrendDataPoint;
    });
  }, [filteredPrs, filteredCommits, filteredDeploys, dateRange]);

  const recentPrs = useMemo(() => filteredPrs.slice(0, 8), [filteredPrs]);
  const recentDeploys = useMemo(() => filteredDeploys.slice(0, 5), [filteredDeploys]);

  const getAuthorName = (id: string | null) => profiles.find(p => p.id === id)?.name || "Unknown";
  const getRepoName = (id: string) => repos.find(r => r.id === id)?.name || "Unknown";

  const contributorData = useMemo(() => {
    const authorMap = new Map<string, { name: string; commits: number; prs: number }>();
    for (const p of profiles) {
      authorMap.set(p.id, { name: p.name.split(" ")[0], commits: 0, prs: 0 });
    }
    for (const c of filteredCommits) {
      if (c.author_id && authorMap.has(c.author_id)) authorMap.get(c.author_id)!.commits++;
    }
    for (const pr of filteredPrs) {
      if (pr.author_id && authorMap.has(pr.author_id)) authorMap.get(pr.author_id)!.prs++;
    }
    return Array.from(authorMap.values()).filter(a => a.commits > 0 || a.prs > 0).slice(0, 8);
  }, [profiles, filteredCommits, filteredPrs]);

  // Team stats for Team page
  const teamStats = useMemo(() => {
    return profiles.map(profile => {
      const role = roles.find(r => r.user_id === profile.id)?.role || "member";
      const userPrs = prs.filter(p => p.author_id === profile.id);
      const userCommits = commits.filter(c => c.author_id === profile.id);
      const merged = userPrs.filter(p => p.state === "merged" && p.cycle_time_minutes);
      const reviewed = prs.filter(p => p.author_id !== profile.id && p.state === "merged");

      return {
        user: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: role.toUpperCase() as "OWNER" | "ADMIN" | "MEMBER",
          avatarUrl: profile.avatar_url || undefined,
          createdAt: profile.created_at,
        },
        commits: userCommits.length,
        prsOpened: userPrs.length,
        prsReviewed: Math.floor(reviewed.length / Math.max(profiles.length, 1)),
        avgCycleTimeHours: merged.length
          ? +(merged.reduce((s, p) => s + (p.cycle_time_minutes || 0), 0) / merged.length / 60).toFixed(1)
          : 0,
        avgReviewTurnaroundHours: merged.length
          ? +(merged.filter(p => p.review_turnaround_minutes).reduce((s, p) => s + (p.review_turnaround_minutes || 0), 0) / Math.max(merged.filter(p => p.review_turnaround_minutes).length, 1) / 60).toFixed(1)
          : 0,
      };
    });
  }, [profiles, roles, prs, commits]);

  return {
    loading, repos, metrics, trendData, recentPrs, recentDeploys,
    getAuthorName, getRepoName, contributorData, teamStats,
  };
}
