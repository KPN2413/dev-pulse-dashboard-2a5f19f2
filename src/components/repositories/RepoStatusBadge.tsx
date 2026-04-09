import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Wifi, AlertTriangle } from "lucide-react";
import type { RepoStatus } from "@/hooks/use-repositories";

const statusConfig: Record<
  RepoStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  connected: {
    label: "Connected",
    icon: CheckCircle2,
    className: "bg-primary/10 text-primary",
  },
  pending_webhook: {
    label: "Pending Webhook",
    icon: Clock,
    className: "bg-warning/10 text-warning",
  },
  webhook_active: {
    label: "Webhook Active",
    icon: Wifi,
    className: "bg-success/10 text-success",
  },
  sync_needed: {
    label: "Sync Needed",
    icon: AlertTriangle,
    className: "bg-destructive/10 text-destructive",
  },
};

interface RepoStatusBadgeProps {
  status: RepoStatus;
}

export function RepoStatusBadge({ status }: RepoStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
