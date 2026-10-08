import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createUiDevWatchOptions } from "./src/lib/vite-watch.ts";
import { createApiProxy } from "./src/lib/vite-api-proxy.ts";
import { serviceWorkerBuildIdPlugin } from "./src/lib/vite-sw-build-id.ts";

const apiProxy = createApiProxy();

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), serviceWorkerBuildIdPlugin()],
  build: {
    minify: "esbuild",
  },
  esbuild:
    mode === "production"
      ? {
          drop: ["console", "debugger"],
          legalComments: "none",
        }
      : undefined,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      lexical: path.resolve(import.meta.dirname, "./node_modules/lexical/dist/Lexical.mjs"),
      "@geetorusai/adapter-ollama-local/ui": path.resolve(import.meta.dirname, "./src/adapters/ollama-local/index.ts"),
      "@geetorusai/adapter-ollama-local": path.resolve(import.meta.dirname, "../packages/adapters/ollama-local/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    watch: createUiDevWatchOptions(process.cwd()),
    proxy: apiProxy,
  },
  preview: {
    port: 3101,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: apiProxy,
  },
}));
