import {
  User, Organization, Repository, PullRequest, Commit,
  Deployment, MetricSnapshot, TeamMemberStats, DashboardMetrics,
  TrendDataPoint, PullRequestReview, DateRange
} from "@/types";
import { subDays, format, addHours, addMinutes } from "date-fns";

const now = new Date();

// --- Users / Team Members ---
export const mockUsers: User[] = [
  { id: "u1", name: "Sarah Chen", email: "sarah@devpulse.io", role: "OWNER", avatarUrl: undefined, createdAt: "2024-01-15T10:00:00Z" },
  { id: "u2", name: "Marcus Johnson", email: "marcus@devpulse.io", role: "ADMIN", createdAt: "2024-01-20T10:00:00Z" },
  { id: "u3", name: "Aiko Tanaka", email: "aiko@devpulse.io", role: "MEMBER", createdAt: "2024-02-01T10:00:00Z" },
  { id: "u4", name: "David Kim", email: "david@devpulse.io", role: "MEMBER", createdAt: "2024-02-10T10:00:00Z" },
  { id: "u5", name: "Elena Rodriguez", email: "elena@devpulse.io", role: "MEMBER", createdAt: "2024-02-15T10:00:00Z" },
  { id: "u6", name: "James Wright", email: "james@devpulse.io", role: "MEMBER", createdAt: "2024-03-01T10:00:00Z" },
  { id: "u7", name: "Priya Patel", email: "priya@devpulse.io", role: "ADMIN", createdAt: "2024-03-05T10:00:00Z" },
  { id: "u8", name: "Alex Novak", email: "alex@devpulse.io", role: "MEMBER", createdAt: "2024-03-10T10:00:00Z" },
  { id: "u9", name: "Liu Wei", email: "liu@devpulse.io", role: "MEMBER", createdAt: "2024-03-15T10:00:00Z" },
  { id: "u10", name: "Fatima Hassan", email: "fatima@devpulse.io", role: "MEMBER", createdAt: "2024-03-20T10:00:00Z" },
];

export const mockOrg: Organization = {
  id: "org1", name: "DevPulse Labs", slug: "devpulse-labs", ownerId: "u1", createdAt: "2024-01-15T10:00:00Z"
};

export const mockRepos: Repository[] = [
  { id: "r1", organizationId: "org1", owner: "devpulse-labs", name: "api-gateway", fullName: "devpulse-labs/api-gateway", isActive: true, webhookConfigured: true, lastSyncAt: subDays(now, 0.1).toISOString(), createdAt: "2024-01-20T10:00:00Z" },
  { id: "r2", organizationId: "org1", owner: "devpulse-labs", name: "web-client", fullName: "devpulse-labs/web-client", isActive: true, webhookConfigured: true, lastSyncAt: subDays(now, 0.5).toISOString(), createdAt: "2024-01-25T10:00:00Z" },
  { id: "r3", organizationId: "org1", owner: "devpulse-labs", name: "data-pipeline", fullName: "devpulse-labs/data-pipeline", isActive: true, webhookConfigured: false, lastSyncAt: subDays(now, 2).toISOString(), createdAt: "2024-02-01T10:00:00Z" },
];

// --- Generate PRs ---
const prTitles = [
  "feat: add user authentication flow", "fix: resolve race condition in data sync",
  "refactor: extract API client module", "feat: implement dashboard charts",
  "fix: correct timezone handling", "chore: upgrade dependencies",
  "feat: add webhook event processing", "fix: handle null response gracefully",
  "feat: implement team analytics", "refactor: optimize database queries",
  "feat: add deployment tracking", "fix: pagination offset bug",
  "feat: repo settings page", "chore: add integration tests",
  "feat: metric snapshot cron job", "fix: auth token refresh logic",
  "feat: contributor activity charts", "refactor: middleware pipeline",
  "feat: add search functionality", "fix: CSS grid layout on mobile",
  "feat: notification system", "chore: docker compose setup",
  "feat: rate limiting middleware", "fix: memory leak in event listener",
  "feat: bulk import repositories", "refactor: error handling patterns",
  "feat: export metrics to CSV", "fix: date range filter edge case",
  "feat: dark mode toggle", "chore: CI/CD pipeline config",
  "feat: real-time webhook status", "fix: duplicate webhook events",
  "feat: organization settings", "refactor: service layer abstraction",
  "feat: PR review turnaround alerts", "fix: chart tooltip positioning",
  "feat: commit message parsing", "chore: add seed data script",
  "feat: deployment environment tags", "fix: infinite scroll pagination",
  "feat: custom metric dashboards", "refactor: component composition",
  "feat: GitHub app integration", "fix: session expiry handling",
  "feat: team role management", "chore: performance monitoring setup",
];

function randomItem<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomBetween(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }

export const mockPullRequests: PullRequest[] = prTitles.map((title, i) => {
  const daysAgo = randomBetween(0, 89);
  const createdAt = subDays(now, daysAgo);
  const isMerged = Math.random() > 0.2;
  const isClosed = isMerged || Math.random() > 0.7;
  const cycleTime = isMerged ? randomBetween(60, 4800) : undefined;
  const reviewTime = isMerged ? randomBetween(15, 1440) : undefined;

  return {
    id: `pr${i + 1}`,
    repositoryId: mockRepos[i % 3].id,
    authorId: mockUsers[i % mockUsers.length].id,
    number: i + 1,
    title,
    state: isMerged ? "MERGED" : isClosed ? "CLOSED" : "OPEN",
    createdAtGitHub: createdAt.toISOString(),
    mergedAt: isMerged ? addHours(createdAt, randomBetween(1, 72)).toISOString() : undefined,
    closedAt: isClosed ? addHours(createdAt, randomBetween(1, 96)).toISOString() : undefined,
    cycleTimeMinutes: cycleTime,
    reviewTurnaroundMinutes: reviewTime,
  };
});

// --- Commits ---
export const mockCommits: Commit[] = Array.from({ length: 120 }, (_, i) => {
  const daysAgo = randomBetween(0, 89);
  return {
    id: `c${i + 1}`,
    repositoryId: mockRepos[i % 3].id,
    authorId: mockUsers[i % mockUsers.length].id,
    sha: Math.random().toString(36).substring(2, 9) + Math.random().toString(36).substring(2, 9),
    message: randomItem(["Fix tests", "Update README", "Refactor module", "Add feature", "Bug fix", "Cleanup", "Optimize query", "Add validation"]),
    committedAt: subDays(now, daysAgo).toISOString(),
  };
});

// --- Deployments ---
const envs = ["production", "staging", "preview"];
export const mockDeployments: Deployment[] = Array.from({ length: 18 }, (_, i) => ({
  id: `d${i + 1}`,
  repositoryId: mockRepos[i % 3].id,
  environment: envs[i % 3],
  status: i < 14 ? "SUCCESS" : randomItem(["FAILURE", "SUCCESS", "IN_PROGRESS", "PENDING"]) as Deployment["status"],
  deployedAt: subDays(now, randomBetween(0, 60)).toISOString(),
}));

// --- Metric Snapshots (90 days) ---
export const mockMetricSnapshots: MetricSnapshot[] = Array.from({ length: 90 }, (_, i) => {
  const date = subDays(now, 89 - i);
  return {
    id: `ms${i + 1}`,
    repositoryId: "all",
    date: format(date, "yyyy-MM-dd"),
    totalPrs: randomBetween(0, 4),
    avgCycleTimeHours: +(randomBetween(2, 48) + Math.random()).toFixed(1),
    avgReviewTurnaroundHours: +(randomBetween(1, 24) + Math.random()).toFixed(1),
    commitCount: randomBetween(1, 12),
    deploymentCount: randomBetween(0, 2),
  };
});

// --- Computed helpers ---
export function getDashboardMetrics(repoId?: string): DashboardMetrics {
  const prs = repoId ? mockPullRequests.filter(p => p.repositoryId === repoId) : mockPullRequests;
  const commits = repoId ? mockCommits.filter(c => c.repositoryId === repoId) : mockCommits;
  const deploys = repoId ? mockDeployments.filter(d => d.repositoryId === repoId) : mockDeployments;

  const mergedPrs = prs.filter(p => p.state === "MERGED" && p.cycleTimeMinutes);
  const avgCycleTime = mergedPrs.length ? mergedPrs.reduce((s, p) => s + (p.cycleTimeMinutes || 0), 0) / mergedPrs.length / 60 : 0;
  const reviewedPrs = mergedPrs.filter(p => p.reviewTurnaroundMinutes);
  const avgReview = reviewedPrs.length ? reviewedPrs.reduce((s, p) => s + (p.reviewTurnaroundMinutes || 0), 0) / reviewedPrs.length / 60 : 0;

  return {
    totalPrs: prs.length,
    avgCycleTimeHours: +avgCycleTime.toFixed(1),
    commitFrequency: +(commits.length / 13).toFixed(1), // per week over ~90 days
    avgReviewTurnaroundHours: +avgReview.toFixed(1),
    deploymentFrequency: +(deploys.filter(d => d.status === "SUCCESS").length / 13).toFixed(1),
  };
}

export function getTrendData(range: DateRange, repoId?: string): TrendDataPoint[] {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return Array.from({ length: days }, (_, i) => {
    const date = subDays(now, days - 1 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayPrs = mockPullRequests.filter(p => {
      const d = format(new Date(p.createdAtGitHub), "yyyy-MM-dd");
      return d === dateStr && (!repoId || p.repositoryId === repoId);
    });
    const dayCommits = mockCommits.filter(c => {
      const d = format(new Date(c.committedAt), "yyyy-MM-dd");
      return d === dateStr && (!repoId || c.repositoryId === repoId);
    });
    const dayDeploys = mockDeployments.filter(de => {
      const d = format(new Date(de.deployedAt), "yyyy-MM-dd");
      return d === dateStr && (!repoId || de.repositoryId === repoId);
    });
    const mergedPrs = dayPrs.filter(p => p.cycleTimeMinutes);
    return {
      date: format(date, "MMM dd"),
      prs: dayPrs.length,
      commits: dayCommits.length,
      cycleTime: mergedPrs.length ? +(mergedPrs.reduce((s, p) => s + (p.cycleTimeMinutes || 0), 0) / mergedPrs.length / 60).toFixed(1) : 0,
      reviewTime: mergedPrs.length ? +(mergedPrs.filter(p => p.reviewTurnaroundMinutes).reduce((s, p) => s + (p.reviewTurnaroundMinutes || 0), 0) / Math.max(mergedPrs.filter(p => p.reviewTurnaroundMinutes).length, 1) / 60).toFixed(1) : 0,
      deployments: dayDeploys.length,
    } as TrendDataPoint;
  });
}

export function getTeamStats(): TeamMemberStats[] {
  return mockUsers.map(user => {
    const userPrs = mockPullRequests.filter(p => p.authorId === user.id);
    const userCommits = mockCommits.filter(c => c.authorId === user.id);
    const mergedPrs = userPrs.filter(p => p.cycleTimeMinutes);
    const reviewedCount = mockPullRequests.filter(p => p.authorId !== user.id && p.state === "MERGED").length;

    return {
      user,
      commits: userCommits.length,
      prsOpened: userPrs.length,
      prsReviewed: Math.floor(reviewedCount / mockUsers.length),
      avgCycleTimeHours: mergedPrs.length ? +(mergedPrs.reduce((s, p) => s + (p.cycleTimeMinutes || 0), 0) / mergedPrs.length / 60).toFixed(1) : 0,
      avgReviewTurnaroundHours: mergedPrs.length ? +(mergedPrs.filter(p => p.reviewTurnaroundMinutes).reduce((s, p) => s + (p.reviewTurnaroundMinutes || 0), 0) / Math.max(mergedPrs.filter(p => p.reviewTurnaroundMinutes).length, 1) / 60).toFixed(1) : 0,
    } as TeamMemberStats;
  });
}
