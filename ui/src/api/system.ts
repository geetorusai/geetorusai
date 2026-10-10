export type PreflightStatus = "pass" | "warn" | "fail";

export interface PreflightCheck {
  id: string;
  name: string;
  status: PreflightStatus;
  message: string;
  hint?: string;
}

export interface PreflightReport {
  status: PreflightStatus;
  checks: PreflightCheck[];
  generatedAt: string;
}

export const systemApi = {
  /** Environment readiness for the onboarding wizard. */
  preflight: async (): Promise<PreflightReport> => {
    const res = await fetch("/api/system/preflight", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? `Failed to load preflight (${res.status})`);
    }
    return res.json();
  },
};
