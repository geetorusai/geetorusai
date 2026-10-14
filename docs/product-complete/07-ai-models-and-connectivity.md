# 07 — AI Models and Provider Connectivity

GeetorusAI features a pluggable, model-agnostic provider subsystem designed to decouple agent reasoning logic from specific AI vendors. The platform supports **13 distinct provider adapters** spanning frontier remote APIs, local open-weight runtimes, and standardized agent-client protocols.

---

## 1. Supported Model Providers & Adapters

```mermaid
graph LR
    subgraph Geetorus Control Plane
        ModelRouter[Model Discovery & Router]
        AdapterRegistry[Adapter Subsystem]
    end

    subgraph Frontier Remote APIs
        Claude[Anthropic Claude Opus / Sonnet / Haiku]
        Codex[OpenAI Codex / GPT-4o]
        Gemini[Google Gemini 1.5 / 2.0]
        Grok[xAI Grok 2]
        Kimi[Moonshot Kimi]
    end

    subgraph Local Inference & Open-Weight
        Ollama[Ollama: Llama 3, DeepSeek, Qwen, Mistral]
        OpenCode[OpenCode Local Engine]
    end

    subgraph Agent Protocols & Gateways
        ACP[Agent Client Protocol ACP / ACPX]
        OpenClaw[OpenClaw SSE Gateway]
        Hermes[Hermes Protocol Gateway]
        Cursor[Cursor IDE Cloud / Local Driver]
        Pi[Pi Agent Runtime]
    end

    ModelRouter --> AdapterRegistry
    AdapterRegistry --> Claude
    AdapterRegistry --> Codex
    AdapterRegistry --> Gemini
    AdapterRegistry --> Grok
    AdapterRegistry --> Kimi
    AdapterRegistry --> Ollama
    AdapterRegistry --> OpenCode
    AdapterRegistry --> ACP
    AdapterRegistry --> OpenClaw
    AdapterRegistry --> Hermes
    AdapterRegistry --> Cursor
    AdapterRegistry --> Pi
```

---

## 2. Comprehensive Adapter Inventory

| Adapter Type | Display Label | Supported Protocols | Default Model | Primary Package |
| :--- | :--- | :--- | :--- | :--- |
| `claude_local` | Claude Code | ACP / CLI | `claude-opus-5` | `packages/adapters/claude-local` |
| `codex_local` | OpenAI Codex | ACP / Stdio | `codex-davinci` | `packages/adapters/codex-local` |
| `gemini_local` | Google Gemini | REST / Stdio | `gemini-2.0-flash` | `packages/adapters/gemini-local` |
| `grok_local` | xAI Grok | REST / OpenAI-compat | `grok-2` | `packages/adapters/grok-local` |
| `ollama_local` | Ollama (Local & Cloud) | HTTP / REST (`/api/chat`, `/api/generate`, `/api/tags`) | `gemma3:4b` | `packages/adapters/ollama-local` |
| `openclaw_gateway` | OpenClaw Gateway | SSE / WebSocket | `openclaw-default` | `packages/adapters/openclaw-gateway` |
| `hermes_gateway` | Hermes Gateway | JSON-RPC / Gateway | `hermes-agent-v1` | `packages/adapters/hermes-gateway` |
| `cursor_local` | Cursor Local | IPC / Stdio | `cursor-fast` | `packages/adapters/cursor-local` |
| `cursor_cloud` | Cursor Cloud | HTTPS / Token | `cursor-cloud-v1` | `packages/adapters/cursor-cloud` |
| `kimi_local` | Moonshot Kimi | REST / OpenAI-compat | `moonshot-v1-128k` | `packages/adapters/kimi-local` |
| `opencode_local`| OpenCode | CLI / Stdio | `opencode-default` | `packages/adapters/opencode-local` |
| `pi_local` | Pi Local | Stdio / JSON | `pi-default` | `packages/adapters/pi-local` |

---

## 3. Protocol Implementations: ACP vs. CLI

### 1. Agent Client Protocol (ACP / ACPX)
- **Used by**: `claude_local`, `codex_local`.
- **Implementation**: Managed subprocess sidecar (`geetorus-runner-acpx-sidecar`) communicating via bidirectional JSON-RPC over `stdio`.
- **Advantages**: Persistent session states, warm process reuse (`warmHandleIdleMs`), fine-grained tool streaming, and native permission negotations.

### 2. Standard CLI Subprocess
- **Used by**: Claude CLI, OpenCode, Ollama, Pi.
- **Implementation**: Spawns isolated OS binaries (`claude`, `ollama`, `opencode`) inside ephemeral working directories with runtime environment variable injection (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc.).

---

## 4. Credential Resolution & Secret Binding

GeetorusAI enforces zero-hardcoded secrets. Provider credentials resolve dynamically at runtime using a strict precedence hierarchy:

```mermaid
flowchart TD
    Req[Agent Execution Turn] --> Step1{1. Agent Explicit Secret Binding?}
    Step1 -- Yes --> Use1[Use Agent-Specific Bound Secret]
    Step1 -- No --> Step2{2. Company Provider Default?}
    Step2 -- Yes --> Use2[Use Company-Wide Provider Secret]
    Step2 -- No --> Step3{3. Host Environment Variable?}
    Step3 -- Yes --> Use3[Use Host Env: ANTHROPIC_API_KEY, etc.]
    Step3 -- No --> Error[Throw AuthenticationRefusalError]
```

---

## 5. Streaming, Tool Calling & Fallback Policies

- **Token Streaming**: Real-time token output chunks are captured from ACP/stdio stdout and forwarded via WebSocket to the UI live terminal.
- **Tool Calling**:
  - Claude & Codex ACP use native structured tool calling via JSON schemas.
  - CLI adapters receive specialized system prompt wrappers rendering available MCP tools.
- **Circuit Breakers & Retries**:
  - `ErrorClassifier` categorizes failures as `network`, `rate_limit`, `auth`, `context_overflow`, or `fatal`.
  - Rate limits trigger exponential backoff with randomized jitter (e.g. 500ms -> 1500ms -> 4500ms).
  - Sustained failures trip the provider circuit breaker, automatically reporting diagnostics without silently switching to unexpected paid providers.

---

## 6. Unified Ollama Local & Cloud Runtime Architecture

GeetorusAI provides a unified execution engine for Ollama local instances (`http://127.0.0.1:11434`) and remote/Ollama Cloud endpoints:

### Local Ollama Invariants:
1. **Host Reachability**: Probes `/api/tags` with a 6-second timeout; returns clear guidance (`ollama serve`) if unreachable.
2. **Model Availability**: Validates model presence prior to task execution. If missing, reports an explicit error with `ollama pull <model>`. **Never downloads weights automatically without user approval.**
3. **No Silent Failover**: Never silently routes to a paid cloud provider on local model errors.

### Ollama Cloud Invariants:
1. **Secure Authentication**: Attaches `Authorization: Bearer <token>` from configured `apiKey` or `OLLAMA_API_KEY`. Keys are never logged or exposed in UI code.
2. **Streaming & Tools**: Emits incremental token chunks over SSE/NDJSON streams; captures exact `prompt_eval_count` and `eval_count` tokens directly from the Ollama response frame.
3. **Diagnostics**: Normalizes 401/403 (Auth Failure), 429 (Rate Limit Exceeded), and 404 (Model Not Found) into user-actionable diagnostics.

### Always-On Ponytail Efficiency:
All coding tasks execute under the always-on **Ponytail Decision Ladder**:
1. **YAGNI**: Verify necessity before authoring.
2. **Audit**: Reuse existing codebase helpers and utilities.
3. **Native-First**: Use standard language and platform primitives over external dependencies.
4. **Directness**: Keep implementations in single clean expressions where possible.
5. **Minimal Code**: Author the absolute minimum lines required to fulfill verified requirements.
*(No artificial modes or activation flags: active as a constant system invariant).*
