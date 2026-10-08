// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ExecutionBlockerNotice } from "./ExecutionBlockerNotice";
import { issuesApi } from "../api/issues";

vi.mock("../api/issues", () => ({ issuesApi: { resolveRecoveryAction: vi.fn() } }));

function setTextareaValue(element: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("stopped task recovery notice", () => {
  let root: Root;
  let container: HTMLDivElement;
  let client: QueryClient;
  const onResolved = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    await act(async () => root.render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <ExecutionBlockerNotice companyId="company" issueId="task" onResolved={onResolved} blocker={{
            recoveryActionId: "11111111-1111-4111-8111-111111111111",
            runId: "22222222-2222-4222-8222-222222222222",
            agentId: "agent",
            cause: "legacy_execution_requires_reconciliation",
            nextAction: "Automatic recovery stopped.",
          }} />
        </QueryClientProvider>
      </MemoryRouter>,
    ));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    container.remove();
  });

  async function fillReconciliationForm() {
    await act(async () => container.querySelector<HTMLButtonElement>("button")!.click());
    await act(async () => {
      const select = container.querySelector("select")!;
      select.value = "not_performed";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      const textarea = container.querySelector("textarea")!;
      setTextareaValue(textarea, "Verified the old process stopped without changing files.");
      container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    });
  }

  it("does not offer an unsafe exact retry and links to the previous run", () => {
    expect(container.textContent).not.toContain("Retry");
    expect(container.textContent).toContain("Review and continue");
    expect(container.querySelector('a[href="/agents/agent/runs/22222222-2222-4222-8222-222222222222"]')).toBeTruthy();
  });

  it("requires a verified outcome, evidence, and stopped provider before continuing", async () => {
    await act(async () => container.querySelector<HTMLButtonElement>("button")!.click());
    const submit = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent === "Record outcome and continue",
    )!;
    expect(submit.disabled).toBe(true);

    await act(async () => {
      const select = container.querySelector("select")!;
      select.value = "not_performed";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      const textarea = container.querySelector("textarea")!;
      setTextareaValue(textarea, "Verified the old process stopped without changing files.");
      container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    });
    expect(submit.disabled).toBe(false);
  });

  it("records reconciliation evidence instead of retrying the old run", async () => {
    vi.mocked(issuesApi.resolveRecoveryAction).mockResolvedValue({} as never);
    await fillReconciliationForm();
    const submit = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent === "Record outcome and continue",
    )!;
    await act(async () => submit.click());
    await act(async () => { await Promise.resolve(); });

    expect(issuesApi.resolveRecoveryAction).toHaveBeenCalledWith("task", {
      actionId: "11111111-1111-4111-8111-111111111111",
      outcome: "restored",
      sourceIssueStatus: "todo",
      executionReconciliation: {
        runId: "22222222-2222-4222-8222-222222222222",
        providerStopped: true,
        actionOutcome: "not_performed",
        outcomeEvidence: "Verified the old process stopped without changing files.",
      },
    });
    expect(onResolved).toHaveBeenCalledOnce();
  });
});
