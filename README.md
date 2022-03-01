# msw-pact

Create MSW (mock-service-worker) mocks, and generate pact contracts from the recorded interactions.

Note:- This is an alpha version and interface changes are to be expected. If you wish to contribute please get in touch!

Check out this issue for the initial proposal on msw-pacts repo https://github.com/mswjs/msw/issues/572

### How to use

In your tests, import msw and msw pact.

For node based environments

```js
import { setupServer } from "msw/node";
import { setupMswPact } from "./mswPact";
```

For browser based enviromnents

```js
import { setupWorker } from "msw";;
import { setupMswPact } from "./mswPact";
```


Instantiate your msw server/worker and setup msw-pact

Node based

```js
const server = setupServer();
const mswPact = setupMswPact({
  options: consumer: "testConsumer", providers: { ['testProvider']: ['products'] },
  server
});
```

Browser based

```js
const worker = setupWorker();
const mswPact = setupMswPact({
  options: consumer: "testConsumer", providers: { ['testProvider']: ['products'] },
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
beforeEach(async () => {
  mswPact.newTest();
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
| `consumer` | true     | string  | `consumer`              | The consumer name                                        |
| `provider` | true     | { [name: string]: string[] }  |              | An array of provider names, and valid paths to create pacts from matches                                        |
| `includeUrl` | false     | string[]  |             | URL path patterns to include in pact file serialisation, from msw matches                                      |
| `excludeUrl` | false     | string[]  |              | URL path patterns to exclude in pact file serialisation, from msw matches                                    |

See below for sample configuration

```
const mswPact = setupMswPact({
  server,
  options: {
    consumer: "testConsumer", providers: { ['testProvider']: ['products'] },
    debug: true,
    includeUrl: ['products','/product'],
    excludeUrl: ['/product/11'],
  },
});

```

### An example

See [./src/pactFromMsw.msw.spec.ts](./src/pactFromMsw.msw.spec.ts) for an example testing an API client, used in a react application

This test will generate the following two pacts, which can be found in the `./msw_generated_pacts` folder
