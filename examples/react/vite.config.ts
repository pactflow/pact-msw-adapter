import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	server: { port: 3000, open: true },
	build: { outDir: "build", sourcemap: true },
	envPrefix: ["VITE_", "REACT_APP_"],
	test: {
		include: ["src/**/*.{spec,test}.{js,ts}"],
		environment: "node",
		globals: true,
		setupFiles: ["./src/setupTests.js"],
		env: { REACT_APP_API_BASE_URL: "http://localhost:8081" },
	},
});
