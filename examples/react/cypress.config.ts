import { defineConfig } from "cypress";
import setupPlugins from "./cypress/plugins/index.ts";

export default defineConfig({
	retries: 3,
	e2e: {
		setupNodeEvents(on, config) {
			return setupPlugins(on, config);
		},
		baseUrl: "http://localhost:3000",
	},
});
