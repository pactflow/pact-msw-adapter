import { s2j } from "./utils";
export const convertMswMatchToPact = (request, response) => {
  const createPact = {
    consumer: {
      name: "interaction.consumer.name",
    },
    provider: {
      name: "interaction.provider.name",
    },
    interactions: [
      {
        description: request.id,
        providerState: "",
        request: {
          method: request.method,
          path: new URL(request.url).pathname,
          headers: request.headers._headers,
          body: request.bodyUsed ? s2j(request.body) : undefined,
        },
        response: {
          status: response.status,
          headers: response.headers.headers,
          body: response.body ? s2j(response.body) : undefined,
        },
      },
    ],
    metadata: {
      pactSpecification: {
        version: "2.0.0",
      },
    },
  };

  return createPact;
};
