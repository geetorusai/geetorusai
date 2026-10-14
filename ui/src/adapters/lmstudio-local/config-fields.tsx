import { configFieldsForSection } from "../config-sections";
import type { AdapterConfigFieldsProps } from "../types";
import {
  Field,
  DraftInput,
  DraftNumberInput,
} from "../../components/agent-config-primitives";
import { models } from "./models";
import { ChoosePathButton } from "../../components/PathInstructionsModal";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";
const instructionsFileHint =
  "Absolute path to a markdown file (e.g. AGENTS.md) that defines this agent's behavior. Injected into the system prompt at runtime.";

export function LmStudioLocalConfigFields({
  section,
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
  hideInstructionsFile,
}: AdapterConfigFieldsProps) {
  const currentModel = isCreate
    ? values!.lmStudioModel ?? "local-model"
    : eff("adapterConfig", "model", String(config.model ?? "local-model"));

  return configFieldsForSection(section, (
    <>
      <Field label="LM Studio host endpoint" hint="Host URL where LM Studio developer server is running. Defaults to http://127.0.0.1:1234/v1">
        <DraftInput
          value={
            isCreate
              ? values!.lmStudioHost ?? ""
              : eff("adapterConfig", "host", String(config.host ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ lmStudioHost: v })
              : mark("adapterConfig", "host", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="http://127.0.0.1:1234/v1"
        />
      </Field>

      <Field label="API Key (Optional)" hint="Optional authentication token or bearer key if enabled in LM Studio settings.">
        <DraftInput
          value={
            isCreate
              ? values!.lmStudioApiKey ?? ""
              : eff("adapterConfig", "apiKey", String(config.apiKey ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ lmStudioApiKey: v })
              : mark("adapterConfig", "apiKey", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="lm-studio-key"
        />
      </Field>

      <Field label="Model" hint="Configured LM Studio model identifier or currently loaded model.">
        <div className="space-y-2">
          <select
            value={models.some((m) => m.id === currentModel) ? currentModel : "custom"}
            onChange={(e) => {
              const v = e.target.value;
              if (v !== "custom") {
                if (isCreate) {
                  set!({ lmStudioModel: v });
                } else {
                  mark("adapterConfig", "model", v);
                }
              }
            }}
            className={inputClass}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
            <option value="custom">Custom model name...</option>
          </select>
          {(!models.some((m) => m.id === currentModel) || currentModel === "custom") && (
            <DraftInput
              value={isCreate ? values!.lmStudioModel ?? "" : eff("adapterConfig", "model", String(config.model ?? ""))}
              onCommit={(v) =>
                isCreate
                  ? set!({ lmStudioModel: v })
                  : mark("adapterConfig", "model", v || undefined)
              }
              immediate
              className={inputClass}
              placeholder="e.g. qwen2.5-coder-7b-instruct"
            />
          )}
        </div>
      </Field>

      {!hideInstructionsFile && (
        <Field label="Instructions file" hint={instructionsFileHint}>
          <div className="flex gap-2">
            <DraftInput
              value={
                isCreate
                  ? values!.instructionsFilePath ?? ""
                  : eff(
                      "adapterConfig",
                      "instructionsFilePath",
                      String(config.instructionsFilePath ?? ""),
                    )
              }
              onCommit={(v) =>
                isCreate
                  ? set!({ instructionsFilePath: v })
                  : mark("adapterConfig", "instructionsFilePath", v || undefined)
              }
              immediate
              className={inputClass}
              placeholder="/workspace/AGENTS.md"
            />
            <ChoosePathButton />
          </div>
        </Field>
      )}

      <Field label="Sampling temperature" hint="Controls randomness (0.0 to 1.0). Lower is more deterministic. Default: 0.2">
        <DraftNumberInput
          value={
            isCreate
              ? values!.lmStudioTemperature ?? 0.2
              : Number(eff("adapterConfig", "temperature", Number(config.temperature ?? 0.2)))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ lmStudioTemperature: v })
              : mark("adapterConfig", "temperature", v)
          }
          min={0}
          max={1}
          step={0.05}
          className={inputClass}
        />
      </Field>
    </>
  ));
}
