# 19 — Product Limitations and Known Issues

This document provides a transparent accounting of verified limitations, platform-specific operational gotchas, and architectural constraints identified within the active codebase.

---

## 1. Platform-Specific Operational Caveats

### 1. Windows: Embedded PostgreSQL Stale PID Collision
- **Verified Fact**: When the Geetorus development server is abruptly stopped (e.g. `Ctrl+C` or terminal closure), the underlying `postgres.exe` subprocess may continue running in the background. Subsequent boots fail with `FATAL: could not create shared memory segment`.
- **Mitigation / Workaround**: Run `Stop-Process -Name postgres -Force -ErrorAction SilentlyContinue` in PowerShell prior to restarting `pnpm dev`.

### 2. Linux: Bubblewrap (`bwrap`) Sandboxing Dependency
- **Verified Fact**: Filesystem and network namespace isolation (`filesystemScope="workspace"`, `networkScope="allowlist"`) relies on Linux kernel unprivileged user namespaces and the `bwrap` binary.
- **Limitation**: On macOS and native Windows, Bubblewrap confinement is unavailable. The system falls back to standard process isolation unless running inside a Linux Docker container or Daytona remote sandbox.

---

## 2. Architectural Boundaries & Scalability Limits

### 1. Embedded PostgreSQL vs. Multi-Node Clusters
- **Limitation**: The bundled embedded PostgreSQL runtime (`packages/db/src/migration-runtime.ts`) is designed for single-node development and small-team self-hosted deployments.
- **Enterprise Requirement**: High-availability multi-region production deployments must configure an external managed PostgreSQL cluster (e.g., AWS RDS, Supabase, Neon) via `DATABASE_URL`.

### 2. Monolithic Server Memory Footprint
- **Limitation**: Hosting all 80+ route handlers, 480+ services, WebSocket hubs, and background timers inside a single Node.js Express process means high concurrency (e.g. >100 simultaneous streaming agent runs) requires vertical scaling (increasing Node V8 `--max-old-space-size`).

---

## 3. Partially Implemented & Planned Features

| Feature Area | Current State in Code | Next Steps for Full Completion |
| :--- | :--- | :--- |
| **ACP Confinement via Bubblewrap** | CLI engine supports `bwrap`; ACP engine rejects `bwrap` confinement. | Extend Bubblewrap namespace wrapper to wrap the long-lived ACP stdio sidecar process. |
| **Pi Local Adapter** | Stdio contract defined; profile qualification experimental. | Add automated vitest conformance suite for Pi adapter. |
| **Multi-Region Worktree Replication**| Git worktrees exist on local disk only. | Add S3/cloud storage worktree snapshot syncing for distributed runners. |
