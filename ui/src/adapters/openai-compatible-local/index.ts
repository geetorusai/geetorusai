import type { UIAdapterModule } from "../types";
import { parseOpenAICompatibleStdoutLine } from "@geetorusai/adapter-openai-compatible-local/ui";
import { OpenAICompatibleLocalConfigFields } from "./config-fields";
import { buildOpenAICompatibleLocalConfig } from "@geetorusai/adapter-openai-compatible-local/ui";

export const openAICompatibleLocalUIAdapter: UIAdapterModule = {
  type: "openai_compatible_local",
  label: "OpenAI Compatible",
  parseStdoutLine: parseOpenAICompatibleStdoutLine,
  ConfigFields: OpenAICompatibleLocalConfigFields,
  buildAdapterConfig: buildOpenAICompatibleLocalConfig,
};
