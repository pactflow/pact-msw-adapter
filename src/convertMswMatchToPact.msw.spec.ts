import { convertMswMatchToPact } from "./convertMswMatchToPact";
import { MswMatch } from "./mswPact";
const sampleRequest = {
  id: "1fad2374-02e2-4b43-89d4-1c1e72183931",
  url: new URL("http://localhost:8081/products"),
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
  headers: {
    _headers: { "x-powered-by": "msw", "content-type": "application/json" },
    _names: {},
  },
  body: JSON.stringify([{ id: "09", type: "CREDIT_CARD", name: "Gem Visa" }]),
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
        body: [{ id: "09", type: "CREDIT_CARD", name: "Gem Visa" }],
        headers: {
          "content-type": "application/json",
          "x-powered-by": "msw",
        },
      },
    },
  ],
  metadata: { pactSpecification: { version: "2.0.0" } },
};

const foo = [{"request":{"id":"de5eefb0-c451-4ae2-9695-e02626f00ca7","url":"http://localhost:8081/products","method":"GET","body":"","headers":{"_headers":{"accept":"application/json, text/plain, */*","authorization":"Bearer 2022-03-01T19:36:18.277Z","user-agent":"axios/0.21.1","host":"localhost:8081","cookie":""},"_names":{}},"cookies":{},"redirect":"manual","referrer":"","keepalive":false,"cache":"default","mode":"cors","referrerPolicy":"no-referrer","integrity":"","destination":"document","bodyUsed":false,"credentials":"same-origin"},"response":{"status":200,"statusText":"OK","headers":{"_headers":{"x-powered-by":"msw","content-type":"application/json"},"_names":{}},"body":"[{\"id\":\"09\",\"type\":\"CREDIT_CARD\",\"name\":\"Gem Visa\"}]"}}]
describe("writes an msw req/res to a pact", () => {
  it("should ", async () => {
    expect(
      await convertMswMatchToPact({
        matches: foo as any,
        consumer: 'foo',
        provider: 'bar'
      })
    ).toEqual(generatedPact);
  });
});

