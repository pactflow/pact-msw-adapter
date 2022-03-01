# msw-pact

Create MSW (mock-service-worker) mocks, and generate pact contracts from the recorded interactions.

Note:- This is an alpha version and interface changes are to be expected. If you wish to contribute please get in touch!

Check out this issue for the initial proposal on msw-pacts repo https://github.com/mswjs/msw/issues/572

### How to use

In your tests, import msw and msw pact.

```js
import { setupServer } from "msw/node";
import { setupWorker } from "msw";
import { setupMswPact } from "./mswPact";
```

Instantiate your msw server and setup msw-pact

```js
const server = setupServer();
const worker = setupWorker();
const mswPact = setupMswPact({
  options: { consumerName: "myTestConsumer" },
  server,
  worker
});
```

The following parameters are accepted

| Parameter | Required? | Type           | Description                                                  |
| --------- | --------- | -------------- | ------------------------------------------------------------ |
| `server`  | false     | SetupServerApi | server provided by msw - a server or worker must be provided |
| `worker`  | false     | SetupWorkerApi | worker provided by msw - a server or worker must be provided |
| `options` | false     | MswPactOptions | Override msw-pact options - see below for available params   |

In your test framework, setup mock-service-work and msw-pact similar to your pre/post test setup. `Jest` shown.

```js
beforeAll(async () => {
  server.listen();
});
afterEach(async () => {
  mswPact.verifyTest();
  server.resetHandlers();
});
afterAll(async () => {
  mswPact.writeToFile(); // writes the pacts to a file
  mswPact.clear();
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

This test will generate the following two pacts
