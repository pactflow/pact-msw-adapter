import { convertMswMatchToPact } from "./convertMswMatchToPact";
import { MswMatch, PactFile } from "./pactMswAdapter";
import { Headers } from 'headers-polyfill';

const generatedPact:PactFile = {
  consumer: { name: "interaction.consumer.name" },
  provider: { name: "interaction.provider.name" },
  interactions: [
    {
      description: "de5eefb0-c451-4ae2-9695-e02626f00ca7",
      providerState: "",
      request: {
        method: "GET",
        path: "/products",
        body: undefined,
        headers: {
          accept: "application/json, text/plain, */*",
          authorization: "Bearer 2022-03-01T19:36:18.277Z",
        },
      },
      response: {
        status: 200,
        body: [{ id: "09", type: "CREDIT_CARD", name: "Gem Visa" }],
        headers: { "x-powered-by": "msw", "content-type": "application/json" },
      },
    },
  ],
  metadata: { pactSpecification: { version: "2.0.0" } },
};

const sampleMatch: MswMatch[] = [{
  "request": {
    "id": "de5eefb0-c451-4ae2-9695-e02626f00ca7",
    "url": new URL("http://localhost:8081/products"), "method": "GET",
    "body": undefined,
    "headers": new Headers(
      { "accept": "application/json, text/plain, */*", "authorization": "Bearer 2022-03-01T19:36:18.277Z", "user-agent": "axios/0.21.1", "host": "localhost:8081", "content-type": "application/json" }) as Headers,
    "cookies": {}, "redirect": "manual", "referrer": "", "keepalive": false, "cache": "default", "mode": "cors", "referrerPolicy": "no-referrer", "integrity": "", "destination": "document",
    "bodyUsed": false, "credentials": "same-origin"
  },
  "response": {
    "status": 200, "statusText": "OK", "headers": new Headers({ "x-powered-by": "msw", "content-type": "application/json" }),
    "body": JSON.stringify([{ id: "09", type: "CREDIT_CARD", name: "Gem Visa" }])
  },
  "body":JSON.stringify([{ id: "09", type: "CREDIT_CARD", name: "Gem Visa" }]),
  "headers":
  { "accept": "application/json, text/plain, */*", "authorization": "Bearer 2022-03-01T19:36:18.277Z", "user-agent": "axios/0.21.1", "host": "localhost:8081", "content-type": "application/json", "x-powered-by": "msw" } as unknown as Headers
}]
describe("writes an msw req/res to a pact", () => {
  it("should ", async () => {
    expect(
      convertMswMatchToPact({
        matches: sampleMatch as any,
        consumer: 'interaction.consumer.name',
        provider: 'interaction.provider.name',
        isWorker: false
      })
    ).toMatchObject(generatedPact);
  });
});

