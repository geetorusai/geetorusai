export const type = "lm_studio_local";
export const label = "LM Studio";

export const DEFAULT_LM_STUDIO_BASE_URL = "http://127.0.0.1:1234/v1";

export const models: Array<{ id: string; label: string }> = [];

export const agentConfigurationDoc = `# lm_studio_local agent configuration

Adapter: lm_studio_local

Use when:
- You want Geetorus to run agents with models served by LM Studio.
- LM Studio's local server is running from the Developer tab or with \`lms server start\`.
- A tool-capable chat model is loaded or available for just-in-time loading.

Core fields:
- baseUrl (string, optional): LM Studio's OpenAI-compatible base URL. Defaults to http://127.0.0.1:1234/v1.
- model (string, required): exact model identifier returned by LM Studio's GET /v1/models endpoint.
- Load the selected model with a context length of at least 32,768 tokens. Geetorus checks the loaded context during Test Connection when LM Studio's management API is available.
- instructionsFilePath (string, optional): absolute path to a markdown instructions file prepended to the run prompt.
- dangerouslySkipPermissions (boolean, optional): defaults to true for unattended OpenCode runs.
- command (string, optional): agent harness command; defaults to opencode.
- env (object, optional): environment variables. Use LM_STUDIO_BASE_URL to override the default endpoint or LM_STUDIO_API_TOKEN when LM Studio authentication is enabled.

Operational fields:
- timeoutSec (number, optional): run timeout in seconds; zero means no adapter timeout.
- graceSec (number, optional): SIGTERM grace period in seconds.
`;
