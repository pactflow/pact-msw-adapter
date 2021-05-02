import { rest, response, context } from "msw";
import { setupServer } from "msw/node";
const pactData = require("../pact/frontendwebsite-productservice.json");
import { writeFileSync, existsSync, mkdirSync } from "fs";
var path = require("path");
const isDebug = process.env.MSW_PACT_DEBUG;
const writePact = process.env.WRITE_PACT;

const contractToHandlers = (contract) => {
  return contract.interactions.map((interaction) => {
    const { method, path } = interaction.request;
    const { consumer, provider } = contract;
    isDebug
      ? console.log(
          `creating msw request mock from pact for consumer: "${
            consumer.name
          }" provider: "${provider.name}" request: "${JSON.stringify(
            interaction.request
          )}" response: "${JSON.stringify(interaction.response)}" `
        )
      : null;
    return rest[method.toLowerCase()]("http://localhost:8081" + path, () =>
      createResponse(interaction)
    );
  });
};

const createResponse = (interaction) => {
  const { method, path } = interaction.request;
  const { status, headers, body } = interaction.response;

  writePact ? writePactToFile(interaction) : null;
  const transformers = [
    context.status(status),
    headers && context.set(headers),
    body && context.body(JSON.stringify(body)),
  ].filter(Boolean);

  return response(...transformers);
};
const server = setupServer(
  ...contractToHandlers(pactData),
  rest.get("*", (req, res, ctx) => {
    console.log(`No pact interaction defined for ${req.url}`);
    return res(
      ctx.status(200),
      ctx.body(JSON.stringify({ error: "No pact interaction defined" }))
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

export { server, rest };

const writePactToFile = (interaction) => {
  const createPact = {
    consumer: {
      name: "interaction.consumer.name",
    },
    provider: {
      name: "interaction.provider.name",
    },
    interactions: [
      {
        description: interaction.description,
        providerState: interaction.providerState,
        request: {
          method: interaction.request.method,
          path: interaction.request.path,
          headers: interaction.request.headers,
          body: interaction.request.body,
        },
        response: {
          status: interaction.response.status,
          headers: interaction.response.headers,
          body: interaction.response.body,
        },
      },
    ],
    metadata: {
      pactSpecification: {
        version: "2.0.0",
      },
    },
  };

  var filePath = `./msw_generated_pacts/msw_pact_${interaction.description}.json`;
  ensureDirExists(filePath);
  writeFileSync(filePath, JSON.stringify(createPact));
};

const ensureDirExists = (filePath) => {
  var dirname = path.dirname(filePath);
  if (existsSync(dirname)) {
    return true;
  }
  ensureDirExists(dirname);
  mkdirSync(dirname);
};
