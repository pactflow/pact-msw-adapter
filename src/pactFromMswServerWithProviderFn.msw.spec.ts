import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import API from "../examples/react/src/api.ts";
import { type PactFile, setupPactMswAdapter } from "./pactMswAdapter.ts";

const PROVIDER_PATH_RE = /\/([\w\d]+)\/?.*/;

const server = setupServer();
const pactMswAdapter = setupPactMswAdapter({
  server,
  options: {
    // biome-ignore lint/security/noSecrets: test consumer name, not a real secret
    consumer: "testDynamicProvidersConsumer",
    providers: ({ request }) => {
      // first segment of the path is the provider name
      return new URL(request.url).pathname.match(PROVIDER_PATH_RE)?.[1] ?? null;
    },
    debug: true,
    excludeHeaders: ["x-powered-by", "cookie"],
  },
});

describe("API - With MSW mock generating a pact for dynamic providers", () => {
  beforeAll(async () => {
    server.listen();
    pactMswAdapter.clear();
  });

  beforeEach(async () => {
    pactMswAdapter.newTest();
  });

  afterEach(async () => {
    pactMswAdapter.verifyTest();
    server.resetHandlers();
  });

  afterAll(async () => {
    await pactMswAdapter.writeToFile(); // writes the pacts to a file
    pactMswAdapter.clear();
    server.close();
  });

  test("get all products and user", async () => {
    const products = [
      { id: "09", type: "CREDIT_CARD", name: "Gem Visa" },
      { id: "10", type: "CREDIT_CARD", name: "28 Degrees" },
    ];
    const user = { name: "John Doe" };
    server.use(
      http.get(`${API.url}/products`, () => HttpResponse.json(products)),
      http.get(`${API.url}/user`, () => HttpResponse.json(user)),
    );

    const respProducts = await API.getAllProducts();
    const respUser = await API.getUser();
    expect(respProducts).toEqual(products);
    expect(respUser).toEqual(user);

    const pactResults: PactFile[] = [];
    await pactMswAdapter.writeToFile((_path, data) => {
      pactResults.push(data as PactFile);
    }); // writes the pacts to a file
    expect(pactResults.length).toEqual(2);
    expect(pactResults[0].provider.name).toEqual("products");
    expect(pactResults[1].provider.name).toEqual("user");
  });
});
