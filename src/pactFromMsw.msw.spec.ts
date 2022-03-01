import API from "../examples/react/src/api";
import { rest, setupWorker } from "msw";
import { setupMswPact } from "./mswPact";

const worker = setupWorker();
const mswPact = setupMswPact({
  worker,
  options: { consumer: "testConsumer",providers:{ name: ['foo' ]} },
});

describe("API - With MSW mock generating a pact", () => {
  beforeAll(async () => {
    worker.start();
  });

  afterEach(async () => {
    worker.resetHandlers();
    const pactsGeneratedAfterTest = mswPact.verifyTest();
    console.log(pactsGeneratedAfterTest);
  });
  afterAll(async () => {
    mswPact.writeToFile(); // writes the pacts to a file
    mswPact.clear();
    worker.stop();
  });

  test("get all products", async () => {
    const products = [
      {
        id: "09",
        type: "CREDIT_CARD",
        name: "Gem Visa",
      },
    ];
    worker.use(
      rest.get(API.url + "/products", (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(products));
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
    worker.use(
      rest.get(API.url + "/product/10", (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(product));
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
