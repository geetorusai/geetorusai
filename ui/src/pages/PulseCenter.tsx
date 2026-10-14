import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldAlert,
  Zap,
  RotateCcw,
  Clock,
  Database,
  Cpu,
  Server,
  Layers,
} from "lucide-react";
import { pulseApi } from "@/api/pulse";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HealthState, ErrorSeverity } from "@geetorusai/shared";

function stateColor(state: HealthState) {
  switch (state) {
    case "healthy":
      return {
        badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        border: "border-emerald-500/30",
        indicator: "bg-emerald-500",
        label: "HEALTHY",
      };
    case "degraded":
      return {
        badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        border: "border-amber-500/40",
        indicator: "bg-amber-500",
        label: "DEGRADED",
      };
    case "recovering":
      return {
        badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        border: "border-blue-500/40",
        indicator: "bg-blue-500 animate-pulse",
        label: "RECOVERING",
      };
    case "unavailable":
      return {
        badge: "bg-destructive/10 text-destructive border-destructive/20",
        border: "border-destructive/40",
        indicator: "bg-destructive",
        label: "OUTAGE",
      };
    default:
      return {
        badge: "bg-muted text-muted-foreground border-border",
        border: "border-border",
        indicator: "bg-muted-foreground",
        label: "UNKNOWN",
      };
  }
}

function severityBadge(severity: ErrorSeverity) {
  switch (severity) {
    case "critical":
      return "bg-destructive text-destructive-foreground font-mono font-semibold";
    case "high":
      return "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono";
    case "medium":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono";
    default:
      return "bg-muted text-muted-foreground font-mono";
  }
}

export function PulseCenter() {
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<"overview" | "circuit-breakers" | "incidents" | "recovery">("overview");

  const { data: status, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["pulse-status"],
    queryFn: () => pulseApi.getStatus(),
    refetchInterval: 15_000,
  });

  const { data: settings } = useQuery({
    queryKey: ["pulse-settings"],
    queryFn: () => pulseApi.getSettings(),
  });

  const resetBreakerMutation = useMutation({
    mutationFn: (provider: string) => pulseApi.resetCircuitBreaker(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pulse-status"] });
    },
  });

  const resolveIncidentMutation = useMutation({
    mutationFn: (id: string) => pulseApi.resolveIncident(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pulse-status"] });
    },
  });

  const overall = stateColor(status?.state ?? "unknown");

  return (
    <div className="space-y-6">
      {/* Top Header Banner: Minimal with Selective Brutalist Status Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Pulse — System Health & Recovery
            </h1>
            <span
              className={cn(
                "px-2.5 py-0.5 text-xs font-mono font-bold tracking-wider rounded border",
                overall.badge,
              )}
            >
              {overall.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time infrastructure health, circuit breaker telemetry, proactive diagnostics, and automated recovery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="font-mono text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isFetching && "animate-spin")} />
            {isFetching ? "Diagnosing…" : "Run Pulse Check"}
          </Button>
        </div>
      </div>

      {/* Selective Brutalist Metric Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border-2 border-border bg-card p-4 rounded-none shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>SYSTEM STATE</span>
            <span className={cn("h-2.5 w-2.5 rounded-full", overall.indicator)} />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight mt-1 text-foreground">
            {status?.state?.toUpperCase() ?? "CHECKING"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {status?.lastCheckedAt ? `Checked ${new Date(status.lastCheckedAt).toLocaleTimeString()}` : "—"}
          </p>
        </div>

        <div className="border-2 border-border bg-card p-4 rounded-none shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>RECOVERY SUCCESS</span>
            <Zap className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight mt-1 text-foreground">
            {status?.metrics ? `${status.metrics.recoverySuccessRate}%` : "100%"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {status?.metrics ? `${status.metrics.recoveredCount} auto-recovered` : "0 attempts"}
          </p>
        </div>

        <div className="border-2 border-border bg-card p-4 rounded-none shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>ACTIVE INCIDENTS</span>
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight mt-1 text-foreground">
            {status?.activeIncidents ? status.activeIncidents.length : 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {status?.activeIncidents && status.activeIncidents.length > 0 ? "Requires review" : "Zero open alerts"}
          </p>
        </div>

        <div className="border-2 border-border bg-card p-4 rounded-none shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>CIRCUIT BREAKERS</span>
            <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight mt-1 text-foreground">
            {status?.circuitBreakers ? Object.keys(status.circuitBreakers).length : 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {status?.circuitBreakers && Object.values(status.circuitBreakers).some((b) => b.state === "open")
              ? "Tripped breakers active"
              : "All circuits healthy"}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-border gap-6">
        <button
          onClick={() => setSelectedTab("overview")}
          className={cn(
            "pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
            selectedTab === "overview"
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Services & Providers
        </button>
        <button
          onClick={() => setSelectedTab("circuit-breakers")}
          className={cn(
            "pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
            selectedTab === "circuit-breakers"
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Circuit Breakers
        </button>
        <button
          onClick={() => setSelectedTab("incidents")}
          className={cn(
            "pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
            selectedTab === "incidents"
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Incidents ({status?.activeIncidents?.length ?? 0})
        </button>
        <button
          onClick={() => setSelectedTab("recovery")}
          className={cn(
            "pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
            selectedTab === "recovery"
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Recovery Audit Log
        </button>
      </div>

      {/* Tab 1: Services Overview */}
      {selectedTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {status?.services &&
              Object.entries(status.services).map(([key, service]) => {
                const sColor = stateColor(service.status);
                const isDb = key === "database";
                const isGateway = key === "api-gateway";

                return (
                  <Card key={key} className={cn("p-4 border transition-all", sColor.border)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isDb ? (
                          <Database className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : isGateway ? (
                          <Server className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <Cpu className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <h2 className="text-sm font-semibold text-foreground truncate">{service.name}</h2>
                      </div>
                      <span className={cn("px-2 py-0.5 text-xs font-mono font-medium rounded border", sColor.badge)}>
                        {service.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                      {service.message || "Component running within expected operational thresholds."}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground font-mono mt-4 pt-3 border-t border-border/60">
                      <span>Latency: {service.latencyMs !== undefined ? `${service.latencyMs}ms` : "—"}</span>
                      <span>Checked {new Date(service.lastCheckedAt).toLocaleTimeString()}</span>
                    </div>
                  </Card>
                );
              })}
          </div>

          {/* Self-Healing Configuration Card */}
          <Card className="p-4 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-foreground">Self-Healing Automation Policy</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automated backoff, circuit breaking cooldowns, and fallback routing safeguards.
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-500/20">
                  {settings?.autoRecoveryEnabled ? "ACTIVE" : "STANDBY"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs font-mono">
              <div className="p-3 bg-muted/40 rounded border border-border">
                <span className="text-muted-foreground block">Circuit Trip Threshold</span>
                <span className="text-foreground font-semibold text-sm">{settings?.circuitBreakerThreshold ?? 4} failures</span>
              </div>
              <div className="p-3 bg-muted/40 rounded border border-border">
                <span className="text-muted-foreground block">Cooldown Window</span>
                <span className="text-foreground font-semibold text-sm">{Math.round((settings?.circuitBreakerCooldownMs ?? 30000) / 1000)}s</span>
              </div>
              <div className="p-3 bg-muted/40 rounded border border-border">
                <span className="text-muted-foreground block">Max Bounded Retries</span>
                <span className="text-foreground font-semibold text-sm">{settings?.maxRetryAttempts ?? 3} attempts</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Circuit Breakers */}
      {selectedTab === "circuit-breakers" && (
        <div className="space-y-3">
          {status?.circuitBreakers && Object.keys(status.circuitBreakers).length > 0 ? (
            <div className="border border-border divide-y divide-border rounded-none bg-card">
              {Object.entries(status.circuitBreakers).map(([id, cb]) => (
                <div key={id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-sm font-bold text-foreground">{id}</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 text-xs font-mono uppercase font-semibold",
                          cb.state === "open"
                            ? "bg-destructive text-destructive-foreground"
                            : cb.state === "half_open"
                              ? "bg-amber-500 text-white"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                        )}
                      >
                        {cb.state}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono mt-1.5">
                      <span>Failures: {cb.failures} / {cb.threshold}</span>
                      <span>Cooldown: {Math.round(cb.cooldownMs / 1000)}s</span>
                      {cb.openUntil && <span>Open Until: {new Date(cb.openUntil).toLocaleTimeString()}</span>}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetBreakerMutation.mutate(id)}
                    disabled={resetBreakerMutation.isPending || cb.state === "closed"}
                    className="font-mono text-xs shrink-0"
                  >
                    <RotateCcw className="h-3 w-3 mr-1.5" />
                    Reset Circuit
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center border border-border bg-card">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">All Circuits Healthy</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                No provider has exceeded error thresholds.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Incidents */}
      {selectedTab === "incidents" && (
        <div className="space-y-3">
          {status?.activeIncidents && status.activeIncidents.length > 0 ? (
            <div className="space-y-2">
              {status.activeIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="border-2 border-border p-4 bg-card rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("px-1.5 py-0.5 text-xs uppercase font-mono", severityBadge(incident.severity))}>
                        {incident.severity}
                      </span>
                      <h3 className="text-sm font-semibold text-foreground">{incident.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{incident.summary}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono pt-1">
                      <span>Component: {incident.component}</span>
                      <span>Category: {incident.category}</span>
                      <span>Time: {new Date(incident.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolveIncidentMutation.mutate(incident.id)}
                    disabled={resolveIncidentMutation.isPending}
                    className="font-mono text-xs shrink-0"
                  >
                    Mark Resolved
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center border border-border bg-card">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Zero Active Incidents</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                The platform is operating cleanly with no critical or high severity errors.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Recovery Audit Log */}
      {selectedTab === "recovery" && (
        <div className="space-y-3">
          {status?.recentRecoveryEvents && status.recentRecoveryEvents.length > 0 ? (
            <div className="border border-border divide-y divide-border bg-card rounded-none">
              {status.recentRecoveryEvents.map((event) => (
                <div key={event.id} className="p-3 text-xs font-mono flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "px-1.5 py-0.5 uppercase font-bold text-xs",
                          event.status === "recovered"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : event.status === "circuit_broken"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-destructive/10 text-destructive",
                        )}
                      >
                        {event.status}
                      </span>
                      <span className="font-semibold text-foreground">{event.actionTaken}</span>
                      <span className="text-muted-foreground">({event.component})</span>
                    </div>
                    <p className="text-muted-foreground">{event.outcomeMessage}</p>
                  </div>
                  <div className="text-right text-muted-foreground shrink-0">
                    <div>{event.attempts} / {event.maxAttempts} retries</div>
                    <div>{new Date(event.startedAt).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center border border-border bg-card">
              <p className="text-sm font-medium text-foreground">No Recovery Events Recorded</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                All inference and runtime operations completed normally.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
