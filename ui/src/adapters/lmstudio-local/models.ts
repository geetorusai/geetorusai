export const DEFAULT_LMSTUDIO_LOCAL_MODEL = "local-model";
export const DEFAULT_LMSTUDIO_HOST = "http://127.0.0.1:1234/v1";

export const models = [
  { id: "local-model", label: "Currently Loaded Model in LM Studio (Default)" },
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
