import type { SVGProps } from "react";
import { cn } from "../lib/utils";

export function AnimatedGeetorusIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="-1 -1 26 26"
      className={cn("geetorus-thinking-icon", className)}
      aria-hidden="true"
      {...props}
    >
      <circle
        className="geetorus-thinking-icon-path"
        cx="12"
        cy="12"
        r="9"
        pathLength={100}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        transform="rotate(-90 12 12)"
      />
    </svg>
  );
}

/** Full-page loading state: a large, centered, gray animated geetorus. */
export function GeetorusLoading({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn("flex min-h-dvh w-full items-center justify-center", className)}
    >
      <AnimatedGeetorusIcon className="h-24 w-24 text-muted-foreground" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
