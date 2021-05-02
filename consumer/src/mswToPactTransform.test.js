const convertMswMatchToPact = (request, response) => {
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
          headers: response.headers.headers,
          body: response.body,
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

const sampleRequest = {
  id: "1fad2374-02e2-4b43-89d4-1c1e72183931",
  url: "http://localhost:8081/products",
  method: "GET",
  body: "",
  headers: {
    _headers: {
      accept: "application/json, text/plain, */*",
      authorization: "Bearer 2021-05-02T18:18:00.959Z",
      "user-agent": "axios/0.19.1",
      "x-msw-request-id": "1fad2374-02e2-4b43-89d4-1c1e72183931",
      cookie: "",
    },
    _names: {},
  },
  cookies: {},
  redirect: "manual",
  referrer: "",
  keepalive: false,
  cache: "default",
  mode: "cors",
  referrerPolicy: "no-referrer",
  integrity: "",
  destination: "document",
  bodyUsed: false,
  credentials: "same-origin",
};

const sampleResponse = {
  status: 200,
  statusText: "OK",
  headers: { _headers: { "x-powered-by": "msw" }, _names: {} },
  body: '[{"id":"09","type":"CREDIT_CARD","name":"Gem Visa"}]',
};

const generatedPact = {
  consumer: { name: "interaction.consumer.name" },
  provider: { name: "interaction.provider.name" },
  interactions: [
    {
      description: "1fad2374-02e2-4b43-89d4-1c1e72183931",
      providerState: "",
      request: {
        method: "GET",
        path: "/products",
        headers: {
          accept: "application/json, text/plain, */*",
          authorization: "Bearer 2021-05-02T18:18:00.959Z",
          "user-agent": "axios/0.19.1",
          "x-msw-request-id": "1fad2374-02e2-4b43-89d4-1c1e72183931",
          cookie: "",
        },
      },
      response: {
        status: 200,
        body: '[{"id":"09","type":"CREDIT_CARD","name":"Gem Visa"}]',
      },
    },
  ],
  metadata: { pactSpecification: { version: "2.0.0" } },
};

describe("writes an msw req/res to a pact", () => {
  it("should ", async () => {
    expect(convertMswMatchToPact(sampleRequest, sampleResponse)).toEqual(
      generatedPact
    );
  });
});
