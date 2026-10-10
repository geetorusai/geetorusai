import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Loader2, XCircle } from "lucide-react";
import { systemApi, type PreflightStatus } from "../../api/system";
import { cn } from "../../lib/utils";

const ICON: Record<PreflightStatus, typeof CheckCircle2> = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
};

const TONE: Record<PreflightStatus, string> = {
  pass: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  fail: "text-red-600 dark:text-red-400",
};

/**
 * Front-door environment readiness. Informational, never a hard gate — a
 * false-positive check should not lock a user out of onboarding. Failing checks
 * carry the concrete next step from the server.
 */
export function PreflightPanel() {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["system", "preflight"],
    queryFn: systemApi.preflight,
    staleTime: 15_000,
  });

  if (isLoading) {
    return (
      <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking your environment…
      </p>
    );
  }

  // If the check itself can't be reached, stay quiet — onboarding still works.
  if (isError || !data) return null;

  const problems = data.checks.filter((c) => c.status !== "pass");

  if (data.status === "pass") {
    return (
      <p className={cn("mt-8 flex items-center gap-2 text-xs", TONE.pass)}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        Environment ready
      </p>
    );
  }

  return (
    <div className="mt-8 w-full max-w-lg text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn("flex w-full items-center gap-2 text-xs font-medium", TONE[data.status])}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        {problems.length} environment {problems.length === 1 ? "issue" : "issues"} to resolve
        <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul className="mt-3 space-y-3 rounded-lg border border-border bg-muted/20 p-4">
          {problems.map((c) => {
            const Icon = ICON[c.status];
            return (
              <li key={c.id} className="flex gap-2 text-xs">
                <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", TONE[c.status])} />
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-muted-foreground">{c.message}</p>
                  {c.hint && <p className="mt-1 text-muted-foreground">→ {c.hint}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
