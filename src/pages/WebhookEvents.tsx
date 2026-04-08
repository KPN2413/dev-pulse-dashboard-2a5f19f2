import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Webhook, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WebhookEvent {
  id: string;
  event_type: string;
  delivery_id: string | null;
  repository_id: string | null;
  status: "received" | "processed" | "failed";
  received_at: string;
  processed_at: string | null;
  raw_payload: unknown;
}

const statusConfig = {
  received: { label: "Received", icon: Clock, variant: "secondary" as const },
  processed: { label: "Processed", icon: CheckCircle2, variant: "default" as const },
  failed: { label: "Failed", icon: AlertCircle, variant: "destructive" as const },
};

export default function WebhookEventsPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [repoNames, setRepoNames] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    let query = supabase
      .from("webhook_events")
      .select("id, event_type, delivery_id, repository_id, status, received_at, processed_at, raw_payload")
      .order("received_at", { ascending: false })
      .limit(100);

    if (statusFilter !== "all") query = query.eq("status", statusFilter as "received" | "processed" | "failed");
    if (eventFilter !== "all") query = query.eq("event_type", eventFilter);

    const [{ data }, { data: repos }] = await Promise.all([
      query,
      supabase.from("repositories").select("id, full_name"),
    ]);

    if (repos) {
      const map: Record<string, string> = {};
      repos.forEach((r) => (map[r.id] = r.full_name));
      setRepoNames(map);
    }
    setEvents((data as WebhookEvent[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [statusFilter, eventFilter]);

  const eventTypes = [...new Set(events.map((e) => e.event_type))];
  const counts = {
    total: events.length,
    processed: events.filter((e) => e.status === "processed").length,
    failed: events.filter((e) => e.status === "failed").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Webhook Events</h1>
            <p className="text-muted-foreground text-sm">Incoming GitHub webhook events and processing status</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Events", value: counts.total, icon: Webhook },
            { label: "Processed", value: counts.processed, icon: CheckCircle2 },
            { label: "Failed", value: counts.failed, icon: AlertCircle },
          ].map((c) => (
            <Card key={c.label} className="bg-card border-border">
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <c.icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{c.value}</p>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Event Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {eventTypes.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Events table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Event Log</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No webhook events found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-medium">Event</th>
                      <th className="text-left py-2 pr-4 font-medium">Repository</th>
                      <th className="text-left py-2 pr-4 font-medium">Status</th>
                      <th className="text-left py-2 pr-4 font-medium">Delivery ID</th>
                      <th className="text-left py-2 pr-4 font-medium">Received</th>
                      <th className="text-left py-2 font-medium">Payload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev) => {
                      const cfg = statusConfig[ev.status];
                      const StatusIcon = cfg.icon;
                      return (
                        <tr key={ev.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 pr-4">
                            <Badge variant="outline" className="font-mono text-xs">
                              {ev.event_type}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {ev.repository_id ? repoNames[ev.repository_id] || "Unknown" : "—"}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant={cfg.variant} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {cfg.label}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 font-mono text-xs text-muted-foreground truncate max-w-[120px]">
                            {ev.delivery_id || "—"}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                            {new Date(ev.received_at).toLocaleString()}
                          </td>
                          <td className="py-3">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-xs">View</Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>
                                    {ev.event_type} — {ev.delivery_id || ev.id}
                                  </DialogTitle>
                                </DialogHeader>
                                <ScrollArea className="max-h-[60vh]">
                                  <pre className="text-xs bg-muted p-4 rounded-md overflow-auto">
                                    {JSON.stringify(ev.raw_payload, null, 2)}
                                  </pre>
                                </ScrollArea>
                              </DialogContent>
                            </Dialog>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
