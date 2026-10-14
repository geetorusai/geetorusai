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

