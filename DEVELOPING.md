# DEVELOPING

## E2E

In order to run this locally

1. `npm install` - installs the root project
2. `npm run build` - This will build the project
3. `npm run watch` - This will build the project and watch the folder output for Hot-Reloading
4. `npm run dist:ci` - This will build the project and run unit tests
5. `npm link` - links the root project so the locally developed package can be referenced in other builds
6. `npm run example:link` - links the example project with our local build output
7. `npm run example:install` - installs the examples dependencies
8. `npm run example:test:unit` - Uses Vitest, and MSW Server to provide a mock provider, and executes unit tests, recording interactions in a Pact File
9. `npm run example:test:cy:run` - Uses Vitest, and MSW Server to provide a mock provider, and executes unit tests, recording interactions in a Pact File
10. `npm run example:test:cy:run` - Uses Cypress, and MSW Worker to provide a mock provider, and executes unit tests, recording interactions in a Pact File
11. `npm run example:test:cy:open` - Allows you to run the above step, but with Cypress in Watch mode

Run this to check everything is working e2e locally, these steps are run on every GitHub actions builds `./github/workflows/build-and-test.yml`

```sh
npm install
npm run dist:ci
npm link
npm run example:link
npm run example:install
npm run example:test:unit
npm run example:test:cy:run
```

## Watch Mode

There are two types of mocking provided, MSW Worker & MSW Server

- MSW Worker (Browser Based) - With Cypress
- MSW Server (Node Based) - With Jest

### MSW Worker (Browser Based) - With Cypress

You need two terminal windows

Terminal 1

```sh
npm run watch
```

Terminal 2

Cypress Interactive Mode - Watch

```sh
npm run example:test:cy:open
```

or

Cypress Run Mode - Once

```sh
npm run example:test:cy:run
```

### MSW Server (Node Based) - With Vitest

```sh
npm run example:test:unit
```
