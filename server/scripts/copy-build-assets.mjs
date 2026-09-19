import { cpSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const copies = [
  {
    from: path.join(serverRoot, "src", "onboarding-assets"),
    to: path.join(serverRoot, "dist", "onboarding-assets"),
  },
  {
    from: path.join(serverRoot, "src", "built-ins"),
    to: path.join(serverRoot, "dist", "built-ins"),
  },
  {
    from: path.join(serverRoot, "src", "services", "scripts"),
    to: path.join(serverRoot, "dist", "services", "scripts"),
  },
  {
    from: path.join(serverRoot, "..", "packages", "geetorus-runner", "dist"),
    to: path.join(serverRoot, "dist", "vendor", "geetorus-runner"),
  },
];

for (const { from, to } of copies) {
  if (existsSync(from)) {
    mkdirSync(to, { recursive: true });
    cpSync(from, to, { recursive: true, force: true });
  }
}
