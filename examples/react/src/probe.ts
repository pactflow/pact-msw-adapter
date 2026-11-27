import { http } from "msw";
import { setupWorker } from "msw/browser";
import { eachLike, like, withPact } from "../../../src/spike/pactBody.ts";

const worker = setupWorker(
  http.get("/probe-api", withPact(({ pact }) => pact.json({ id: like(1), tags: eachLike({ name: like("a") }) }))),
);
await worker.start({ quiet: true });
const w = window as unknown as Record<string, unknown>;
w.msw = { worker };
w.probeFetch = () => fetch("/probe-api").then((r) => r.json());
