# pact-msw-adapter

> Generate pact contracts from the recorded mock service worker interactions.

<!-- markdownlint-disable no-inline-html -->
<div align="center"><table>
    <tr>
        <td>Package</td>
        <td>
            <a href="https://npmjs.com/package/@pactflow/pact-msw-adapter"><img src="https://img.shields.io/npm/v/@pactflow/pact-msw-adapter.svg" alt="Version"></a>
            <a href="https://npmjs.com/package/@pactflow/pact-msw-adapter"><img src="https://img.shields.io/node/v/@pactflow/pact-msw-adapter.svg" alt="Node Versions"></a>
            <a href="https://npmjs.com/package/@pactflow/pact-msw-adapter"><img src="https://img.shields.io/npm/dm/@pactflow/pact-msw-adapter.svg" alt="Downloads"></a>
        </td>
    </tr>
    <tr>
        <td>CI/CD</td>
        <td>
            <a href="https://github.com/pactflow/pact-msw-adapter/actions/workflows/test.yml?query=branch:main"><img src="https://img.shields.io/github/actions/workflow/status/pactflow/pact-msw-adapter/test.yml?branch=main&label=test" alt="Test Status"></a>
            <a href="https://github.com/pactflow/pact-msw-adapter/actions/workflows/release.yml?query=branch:main"><img src="https://img.shields.io/github/actions/workflow/status/pactflow/pact-msw-adapter/release.yml?branch=main&label=release" alt="Release Status"></a>
        </td>
    </tr>
    <tr>
        <td>Meta</td>
        <td>
            <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/build-Vite-646CFF.svg" alt="build - Vite"></a>
            <a href="https://vitest.dev"><img src="https://img.shields.io/badge/tested%20with-Vitest-6E9F18.svg" alt="tested with - Vitest"></a>
            <a href="https://biomejs.dev"><img src="https://img.shields.io/badge/linting-Biome-60A5FA.svg" alt="linting - Biome"></a>
            <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/types-TypeScript-3178C6.svg" alt="types - TypeScript"></a>
            <a href="https://npmjs.com/package/@pactflow/pact-msw-adapter"><img src="https://img.shields.io/npm/l/@pactflow/pact-msw-adapter.svg" alt="License"></a>
        </td>
    </tr>
    <tr>
        <td>Community</td>
        <td>
            <a href="https://github.com/pactflow/pact-msw-adapter/issues"><img src="https://img.shields.io/github/issues/pactflow/pact-msw-adapter.svg" alt="Issues"></a>
            <a href="https://github.com/pactflow/pact-msw-adapter"><img src="https://img.shields.io/github/stars/pactflow/pact-msw-adapter.svg?style=flat" alt="GitHub Stars"></a>
            <a href="http://slack.pact.io"><img src="https://img.shields.io/badge/slack-pact--foundation-4A154B.svg" alt="Slack"></a>
            <a href="https://stackoverflow.com/questions/tagged/pact"><img src="https://img.shields.io/badge/stackoverflow-pact-F48024.svg" alt="Stack Overflow"></a>
        </td>
    </tr>
</table></div>
<!-- markdownlint-enable no-inline-html -->

Check out the [quick start guide](https://docs.pactflow.io/docs/bi-directional-contract-testing/tools/msw).

## Compatibility table

| pact msw version | msw version | node version | migration guide                                       |
|------------------|-------------|--------------|-------------------------------------------------------|
| `^2`             | `<=1`       | `>=16 <=20`  |                                                       |
| `^3`             | `^2`        | `>=18`       | [v2 to v3](#migrating-pact-msw-adapter-from-v2-to-v3) |
| `^4`             | `^2`        | `>=22`       | [v3 to v4](#migrating-pact-msw-adapter-from-v3-to-v4) |

##  Getting started

```
npm install @pactflow/pact-msw-adapter --save-dev
```

MSW provides a `setupServer` for node environments and `setupWorker` for browser based environment

```js
import { setupServer } from "msw/node";
import { setupPactMswAdapter } from "@pactflow/pact-msw-adapter";
```

For browser based enviromnents

```js
import { setupWorker } from "msw/browser";
import { setupPactMswAdapter } from "@pactflow/pact-msw-adapter";
```

See [./src/pactFromMswServer.msw.spec.ts](./src/pactFromMswServer.msw.spec.ts) msw mock server example (vitest/msw/react)

See [./examples/react/cypress/e2e/pactFromMswWorker.cy.ts](./examples/react/cypress/e2e/pactFromMswWorker.cy.ts) msw mock worker example (cypress/msw/react)

These tests will generate pacts, which can be found in the `./msw_generated_pacts` folder

## How to use

Let's start by listing it's methods:
- `setupPactMswAdapter`: Generates an pact-msw-adapter instance. It also allows for several options on the adapter.
- `newTest`: Tells the adapter a new test is about to start. This is used for validating msw calls.
- `verifyTest`: Waits for all pending network calls to finish or timeout, and asserts that all these calls started and finished on the same test without unexpected errors, and that there were no calls to included urls which aren't handled by msw.
- `clear`: Resets all pact-msw-adapter's internal states, same effect as generating a new pact-msw-adapter instance.
- `writeToFile`: Dumps all the recorded msw calls to pact files, generating one pact file for each consumer-provider call. For browser environments, it requires a custom file writter as argument.


## Options

| Parameter | Required? | Type | Default | Description |
| - | - | - | - | - |
| server  | `false` | `SetupServer` |  | server provided by msw - a server or worker must be provided|
| worker  | `false` | `SetupWorker` |  | worker provided by msw - a server or worker must be provided|
| timeout | `false` | `number` | `200` | Time in ms for a network request to expire, `verifyTest` will fail after twice this amount of time. |
| consumer | `true` | `string` | | name of the consumer running the tests |
| providers | `true` | `{ [string]: string[] } \| ({ request: Request; requestId: string }) => string \| null` | | names and filters for each provider or function that returns name of provider for given request |
| pactOutDir | `false` | `string` | `./msw_generated_pacts/` | path to write pact files into |
| includeUrl | `false` | `string[]` | | inclusive filters for network calls |
| excludeUrl | `false` | `string[]` | | exclusive filters for network calls |
| excludeHeaders | `false` | `string[]` | | exclude generated headers from being written to request/response objects in pact file |
| debug | `false` | `boolean` | `false` | prints verbose information about pact-msw-adapter events |
| logger | `false` | `console` | `console` | logger used to print messages to console |

## Route filtering

By default pact-msw-adapter will try to record an interaction for every single network call, including external dependencies, fonts or static resources. This is why we’re implementing a route filtering mechanism to include only relevant paths in our pact files.

This mechanism has three layers, in order of priority:
- `excludeUrl`: All paths containing any of the strings present in this array will be ignored.
- `includeUrl`: All paths not containing any of the strings in this array will be ignored.
- `providers`: Paths not containing any of the strings listed in the map’s values will be ignored.

The first two layers can be skipped by setting it’s value to `undefined`. The third layer is mandatory.

`providers` can be also a function that returns name of provider for given request. If no provider is matched it should return `null`. This allows dynamically matching providers based on url patterns.

## Header filtering

By default pact-msw-adapter captures and serialises all request and response headers captured, in the generated pact file.

You may wish to exclude these on a global basis.

This mechanism currently has a layer
- `excludeHeaders`: All headers containing any of the strings present in this array will be ignored.

## Custom file writers

The adapter uses by default node’s filesystem to write pact files to disk. This makes it incompatible with browser environments where `fs` is not available. To overcome this, `pact-msw-adapter` allows for defining custom functions for writting files to disk.

```js
writeToFile(writer?: (path: string, data: object) => void): Promise<void>
```

Writers are required to by synchronous.

The `path` argument contains a relative path to save the file into, already prepending `pactOutDir`, and including the file’s name and extension.

The `data` field consists of a javascript object containing a pact file (check the [anatomy of a pact file](#anatomy-of-a-pact-file)).

## Log output

You can create your own instance of a `Logger`, the default is a [`console`](https://developer.mozilla.org/en-US/docs/Web/API/console)

If one wishes to suppress the output from pact-msw-adapter, you could use the following `emptyConsole` function.

```js
  const emptyConsole = () => {
    const emptyFunction = () => {};
    const emptyConsole = {
      log: emptyFunction,
      debug: emptyFunction,
      info: emptyFunction,
      warn: emptyFunction,
      error: emptyFunction,
      group: emptyFunction,
      groupCollapsed: emptyFunction,
      groupEnd: emptyFunction,
    };
    return emptyConsole;
  }
```

Pass the custom console to the `options.logger` key in `setupPactMswAdapter`

```js
import { PactFile, setupPactMswAdapter } from "./pactMswAdapter";

const server = setupServer();
const pactMswAdapter = setupPactMswAdapter({
    server,
    options: {
      ...options,
      logger: emptyConsole()
  },
});
```

_Note:_ - This will not control or affect msw's native logging.

## Pact files generation

`pact-msw-adapter` will dump all the recorded requests into pact files when `writeToFile` is called.

A recorded request is a request which has started and been successfully mocked by msw since pact-msw-adapter has been instantiated or cleared. This can include duplicated requests and does not distinguishes between different test runs.

Each time `writeToFile` is run, it will generate one pact file for every consumer-provider pair. In practice, consumers are fixed, making it to generate one pact file per provider.

In order to do this, `pact-msw-adapter` uses the providers map to asociate a request with a provider. The providers map is iterated in order and each request is associated with exactly one provider.

Once this association is done, `pact-msw-adapter` will translate each request to a pact interaction and group these interactions on pact files by provider.


<details>
  <summary>pact-msw-adapter implementation</summary>
    <br>

```js
import { setupPactMswAdapter } from '@pactflow/pact-msw-adapter';

let pactMswAdapter: any = undefined;

beforeEach(async () => {
    if (!pactMswAdapter) {
        cy.window().then(window => {
            pactMswAdapter = setupPactMswAdapter({
                worker: window.msw.worker,
                options: {
                    consumer: 'web-ea',
                    timeout: 1000,
                    providers: {
                        'edge-api-admin': [ 'edge-api-admin' ]
                    },
                    pactOutDir: './pacts',
                    excludeUrl: ['static/'],
                    // debug: true
                },
              });
            pactMswAdapter.newTest();
        });
    } else {
        pactMswAdapter.newTest();
    }
});
afterEach(async () => {
    if (!pactMswAdapter) return;
    
    try {
        await pactMswAdapter.verifyTest();
    } catch (err) {
        // cypress doesn't like errors on hooks...
        if (process.env.NODE_ENV !== 'production') {
            console.groupCollapsed('%cError generating pacts.', 'color:coral;font-weight:bold;');
            console.log(err);
            console.groupEnd();
        } else {
            // fail on pipelines
            throw err;
        }
    }
});
after(async () => {
    if (!pactMswAdapter) return;

    await pactMswAdapter.writeToFile((path: string, data: object) => cy.writeFile(path, data));
    pactMswAdapter.clear();
});
```
</details>

## Anatomy of a Pact File
Without further do, it looks like the following:

```js
{
  "consumer": { "name": "" },
  "provider": { "name": "" },
  "interactions": [
    {
      "description": "",
      "providerState": "",
      "request": {
        "method": "GET",
        "path": "", // Ids replaced
        "query": "", // url-encoded query
        "matchingRules": { ... }
      },
      "response": {
        "status": 200,
        "headers": { },
        "body": { ... },
        "matchingRules": { ... }
      }
    }
  ],
  "metadata": {
    "pactSpecification": {
      "version": "2.0.0"
    }
  }
}
```

Here, `matchingRules` represent the assertions of the expectation, while `body`, `query` and `path` contains it's example values.

## Migrating pact-msw-adapter from v2 to v3

In [October 2023 msw released new version 2](https://mswjs.io/blog/introducing-msw-2.0) that bring significant changes to the msw interface. To reflect these changes we've released pact-msw-adapter@v3 that's compatible with msw@v2.

To migrate you'll need to update `msw to >=2.0` and migrate your usage of the library ([migration guide here](https://mswjs.io/docs/migrations/1.x-to-2.x)).

Breaking changes on pact-msw-adapter side:
- minimal required version of Node is v18
- some exported types were renamed and extended to match msw behaviour
  - `MswMatch` is now `MatchedRequest` and is `{ request: Request; requestId: string; response: Response }`
  - `ExpiredRequest` still called the same and is `{ request: Request; requestId: string; startTime: number; duration?: number }`
  - added `PendingRequest` as `{ request: Request; requestId: string; }`
- `PactMswAdapterOptions.providers` function variant is now consistent with msw and has signature `(event: PendingRequest) => string | null`
- `PactMswAdapter.emitter` events are slightly updated to match msw behaviour
  - `pact-msw-adapter:expired` handler must have signature `(event: ExpiredRequest) => void`
  - `pact-msw-adapter:match` handler must have signature `(event: MatchedRequest) => void`
- `convertMswMatchToPact` is now async function

## Migrating pact-msw-adapter from v3 to v4

pact-msw-adapter@v4 modernises the package and its tooling. The public API is unchanged, so no code changes are required beyond meeting the new runtime requirement.

Breaking changes on pact-msw-adapter side:
- minimal required version of Node is now v22 (Node `<22` is no longer supported)
- the package is now published as pure ESM (`"type": "module"`); it can no longer be consumed via CommonJS `require()`. Use `import` / an ESM-aware bundler instead.

msw compatibility is unchanged (`>=2.0.0`).

## Contributors

Background: 
 - Check out this issue for the initial proposal on msw's repo https://github.com/mswjs/msw/issues/572

Made possible by these awesome people! You are welcome to contribute too!

![Repo Contributors](https://contrib.rocks/image?repo=pactflow/pact-msw-adapter)

Special thanks to [Juan Cruz](https://github.com/IJuanI) for being an early adopter and improving the experience!


## Who is using pact-msw-adapter?

### SUI

![image](https://user-images.githubusercontent.com/19932401/206742449-e9fe57ac-7f17-40af-84ab-3035443d6b85.png)
- [SUI](https://github.com/SUI-Components)
  - Source [https://github.com/SUI-Components/sui/tree/master/packages/sui-test-contract](https://github.com/SUI-Components/sui/tree/master/packages/sui-test-contract)
  - NPM [@s-ui/test-contract](https://www.npmjs.com/package/@s-ui/test-contract)
