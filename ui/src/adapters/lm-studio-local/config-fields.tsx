import { configFieldsForSection } from "../config-sections";
import type { AdapterConfigFieldsProps } from "../types";
import { Field, ToggleField, DraftInput, help } from "../../components/agent-config-primitives";
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
  return configFieldsForSection(section, (
    <>
      <Field
        label="LM Studio server URL"
        hint="OpenAI-compatible API base URL. Start it from LM Studio's Developer tab or with `lms server start`."
      >
        <DraftInput
          value={
            isCreate
              ? values!.baseUrl ?? "http://127.0.0.1:1234/v1"
              : eff("adapterConfig", "baseUrl", String(config.baseUrl ?? "http://127.0.0.1:1234/v1"))
          }
          onCommit={(value) =>
            isCreate
              ? set!({ baseUrl: value })
              : mark("adapterConfig", "baseUrl", value || undefined)
          }
          immediate
          className={inputClass}
          placeholder="http://127.0.0.1:1234/v1"
        />
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
              onCommit={(value) =>
                isCreate
                  ? set!({ instructionsFilePath: value })
                  : mark("adapterConfig", "instructionsFilePath", value || undefined)
              }
              immediate
              className={inputClass}
              placeholder="/absolute/path/to/AGENTS.md"
            />
            <ChoosePathButton />
          </div>
        </Field>
      )}

      <ToggleField
        label="Skip permissions"
        hint={help.dangerouslySkipPermissions}
        checked={
          isCreate
            ? values!.dangerouslySkipPermissions
            : eff(
                "adapterConfig",
                "dangerouslySkipPermissions",
                config.dangerouslySkipPermissions !== false,
              )
        }
        onChange={(value) =>
          isCreate
            ? set!({ dangerouslySkipPermissions: value })
            : mark("adapterConfig", "dangerouslySkipPermissions", value)
        }
      />
    </>
  ));
}
