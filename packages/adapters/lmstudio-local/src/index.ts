export const type = "lmstudio_local";
export const label = "LM Studio (Local AI)";

export const DEFAULT_LMSTUDIO_LOCAL_MODEL = "local-model";
export const DEFAULT_LMSTUDIO_HOST = "http://127.0.0.1:1234/v1";

export const models = [
  // Currently Loaded / Default Model
  { id: "local-model", label: "Currently Loaded Model in LM Studio (Default)" },
  // Popular coding & general models run in LM Studio
  { id: "qwen2.5-coder-7b-instruct", label: "Qwen 2.5 Coder 7B (LM Studio - Recommended)" },
  { id: "qwen2.5-coder-14b-instruct", label: "Qwen 2.5 Coder 14B (LM Studio)" },
  { id: "qwen2.5-coder-32b-instruct", label: "Qwen 2.5 Coder 32B (LM Studio)" },
  { id: "deepseek-r1-distill-qwen-7b", label: "DeepSeek R1 Distill 7B (LM Studio - Reasoning)" },
  { id: "deepseek-r1-distill-qwen-14b", label: "DeepSeek R1 Distill 14B (LM Studio - Reasoning)" },
  { id: "deepseek-r1-distill-llama-8b", label: "DeepSeek R1 Distill Llama 8B (LM Studio)" },
  { id: "llama-3.2-3b-instruct", label: "Llama 3.2 3B (LM Studio - Fast)" },
  { id: "llama-3.2-1b-instruct", label: "Llama 3.2 1B (LM Studio - Ultra Fast)" },
  { id: "llama-3.1-8b-instruct", label: "Llama 3.1 8B (LM Studio)" },
  { id: "llama-3.3-70b-instruct", label: "Llama 3.3 70B (LM Studio)" },
  { id: "mistral-7b-instruct-v0.3", label: "Mistral 7B (LM Studio)" },
  { id: "phi-4", label: "Phi-4 (LM Studio)" },
  { id: "gemma-2-9b-it", label: "Gemma 2 9B (LM Studio)" },
];

export const agentConfigurationDoc = `# lmstudio_local agent configuration

Adapter: lmstudio_local

Use when:
- You want to run local open-source models completely private and offline using LM Studio
- You have LM Studio running locally with the developer local server active on \`http://127.0.0.1:1234/v1\`
- You want zero API cost, local GPU acceleration, and OpenAI-compatible completions

Don't use when:
- LM Studio is not installed, or the LM Studio local server is not running

Core fields:
- cwd (string, optional): working directory for the agent process
- model (string, optional): LM Studio model ID (e.g. local-model, qwen2.5-coder-7b-instruct, deepseek-r1-distill-qwen-7b). Defaults to local-model.
- host (string, optional): LM Studio server endpoint URL. Defaults to http://127.0.0.1:1234/v1 (or LMSTUDIO_HOST environment variable).
- apiKey (string, optional): optional API token or bearer secret if LM Studio authentication is enabled (or LMSTUDIO_API_KEY).
- temperature (number, optional): generation temperature (default: 0.2)
- promptTemplate (string, optional): run prompt template
- env (object, optional): KEY=VALUE environment variables

Operational fields:
- timeoutSec (number, optional): run timeout in seconds (default: 1200 local, 300 remote)
- graceSec (number, optional): SIGTERM grace period in seconds
`;
