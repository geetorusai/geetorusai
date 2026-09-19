export const type = "ollama_local";
export const label = "Ollama (Local AI)";

export const DEFAULT_OLLAMA_LOCAL_MODEL = "qwen2.5-coder:latest";
export const DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434";

export const models = [
  { id: DEFAULT_OLLAMA_LOCAL_MODEL, label: "Qwen 2.5 Coder (Recommended)" },
  { id: "qwen2.5-coder:32b", label: "Qwen 2.5 Coder 32B" },
  { id: "qwen2.5-coder:14b", label: "Qwen 2.5 Coder 14B" },
  { id: "qwen2.5-coder:7b", label: "Qwen 2.5 Coder 7B" },
  { id: "deepseek-r1:latest", label: "DeepSeek R1" },
  { id: "deepseek-r1:14b", label: "DeepSeek R1 14B" },
  { id: "deepseek-r1:8b", label: "DeepSeek R1 8B" },
  { id: "deepseek-r1:70b", label: "DeepSeek R1 70B" },
  { id: "llama3.3:latest", label: "Llama 3.3" },
  { id: "llama3.2:latest", label: "Llama 3.2" },
  { id: "llama3.1:latest", label: "Llama 3.1" },
  { id: "mistral:latest", label: "Mistral" },
  { id: "phi4:latest", label: "Phi-4" },
  { id: "codellama:latest", label: "Code Llama" },
  { id: "starcoder2:latest", label: "StarCoder 2" },
  { id: "gemma2:latest", label: "Gemma 2" },
];

export const agentConfigurationDoc = `# ollama_local agent configuration

Adapter: ollama_local

Use when:
- You want to run local open-source models completely private and offline using Ollama
- You have Ollama running locally on \`http://127.0.0.1:11434\` or a network host
- You want zero API costs and full data privacy

Don't use when:
- You need cloud-hosted commercial APIs like Anthropic Claude or OpenAI GPT-4o without local hardware
- Ollama is not installed or running on the machine/network

Core fields:
- cwd (string, optional): working directory for the agent process
- model (string, optional): Ollama model name (e.g. qwen2.5-coder:latest, deepseek-r1:latest, llama3.3:latest). Defaults to qwen2.5-coder:latest.
- host (string, optional): Ollama server endpoint URL. Defaults to http://127.0.0.1:11434 (or OLLAMA_HOST environment variable).
- temperature (number, optional): generation temperature (default: 0.2)
- promptTemplate (string, optional): run prompt template
- env (object, optional): KEY=VALUE environment variables

Operational fields:
- timeoutSec (number, optional): run timeout in seconds (default: 300)
- graceSec (number, optional): SIGTERM grace period in seconds
`;
