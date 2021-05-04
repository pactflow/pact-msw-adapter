# msw-pact

Create MSW (mock-service-worker) mocks, and generate pact contracts from the recorded interactions.

Note:- This is an alpha version and interface changes are to be expected. If you wish to contribute please get in touch!

### How to use

In your tests, import msw and msw pact.

```js
import { setupServer } from "msw/node";
import { setupMswPact } from "./mswPact";
```

Instantiate your server and declare a variable to use later

```js
const server = setupServer();
let pacts;
```

In your test frameworks beforeEach or beforeAll method

```js
pacts = setupMswPact({
  server,
  options: { writePact: true },
});
```

The following options are available

| Parameter | Required? | Type           | Description                                                |
| --------- | --------- | -------------- | ---------------------------------------------------------- |
| `server`  | true      | SetupServerApi | server provided by msw                                     |
| `options` | false     | MswPactOptions | Override msw-pact options - see below for available params |

After your test is finished, you can inspect the `pacts` object we created earlier

```js
console.log(await pacts);
```

### options

| Parameter      | Required? | Type    | Default    | Description                          |
| -------------- | --------- | ------- | ---------- | ------------------------------------ |
| `writePact`    | false     | boolean | false      | write pact to `./msw_generated_pact` |
| `debug`        | false     | boolean | false      | Print verbose logging                |
| `consumerName` | false     | string  | `consumer` | The consumer name                    |
| `providerName` | false     | string  | `provider` | The provider name                    |

### An example

Taken from [./src/pactFromMsw.msw.spec.ts](./src/pactFromMsw.msw.spec.ts)

Testing an API client, used in a react application

```js
import API from "../examples/react/src/api";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { setupMswPact } from "./mswPact";

const server = setupServer();

describe("API - With MSW mock generating a pact", () => {
  let pacts: any;
  beforeAll(async () => {
    server.listen();
  });
  beforeEach(async () => {
    pacts = setupMswPact({
      server,
      options: { writePact: true },
    });
  });
  afterEach(async () => {
    server.resetHandlers();
    try {
      console.log(await pacts);
    } catch {
      //
    }
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
