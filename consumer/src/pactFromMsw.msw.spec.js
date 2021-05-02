import API from "./api";
import { rest } from "msw";
import { setupServer } from "msw/node";

const server = setupServer();

describe("API - With MSW mock generating a pact", () => {
  beforeAll(() => {
    server.listen();
    var requestMatch = new Promise((resolve) => {
      server.on("request:match", resolve);
    });
    var responseMocked = new Promise((resolve) => {
      server.on("response:mocked", resolve);
    });

    Promise.all([requestMatch, responseMocked]).then((data) => {
      console.log("Request matched and response mocked");
      const request = data[0]; // MockedRequest<DefaultRequestBody>
      const response = data[1]; // IsomorphicResponse;
      console.log(j2s(request));
      console.log(j2s(response));
    });
    server.on("request:unhandled", (unhandled) => {
      const { url } = unhandled;
      console.log("This request was unhandled by msw: " + url);
    });
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  test("get all products", async () => {
    const products = [
      {
        id: "09",
        type: "CREDIT_CARD",
        name: "Gem Visa",
      },
    ];
    server.use(
      rest.get(API.url + "/products", (req, res, ctx) => {
        return res(ctx.status(200), ctx.body(JSON.stringify(products)));
      })
    );

    const respProducts = await API.getAllProducts();
    expect(respProducts).toEqual(products);
  });

  test("get product ID 10", async () => {
    const product = {
      id: "10",
      type: "CREDIT_CARD",
      name: "28 Degrees",
    };
    server.use(
      rest.get(API.url + "/product/10", (req, res, ctx) => {
        return res(ctx.status(200), ctx.body(JSON.stringify(product)));
      })
    );

    const respProduct = await API.getProduct("10");
    expect(respProduct).toEqual(product);
  });

  test("unhandled route", async () => {
    await expect(API.getProduct("10")).rejects.toThrow(
      "connect ECONNREFUSED 127.0.0.1:8081"
    );
  });
});

const j2s = (json) => JSON.stringify(json);

const sampleResponse = {
  id: "1fad2374-02e2-4b43-89d4-1c1e72183931",
  url: "http://localhost:8081/products",
  method: "GET",
  body: "",
  headers: {
    _headers: {
      accept: "application/json, text/plain, */*",
      authorization: "Bearer 2021-05-02T18:18:00.959Z",
      "user-agent": "axios/0.19.1",
      "x-msw-request-id": "1fad2374-02e2-4b43-89d4-1c1e72183931",
      cookie: "",
    },
    _names: {},
  },
  cookies: {},
  redirect: "manual",
  referrer: "",
  keepalive: false,
  cache: "default",
  mode: "cors",
  referrerPolicy: "no-referrer",
  integrity: "",
  destination: "document",
  bodyUsed: false,
  credentials: "same-origin",
};

const sampleRequest = {
  status: 200,
  statusText: "OK",
  headers: { _headers: { "x-powered-by": "msw" }, _names: {} },
  body: '[{"id":"09","type":"CREDIT_CARD","name":"Gem Visa"}]',
};
