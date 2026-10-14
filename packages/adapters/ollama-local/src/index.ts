export const type = "ollama_local";
export const label = "Ollama (Local & Cloud)";

export const DEFAULT_OLLAMA_LOCAL_MODEL = "gemma3:4b";
export const DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434";

export const models = [
  // Local Ollama Models (Standard installed tags)
  { id: "gemma3:4b", label: "Gemma 3 4B (Local - Fast & Default)" },
  { id: "qwen2.5-coder:latest", label: "Qwen 2.5 Coder (Local - Recommended for Code)" },
  { id: "qwen2.5-coder:7b", label: "Qwen 2.5 Coder 7B (Local)" },
  { id: "qwen2.5-coder:14b", label: "Qwen 2.5 Coder 14B (Local)" },
  { id: "qwen2.5-coder:32b", label: "Qwen 2.5 Coder 32B (Local)" },
  { id: "deepseek-r1:8b", label: "DeepSeek R1 8B (Local - Reasoning)" },
  { id: "deepseek-r1:14b", label: "DeepSeek R1 14B (Local - Reasoning)" },
  { id: "deepseek-r1:latest", label: "DeepSeek R1 (Local)" },
  { id: "llama3.3:latest", label: "Llama 3.3 70B (Local)" },
  { id: "llama3.2:latest", label: "Llama 3.2 3B (Local - Ultra Fast)" },
  { id: "llama3.1:latest", label: "Llama 3.1 8B (Local)" },
  { id: "mistral:latest", label: "Mistral 7B (Local)" },
  { id: "phi4:latest", label: "Phi-4 14B (Local)" },
  { id: "codellama:latest", label: "Code Llama (Local)" },
  { id: "starcoder2:latest", label: "StarCoder 2 (Local)" },
  { id: "gemma2:latest", label: "Gemma 2 (Local)" },
  // Ollama Cloud & Remote Endpoints
  { id: "deepseek-v3:cloud", label: "DeepSeek V3 (Ollama Cloud / Remote)" },
  { id: "deepseek-r1:cloud", label: "DeepSeek R1 (Ollama Cloud / Remote)" },
  { id: "llama3.3:cloud", label: "Llama 3.3 70B (Ollama Cloud / Remote)" },
  { id: "qwen2.5-coder:32b:cloud", label: "Qwen 2.5 Coder 32B (Ollama Cloud / Remote)" },
];

export const agentConfigurationDoc = `# ollama_local agent configuration

Adapter: ollama_local

Use when:
- You want to run local open-source models completely private and offline using Ollama
- You have Ollama running locally on \`http://127.0.0.1:11434\` or a remote Ollama Cloud host
- You want high performance, zero API costs (local) or scalable cloud capacity (Ollama Cloud) with full streaming and tool-calling support

Don't use when:
- Ollama is not installed or running, and no Ollama Cloud endpoint is configured

Core fields:
- cwd (string, optional): working directory for the agent process
- model (string, optional): Ollama model tag (e.g. gemma3:4b, qwen2.5-coder:latest, deepseek-r1:8b). Defaults to gemma3:4b.
- host (string, optional): Ollama server endpoint URL. Defaults to http://127.0.0.1:11434 (or OLLAMA_HOST environment variable). For Ollama Cloud, specify your remote endpoint.
- apiKey (string, optional): API token or bearer secret for authenticated Ollama Cloud / remote gateway (or OLLAMA_API_KEY environment variable). Never logged or exposed.
- temperature (number, optional): generation temperature (default: 0.2)
- promptTemplate (string, optional): run prompt template
- env (object, optional): KEY=VALUE environment variables

Operational fields:
- timeoutSec (number, optional): run timeout in seconds (default: 300)
- graceSec (number, optional): SIGTERM grace period in seconds
`;

