import API from "../examples/react/src/api";
import { setupPactMsw } from "./mswPact";
import pactData from "./pact/frontendwebsite-productservice.json";

const pactMsw = setupPactMsw();
pactMsw.setupMswPactHandlers(pactData);
const pactMswServer = pactMsw.pactMswServer;

describe("API - With MSW mock generated from pact", () => {
  beforeAll(() => pactMswServer.listen());
  afterEach(() => pactMswServer.resetHandlers());
  afterAll(() => pactMswServer.close());
  test("get all products", async () => {
    const products = [
      {
        id: "09",
        type: "CREDIT_CARD",
        name: "Gem Visa",
      },
    ];
    const respProducts = await API.getAllProducts();
    expect(respProducts).toEqual(products);
  });

  test("get product ID 10", async () => {
    const product = {
      id: "10",
      type: "CREDIT_CARD",
      name: "28 Degrees",
    };
    const respProduct = await API.getProduct("10");
    expect(respProduct).toEqual(product);
  });
});
