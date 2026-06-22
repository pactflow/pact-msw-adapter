import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/pactMswAdapter.ts"),
      formats: ["es"],
      fileName: "pact-msw-adapter",
    },
    rollupOptions: {
      external: [
        "msw",
        "msw/browser",
        "msw/node",
        "events",
        "node:events",
        "node:fs",
        "node:path",
        "fs",
        "path",
      ],
    },
  },
  plugins: [
    dts({
      include: ["src"],
      exclude: ["src/**/*.spec.ts", "src/**/*.test.ts"],
    }),
  ],
});
