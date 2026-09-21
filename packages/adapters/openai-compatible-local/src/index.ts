export const type = "openai_compatible_local";
export const label = "OpenAI Compatible";

export const SANDBOX_INSTALL_COMMAND =
  'curl -fsSL https://opencode.ai/install | bash && ' +
  'if [ -x "$HOME/.opencode/bin/opencode" ]; then ' +
  'if [ "$(id -u)" -eq 0 ]; then ' +
  'ln -sf "$HOME/.opencode/bin/opencode" /usr/local/bin/opencode; ' +
  'elif command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then ' +
  'sudo ln -sf "$HOME/.opencode/bin/opencode" /usr/local/bin/opencode; ' +
  'else ' +
  'mkdir -p "$HOME/.local/bin" && ' +
  'ln -sf "$HOME/.opencode/bin/opencode" "$HOME/.local/bin/opencode"; ' +
  'fi; ' +
  'fi';

export const DEFAULT_OPENAI_COMPATIBLE_LOCAL_MODEL = "openai_compatible/meta/llama-3.2-11b-vision-instruct";

export function isValidOpenAICompatibleModelId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return Boolean(value.trim());
}

export const models: Array<{ id: string; label: string }> = [
  { id: "openai_compatible/meta/llama-3.2-11b-vision-instruct", label: "meta/llama-3.2-11b-vision-instruct (NVIDIA)" },
  { id: "openai_compatible/deepseek-ai/deepseek-v4-flash-0731", label: "deepseek-ai/deepseek-v4-flash-0731" },
  { id: "openai_compatible/moonshotai/kimi-k3", label: "moonshotai/kimi-k3" },
  { id: "openai_compatible/mistralai/mistral-large-2-instruct", label: "mistralai/mistral-large-2-instruct" },
  { id: "openai_compatible/gpt-4o", label: "gpt-4o (OpenAI)" },
  { id: "openai_compatible/gpt-4o-mini", label: "gpt-4o-mini (OpenAI)" },
];

export const agentConfigurationDoc = `# openai_compatible_local agent configuration

Adapter: openai_compatible_local

Use when:
- You want Geetorus to connect to custom OpenAI-compatible API providers (like NVIDIA NIM, OpenRouter, vLLM, Ollama, LiteLLM, Groq, Together, DeepSeek, etc.)
- You want to specify custom Base URL, API Key, and Model

Core fields:
- cwd (string, optional): default absolute working directory fallback for the agent process
- instructionsFilePath (string, optional): absolute path to a markdown instructions file prepended to the run prompt
- baseUrl (string, optional): The base URL of the OpenAI compatible API (e.g., https://integrate.api.nvidia.com/v1)
- apiKey (string, optional): The API key for the provider (e.g., nvapi-...)
- model (string, required): Model id (e.g. meta/llama-3.2-11b-vision-instruct or moonshotai/kimi-k3)
- variant (string, optional): variant passed to CLI
- dangerouslySkipPermissions (boolean, optional): defaults to true
- promptTemplate (string, optional): run prompt template
- command (string, optional): defaults to "opencode"
- extraArgs (string[], optional): additional CLI args
- env (object, optional): KEY=VALUE environment variables

Operational fields:
- timeoutSec (number, optional): run timeout in seconds
- graceSec (number, optional): SIGTERM grace period in seconds
`;
