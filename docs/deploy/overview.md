---
title: Deployment Overview
summary: Production deployment modes and network topologies
---

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ OPERATIONAL DEPLOYMENT MODES // INFRASTRUCTURE TOPOLOGY                     │
│ LOCAL TRUSTED • PRIVATE VPN/TAILSCALE • INTERNET-FACING PRODUCTION          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## [ 01 // THREE DEPLOYMENT TOPOLOGIES ]

| TOPOLOGY MODE | AUTHENTICATION GATE | NETWORK BINDING | BEST USE-CASE |
| :--- | :--- | :--- | :--- |
| `local_trusted` | None (Single Operator) | `127.0.0.1` Loopback | Solo dev, local experimentation, fast boot |
| `authenticated` + `private` | Better Auth Sessions | `0.0.0.0` (Tailscale / VPN) | Distributed engineering team on mesh network |
| `authenticated` + `public` | Strict Better Auth + RBAC | Public FQDN / HTTPS | Cloud hosting (AWS ECS, Docker, Kubernetes) |

---

## [ 02 // TECHNICAL MATRIX ]

### 1. LOCAL TRUSTED (DEFAULT)
- Binds strictly to loopback (`localhost`).
- Skips interactive credential gates for zero friction.
- Provisions embedded PostgreSQL runtime automatically.

### 2. AUTHENTICATED + PRIVATE
- Requires user sign-in via Better Auth.
- Accessible across team overlay networks (Tailscale, WireGuard, VPC).
- Auto base URL discovery for dynamic LAN/mesh IP addresses.

### 3. AUTHENTICATED + PUBLIC
- Enforces strict Origin headers, CSRF protection, and session encryption.
- Requires explicit public domain configuration (`BETTER_AUTH_URL`).
- Audit logging enabled for all external invocations.

---

## [ 03 // CONFIGURATION COMMANDS ]

Select topology during initial boot:
```bash
pnpm geetorusai onboard
```

Or reconfigure an existing deployment:
```bash
pnpm geetorusai configure --section server
```
