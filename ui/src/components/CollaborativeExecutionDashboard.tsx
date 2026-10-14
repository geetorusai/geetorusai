import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GitBranch,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Bot,
  Workflow,
  Coins,
  ShieldCheck,
  Layers,
  Activity,
  FileText,
  Sparkles,
  Lock,
  ChevronRight,
  UserCheck,
  XCircle,
} from "lucide-react";
import type { Agent, CollaborativeRole, CollaborativeSubtaskStatus } from "@geetorusai/shared";
import { collaborationApi } from "../api/collaboration";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

interface CollaborativeExecutionDashboardProps {
  companyId: string;
  issueId: string;
  issueTitle: string;
  agents?: Agent[];
}

function RoleBadge({ role }: { role: CollaborativeRole }) {
  const styles: Record<CollaborativeRole, { label: string; class: string }> = {
    planner: {
      label: "Planner",
      class: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    },
    researcher: {
      label: "Researcher",
      class: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    },
    implementer: {
      label: "Implementer",
      class: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    },
    integrator: {
      label: "Integrator",
      class: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
    },
    tester: {
      label: "Testing & QA",
      class: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    },
    reviewer: {
      label: "Reviewer",
      class: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
    },
    documenter: {
      label: "Documenter",
      class: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20",
    },
    coordinator: {
      label: "Coordinator",
      class: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
    },
  };

  const current = styles[role] ?? { label: role, class: "bg-muted text-muted-foreground" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-(length:--text-micro) font-medium border",
        current.class,
      )}
    >
      <Bot className="h-3 w-3" />
      {current.label}
    </span>
  );
}

function SubtaskStatusBadge({ status }: { status: CollaborativeSubtaskStatus }) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-(length:--text-micro) font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </span>
      );
    case "in_progress":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-(length:--text-micro) font-medium bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 animate-pulse">
          <Activity className="h-3 w-3 animate-spin" />
          In Progress
        </span>
      );
    case "assigned":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-(length:--text-micro) font-medium bg-primary/10 text-primary border border-primary/20">
          <UserCheck className="h-3 w-3" />
          Assigned
        </span>
      );
    case "blocked":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-(length:--text-micro) font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
          <Clock className="h-3 w-3" />
          Blocked
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-(length:--text-micro) font-medium bg-destructive/15 text-destructive border border-destructive/30">
          <AlertCircle className="h-3 w-3" />
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-(length:--text-micro) font-medium bg-muted text-muted-foreground border border-border">
          Pending
        </span>
      );
  }
}

export function CollaborativeExecutionDashboard({
  companyId,
  issueId,
  issueTitle,
  agents = [],
}: CollaborativeExecutionDashboardProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"subtasks" | "context" | "logs" | "output">("subtasks");
  const [reassignSubtaskId, setReassignSubtaskId] = useState<string | null>(null);

  const queryKey = queryKeys.issues.collaboration(issueId);

  const { data: workflow, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => collaborationApi.getWorkflow(companyId, issueId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "in_progress" ? 3000 : false;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const startMutation = useMutation({
    mutationFn: () => collaborationApi.startWorkflow(companyId, issueId),
    onSuccess: invalidate,
  });

  const pauseMutation = useMutation({
    mutationFn: () => collaborationApi.pauseWorkflow(companyId, issueId),
    onSuccess: invalidate,
  });

  const resumeMutation = useMutation({
    mutationFn: () => collaborationApi.resumeWorkflow(companyId, issueId),
    onSuccess: invalidate,
  });

  const cancelMutation = useMutation({
    mutationFn: () => collaborationApi.cancelWorkflow(companyId, issueId),
    onSuccess: invalidate,
  });

  const planMutation = useMutation({
    mutationFn: () => collaborationApi.planWorkflow(companyId, issueId),
    onSuccess: invalidate,
  });

  const completeSubtaskMutation = useMutation({
    mutationFn: (subtaskId: string) =>
      collaborationApi.completeSubtask(companyId, issueId, subtaskId),
    onSuccess: invalidate,
  });

  const retrySubtaskMutation = useMutation({
    mutationFn: (subtaskId: string) =>
      collaborationApi.retrySubtask(companyId, issueId, subtaskId),
    onSuccess: invalidate,
  });

  const reassignMutation = useMutation({
    mutationFn: (data: { subtaskId: string; agentId: string; agentName: string; agentRole: string }) =>
      collaborationApi.reassignSubtask(companyId, issueId, data.subtaskId, {
        agentId: data.agentId,
        agentName: data.agentName,
        agentRole: data.agentRole,
      }),
    onSuccess: () => {
      setReassignSubtaskId(null);
      invalidate();
    },
  });

  const requestOverrideMutation = useMutation({
    mutationFn: () =>
      collaborationApi.requestBudgetOverride(companyId, issueId, {
        reason: "Requesting administrator budget override for continued execution",
      }),
    onSuccess: invalidate,
  });

  if (isLoading) {
    return (
      <Card className="p-6 border border-border bg-card/60">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Activity className="h-4 w-4 animate-spin text-primary" />
          <span>Loading collaborative execution workspace...</span>
        </div>
      </Card>
    );
  }

  if (error || !workflow) {
    return (
      <Card className="p-6 border border-border bg-card/60">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Workflow className="h-4 w-4 text-primary" />
            <span>Intelligent Task Distribution</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Analyze this task and generate a collaborative multi-agent execution plan.
          </p>
          <Button
            id="btn-generate-plan"
            size="sm"
            onClick={() => planMutation.mutate()}
            disabled={planMutation.isPending}
            className="gap-2"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {planMutation.isPending ? "Generating Plan..." : "Generate Execution Plan"}
          </Button>
        </div>
      </Card>
    );
  }

  const subtasks = workflow.subtasks ?? [];
  const completedCount = subtasks.filter((s) => s.status === "completed").length;
  const inProgressCount = subtasks.filter((s) => s.status === "in_progress").length;
  const progressPercent = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card/75 p-5 shadow-sm">
      {/* Header Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Workflow className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-foreground">
              Collaborative Multi-Agent Execution
            </h2>
            <Badge variant="outline" className="text-(length:--text-micro) uppercase font-mono">
              {workflow.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Strategy: <span className="font-medium text-foreground">{workflow.strategy === "multi_agent_collaborative" ? "Multi-Agent Collaboration" : "Single Agent"}</span> · Concurrency limit: {workflow.concurrencyLimit} parallel agents
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {workflow.status === "planned" && (
            <Button
              id="btn-collab-start"
              size="sm"
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              Start Collaboration
            </Button>
          )}

          {workflow.status === "in_progress" && (
            <Button
              id="btn-collab-pause"
              variant="outline"
              size="sm"
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
              className="gap-1.5"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </Button>
          )}

          {workflow.status === "paused" && (
            <Button
              id="btn-collab-resume"
              size="sm"
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
              className="gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              Resume
            </Button>
          )}

          {(workflow.status === "in_progress" || workflow.status === "paused") && (
            <Button
              id="btn-collab-cancel"
              variant="ghost"
              size="sm"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="text-muted-foreground hover:text-destructive"
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
          )}

          <Button
            id="btn-collab-replan"
            variant="outline"
            size="sm"
            onClick={() => planMutation.mutate()}
            disabled={planMutation.isPending}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Re-plan
          </Button>
        </div>
      </div>

      {/* Resilient Budget Notification Banner */}
      {workflow.budgetPolicyState && workflow.budgetPolicyState !== "normal" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-semibold">
                {workflow.budgetPolicyState === "awaiting_approval"
                  ? "Budget Policy: Execution Paused (Awaiting Approval)"
                  : "Budget Policy: Throttled to Economical Model Tier"}
              </span>
              <p className="text-(length:--text-micro) text-muted-foreground mt-0.5">
                {workflow.budgetPolicyState === "awaiting_approval"
                  ? "A budget threshold or active incident triggered an automatic pause. Request an administrative override to continue."
                  : "Models have been automatically downshifted to economical tiers to preserve budget headroom."}
              </p>
            </div>
          </div>
          {workflow.budgetPolicyState === "awaiting_approval" && (
            <Button
              id="btn-request-budget-override"
              size="sm"
              variant="outline"
              onClick={() => requestOverrideMutation.mutate()}
              disabled={requestOverrideMutation.isPending || workflow.budgetOverrideRequested}
              className="border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 shrink-0 text-xs"
            >
              {workflow.budgetOverrideRequested ? "Override Pending" : "Request Override"}
            </Button>
          )}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border/60 bg-background/50 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <Layers className="h-3.5 w-3.5" />
          </div>
          <div className="mt-1 text-lg font-semibold text-foreground">
            {completedCount} / {subtasks.length}
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/50 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Concurrency</span>
            <Users className="h-3.5 w-3.5" />
          </div>
          <div className="mt-1 text-lg font-semibold text-foreground">
            {inProgressCount} active
          </div>
          <p className="mt-1 text-(length:--text-micro) text-muted-foreground">
            Max {workflow.concurrencyLimit} parallel agents
          </p>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/50 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Token Budget</span>
            <Coins className="h-3.5 w-3.5" />
          </div>
          <div className="mt-1 text-lg font-semibold text-foreground">
            {workflow.totalTokensUsed.toLocaleString()}
          </div>
          <p className="mt-1 text-(length:--text-micro) text-muted-foreground">
            Tokens utilized across roles
          </p>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/50 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Verification</span>
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <div className="mt-1 text-lg font-semibold text-foreground">
            {workflow.verification?.verified ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Verified</span>
            ) : (
              <span className="text-muted-foreground text-sm">Pending</span>
            )}
          </div>
          <p className="mt-1 text-(length:--text-micro) text-muted-foreground">
            Integration & test gating
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border/60 pb-2 text-xs">
        <button
          id="tab-subtasks"
          onClick={() => setActiveTab("subtasks")}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium transition-colors",
            activeTab === "subtasks"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          Subtasks & DAG ({subtasks.length})
        </button>
        <button
          id="tab-context"
          onClick={() => setActiveTab("context")}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium transition-colors",
            activeTab === "context"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          Shared Workspace & Contracts
        </button>
        <button
          id="tab-logs"
          onClick={() => setActiveTab("logs")}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium transition-colors",
            activeTab === "logs"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          Live Activity Feed ({workflow.logs?.length ?? 0})
        </button>
        {workflow.finalConsolidatedOutput && (
          <button
            id="tab-output"
            onClick={() => setActiveTab("output")}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium transition-colors",
              activeTab === "output"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            Final Delivery Output
          </button>
        )}
      </div>

      {/* Tab 1: Subtasks List & DAG */}
      {activeTab === "subtasks" && (
        <div className="space-y-3">
          {subtasks.map((sub, index) => {
            const hasPrereqs = sub.dependencies && sub.dependencies.length > 0;
            const isReassigning = reassignSubtaskId === sub.id;

            return (
              <div
                key={sub.id}
                className={cn(
                  "rounded-lg border p-3.5 transition-all",
                  sub.status === "in_progress"
                    ? "border-primary/50 bg-primary/5 shadow-xs"
                    : sub.status === "completed"
                      ? "border-border/60 bg-background/40 opacity-90"
                      : "border-border/60 bg-background/60",
                )}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        #{index + 1}
                      </span>
                      <h4 className="text-sm font-semibold text-foreground">
                        {sub.title}
                      </h4>
                      <RoleBadge role={sub.role} />
                      <SubtaskStatusBadge status={sub.status} />
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {sub.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-(length:--text-micro) text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Bot className="h-3 w-3 text-muted-foreground" />
                        Assigned:{" "}
                        <span className="font-medium text-foreground">
                          {sub.assignedAgentName ?? "Unassigned"}
                        </span>
                        {sub.assignedModel && (
                          <span className="text-muted-foreground/80">
                            ({sub.assignedModel})
                          </span>
                        )}
                      </span>

                      {hasPrereqs && (
                        <span className="inline-flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          Requires: {sub.dependencies.join(", ")}
                        </span>
                      )}

                      {sub.targetFiles.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Files: {sub.targetFiles.slice(0, 2).join(", ")}
                          {sub.targetFiles.length > 2 && "..."}
                        </span>
                      )}

                      {sub.gitBranch && (
                        <span className="inline-flex items-center gap-1 font-mono text-(length:--text-micro) px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40">
                          <GitBranch className="h-2.5 w-2.5 text-primary" />
                          {sub.gitBranch}
                        </span>
                      )}

                      {sub.isSynthesizedSpecialist && (
                        <span className="inline-flex items-center gap-1 text-(length:--text-micro) px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 font-medium">
                          <Sparkles className="h-2.5 w-2.5" />
                          Specialist Synthesized
                        </span>
                      )}
                    </div>

                    {sub.outputNotes && (
                      <div className="mt-2 rounded border border-border/50 bg-muted/30 p-2 text-xs text-foreground">
                        <span className="font-medium text-muted-foreground">Output: </span>
                        {sub.outputNotes}
                      </div>
                    )}

                    {sub.error && (
                      <div className="mt-2 rounded border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                        <span className="font-medium">Blocker/Error: </span>
                        {sub.error} (Retry {sub.retryCount})
                      </div>
                    )}
                  </div>

                  {/* Subtask Controls */}
                  <div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0">
                    {sub.status === "in_progress" && (
                      <Button
                        id={`btn-complete-${sub.id}`}
                        size="sm"
                        variant="outline"
                        onClick={() => completeSubtaskMutation.mutate(sub.id)}
                        disabled={completeSubtaskMutation.isPending}
                        className="text-xs gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Complete
                      </Button>
                    )}

                    {(sub.status === "failed" || sub.status === "blocked") && (
                      <Button
                        id={`btn-retry-${sub.id}`}
                        size="sm"
                        variant="outline"
                        onClick={() => retrySubtaskMutation.mutate(sub.id)}
                        disabled={retrySubtaskMutation.isPending}
                        className="text-xs gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Retry
                      </Button>
                    )}

                    <Button
                      id={`btn-reassign-${sub.id}`}
                      size="sm"
                      variant="ghost"
                      onClick={() => setReassignSubtaskId(isReassigning ? null : sub.id)}
                      className="text-xs text-muted-foreground"
                    >
                      Reassign
                    </Button>
                  </div>
                </div>

                {/* Reassignment Dropdown Panel */}
                {isReassigning && (
                  <div className="mt-3 rounded border border-border bg-background p-2.5">
                    <div className="text-xs font-medium text-foreground mb-1.5">
                      Choose employee/agent for "{sub.title}":
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {agents.map((ag) => (
                        <button
                          key={ag.id}
                          onClick={() =>
                            reassignMutation.mutate({
                              subtaskId: sub.id,
                              agentId: ag.id,
                              agentName: ag.name,
                              agentRole: ag.role,
                            })
                          }
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
                            ag.id === sub.assignedAgentId
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border hover:bg-muted text-foreground",
                          )}
                        >
                          <Bot className="h-3 w-3" />
                          <span>{ag.name}</span>
                          <span className="text-muted-foreground text-(length:--text-micro)">
                            ({ag.role})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Shared Workspace & Contracts */}
      {activeTab === "context" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-background/50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
              <Lock className="h-3.5 w-3.5" />
              File Locks & Collision Prevention
            </h3>
            {workflow.sharedContext?.fileLocks && Object.keys(workflow.sharedContext.fileLocks).length > 0 ? (
              <div className="space-y-1.5">
                {Object.entries(workflow.sharedContext.fileLocks).map(([file, lock]) => (
                  <div
                    key={file}
                    className="flex items-center justify-between text-xs rounded bg-muted/40 px-2.5 py-1.5"
                  >
                    <span className="font-mono text-foreground">{file}</span>
                    <span className="text-muted-foreground text-(length:--text-micro)">
                      Locked by Agent {lock.agentId} on {lock.subtaskId}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No active file locks. Subtasks run with isolated conflict boundaries.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border/60 bg-background/50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
              <FileText className="h-3.5 w-3.5" />
              Architectural Directives
            </h3>
            {workflow.sharedContext?.architecturalNotes && workflow.sharedContext.architecturalNotes.length > 0 ? (
              <ul className="space-y-1 text-xs text-foreground list-disc list-inside">
                {workflow.sharedContext.architecturalNotes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Planner directives and shared architectural contracts will appear here.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Live Activity Feed */}
      {activeTab === "logs" && (
        <div className="space-y-2 max-h-80 overflow-y-auto rounded-lg border border-border/60 bg-background/50 p-3">
          {workflow.logs && workflow.logs.length > 0 ? (
            workflow.logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2.5 text-xs py-1 border-b border-border/40 last:border-0"
              >
                <span
                  className={cn(
                    "mt-0.5 h-2 w-2 rounded-full shrink-0",
                    log.level === "success"
                      ? "bg-emerald-500"
                      : log.level === "error"
                        ? "bg-destructive"
                        : log.level === "warn"
                          ? "bg-amber-500"
                          : "bg-primary",
                  )}
                />
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-2 text-(length:--text-micro) text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {log.agentName ?? "Orchestrator"}
                    </span>
                    <span>·</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-foreground">{log.message}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No logs recorded yet.</p>
          )}
        </div>
      )}

      {/* Tab 4: Final Output */}
      {activeTab === "output" && workflow.finalConsolidatedOutput && (
        <div className="rounded-lg border border-border/60 bg-background/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Consolidated Verification Report
          </div>
          <pre className="whitespace-pre-wrap font-sans text-xs text-foreground bg-muted/20 p-3 rounded-md border border-border/40">
            {workflow.finalConsolidatedOutput}
          </pre>
        </div>
      )}
    </div>
  );
}
