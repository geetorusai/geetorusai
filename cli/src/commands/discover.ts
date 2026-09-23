import * as p from "@clack/prompts";
import pc from "picocolors";
import { discoverCompleteHostEnvironment } from "@geetorusai/adapter-utils";
import { printGeetorusCliBanner } from "../utils/banner.js";

export async function discoverCommand(opts: {
  json?: boolean;
  yes?: boolean;
}): Promise<void> {
  if (!opts.json) {
    printGeetorusCliBanner();
    p.intro(pc.bgCyan(pc.black(" geetorus discover — host environment inspector ")));
  }

  const s = p.spinner();
  if (!opts.json) {
    s.start("Inspecting host system (AI IDEs, CLIs, MCP servers, runtimes, providers)...");
  }

  const inventory = await discoverCompleteHostEnvironment();

  if (!opts.json) {
    s.stop("Host inspection completed.");
  }

  if (opts.json) {
    console.log(JSON.stringify(inventory, null, 2));
    return;
  }

  // 1. AI Tools (IDEs & CLIs)
  const availableTools = inventory.aiTools.filter((t) => t.isAvailable);
  p.note(
    availableTools.length > 0
      ? availableTools
          .map(
            (t) =>
              `${pc.bold(t.name)} [${t.category.toUpperCase()}]\n` +
              `  • Binary: ${pc.cyan(t.binaryPath ?? t.binaryName)}\n` +
              `  • Version: ${t.version ?? "Unknown"}\n` +
              `  • Auth Status: ${
                t.authStatus === "authenticated"
                  ? pc.green("Authenticated")
                  : t.authStatus === "unauthenticated"
                  ? pc.yellow("Installed (Needs Auth)")
                  : pc.dim("Unconfigured")
              }`,
          )
          .join("\n\n")
      : pc.yellow("No supported AI IDEs or CLIs detected on PATH."),
    `AI Tools & Editors (${availableTools.length} Detected)`,
  );

  // 2. MCP Servers
  if (inventory.mcpServers.length > 0) {
    p.note(
      inventory.mcpServers
        .map(
          (m) =>
            `${pc.bold(m.name)}\n` +
            `  • Command: ${pc.cyan(`${m.command} ${m.args.join(" ")}`.trim())}\n` +
            `  • Config: ${pc.dim(m.sourceConfig)}`,
        )
        .join("\n\n"),
      `Local MCP Servers (${inventory.mcpServers.length} Configured)`,
    );
  }

  // 3. Dev Runtimes
  const activeRuntimes = inventory.devRuntimes.filter((r) => r.isAvailable);
  p.note(
    activeRuntimes
      .map((r) => `  • ${pc.bold(r.name)}: ${r.version ?? "Available"} (${pc.dim(r.binaryPath)})`)
      .join("\n"),
    `Developer Runtimes & SDKs (${activeRuntimes.length} Available)`,
  );

  // 4. Recommendations
  if (inventory.recommendations.length > 0) {
    p.note(
      inventory.recommendations
        .map((r) => `👉 ${pc.bold(r.title)}\n   ${r.description}`)
        .join("\n\n"),
      `Tailored Host Recommendations (${inventory.recommendations.length})`,
    );
  }

  p.outro(pc.green("Environment inspection complete. All tools are ready for central control integration."));
}
