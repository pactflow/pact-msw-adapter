# msw-pact

Create MSW (mock-service-worker) mocks, and generate pact contracts from the recorded interactions.

Note:- This is an alpha version and interface changes are to be expected. If you wish to contribute please get in touch!

### How to use

In your tests, import msw and msw pact.

```js
import { setupServer } from "msw/node";
import { setupMswPact } from "./mswPact";
```

Instantiate your msw server and setup msw-pact

```js
const server = setupServer();
const mswPactProvider = setupMswPact({
  server,
  options: { writePact: true },
});
```

The following parameters are accepted

| Parameter | Required? | Type           | Description                                                |
| --------- | --------- | -------------- | ---------------------------------------------------------- |
| `server`  | true      | SetupServerApi | server provided by msw                                     |
| `options` | false     | MswPactOptions | Override msw-pact options - see below for available params |

In your test framework, setup mock-service-work and msw-pact similar to your pre/post test setup. `Jest` shown.

```js
beforeAll(async () => {
  server.listen();
});
beforeEach(async () => {
  mswPactProvider.listen();
});
afterEach(async () => {
  server.resetHandlers();
  console.log(await mswPactProvider.returnPact());
});
afterAll(async () => {
  server.close();
});
```

### options

| Parameter      | Required? | Type    | Default    | Description                                              |
| -------------- | --------- | ------- | ---------- | -------------------------------------------------------- |
| `timeout`      | false     | number  | 200        | amount of time in ms, returnPact() will wait for a match |
| `writePact`    | false     | boolean | false      | write pact to `./msw_generated_pact`                     |
| `debug`        | false     | boolean | false      | Print verbose logging                                    |
| `consumerName` | false     | string  | `consumer` | The consumer name                                        |
| `providerName` | false     | string  | `provider` | The provider name                                        |

### An example

Taken from [./src/pactFromMsw.msw.spec.ts](./src/pactFromMsw.msw.spec.ts)

Testing an API client, used in a react application

```js
import API from "../examples/react/src/api";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { setupMswPact } from "./mswPact";

const server = setupServer();
const mswPactProvider = setupMswPact({
  server,
  options: { writePact: true },
});

describe("API - With MSW mock generating a pact", () => {
  beforeAll(async () => {
    server.listen();
  });
  beforeEach(async () => {
    mswPactProvider.listen();
  });
  afterEach(async () => {
    server.resetHandlers();
    console.log(await mswPactProvider.returnPact());
  });
  afterAll(async () => {
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
    server.use(
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
```
