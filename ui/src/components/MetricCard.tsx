import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/lib/router";

interface MetricCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  description?: ReactNode;
  to?: string;
  onClick?: () => void;
}

export function MetricCard({ icon: Icon, value, label, description, to, onClick }: MetricCardProps) {
  const isClickable = !!(to || onClick);

  const inner = (
    <div className={`h-full px-4 py-4 sm:px-5 sm:py-5 rounded-none border-2 border-black bg-card shadow-[4px_4px_0px_0px_#000000] transition-all${isClickable ? " hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_#000000] cursor-pointer" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-2xl sm:text-3xl font-black font-heading tracking-tight tabular-nums text-foreground">
            {value}
          </p>
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground mt-1 font-heading">
            {label}
          </p>
          {description && (
            <div className="text-xs text-muted-foreground mt-1.5 hidden sm:block font-sans">{description}</div>
          )}
        </div>
        <div className="p-2.5 rounded-none bg-accent border-2 border-black shadow-[2px_2px_0px_0px_#000000] shrink-0 mt-0.5 text-accent-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="no-underline text-inherit h-full" onClick={onClick}>
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <div className="h-full" onClick={onClick}>
        {inner}
      </div>
    );
  }

  return inner;
}
