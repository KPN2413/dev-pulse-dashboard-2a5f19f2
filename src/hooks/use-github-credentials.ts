import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type CredentialStatus = "loading" | "not_connected" | "connected" | "invalid_token" | "token_needs_update";

export interface CredentialState {
  status: CredentialStatus;
  tokenLastFour: string | null;
  updatedAt: string | null;
  error: string | null;
}

export function useGitHubCredentials() {
  const { user } = useAuth();
  const [state, setState] = useState<CredentialState>({
    status: "loading",
    tokenLastFour: null,
    updatedAt: null,
    error: null,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!user) {
      setState({ status: "not_connected", tokenLastFour: null, updatedAt: null, error: null });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("github-credentials", {
        body: { action: "status" },
      });
      if (error) throw new Error(error.message);
      setState({
        status: data.status ?? "not_connected",
        tokenLastFour: data.tokenLastFour ?? null,
        updatedAt: data.updatedAt ?? null,
        error: null,
      });
    } catch (err: any) {
      setState((prev) => ({ ...prev, status: "not_connected", error: err.message }));
    }
  }, [user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const saveToken = useCallback(async (token: string) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("github-credentials", {
        body: { action: "save", token },
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      setState({
        status: data.status ?? "connected",
        tokenLastFour: data.tokenLastFour ?? null,
        updatedAt: new Date().toISOString(),
        error: null,
      });
      return { success: true, githubLogin: data.githubLogin };
    } catch (err: any) {
      setState((prev) => ({ ...prev, error: err.message }));
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  }, []);

  const removeToken = useCallback(async () => {
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("github-credentials", {
        body: { action: "remove" },
      });
      if (error) throw new Error(error.message);
      setState({ status: "not_connected", tokenLastFour: null, updatedAt: null, error: null });
      return true;
    } catch (err: any) {
      setState((prev) => ({ ...prev, error: err.message }));
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const testConnection = useCallback(async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("github-credentials", {
        body: { action: "test" },
      });
      if (error) throw new Error(error.message);
      if (data.status) {
        setState((prev) => ({
          ...prev,
          status: data.status,
          error: data.error ?? null,
        }));
      }
      return data;
    } catch (err: any) {
      setState((prev) => ({ ...prev, error: err.message }));
      return { ok: false, error: err.message };
    } finally {
      setTesting(false);
    }
  }, []);

  return {
    ...state,
    saving,
    testing,
    saveToken,
    removeToken,
    testConnection,
    refresh: fetchStatus,
  };
}
