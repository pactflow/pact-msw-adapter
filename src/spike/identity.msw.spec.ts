import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { expect, it } from "vitest";

it("what survives from resolver to response:mocked (node)", async () => {
  const seen: Record<string, unknown> = {};
  const server = setupServer(
    http.get("http://x.test/a", ({ request, requestId }) => {
      const res = HttpResponse.json(
        { a: 1 },
        { headers: { "x-pact-id": "abc" } },
      );
      seen.resolverReq = request;
      seen.resolverRes = res;
      seen.resolverId = requestId;
      return res;
    }),
  );
  server.events.on("request:match", ({ request, requestId }) => {
    seen.matchReq = request;
    seen.matchId = requestId;
  });
  const done = new Promise<void>((resolve) =>
    server.events.on("response:mocked", ({ request, response, requestId }) => {
      seen.mockedReq = request;
      seen.mockedRes = response;
      seen.mockedId = requestId;
      seen.header = response.headers.get("x-pact-id");
      resolve();
    }),
  );
  server.listen();
  await fetch("http://x.test/a");
  await done;
  server.close();
  const r = {
    sameResponse: seen.resolverRes === seen.mockedRes,
    sameReqResolverVsMatch: seen.resolverReq === seen.matchReq,
    sameReqMatchVsMocked: seen.matchReq === seen.mockedReq,
    sameId: seen.resolverId === seen.matchId && seen.matchId === seen.mockedId,
    header: seen.header,
  };
  // biome-ignore lint/suspicious/noConsole: spike probe output
  console.log("PROBE", JSON.stringify(r));
  expect(r.sameId).toBe(true);
});
