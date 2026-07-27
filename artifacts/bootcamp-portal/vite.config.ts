import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fakeDataPreviewPlugin } from "./dev/fake-data-plugin";

export default defineConfig(async ({ mode }) => {
  const fileEnv = loadEnv(mode, import.meta.dirname, "");
  const fakeDataSet = process.env.FAKE_DATA_SET ?? fileEnv.FAKE_DATA_SET;
  const rawPort =
    process.env.PORTAL_PORT ??
    fileEnv.PORTAL_PORT ??
    process.env.PORT ??
    fileEnv.PORT ??
    "4173";
  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  const basePath = process.env.BASE_PATH ?? fileEnv.BASE_PATH ?? "/";

  return {
    base: basePath,
    define: {
      __FAKE_DATA_SET__: JSON.stringify(fakeDataSet ?? null),
    },
    plugins: [
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      fakeDataPreviewPlugin(fakeDataSet),
      ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, ".."),
              }),
            ),
            await import("@replit/vite-plugin-dev-banner").then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
