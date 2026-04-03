export type UserRole = "OWNER" | "ADMIN" | "MEMBER";
export type PRState = "OPEN" | "MERGED" | "CLOSED";
export type ReviewState = "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "PENDING";
export type DeploymentStatus = "SUCCESS" | "FAILURE" | "PENDING" | "IN_PROGRESS";
export type WebhookEventStatus = "RECEIVED" | "PROCESSED" | "FAILED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
}

export interface Repository {
  id: string;
  organizationId: string;
  owner: string;
  name: string;
  fullName: string;
  githubRepoId?: string;
  isActive: boolean;
  webhookConfigured: boolean;
  lastSyncAt?: string;
  createdAt: string;
}

export interface PullRequest {
  id: string;
  repositoryId: string;
  authorId: string;
  githubPrId?: number;
  number: number;
  title: string;
  state: PRState;
  createdAtGitHub: string;
  mergedAt?: string;
  closedAt?: string;
  cycleTimeMinutes?: number;
  reviewTurnaroundMinutes?: number;
}

export interface PullRequestReview {
  id: string;
  pullRequestId: string;
  reviewerId: string;
  state: ReviewState;
  submittedAt: string;
}

export interface Commit {
  id: string;
  repositoryId: string;
  authorId: string;
  sha: string;
  message?: string;
  committedAt: string;
}

export interface Deployment {
  id: string;
  repositoryId: string;
  environment: string;
  status: DeploymentStatus;
  deployedAt: string;
}

export interface MetricSnapshot {
  id: string;
  repositoryId: string;
  date: string;
  totalPrs: number;
  avgCycleTimeHours: number;
  avgReviewTurnaroundHours: number;
  commitCount: number;
  deploymentCount: number;
}

export interface TeamMemberStats {
  user: User;
  commits: number;
  prsOpened: number;
  prsReviewed: number;
  avgCycleTimeHours: number;
  avgReviewTurnaroundHours: number;
}

export interface DashboardMetrics {
  totalPrs: number;
  avgCycleTimeHours: number;
  commitFrequency: number;
  avgReviewTurnaroundHours: number;
  deploymentFrequency: number;
}

export interface TrendDataPoint {
  date: string;
  prs: number;
  commits: number;
  cycleTime: number;
  reviewTime: number;
  deployments: number;
}

export type DateRange = "7d" | "30d" | "90d";
