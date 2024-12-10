import API from "../examples/react/src/api";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { PactFile, setupPactMswAdapter } from "./pactMswAdapter";
const pjson = require("../package.json");

const server = setupServer();
const pactMswAdapter = setupPactMswAdapter({
  server,
  options: {
    consumer: "testConsumer",
    providers: {
      ["testProvider"]: ["products"],
      ["testProvider2"]: ["/product/10"],
    },
    debug: true,
    includeUrl: ["products", "/product"],
    excludeUrl: ["/product/11"],
    excludeHeaders: ["x-powered-by", "cookie", "accept-encoding", "host"],
  },
});

describe("API - With MSW mock generating a pact", () => {
  beforeAll(async () => {
    server.listen();
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

  test("get all products", async () => {
    const products = [
      {
        id: "09",
        type: "CREDIT_CARD",
        name: "Gem Visa",
      },
    ];
    server.use(
      http.get(API.url + "/products", () => {
        return HttpResponse.json(products)
      })
    );

    const respProducts = await API.getAllProducts();
    expect(respProducts).toEqual(products);
  });

  test("post product ID 10", async () => {
    const productData = {
      type: "CREDIT_CARD",
      name: "28 Degrees",
    };
    server.use(
      http.post(API.url + "/product/10", () => {
        return HttpResponse.json(productData)
      })
    );

    const respProduct = await API.postProduct("10", productData);
    expect(respProduct).toEqual(productData);
  });

  test("get product ID 10", async () => {
    const product = {
      id: "10",
      type: "CREDIT_CARD",
      name: "28 Degrees",
    };
    server.use(
      http.get(API.url + "/product/10", () => {
        return HttpResponse.json(product)
      })
    );

    const respProduct = await API.getProduct("10");
    expect(respProduct).toEqual(product);
  });

  test("get product ID 10 with visibility hidden", async () => {
    const product = {
      id: "10",
      type: "CREDIT_CARD",
      name: "28 Degrees",
    };
    const hiddenVisibilityProduct = {
      ...product,
      visibility: "hidden",
    };
    server.use(
      http.get(API.url + "/product/10", ({ request }) => {
        const visibility = new URL(request.url).searchParams.get("visibility");
        const response =
          visibility === "hidden" ? hiddenVisibilityProduct : product;

        return HttpResponse.json(response)
      })
    );

    const respProduct = await API.getProduct("10", { visibility: "hidden" });
    expect(respProduct).toEqual(hiddenVisibilityProduct);
  });

  test("handle requests mocked with error", async () => {
    server.use(
      http.get(API.url + "/product/10", () => HttpResponse.error())
    );
    
    // This request is going to be marked as expired after the test is finished and should be handled gracefully by the subsequent writeToFile()
    await expect(()=> API.getProduct("10")).rejects.toEqual(new Error('TypeError: Network error'))
  })

  test("unhandled route", async () => {
    await expect(API.getProduct("11")).rejects.toThrow(
      /^Error: connect ECONNREFUSED (127.0.0.1|::1):8081.*$/
    );
  });

  test("creates pact files", async () => {
    let pactResults: PactFile[] = [];
    await pactMswAdapter.writeToFile((path, data) => {
      pactResults.push(data as PactFile);
    }); // writes the pacts to a file
    expect(pactResults.length).toEqual(2);
    expect(pactResults[0].consumer.name).toEqual("testConsumer");
    expect(pactResults[0].provider.name).toEqual("testProvider");
    expect(pactResults[1].consumer.name).toEqual("testConsumer");
    expect(pactResults[1].provider.name).toEqual("testProvider2");
    expect(pactResults[0].interactions[0].request.method).toEqual("GET");
    expect(pactResults[0].interactions[0].request.path).toEqual("/products");
    expect(pactResults[0].interactions[0].request.headers).toEqual({
      accept: "application/json, text/plain, */*",
      authorization: expect.any(String),
      // connection: expect.any(String),
      "user-agent": expect.any(String),
    });
    expect(pactResults[0].interactions[0].response.status).toEqual(200);

    expect(pactResults[0].interactions[0].response.headers).toEqual({
      // "content-length": expect.any(String),
      "content-type": "application/json",
    });
    expect(pactResults[0].interactions[0].response.body).toEqual([
      {
        id: "09",
        type: "CREDIT_CARD",
        name: "Gem Visa",
      },
    ]);
    expect(pactResults[1].interactions[0].request.body).toEqual({
      type: "CREDIT_CARD",
      name: "28 Degrees",
    });
    expect(pactResults[1].interactions[1].request.body).toBeUndefined();
    expect(pactResults[0].metadata).toEqual({
      pactSpecification: {
        version: "2.0.0",
      },
      client: {
        name: "pact-msw-adapter",
        version: pjson.version,
      },
    });
  });
});
