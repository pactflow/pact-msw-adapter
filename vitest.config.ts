import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["src/**/*.msw.spec.ts", "src/**/*.msw.test.ts"],
		environment: "node",
		env: { REACT_APP_API_BASE_URL: "http://localhost:8081" },
		globals: true,
	},
});
