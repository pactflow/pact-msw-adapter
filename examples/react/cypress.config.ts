import { createRequire } from "node:module";
import { defineConfig } from "cypress";
import vitePreprocessor from "cypress-vite";
import type { Plugin } from "vite";

const require = createRequire(import.meta.url);

/**
 * cypress-vite uses `{ ...userConfig, ...defaultConfig }` where defaultConfig.build
 * overwrites userConfig.build entirely. Only top-level keys absent from defaultConfig
 * (like `plugins`) are preserved from userConfig. So we use a plugin to polyfill
 * `"events"` with the npm events package (same browser-compatible EventEmitter that
 * webpack bundles automatically), rather than relying on build.rollupOptions.external.
 */
const eventsPolyfillPlugin: Plugin = {
  name: "events-polyfill",
  enforce: "pre",
  resolveId(id) {
    if (id === "events") {
      // Redirect to the npm `events` package (browser-compatible EventEmitter
      // polyfill) rather than the Node.js built-in, which Vite would replace
      // with an empty __vite-browser-external stub in browser build mode.
      return require.resolve("events/events.js");
    }
  },
};

export default defineConfig({
  retries: 3,
  e2e: {
    setupNodeEvents(on) {
      on(
        "file:preprocessor",
        vitePreprocessor({ plugins: [eventsPolyfillPlugin] }),
      );
    },
    baseUrl: "http://localhost:3000",
  },
});
