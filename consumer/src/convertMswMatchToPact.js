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
          body: request.bodyUsed ? request.body : undefined,
        },
        response: {
          status: response.status,
          headers: response.headers._headers,
          body: response.body
            ? response.headers._headers["content-type"].includes("json")
              ? JSON.parse(response.body)
              : response.body
            : undefined,
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
