import { useState } from "react";
import { Link } from "@/lib/router";
import { ListChecks, Network, Receipt, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "../../lib/utils";

const STORAGE_PREFIX = "geetorus:orientation-seen:";

const STOPS: Array<{ to: string; icon: typeof ListChecks; label: string; blurb: string }> = [
  { to: "/issues", icon: ListChecks, label: "Issues", blurb: "Every task — who owns it, what's in progress, what's blocked." },
  { to: "/org", icon: Network, label: "Org Chart", blurb: "Your agents and their reporting lines. Hire and reassign here." },
  { to: "/costs", icon: Receipt, label: "Cost", blurb: "Token spend and run counts, broken down by agent and model." },
  { to: "/approvals", icon: ShieldCheck, label: "Governance", blurb: "Approvals, budgets, and skill policy — the gates on agent action." },
];

function seen(companyId: string): boolean {
  try {
    return localStorage.getItem(STORAGE_PREFIX + companyId) === "1";
  } catch {
    return false;
  }
}

export function markOrientationSeen(companyId: string): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + companyId, "1");
  } catch {
    /* private mode / blocked storage — the panel just reappears next load */
  }
}

/**
 * Show the panel only for a company that has finished onboarding (has at least
 * one agent) and has not dismissed it before.
 */
export function shouldShowOrientation(
  companyId: string | null | undefined,
  agentCount: number,
): companyId is string {
  return Boolean(companyId) && agentCount >= 1 && !seen(companyId as string);
}

/**
 * One-time "here's where things are" panel for a freshly set-up company. Shows
 * on the dashboard until dismissed (per company, remembered in localStorage).
 * Nothing to configure — it's a map, not a wizard, so it stays out of the way
 * of the resumable onboarding flow.
 */
export function OrientationPanel({
  companyId,
  agentCount,
}: {
  companyId: string | null | undefined;
  agentCount: number;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !shouldShowOrientation(companyId, agentCount)) return null;

  const dismiss = () => {
    markOrientationSeen(companyId);
    setDismissed(true);
  };

  return (
    <section className="mb-8 rounded-lg border border-border bg-muted/20 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">You're set up. Here's where things live.</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Four places you'll come back to. Everything else hangs off these.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss orientation"
          className="rounded-sm p-1 text-muted-foreground/60 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {STOPS.map(({ to, icon: Icon, label, blurb }) => (
          <li key={to}>
            <Link
              to={to}
              onClick={dismiss}
              className={cn(
                "flex gap-3 rounded-md border border-transparent p-3 no-underline text-inherit",
                "hover:border-border hover:bg-background transition-colors",
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{blurb}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <Button variant="outline" size="sm" onClick={dismiss}>
          Got it
        </Button>
      </div>
    </section>
  );
}
