import { HttpResponse } from "msw";
import { convertMswMatchToPact } from "./convertMswMatchToPact";
import { MatchedRequest, PactFile } from "./pactMswAdapter";
const pjson = require("../package.json");

const generatedPact: PactFile = {
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
    {
      description: "073d6de0-e1ac-11ec-8fea-0242ac120002",
      providerState: "",
      request: {
        method: "GET",
        path: "/products",
        body: undefined,
        headers: {
          accept: "application/json, text/plain, */*",
          authorization: "Bearer 2022-03-01T19:36:18.277Z",
        },
        query: "sort=asc",
      },
      response: {
        status: 200,
        body: [{ id: "09", type: "CREDIT_CARD", name: "Gem Visa" }],
        headers: { "x-powered-by": "msw", "content-type": "application/json" },
      },
    },
  ],
  metadata: {
    pactSpecification: { version: "2.0.0" },
    client: { name: "pact-msw-adapter", version: pjson.version },
  },
};

const sampleMatch: MatchedRequest[] = [
  {
    requestId: "de5eefb0-c451-4ae2-9695-e02626f00ca7",
    request: new Request("http://localhost:8081/products", {
      method: "GET",
      body: null,
      headers: new Headers({
        accept: "application/json, text/plain, */*",
        authorization: "Bearer 2022-03-01T19:36:18.277Z",
        "user-agent": "axios/0.21.1",
        host: "localhost:8081",
        "content-type": "application/json",
      }),
      redirect: "manual",
      referrer: "",
      keepalive: false,
      cache: "default",
      mode: "cors",
      referrerPolicy: "no-referrer",
      integrity: "",
      credentials: "same-origin",
    }),
    response: HttpResponse.json(
      [{ id: "09", type: "CREDIT_CARD", name: "Gem Visa" }],
      {
        status: 200,
        statusText: "OK",
        headers: new Headers({
          "x-powered-by": "msw",
          "content-type": "application/json",
        }),
      }
    ),
  },
  {
    requestId: "073d6de0-e1ac-11ec-8fea-0242ac120002",
    request: new Request("http://localhost:8081/products?sort=asc", {
      method: "GET",
      body: undefined,
      headers: new Headers({
        accept: "application/json, text/plain, */*",
        authorization: "Bearer 2022-03-01T19:36:18.277Z",
        "user-agent": "axios/0.21.1",
        host: "localhost:8081",
        "content-type": "application/json",
      }),
      redirect: "manual",
      referrer: "",
      keepalive: false,
      cache: "default",
      mode: "cors",
      referrerPolicy: "no-referrer",
      integrity: "",
      credentials: "same-origin",
    }),
    response: HttpResponse.json(
      [{ id: "09", type: "CREDIT_CARD", name: "Gem Visa" }], 
      {
        status: 200,
        statusText: "OK",
        headers: new Headers({
          "x-powered-by": "msw",
          "content-type": "application/json",
        }),
      }
    ),
  },
];

describe("writes an msw req/res to a pact", () => {
  it("should convert an msw server match to a pact", async () => {
    expect(
      await convertMswMatchToPact({
        matches: sampleMatch as any,
        consumer: "interaction.consumer.name",
        provider: "interaction.provider.name",
      })
    ).toMatchObject(generatedPact);
  });
});
