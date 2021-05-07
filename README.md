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
const mswPact = setupMswPact({
  server,
  options: { consumerName: "myTestConsumer" },
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
  mswPact.listen();
});
afterEach(async () => {
  server.resetHandlers();
  const pactsGeneratedAfterTest = await mswPact.returnPacts();
  console.log(pactsGeneratedAfterTest);
});
afterAll(async () => {
  const allPactsGeneratedAfterTestSuite = await mswPact.returnAllPacts();
  console.log(allPactsGeneratedAfterTestSuite.length); // returns 2
  console.log(JSON.stringify(allPactsGeneratedAfterTestSuite)); // returns any array of generated pacts
  mswPact.clear();
  console.log(allPactsGeneratedAfterTestSuite); // returns []
  server.close();
});
```

### options

| Parameter      | Required? | Type    | Default                 | Description                                              |
| -------------- | --------- | ------- | ----------------------- | -------------------------------------------------------- |
| `timeout`      | false     | number  | 200                     | amount of time in ms, returnPact() will wait for a match |
| `pactOutDir`   | false     | string  | `./msw_generated_pacts` | write pacts to the specified location                    |
| `debug`        | false     | boolean | false                   | Print verbose logging                                    |
| `consumerName` | false     | string  | `consumer`              | The consumer name                                        |
| `providerName` | false     | string  | `provider`              | The provider name                                        |

### An example

Taken from [./src/pactFromMsw.msw.spec.ts](./src/pactFromMsw.msw.spec.ts)

Testing an API client, used in a react application

```js
import API from "../examples/react/src/api";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { setupMswPact } from "./mswPact";

const server = setupServer();
const mswPact = setupMswPact({ server });

describe("API - With MSW mock generating a pact", () => {
  beforeAll(async () => {
    server.listen();
  });
  beforeEach(async () => {
    mswPact.listen();
  });
  afterEach(async () => {
    server.resetHandlers();
    const pactsGeneratedAfterTest = await mswPact.returnPacts();
    console.log(pactsGeneratedAfterTest);
  });
  afterAll(async () => {
    mswPact.writePacts(); // writes the pacts to a file
    const allPactsGeneratedAfterTestSuite = await mswPact.returnAllPacts();
    console.log(allPactsGeneratedAfterTestSuite.length); // returns 2
    console.log(JSON.stringify(allPactsGeneratedAfterTestSuite)); // returns any array of generated pacts
    mswPact.clear();
    console.log(allPactsGeneratedAfterTestSuite); // returns []
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

This test will generate the following two pacts

```json
{
  "consumer": { "name": "consumer" },
  "provider": { "name": "provider" },
  "interactions": [
    {
      "description": "412bfbc9-0804-4955-83b3-2ff9c3134a11",
      "providerState": "",
      "request": {
        "method": "GET",
        "path": "/product/10",
        "headers": {
          "accept": "application/json, text/plain, */*",
          "authorization": "Bearer 2021-05-04T17:49:26.713Z",
          "user-agent": "axios/0.19.2",
          "x-msw-request-id": "412bfbc9-0804-4955-83b3-2ff9c3134a11",
          "cookie": ""
        }
      },
      "response": {
        "status": 200,
        "headers": {
          "x-powered-by": "msw",
          "content-type": "application/json"
        },
        "body": { "id": "10", "type": "CREDIT_CARD", "name": "28 Degrees" }
      }
    }
  ],
  "metadata": { "pactSpecification": { "version": "2.0.0" } }
}
```

```json
{
  "consumer": { "name": "consumer" },
  "provider": { "name": "provider" },
  "interactions": [
    {
      "description": "ffdfc4c4-0082-4e5c-8490-3c3a62f7d13b",
      "providerState": "",
      "request": {
        "method": "GET",
        "path": "/products",
        "headers": {
          "accept": "application/json, text/plain, */*",
          "authorization": "Bearer 2021-05-04T17:49:26.690Z",
          "user-agent": "axios/0.19.2",
          "x-msw-request-id": "ffdfc4c4-0082-4e5c-8490-3c3a62f7d13b",
          "cookie": ""
        }
      },
      "response": {
        "status": 200,
        "headers": {
          "x-powered-by": "msw",
          "content-type": "application/json"
        },
        "body": [{ "id": "09", "type": "CREDIT_CARD", "name": "Gem Visa" }]
      }
    }
  ],
  "metadata": { "pactSpecification": { "version": "2.0.0" } }
}
```
