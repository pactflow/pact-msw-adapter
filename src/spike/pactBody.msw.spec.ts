import { http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, expect, it } from "vitest";
import { convertMswMatchToPact } from "../convertMswMatchToPact.ts";
import {
  eachLike,
  like,
  type MatchedRequest,
  pactJson,
  setupPactMswAdapter,
  withPact,
} from "../pactMswAdapter.ts";
import { pactRegistry } from "./pactBody.ts";

const server = setupServer(
  http.get("http://x.test/helper", ({ requestId }) =>
    pactJson(requestId, { id: like(1), tags: eachLike({ name: like("a") }) }),
  ),
  http.get(
    "http://x.test/wrapped",
    withPact(({ pact }) => pact.json({ name: like("bob") })),
  ),
  http.get(
    "http://x.test/filtered",
    withPact(({ pact }) => pact.json({ name: like("nope") })),
  ),
);
const adapter = setupPactMswAdapter({
  server,
  options: {
    consumer: "c",
    providers: { p: ["x.test"] },
    excludeUrl: ["filtered"],
  },
});
const matches: MatchedRequest[] = [];
adapter.emitter.on("pact-msw-adapter:match", (m: MatchedRequest) =>
  matches.push(m),
);
server.listen();
afterAll(() => server.close());

it("adapter puts matchingRules in the pact and the app gets the reified body", async () => {
  adapter.newTest();
  const a = await fetch("http://x.test/helper").then((r) => r.json());
  const b = await fetch("http://x.test/wrapped").then((r) => r.json());
  await fetch("http://x.test/filtered");
  await new Promise((r) => setTimeout(r, 10));
  adapter.verifyTest();

  expect(a).toEqual({ id: 1, tags: [{ name: "a" }] });
  expect(b).toEqual({ name: "bob" });
  expect(pactRegistry.size).toBe(0); // filtered request's template cleared too

  const pact = await convertMswMatchToPact({
    consumer: "c",
    provider: "p",
    matches,
  });
  const [helper, wrapped] = pact.interactions;
  expect(helper.response.body).toEqual({ id: 1, tags: [{ name: "a" }] });
  expect(helper.response.matchingRules).toEqual({
    "$.body.id": { match: "type" },
    "$.body.tags": { match: "type", min: 1 },
    "$.body.tags[*].name": { match: "type" },
  });
  expect(wrapped.response.matchingRules).toEqual({
    "$.body.name": { match: "type" },
  });
  expect(pact.metadata.pactSpecification.version).toBe("2.0.0");
});
