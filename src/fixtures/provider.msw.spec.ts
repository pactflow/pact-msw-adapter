import { LogLevel, Verifier } from '@pact-foundation/pact';
import { runStandaloneServer, server } from './graphqlApi';
import path from 'path'

// Verify that the provider meets all consumer expectations
describe('Pact Verification', () =>  {
  beforeAll(async () => {
    await runStandaloneServer(server)
  });
  afterAll(async () => {
     await server.stop()
  });
  console.log(path.resolve(process.cwd(), "./msw_generated_pacts/testConsumer-graphql.json"))

  it('validates the expectations of Matching Service', async () => {
    const opts = {
      pactUrls: [path.resolve(process.cwd(), "./msw_generated_pacts/testConsumer-graphql.json")],
      providerVersion: "1.0.0",
      providerVersionBranch: 'master',
      providerName: "graphql",
      logLevel: "info" as LogLevel,
      providerBaseUrl: "http://localhost:4000",
      timeout: 5000
    };

   await new Verifier(opts).verifyProvider()
  });
});
