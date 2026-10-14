# 16 — Deployment and Operations

GeetorusAI is designed for flexible deployment across self-hosted hardware, air-gapped internal servers, Docker containers, and cloud infrastructure.

---

## 1. Deployment Topology & Methods

```mermaid
graph TD
    subgraph Ingress [Ingress & Reverse Proxy]
        TLS[Nginx / Caddy / Cloudflare Tunnel / Tailscale HTTPS Broker]
    end

    subgraph AppHost [Geetorus Host Server / Container]
        NodeApp[Node.js Express Control Plane :3100]
        EmbeddedDB[(Optional: Embedded Postgres 18)]
        GitWorktrees[(Git Worktree Cache ~/.geetorus/worktrees)]
    end

    subgraph ExternalServices [External Managed Infrastructure]
        ExtDB[(External PostgreSQL 15+ Cluster)]
        S3Bucket[(S3-Compatible Artifact Storage)]
        OTelCollector[OpenTelemetry / Prometheus Collector]
    end

    TLS <-->|HTTPS / WSS| NodeApp
    NodeApp <--> EmbeddedDB
    NodeApp <--> ExtDB
    NodeApp <--> GitWorktrees
    NodeApp <--> S3Bucket
    NodeApp -.->|Traces & Metrics| OTelCollector
```

---

## 2. Production Docker Deployment

A multi-stage `Dockerfile` is provided at the repository root:

```bash
# 1. Build the production container image
docker build -t geetorusai:latest -f Dockerfile .

# 2. Run the container with persistent volume mount
docker run -d \
  --name geetorusai \
  -p 3100:3100 \
  -v geetorus_data:/root/.geetorus \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://user:pass@postgres-host:5432/geetorus \
  -e ANTHROPIC_API_KEY=sk-ant-xxx \
  geetorusai:latest
```

---

## 3. Bare-Metal / Systemd Service Setup

Create `/etc/systemd/system/geetorusai.service`:

```ini
[Unit]
Description=GeetorusAI Control Plane
After=network.target postgresql.service

[Service]
Type=simple
User=geetorus
WorkingDirectory=/opt/geetorusai
ExecStart=/usr/bin/node /opt/geetorusai/server/dist/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3100
Environment=DATABASE_URL=postgresql://geetorus:secret@localhost:5432/geetorus
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now geetorusai
```

---

## 4. Secure Networking & Tailscale HTTPS Broker

For secure remote team access without opening public internet ports:
- **`packages/tailscale-https-broker`**: Integrates with Tailscale to assign an automated MagicDNS domain with LetsEncrypt TLS certificates (`https://geetorus.your-tailnet.ts.net`).
- **Private Hostname Guard**: Middleware (`private-hostname-guard.ts`) blocks SSRF and DNS rebinding attacks against loopback or metadata endpoints (`169.254.169.254`).
