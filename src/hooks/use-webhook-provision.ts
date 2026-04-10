import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type WebhookProvisionState = "idle" | "provisioning" | "verifying" | "success" | "failed";

export interface WebhookProvisionStatus {
  state: WebhookProvisionState;
  error: string | null;
  fallback: boolean;
  result: Record<string, unknown> | null;
}

export function useWebhookProvision() {
  const [statusMap, setStatusMap] = useState<Record<string, WebhookProvisionStatus>>({});

  const getStatus = useCallback(
    (repoId: string): WebhookProvisionStatus =>
      statusMap[repoId] ?? { state: "idle", error: null, fallback: false, result: null },
    [statusMap]
  );

  const provision = useCallback(async (repoId: string) => {
    setStatusMap((prev) => ({
      ...prev,
      [repoId]: { state: "provisioning", error: null, fallback: false, result: null },
    }));

    try {
      const { data, error } = await supabase.functions.invoke("github-webhook-provision", {
        body: { action: "provision", repoId },
      });

      if (error) throw new Error(error.message);

      if (data?.error) {
        setStatusMap((prev) => ({
          ...prev,
          [repoId]: { state: "failed", error: data.error, fallback: !!data.fallback, result: data },
        }));
        toast.error(data.error);
        return data;
      }

      setStatusMap((prev) => ({
        ...prev,
        [repoId]: { state: "success", error: null, fallback: false, result: data },
      }));
      toast.success(`Webhook ${data.action}: automatically configured on GitHub`);
      return data;
    } catch (err: any) {
      setStatusMap((prev) => ({
        ...prev,
        [repoId]: { state: "failed", error: err.message, fallback: false, result: null },
      }));
      toast.error(`Webhook setup failed: ${err.message}`);
      return null;
    }
  }, []);

  const verify = useCallback(async (repoId: string) => {
    setStatusMap((prev) => ({
      ...prev,
      [repoId]: { state: "verifying", error: null, fallback: false, result: null },
    }));

    try {
      const { data, error } = await supabase.functions.invoke("github-webhook-provision", {
        body: { action: "verify", repoId },
      });

      if (error) throw new Error(error.message);

      if (data?.error) {
        setStatusMap((prev) => ({
          ...prev,
          [repoId]: { state: "failed", error: data.error, fallback: !!data.fallback, result: data },
        }));
        toast.error(data.error);
        return data;
      }

      const isHealthy = data.status === "active";
      setStatusMap((prev) => ({
        ...prev,
        [repoId]: { state: isHealthy ? "success" : "failed", error: null, fallback: false, result: data },
      }));

      if (isHealthy) {
        toast.success("Webhook verified: configuration is healthy");
      } else {
        const issues = data.issues?.join("; ") || "Configuration issues detected";
        toast.warning(`Webhook issues: ${issues}`);
      }
      return data;
    } catch (err: any) {
      setStatusMap((prev) => ({
        ...prev,
        [repoId]: { state: "failed", error: err.message, fallback: false, result: null },
      }));
      toast.error(`Verification failed: ${err.message}`);
      return null;
    }
  }, []);

  return { getStatus, provision, verify };
}
