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
