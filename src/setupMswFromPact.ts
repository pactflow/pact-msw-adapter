import {
  rest,
  response,
  context,
  RestHandler,
  MockedRequest,
  DefaultRequestBody,
} from "msw";
import { setupServer } from "msw/node";
import { j2s } from "./utils/utils";
import { InteractionState } from "@pact-foundation/pact";
import pactData from "./pact/frontendwebsite-productservice.json";
const isDebug = process.env.MSW_PACT_DEBUG;

const contractToHandlers = (contract: {
  consumer: { name: string };
  provider: { name: string };
  interactions: InteractionState[];
}) => {
  return contract.interactions.map((interaction) => {
    if (!interaction.request) {
      return;
    }
    const { method, path } = interaction.request;
    const { consumer, provider } = contract;
    if (isDebug) {
      console.log(
        `creating msw request mock from pact for consumer: "${consumer.name}" provider: "${provider.name}"`
      );
      console.log(`request: "${j2s(interaction.request)}"`);
      if (interaction.response) {
        console.log(`response: "${j2s(interaction.response)}"`);
      }
    }

    type mswRestTypes =
      | "head"
      | "get"
      | "delete"
      | "put"
      | "patch"
      | "options"
      | "post";

    const pactMethod = method.toLowerCase() as mswRestTypes;
    return rest[pactMethod]("http://localhost:8081" + path, () =>
      createResponse(interaction)
    );
  });
};

const createResponse = (interaction: InteractionState) => {
  if (interaction.request && interaction.response) {
    const { status, headers, body } = interaction.response;

    const transformers = [
      context.status(status as number),
      headers &&
        context.set(
          headers as {
            [name: string]: string;
          }
        ),
      body && context.json(body),
    ].filter(Boolean);

    return response(...transformers);
  }
};

const setupMswPactHandlers = (pactData: any) => {
  return contractToHandlers(pactData).filter(
    (x) => x !== undefined
  ) as RestHandler<MockedRequest<DefaultRequestBody>>[];
};

const pactMswServer = setupServer(
  ...setupMswPactHandlers(pactData),
  rest.get("*", (req, res, ctx) => {
    console.log(`No pact interaction defined for ${req.url}`);
    return res(
      ctx.status(200),
      ctx.json({ error: "No pact interaction defined" })
    );
  })
);

// beforeAll(() => pactMswServer.listen());
// afterEach(() => pactMswServer.resetHandlers());
// afterAll(() => pactMswServer.close());

export { pactMswServer, rest, setupMswPactHandlers };
