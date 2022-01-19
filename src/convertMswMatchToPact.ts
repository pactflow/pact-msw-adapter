import { DefaultRequestBody, MockedRequest } from "msw";
import { PactResults } from "./mswPact";

export const convertMswMatchToPact = async ({
  request,
  response,
  consumerName,
  providerName,
}: {
  request: MockedRequest<DefaultRequestBody>;
  response: Response;
  consumerName?: string;
  providerName?: string;
}): Promise<PactResults> => {
  const createPact: PactResults = {
    consumer: {
      name: consumerName ?? "consumer",
    },
    provider: {
      name: providerName ?? "provider",
    },
    interactions: [
      {
        description: request.id,
        providerState: "",
        request: {
          method: request.method,
          path: request.url.pathname,
          // @ts-ignore
          headers: request.headers._headers,
          body: request.bodyUsed ? request.body : undefined,
        },
        response: {
          status: response.status,
          // @ts-ignore
          headers: response.headers._headers,
          body: response.body
            ? response.headers.get("content-type")?.includes("json")
              ? (await response.json())
              : response.body
            : undefined,
        },
      },
    ],
  };

  return createPact;
};
