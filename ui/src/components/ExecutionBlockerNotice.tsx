import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ExecutionBlocker, ExecutionReconciliation } from "@geetorusai/shared";
import { Link } from "react-router-dom";
import { issuesApi } from "../api/issues";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

type ReconciliationOutcome = ExecutionReconciliation["actionOutcome"];

export function ExecutionBlockerNotice({ companyId: _companyId, issueId, blocker, onResolved }: {
  companyId: string;
  issueId: string;
  blocker: ExecutionBlocker;
  onResolved: () => void;
}) {
  const queryClient = useQueryClient();
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [providerStopped, setProviderStopped] = useState(false);
  const [actionOutcome, setActionOutcome] = useState<ReconciliationOutcome | "">("");
  const [outcomeEvidence, setOutcomeEvidence] = useState("");
  const canReconcile = Boolean(blocker.recoveryActionId && blocker.runId);
  const evidenceIsValid = outcomeEvidence.trim().length >= 20;
  const reconcile = useMutation({
    mutationFn: () => issuesApi.resolveRecoveryAction(issueId, {
      actionId: blocker.recoveryActionId!,
      outcome: "restored",
      sourceIssueStatus: "todo",
      executionReconciliation: {
        runId: blocker.runId!,
        providerStopped: true,
        actionOutcome: actionOutcome as ReconciliationOutcome,
        outcomeEvidence: outcomeEvidence.trim(),
      },
    }),
    onSuccess: () => {
      onResolved();
      for (const queryKey of [queryKeys.issues.detail(issueId), queryKeys.issues.runs(issueId),
        queryKeys.issues.liveRuns(issueId), queryKeys.issues.activeRun(issueId)]) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });
  return (
    <div role="status" aria-label="Task recovery" className="mx-(--sz-execution-blocker-inline) my-(--sz-execution-blocker-block) flex flex-wrap items-center justify-between gap-(--sz-execution-blocker-block) execution-blocker-notice border border-border bg-muted text-foreground">
      <div className="min-w-0 flex-1">
        <p>{blocker.cause === "legacy_execution_requires_reconciliation"
          ? "Automatic recovery stopped. Verify the previous run before continuing with the new adapter."
          : blocker.nextAction}</p>
        {blocker.runId && blocker.agentId ? (
          <Link className="text-sm text-primary underline-offset-2 hover:underline" to={`/agents/${blocker.agentId}/runs/${blocker.runId}`}>
            Inspect previous run
          </Link>
        ) : null}
      </div>
      {canReconcile ? (
        <Button variant="outline" size="sm" onClick={() => setShowReconciliation((value) => !value)}>
          {showReconciliation ? "Cancel" : "Review and continue"}
        </Button>
      ) : null}
      {showReconciliation && canReconcile ? (
        <div className="w-full space-y-(--sz-execution-blocker-section-space) border-t border-border pt-(--sz-execution-blocker-section-space)">
          <p className="text-sm text-muted-foreground">
            This starts a fresh run. It does not replay the previous run or assume its actions failed.
          </p>
          <div className="space-y-(--sz-execution-blocker-field-gap)">
            <Label htmlFor={`reconciliation-outcome-${issueId}`}>Previous run outcome</Label>
            <select
              id={`reconciliation-outcome-${issueId}`}
              value={actionOutcome}
              onChange={(event) => setActionOutcome(event.target.value as ReconciliationOutcome | "")}
              className="flex h-(--sz-execution-blocker-control-height) w-full rounded-md border border-input bg-background px-(--sz-execution-blocker-section-space) text-sm"
            >
              <option value="">Select the verified outcome</option>
              <option value="not_performed">No action was performed</option>
              <option value="completed">The action completed</option>
              <option value="mixed">Some actions completed</option>
            </select>
          </div>
          <div className="space-y-(--sz-execution-blocker-field-gap)">
            <Label htmlFor={`reconciliation-evidence-${issueId}`}>Verification evidence</Label>
            <Textarea
              id={`reconciliation-evidence-${issueId}`}
              value={outcomeEvidence}
              onChange={(event) => setOutcomeEvidence(event.target.value)}
              placeholder="Describe what you checked and how you verified the outcome."
            />
            <p className="text-xs text-muted-foreground">At least 20 characters. This is recorded in the audit log.</p>
          </div>
          <label className="flex items-center gap-(--sz-execution-blocker-block) text-sm">
            <input type="checkbox" checked={providerStopped} onChange={(event) => setProviderStopped(event.target.checked)} />
            I verified the previous run is no longer executing.
          </label>
          <Button
            size="sm"
            disabled={!providerStopped || !actionOutcome || !evidenceIsValid || reconcile.isPending}
            onClick={() => reconcile.mutate()}
          >
            {reconcile.isPending ? "Continuing…" : "Record outcome and continue"}
          </Button>
        </div>
      ) : null}
      {reconcile.isError ? (
        <p role="alert" className="w-full text-destructive">{reconcile.error.message}</p>
      ) : null}
    </div>
  );
}
