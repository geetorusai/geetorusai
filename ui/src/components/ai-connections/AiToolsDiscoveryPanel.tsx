import React, { useEffect, useState } from "react";

export interface DiscoveredToolItem {
  id: string;
  name: string;
  category: "ai_ide" | "ai_cli";
  binaryName: string;
  binaryPath: string | null;
  isAvailable: boolean;
  version: string | null;
  authStatus: "authenticated" | "unauthenticated" | "unconfigured";
  configPath: string | null;
  detectedEnvVars: string[];
  capabilities: {
    supportsContextSync: boolean;
    supportsMcpTools: boolean;
    supportsPulseExecution: boolean;
    supportsWorktreeSandbox: boolean;
  };
  isConnected?: boolean;
}

export interface McpServerItem {
  name: string;
  command: string;
  args: string[];
  sourceConfig: string;
}

export interface DevRuntimeItem {
  id: string;
  name: string;
  binaryName: string;
  binaryPath: string | null;
  version: string | null;
  isAvailable: boolean;
}

export interface AiProviderItem {
  id: string;
  name: string;
  envKeys: string[];
  isConfigured: boolean;
  detectedKeys: string[];
}

export interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  type: string;
  actionToolId?: string;
}

export interface FullHostInventory {
  scannedAt: string;
  hostPlatform: string;
  aiTools: DiscoveredToolItem[];
  mcpServers: McpServerItem[];
  devRuntimes: DevRuntimeItem[];
  aiProviders: AiProviderItem[];
  recommendations: RecommendationItem[];
}

export function AiToolsDiscoveryPanel() {
  const [activeTab, setActiveTab] = useState<"tools" | "mcp" | "runtimes" | "providers" | "recommendations">("tools");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<FullHostInventory | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [liveStreamConnected, setLiveStreamConnected] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/ai-tools/discover");
      const data = await res.json();
      if (data.success && data.inventory) {
        setInventory(data.inventory);
      } else {
        setError(data.error || "Failed to scan host environment");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();

    // Subscribe to SSE real-time stream
    const eventSource = new EventSource("/api/system/ai-tools/stream");
    eventSource.onopen = () => setLiveStreamConnected(true);
    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.data) {
          setInventory(message.data);
        }
      } catch {
        // Skip unparseable
      }
    };
    eventSource.onerror = () => setLiveStreamConnected(false);

    return () => {
      eventSource.close();
    };
  }, []);

  const handleConnect = async (toolId: string) => {
    setActionMessage(null);
    try {
      const res = await fetch("/api/system/ai-tools/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId, syncWorkspace: true, syncMcp: true }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message || `Connected ${toolId}`);
        fetchInventory();
      } else {
        setError(data.error || "Connection failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleVerify = async (toolId: string) => {
    setActionMessage(null);
    try {
      const res = await fetch("/api/system/ai-tools/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Verified ${toolId}: Status ${data.status.toUpperCase()}`);
      } else {
        setError(data.error || "Verification failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div style={{ padding: "20px", background: "#111827", borderRadius: "10px", color: "#F9FAFB", fontFamily: "sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Universal Host Environment Discovery</h2>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "3px 9px",
                borderRadius: "12px",
                background: liveStreamConnected ? "#059669" : "#4B5563",
                color: "#FFF",
                fontWeight: 600,
              }}
            >
              {liveStreamConnected ? "Live Watchdog SSE Active" : "Polling Mode"}
            </span>
          </div>
          <p style={{ fontSize: "0.875rem", color: "#9CA3AF", margin: "4px 0 0 0" }}>
            Real-time control plane integration & automatic context synchronization.
          </p>
        </div>

        <button
          onClick={fetchInventory}
          disabled={loading}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            background: "#374151",
            color: "#FFF",
            border: "none",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          {loading ? "Scanning Host..." : "Rescan Now"}
        </button>
      </div>

      {/* Action and Error Feedback */}
      {actionMessage && (
        <div style={{ padding: "12px", borderRadius: "6px", background: "#065F46", color: "#D1FAE5", marginBottom: "16px" }}>
          {actionMessage}
        </div>
      )}
      {error && (
        <div style={{ padding: "12px", borderRadius: "6px", background: "#991B1B", color: "#FEE2E2", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #374151", paddingBottom: "10px", marginBottom: "20px" }}>
        {[
          { key: "tools", label: `AI Tools & IDEs (${inventory?.aiTools.length ?? 0})` },
          { key: "mcp", label: `MCP Servers (${inventory?.mcpServers.length ?? 0})` },
          { key: "runtimes", label: `Dev Runtimes (${inventory?.devRuntimes.filter((r) => r.isAvailable).length ?? 0})` },
          { key: "providers", label: `AI Providers (${inventory?.aiProviders.filter((p) => p.isConfigured).length ?? 0})` },
          { key: "recommendations", label: `Recommendations (${inventory?.recommendations.length ?? 0})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: "8px 14px",
              borderRadius: "6px",
              background: activeTab === tab.key ? "#2563EB" : "transparent",
              color: activeTab === tab.key ? "#FFF" : "#9CA3AF",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {loading && !inventory ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#9CA3AF" }}>Scanning local host environment...</div>
      ) : (
        <div>
          {/* TAB 1: AI Tools */}
          {activeTab === "tools" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
              {inventory?.aiTools.map((tool) => (
                <div
                  key={tool.id}
                  style={{
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    padding: "16px",
                    background: "#1F2937",
                    display: "flex",
                    flexDirection: "column",
                    justify: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{tool.name}</h3>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          background: tool.isConnected ? "#10B981" : tool.authStatus === "authenticated" ? "#3B82F6" : tool.isAvailable ? "#F59E0B" : "#6B7280",
                          color: "#FFF",
                          fontWeight: 600,
                        }}
                      >
                        {tool.isConnected ? "Connected" : tool.authStatus === "authenticated" ? "Ready" : tool.isAvailable ? "Installed" : "Unconfigured"}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.8125rem", color: "#9CA3AF", marginTop: "10px", lineHeight: "1.5" }}>
                      <div><strong>Category:</strong> {tool.category.toUpperCase()}</div>
                      {tool.binaryPath && <div><strong>Location:</strong> {tool.binaryPath}</div>}
                      {tool.version && <div><strong>Version:</strong> {tool.version}</div>}
                      {tool.configPath && <div><strong>Config:</strong> {tool.configPath}</div>}
                    </div>
                  </div>

                  <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleConnect(tool.id)}
                      disabled={!tool.isAvailable && tool.authStatus === "unconfigured"}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "6px",
                        background: tool.isConnected ? "#059669" : "#2563EB",
                        color: "#FFF",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                        opacity: !tool.isAvailable && tool.authStatus === "unconfigured" ? 0.5 : 1,
                      }}
                    >
                      {tool.isConnected ? "Re-Sync Context" : "Connect & Sync"}
                    </button>
                    <button
                      onClick={() => handleVerify(tool.id)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "6px",
                        background: "#4B5563",
                        color: "#FFF",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Verify
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: MCP Servers */}
          {activeTab === "mcp" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {inventory?.mcpServers.map((server, idx) => (
                <div key={idx} style={{ padding: "14px", borderRadius: "8px", background: "#1F2937", border: "1px solid #374151" }}>
                  <div style={{ fontWeight: 600, fontSize: "1rem", color: "#60A5FA" }}>{server.name}</div>
                  <div style={{ fontSize: "0.875rem", color: "#D1D5DB", marginTop: "4px" }}>
                    <strong>Command:</strong> <code>{server.command} {server.args.join(" ")}</code>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#9CA3AF", marginTop: "4px" }}>
                    Discovered from: {server.sourceConfig}
                  </div>
                </div>
              ))}
              {inventory?.mcpServers.length === 0 && (
                <div style={{ padding: "30px", textAlign: "center", color: "#9CA3AF" }}>No local MCP server configs detected.</div>
              )}
            </div>
          )}

          {/* TAB 3: Runtimes */}
          {activeTab === "runtimes" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
              {inventory?.devRuntimes.map((runtime) => (
                <div key={runtime.id} style={{ padding: "14px", borderRadius: "8px", background: "#1F2937", border: "1px solid #374151" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 600 }}>{runtime.name}</div>
                    <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "10px", background: runtime.isAvailable ? "#10B981" : "#6B7280", color: "#FFF" }}>
                      {runtime.isAvailable ? "Available" : "Missing"}
                    </span>
                  </div>
                  {runtime.version && <div style={{ fontSize: "0.8125rem", color: "#9CA3AF", marginTop: "6px" }}>{runtime.version}</div>}
                  {runtime.binaryPath && <div style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis" }}>{runtime.binaryPath}</div>}
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: Providers */}
          {activeTab === "providers" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
              {inventory?.aiProviders.map((provider) => (
                <div key={provider.id} style={{ padding: "14px", borderRadius: "8px", background: "#1F2937", border: "1px solid #374151" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 600 }}>{provider.name}</div>
                    <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "10px", background: provider.isConfigured ? "#3B82F6" : "#4B5563", color: "#FFF" }}>
                      {provider.isConfigured ? "Keys Detected" : "Unconfigured"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#9CA3AF", marginTop: "6px" }}>
                    Environment Keys: {provider.envKeys.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: Recommendations */}
          {activeTab === "recommendations" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {inventory?.recommendations.map((rec) => (
                <div key={rec.id} style={{ padding: "16px", borderRadius: "8px", background: "#1E3A8A", border: "1px solid #3B82F6", color: "#EFF6FF" }}>
                  <div style={{ fontWeight: 700, fontSize: "1rem" }}>👉 {rec.title}</div>
                  <div style={{ fontSize: "0.875rem", marginTop: "6px", color: "#DBEAFE" }}>{rec.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
