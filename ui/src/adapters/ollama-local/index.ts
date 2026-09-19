import type { UIAdapterModule } from "../types";
import { parseOllamaStdoutLine } from "./parse-stdout";
import { buildOllamaLocalConfig } from "./build-config";
import { OllamaLocalConfigFields } from "./config-fields";

export const ollamaLocalUIAdapter: UIAdapterModule = {
  type: "ollama_local",
  label: "Ollama (Local AI)",
  parseStdoutLine: parseOllamaStdoutLine,
  ConfigFields: OllamaLocalConfigFields,
  buildAdapterConfig: buildOllamaLocalConfig,
};
