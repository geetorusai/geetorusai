import type { UIAdapterModule } from "../types";
import { parseLmStudioStdoutLine } from "./parse-stdout";
import { buildLmStudioLocalConfig } from "./build-config";
import { LmStudioLocalConfigFields } from "./config-fields";

export const lmstudioLocalUIAdapter: UIAdapterModule = {
  type: "lmstudio_local",
  label: "LM Studio",
  parseStdoutLine: parseLmStudioStdoutLine,
  ConfigFields: LmStudioLocalConfigFields,
  buildAdapterConfig: buildLmStudioLocalConfig,
};
