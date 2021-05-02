import { rest, response, context } from "msw";
import { setupServer } from "msw/node";
import { j2s } from "./utils";

const pactData = require("../pact/frontendwebsite-productservice.json");
const isDebug = process.env.MSW_PACT_DEBUG;

const contractToHandlers = (contract) => {
  return contract.interactions.map((interaction) => {
    const { method, path } = interaction.request;
    const { consumer, provider } = contract;
    if (isDebug) {
      console.log(
        `creating msw request mock from pact for consumer: "${consumer.name}" provider: "${provider.name}"`
      );
      console.log(`request: "${j2s(interaction.request)}"`);
      console.log(`response: "${j2s(interaction.response)}"`);
    }
    return rest[method.toLowerCase()]("http://localhost:8081" + path, () =>
      createResponse(interaction)
    );
  });
};

const createResponse = (interaction) => {
  const { status, headers, body } = interaction.response;

  const transformers = [
    context.status(status),
    headers && context.set(headers),
    body && context.body(j2s(body)),
  ].filter(Boolean);

  return response(...transformers);
};

const server = setupServer(
  ...contractToHandlers(pactData),
  rest.get("*", (req, res, ctx) => {
    console.log(`No pact interaction defined for ${req.url}`);
    return res(
      ctx.status(200),
      ctx.body(j2s({ error: "No pact interaction defined" }))
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

export { server, rest };
