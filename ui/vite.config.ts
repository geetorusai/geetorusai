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
  optimizeDeps: {
    include: [
      "react",
      "react/jsx-runtime",
      "react-dom",
      "react-dom/client",
      "react-router-dom",
      "@assistant-ui/react",
      "@base-ui/react/merge-props",
      "@base-ui/react/use-render",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "@lexical/link",
      "@mdxeditor/editor",
      "@sentry/browser",
      "@tanstack/react-query",
      "@xterm/addon-fit",
      "@xterm/xterm",
      "class-variance-authority",
      "clsx",
      "cmdk",
      "i18next",
      "lexical",
      "lucide-react",
      "mermaid",
      "motion/react",
      "radix-ui",
      "react-i18next",
      "react-markdown",
      "react-resizable-panels",
      "remark-gfm",
      "tailwind-merge",
      "zod",
    ],
  },
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
