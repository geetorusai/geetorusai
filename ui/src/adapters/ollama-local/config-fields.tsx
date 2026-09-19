import { configFieldsForSection } from "../config-sections";
import type { AdapterConfigFieldsProps } from "../types";
import {
  Field,
  DraftInput,
  DraftNumberInput,
} from "../../components/agent-config-primitives";
import { models } from "./models";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";
const instructionsFileHint =
  "Absolute path to a markdown file (e.g. AGENTS.md) that defines this agent's behavior. Injected into the system prompt at runtime.";

export function OllamaLocalConfigFields({
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
    ? values!.ollamaModel ?? "qwen2.5-coder:latest"
    : eff("adapterConfig", "model", String(config.model ?? "qwen2.5-coder:latest"));

  return configFieldsForSection(section, (
    <>
      <Field label="Ollama host endpoint" hint="Host URL where Ollama is running. Defaults to http://127.0.0.1:11434">
        <DraftInput
          value={
            isCreate
              ? values!.ollamaHost ?? ""
              : eff("adapterConfig", "host", String(config.host ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ ollamaHost: v })
              : mark("adapterConfig", "host", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="http://127.0.0.1:11434"
        />
      </Field>

      <Field label="Model" hint="Ollama model to use for completion & chat">
        <div className="flex flex-col gap-2">
          <select
            className={inputClass}
            value={currentModel}
            onChange={(e) => {
              const val = e.target.value;
              isCreate ? set!({ ollamaModel: val }) : mark("adapterConfig", "model", val);
            }}
          >
            {models.map((m: { id: string; label: string }) => (
              <option key={m.id} value={m.id}>
                {m.label} ({m.id})
              </option>
            ))}
            <option value="custom">Custom model tag...</option>
          </select>

          {(!models.some((m: { id: string; label: string }) => m.id === currentModel) || currentModel === "custom") && (
            <DraftInput
              value={currentModel === "custom" ? "" : currentModel}
              onCommit={(v) =>
                isCreate
                  ? set!({ ollamaModel: v })
                  : mark("adapterConfig", "model", v || undefined)
              }
              immediate
              className={inputClass}
              placeholder="e.g. deepseek-r1:32b, mistral-nemo, codegemma"
            />
          )}
        </div>
      </Field>

      <Field configSection="advanced" label="Temperature" hint="Sampling temperature between 0.0 and 1.0 (defaults to 0.2)">
        {isCreate ? (
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            className={inputClass}
            value={values!.ollamaTemperature ?? 0.2}
            onChange={(e) => set!({ ollamaTemperature: Number(e.target.value) })}
          />
        ) : (
          <DraftNumberInput
            value={eff(
              "adapterConfig",
              "temperature",
              Number(config.temperature ?? 0.2),
            )}
            onCommit={(v) => mark("adapterConfig", "temperature", v ?? 0.2)}
            immediate
            className={inputClass}
          />
        )}
      </Field>

      {!hideInstructionsFile && (
        <Field label="Agent instructions file" hint={instructionsFileHint}>
          <div className="flex items-center gap-2">
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
              placeholder="/absolute/path/to/AGENTS.md"
            />
            <ChoosePathButton />
          </div>
        </Field>
      )}
    </>
  ));
}
