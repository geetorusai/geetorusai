import type { AgentAdapterType } from "@geetorusai/shared";

export type EnvironmentCategory = "ai_ide" | "ai_cli" | "mcp_server" | "dev_runtime" | "ai_provider";
export type ToolAuthStatus = "authenticated" | "unauthenticated" | "unconfigured";

export interface DiscoveredMcpServer {
  name: string;
  command: string;
  args: string[];
  sourceConfig: string;
}

export interface DiscoveredDevRuntime {
  id: string;
  name: string;
  binaryName: string;
  binaryPath: string | null;
  version: string | null;
  isAvailable: boolean;
}

export interface DiscoveredAiProvider {
  id: string;
  name: string;
  envKeys: string[];
  isConfigured: boolean;
  detectedKeys: string[];
}

export interface SystemRecommendation {
  id: string;
  title: string;
  description: string;
  type: "enable_local_llm" | "sync_mcp_tools" | "enable_sandbox" | "configure_api_key";
  actionToolId?: string;
}

export interface DiscoveredAiTool {
  id: string;
  name: string;
  category: EnvironmentCategory;
  adapterType?: AgentAdapterType;
  binaryName: string;
  binaryPath: string | null;
  isAvailable: boolean;
  version: string | null;
  authStatus: ToolAuthStatus;
  configPath: string | null;
  detectedEnvVars: string[];
  capabilities: {
    supportsContextSync: boolean;
    supportsMcpTools: boolean;
    supportsPulseExecution: boolean;
    supportsWorktreeSandbox: boolean;
  };
}

export interface CompleteHostEnvironmentInventory {
  scannedAt: string;
  hostPlatform: string;
  aiTools: DiscoveredAiTool[];
  mcpServers: DiscoveredMcpServer[];
  devRuntimes: DiscoveredDevRuntime[];
  aiProviders: DiscoveredAiProvider[];
  recommendations: SystemRecommendation[];
}

export interface KnownToolSpec {
  id: string;
  name: string;
  category: EnvironmentCategory;
  adapterType?: AgentAdapterType;
  binaryName: string;
  versionFlag: string;
  envKeys: string[];
  configPaths: (homeDir: string) => string[];
  capabilities: {
    supportsContextSync: boolean;
    supportsMcpTools: boolean;
    supportsPulseExecution: boolean;
    supportsWorktreeSandbox: boolean;
  };
}

export const EXTENDED_KNOWN_TOOLS: KnownToolSpec[] = [
  // AI CLIs & Agents
  {
    id: "claude-cli",
    name: "Claude Code CLI",
    category: "ai_cli",
    adapterType: "claude_local",
    binaryName: "claude",
    versionFlag: "--version",
    envKeys: ["ANTHROPIC_API_KEY", "CLAUDE_CODE_TOKEN"],
    configPaths: (h) => [`${h}/.claude`, `${h}/.claude.json`],
    capabilities: { supportsContextSync: true, supportsMcpTools: true, supportsPulseExecution: true, supportsWorktreeSandbox: true },
  },
  {
    id: "antigravity-cli",
    name: "Antigravity CLI",
    category: "ai_cli",
    adapterType: "claude_local",
    binaryName: "agy",
    versionFlag: "version",
    envKeys: ["ANTIGRAVITY_API_KEY", "GEMINI_API_KEY"],
    configPaths: (h) => [`${h}/.antigravity`, `${h}/.config/antigravity`, `${h}/.gemini/antigravity-ide`],
    capabilities: { supportsContextSync: true, supportsMcpTools: true, supportsPulseExecution: true, supportsWorktreeSandbox: true },
  },

  {
    id: "codex-cli",
    name: "OpenAI Codex CLI",
    category: "ai_cli",
    adapterType: "codex_local",
    binaryName: "codex",
    versionFlag: "--version",
    envKeys: ["OPENAI_API_KEY", "CODEX_API_KEY"],
    configPaths: (h) => [`${h}/.codex`, `${h}/.config/codex`],
    capabilities: { supportsContextSync: true, supportsMcpTools: true, supportsPulseExecution: true, supportsWorktreeSandbox: true },
  },
  {
    id: "opencode-cli",
    name: "OpenCode / OpenClaw CLI",
    category: "ai_cli",
    adapterType: "opencode_local",
    binaryName: "opencode",
    versionFlag: "--version",
    envKeys: ["OPENCODE_TOKEN", "OPENCLAW_KEY"],
    configPaths: (h) => [`${h}/.opencode`, `${h}/.openclaw`],
    capabilities: { supportsContextSync: true, supportsMcpTools: true, supportsPulseExecution: true, supportsWorktreeSandbox: true },
  },
  {
    id: "ollama-cli",
    name: "Ollama Local LLM",
    category: "ai_cli",
    adapterType: "ollama_local",
    binaryName: "ollama",
    versionFlag: "--version",
    envKeys: ["OLLAMA_HOST"],
    configPaths: (h) => [`${h}/.ollama`],
    capabilities: { supportsContextSync: true, supportsMcpTools: false, supportsPulseExecution: true, supportsWorktreeSandbox: true },
  },
  {
    id: "kimi-cli",
    name: "Kimi CLI",
    category: "ai_cli",
    adapterType: "kimi_local",
    binaryName: "kimi",
    versionFlag: "--version",
    envKeys: ["KIMI_API_KEY", "KIMI_MODEL_API_KEY"],
    configPaths: (h) => [`${h}/.kimi`, `${h}/.config/kimi`],
    capabilities: { supportsContextSync: true, supportsMcpTools: true, supportsPulseExecution: true, supportsWorktreeSandbox: true },
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    category: "ai_cli",
    adapterType: "gemini_local",
    binaryName: "gemini",
    versionFlag: "--version",
    envKeys: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
    configPaths: (h) => [`${h}/.gemini`],
    capabilities: { supportsContextSync: true, supportsMcpTools: true, supportsPulseExecution: true, supportsWorktreeSandbox: true },
  },
  {
    id: "grok-cli",
    name: "Grok CLI",
    category: "ai_cli",
    adapterType: "grok_local",
    binaryName: "grok",
    versionFlag: "--version",
    envKeys: ["XAI_API_KEY", "GROK_API_KEY"],
    configPaths: (h) => [`${h}/.grok`],
    capabilities: { supportsContextSync: true, supportsMcpTools: true, supportsPulseExecution: true, supportsWorktreeSandbox: true },
  },
  {
    id: "aider-cli",
    name: "Aider AI Coding Assistant",
    category: "ai_cli",
    adapterType: "openai-compatible_local",
    binaryName: "aider",
    versionFlag: "--version",
    envKeys: ["OPENAI_API_KEY", "ANTHROPIC_API_KEY"],
    configPaths: (h) => [`${h}/.aider.conf.yml`],
    capabilities: { supportsContextSync: true, supportsMcpTools: false, supportsPulseExecution: false, supportsWorktreeSandbox: true },
  },
  {
    id: "pi-cli",
    name: "Pi Local Agent CLI",
    category: "ai_cli",
    adapterType: "pi_local",
    binaryName: "pi",
    versionFlag: "--version",
    envKeys: ["PI_API_KEY"],
    configPaths: (h) => [`${h}/.pi`],
    capabilities: { supportsContextSync: true, supportsMcpTools: true, supportsPulseExecution: true, supportsWorktreeSandbox: true },
  },

  // AI IDEs
  {
    id: "cursor-ide",
    name: "Cursor AI IDE",
    category: "ai_ide",
    adapterType: "cursor_local",
    binaryName: "cursor",
    versionFlag: "--version",
    envKeys: ["CURSOR_API_KEY"],
    configPaths: (h) => [`${h}/.cursor`, `${h}/AppData/Roaming/Cursor`],
    capabilities: { supportsContextSync: true, supportsMcpTools: true, supportsPulseExecution: false, supportsWorktreeSandbox: true },
  },
  {
    id: "windsurf-ide",
    name: "Windsurf AI IDE",
    category: "ai_ide",
    adapterType: "cursor_local",
    binaryName: "windsurf",
    versionFlag: "--version",
    envKeys: ["WINDSURF_TOKEN"],
    configPaths: (h) => [`${h}/.windsurf`, `${h}/AppData/Roaming/Windsurf`],
    capabilities: { supportsContextSync: true, supportsMcpTools: true, supportsPulseExecution: false, supportsWorktreeSandbox: true },
  },
  {
    id: "trae-ide",
    name: "Trae AI IDE",
    category: "ai_ide",
    adapterType: "cursor_local",
    binaryName: "trae",
    versionFlag: "--version",
    envKeys: [],
    configPaths: (h) => [`${h}/.trae`, `${h}/AppData/Roaming/Trae`],
    capabilities: { supportsContextSync: true, supportsMcpTools: true, supportsPulseExecution: false, supportsWorktreeSandbox: true },
  },
  {
    id: "vscode-ide",
    name: "Visual Studio Code",
    category: "ai_ide",
    binaryName: "code",
    versionFlag: "--version",
    envKeys: [],
    configPaths: (h) => [`${h}/.vscode`, `${h}/AppData/Roaming/Code`],
    capabilities: { supportsContextSync: true, supportsMcpTools: true, supportsPulseExecution: false, supportsWorktreeSandbox: true },
  },
  {
    id: "zed-ide",
    name: "Zed Editor",
    category: "ai_ide",
    binaryName: "zed",
    versionFlag: "--version",
    envKeys: [],
    configPaths: (h) => [`${h}/.config/zed`],
    capabilities: { supportsContextSync: true, supportsMcpTools: true, supportsPulseExecution: false, supportsWorktreeSandbox: true },
  },
];

export const DEV_RUNTIMES_SPEC = [
  { id: "node", name: "Node.js", binaryName: "node", versionFlag: "--version" },
  { id: "python", name: "Python 3", binaryName: "python3", versionFlag: "--version" },
  { id: "go", name: "Go Programming Language", binaryName: "go", versionFlag: "version" },
  { id: "rust", name: "Rust / Cargo", binaryName: "cargo", versionFlag: "--version" },
  { id: "docker", name: "Docker Container Engine", binaryName: "docker", versionFlag: "--version" },
  { id: "git", name: "Git Version Control", binaryName: "git", versionFlag: "--version" },
  { id: "bun", name: "Bun JavaScript Runtime", binaryName: "bun", versionFlag: "--version" },
  { id: "deno", name: "Deno JavaScript Runtime", binaryName: "deno", versionFlag: "--version" },
  { id: "pnpm", name: "PNPM Package Manager", binaryName: "pnpm", versionFlag: "--version" },
  { id: "uv", name: "UV Fast Python Package Installer", binaryName: "uv", versionFlag: "--version" },
];

export const AI_PROVIDERS_SPEC = [
  { id: "anthropic", name: "Anthropic Claude API", envKeys: ["ANTHROPIC_API_KEY", "CLAUDE_CODE_TOKEN"] },
  { id: "openai", name: "OpenAI GPT API", envKeys: ["OPENAI_API_KEY", "CODEX_API_KEY"] },
  { id: "google-gemini", name: "Google Gemini API", envKeys: ["GEMINI_API_KEY", "GOOGLE_API_KEY"] },
  { id: "ollama-local", name: "Ollama Local Engine", envKeys: ["OLLAMA_HOST"] },
  { id: "openrouter", name: "OpenRouter Multi-Model API", envKeys: ["OPENROUTER_API_KEY"] },
  { id: "mistral", name: "Mistral AI API", envKeys: ["MISTRAL_API_KEY"] },
  { id: "deepseek", name: "DeepSeek AI API", envKeys: ["DEEPSEEK_API_KEY"] },
  { id: "groq", name: "Groq LPU Accelerator API", envKeys: ["GROQ_API_KEY"] },
  { id: "xai-grok", name: "xAI Grok API", envKeys: ["XAI_API_KEY", "GROK_API_KEY"] },
  { id: "bedrock", name: "AWS Bedrock / Claude", envKeys: ["AWS_SECRET_ACCESS_KEY", "AWS_ACCESS_KEY_ID"] },
];

export async function discoverCompleteHostEnvironment(customEnv?: Record<string, string>): Promise<CompleteHostEnvironmentInventory> {
  const scannedAt = new Date().toISOString();

  if (typeof window !== "undefined") {
    return {
      scannedAt,
      hostPlatform: "browser",
      aiTools: [],
      mcpServers: [],
      devRuntimes: [],
      aiProviders: [],
      recommendations: [],
    };
  }

  const os = await import("node:os");
  const path = await import("node:path");
  const fs = await import("node:fs");
  const { execSync } = await import("node:child_process");

  const homeDir = os.default.homedir();
  const hostPlatform = process.platform;
  const env = customEnv ?? process.env;

  const resolveBinaryPath = (binaryName: string): string | null => {
    const isWindows = process.platform === "win32";
    const cmd = isWindows ? `where.exe ${binaryName}` : `which ${binaryName}`;
    try {
      const output = execSync(cmd, { stdio: ["pipe", "pipe", "ignore"], encoding: "utf8" });
      const firstLine = output.split(/\r?\n/)[0]?.trim();
      return firstLine && fs.default.existsSync(firstLine) ? firstLine : null;
    } catch {
      return null;
    }
  };

  const resolveVersion = (binaryPath: string, versionFlag: string): string | null => {
    try {
      const output = execSync(`"${binaryPath}" ${versionFlag}`, {
        stdio: ["pipe", "pipe", "ignore"],
        encoding: "utf8",
        timeout: 3000,
      });
      return output.trim().split(/\r?\n/)[0] ?? null;
    } catch {
      return null;
    }
  };

  // 1. Discover AI Tools (IDEs & CLIs)
  const aiTools: DiscoveredAiTool[] = [];
  for (const toolDef of EXTENDED_KNOWN_TOOLS) {
    const binaryPath = resolveBinaryPath(toolDef.binaryName);
    const isAvailable = Boolean(binaryPath);
    const version = binaryPath ? resolveVersion(binaryPath, toolDef.versionFlag) : null;
    const detectedEnvVars = toolDef.envKeys.filter((k) => Boolean(env[k]?.trim()));
    const existingConfigPath = toolDef.configPaths(homeDir).find((p) => fs.default.existsSync(p)) ?? null;

    let authStatus: ToolAuthStatus = "unconfigured";
    if (detectedEnvVars.length > 0 || (existingConfigPath && fs.default.existsSync(existingConfigPath))) {
      authStatus = "authenticated";
    } else if (isAvailable) {
      authStatus = "unauthenticated";
    }

    aiTools.push({
      id: toolDef.id,
      name: toolDef.name,
      category: toolDef.category,
      adapterType: toolDef.adapterType,
      binaryName: toolDef.binaryName,
      binaryPath,
      isAvailable,
      version,
      authStatus,
      configPath: existingConfigPath,
      detectedEnvVars,
      capabilities: toolDef.capabilities,
    });
  }

  // 2. Discover MCP Servers
  const mcpServers: DiscoveredMcpServer[] = [];
  const mcpConfigCandidates = [
    path.default.join(homeDir, ".mcp.json"),
    path.default.join(homeDir, ".cursor", "mcp.json"),
    path.default.join(homeDir, ".claude", "mcp.json"),
    path.default.join(homeDir, ".config", "opencode", "mcp.json"),
  ];

  for (const cfgPath of mcpConfigCandidates) {
    if (fs.default.existsSync(cfgPath)) {
      try {
        const raw = fs.default.readFileSync(cfgPath, "utf8");
        const parsed = JSON.parse(raw);
        const serversObj = parsed.mcpServers ?? parsed.servers ?? {};
        for (const [name, spec] of Object.entries<any>(serversObj)) {
          mcpServers.push({
            name,
            command: spec.command ?? "npx",
            args: Array.isArray(spec.args) ? spec.args : [],
            sourceConfig: cfgPath,
          });
        }
      } catch {
        // Skip invalid JSON
      }
    }
  }

  // 3. Discover Dev Runtimes
  const devRuntimes: DiscoveredDevRuntime[] = [];
  for (const rSpec of DEV_RUNTIMES_SPEC) {
    const binaryPath = resolveBinaryPath(rSpec.binaryName);
    const isAvailable = Boolean(binaryPath);
    const version = binaryPath ? resolveVersion(binaryPath, rSpec.versionFlag) : null;
    devRuntimes.push({
      id: rSpec.id,
      name: rSpec.name,
      binaryName: rSpec.binaryName,
      binaryPath,
      version,
      isAvailable,
    });
  }

  // 4. Discover AI Providers
  const aiProviders: DiscoveredAiProvider[] = [];
  for (const pSpec of AI_PROVIDERS_SPEC) {
    const detectedKeys = pSpec.envKeys.filter((k) => Boolean(env[k]?.trim()));
    aiProviders.push({
      id: pSpec.id,
      name: pSpec.name,
      envKeys: pSpec.envKeys,
      isConfigured: detectedKeys.length > 0,
      detectedKeys,
    });
  }

  // 5. Generate Contextual System Recommendations
  const recommendations: SystemRecommendation[] = [];

  const ollama = aiTools.find((t) => t.id === "ollama-cli");
  if (ollama?.isAvailable) {
    recommendations.push({
      id: "rec-ollama-local",
      title: "Activate Offline Local AI Execution",
      description: "Ollama is installed locally. Enable zero-cost, offline agent pulse execution.",
      type: "enable_local_llm",
      actionToolId: "ollama-cli",
    });
  }

  if (mcpServers.length > 0) {
    recommendations.push({
      id: "rec-mcp-sync",
      title: `Synchronize ${mcpServers.length} Discovered MCP Server Tools`,
      description: `Discovered MCP tools from local IDE configs (${mcpServers.map((s) => s.name).join(", ")}). Sync into Geetorus agent workspace.`,
      type: "sync_mcp_tools",
    });
  }

  const docker = devRuntimes.find((r) => r.id === "docker");
  if (docker?.isAvailable) {
    recommendations.push({
      id: "rec-docker-sandbox",
      title: "Isolated Container Sandboxing Ready",
      description: "Docker engine detected on host. Isolated multi-tenant execution sandboxes can be enabled.",
      type: "enable_sandbox",
    });
  }

  const unconfiguredProviders = aiProviders.filter((p) => !p.isConfigured);
  if (unconfiguredProviders.length > 0) {
    recommendations.push({
      id: "rec-config-provider",
      title: "Configure Cloud AI Provider Credentials",
      description: `Set API keys for ${unconfiguredProviders.slice(0, 3).map((p) => p.name).join(", ")} to unlock high-capacity cloud agent models.`,
      type: "configure_api_key",
    });
  }

  const gemini = aiTools.find((t) => t.id === "gemini-cli");
  if (gemini?.isAvailable) {
    recommendations.push({
      id: "rec-gemini-deprecated",
      title: "Migrate Deprecated Gemini Code Assist CLI to Antigravity CLI",
      description: "Gemini Code Assist CLI (0.60.0) is sunset by Google for individual accounts. Switch your agent setup to Antigravity CLI (agy), Claude Code, or OpenAI Codex.",
      type: "configure_api_key",
      actionToolId: "antigravity-cli",
    });
  }

  return {
    scannedAt,
    hostPlatform,
    aiTools,
    mcpServers,
    devRuntimes,
    aiProviders,
    recommendations,
  };
}

// Retain legacy export for backward compatibility
export const KNOWN_AI_TOOLS = EXTENDED_KNOWN_TOOLS;
export async function discoverAiTools(customEnv?: Record<string, string>): Promise<DiscoveredAiTool[]> {
  const full = await discoverCompleteHostEnvironment(customEnv);
  return full.aiTools;
}
