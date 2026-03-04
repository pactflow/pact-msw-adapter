import { setupPactMswAdapter } from "@pactflow/pact-msw-adapter";
import { setupServer } from "msw/node";
import { handlers } from "./mocks/handlers.ts";

// This configures a request mocking server with the given request handlers.
const server = setupServer(...handlers);

const pactMswAdapter = setupPactMswAdapter({
	server,
	options: {
		consumer: "testConsumer",
		providers: { testProvider: ["products"], testProvider2: ["/product/10"] },
		debug: true,
		includeUrl: ["products", "/product"],
		excludeUrl: ["/product/11"],
		excludeHeaders: ["x-powered-by", "cookie"],
	},
});

beforeAll(() => {
	server.listen();
});

beforeEach(() => {
	pactMswAdapter.newTest();
});

afterEach(() => {
	pactMswAdapter.verifyTest();
	server.resetHandlers();
});

afterAll(async () => {
	await pactMswAdapter.writeToFile(); // writes the pacts to a file
	pactMswAdapter.clear();
	server.close();
});
