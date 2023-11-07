# DEVELOPING

## E2E

In order to run this locally

1. `yarn install` - installs the root project
2. `yarn build` - This will build the project
3. `yarn watch` - This will build the project and watch the folder output for Hot-Reloading
4. `yarn run dist:ci` - This will build the project and run unit tests
5. `yarn link` - links the root project so the locally developed package can be referenced in other builds
6. `yarn run example:link` - links the example project with our local build output
7. `yarn run example:install` - installs the examples dependencies
8. `yarn run example:test:unit` - Uses Jest, and MSW Server to provide a mock provider, and executes unit tests, recording interactions in a Pact File
9. `yarn run example:test:cy:run` - Uses Jest, and MSW Server to provide a mock provider, and executes unit tests, recording interactions in a Pact File
10. `yarn run example:test:cy:run` - Uses Cypress, and MSW Worker to provide a mock provider, and executes unit tests, recording interactions in a Pact File
11. `yarn run example:test:cy:open` - Allows you to run the above step, but with Cypress in Watch mode

Run this to check everything is working e2e locally, these steps are run on every GitHub actions builds `./github/workflows/build-and-test.yml`

```sh
yarn install
yarn run dist:ci
yarn link
yarn run example:link
yarn run example:install
yarn run example:test:unit
yarn run example:test:cy:run
```

## Watch Mode

There are two types of mocking provided, MSW Worker & MSW Server

- MSW Worker (Browser Based) - With Cypress
- MSW Server (Node Based) - With Jest

### MSW Worker (Browser Based) - With Cypress

You need two terminal windows

Terminal 1

```sh
yarn watch
```

Terminal 2

Cypress Interactive Mode - Watch

```sh
yarn run example:test:cy:open
```

or

Cypress Run Mode - Once

```sh
yarn run example:test:cy:run
```

### MSW Server (Node Based) - With Jest

```sh
yarn run example:test:unit
```


## Graphql


Start the graphql API in one terminal:

```bash
yarn start:gql
```

Then run the graphql client in another terminal:
```bash
yarn run:gqlClient 
```


Generate a consumer pact, by running a jest test, with msw-pact, testing the gql consumer

```
test:gql:consumer
```

Run the provider verification for the gql consumer


```
test:gql:verifier
```