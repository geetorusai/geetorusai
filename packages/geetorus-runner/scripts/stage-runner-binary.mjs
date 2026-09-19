import { execFile, execSync } from "node:child_process";
import { chmod, copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const executable = process.platform === "win32" ? "geetorus-runnerd.exe" : "geetorus-runnerd";
const source = path.join(packageRoot, "runner", "target", "release", executable);
const destinationDirectory = path.join(packageRoot, "dist", "bin");
const destination = path.join(destinationDirectory, executable);

await mkdir(destinationDirectory, { recursive: true });

let cargoAvailable = false;
try {
  execSync("cargo --version", { stdio: "ignore" });
  cargoAvailable = true;
} catch {
  cargoAvailable = false;
}

if (cargoAvailable) {
  try {
    execSync("cargo build --release --manifest-path runner/Cargo.toml --locked -p geetorus-runner-core --bin geetorus-runnerd", {
      cwd: packageRoot,
      stdio: "inherit",
    });
  } catch (err) {
    console.warn("Cargo build failed:", err.message);
  }
}

if (existsSync(source)) {
  await copyFile(source, destination);
  if (process.platform !== "win32") await chmod(destination, 0o755);
  if (process.platform === "darwin") {
    try {
      await execFileAsync("codesign", ["--force", "--sign", "-", destination]);
    } catch {}
  }
} else {
  console.log(`[geetorus-runner] Native runner binary skipped (Rust/Cargo toolchain not available).`);
}
