import { rest, response, context } from "msw";
import { setupServer } from "msw/node";
const pactData = require("../pact/frontendwebsite-productservice.json");

const isDebug = process.env.MSW_PACT_DEBUG;

function contractToHandlers(contract) {
  return contract.interactions.map((interaction) => {
    const { method, path } = interaction.request;
    const { consumer, provider } = contract;
    isDebug
      ? console.log(
          `creating msw request mock from pact for consumer: "${consumer.name}" provider: "${provider.name}" method: "${method}" path: "${path}" `
        )
      : null;
    return rest[method.toLowerCase()]("http://localhost:8081" + path, () =>
      createResponse(interaction.response)
    );
  });
}

function createResponse(expectedResponse) {
  const { status, headers, body } = expectedResponse;
  isDebug
    ? console.log(
        `setting response to status: "${status}" headers: "${JSON.stringify(
          headers
        )}" body: "${JSON.stringify(body)}" `
      )
    : null;
  const transformers = [
    context.status(status),
    headers && context.set(headers),
    body && context.body(JSON.stringify(body)),
  ].filter(Boolean);
  return response(...transformers);
}
const server = setupServer(
  ...[
    ...contractToHandlers(pactData),
    rest.get("*", (req, res, ctx) => {
      console.log(`No pact interaction defined for ${req.url}`);
      return res(
        ctx.status(200),
        ctx.body(JSON.stringify({ error: "No pact interaction defined" }))
      );
    }),
  ]
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

export { server, rest };
