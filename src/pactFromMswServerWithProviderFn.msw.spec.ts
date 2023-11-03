import API from "../examples/react/src/api";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { PactFile, setupPactMswAdapter } from "./pactMswAdapter";

const server = setupServer();
const pactMswAdapter = setupPactMswAdapter({
  server,
  options: {
    consumer: "testDynamicProvidersConsumer",
    providers: ({ request }) => {
      // first segment of the path is the provider name
      return new URL(request.url).pathname.match(/\/([\w\d]+)\/?.*/)?.[1] ?? null
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
    server.close()
  });

  test("get all products and user", async () => {
    const products = [
      { id: "09", type: "CREDIT_CARD", name: "Gem Visa" },
      { id: "10", type: "CREDIT_CARD", name: "28 Degrees" },
    ];
    const user = { name: "John Doe" };
    server.use(
      http.get(API.url + "/products", () => {
        return HttpResponse.json(products)
      }),
      http.get(API.url + "/user", () => {
        return HttpResponse.json(user)
      }),
    );

    const respProducts = await API.getAllProducts();
    const respUser = await API.getUser();
    expect(respProducts).toEqual(products);
    expect(respUser).toEqual(user);

    let pactResults: PactFile[] = [];
    await pactMswAdapter.writeToFile((path, data) => {
      pactResults.push(data as PactFile);
    }); // writes the pacts to a file
    expect(pactResults.length).toEqual(2);
    expect(pactResults[0].provider.name).toEqual("products");
    expect(pactResults[1].provider.name).toEqual("user");
  });
})