// biome-ignore-all lint/performance/noBarrelFile: spike re-exports the pact-matchers DSL until it ships as its own package
// biome-ignore-all lint/performance/noReExportAll: as above
// biome-ignore-all lint/style/useExportsLast: as above
// SPIKE: requestId-keyed registry so an msw resolver can hand a matcher
// template to the adapter's response:mocked handler. The DSL and rule
// generation come from packages/pact-matchers.
import { HttpResponse } from "msw";
import {
  processBody,
  type Rule,
  reify,
  toV2MatchingRules,
} from "../../packages/pact-matchers/src/index.ts";

export * as Matchers from "../../packages/pact-matchers/src/matchers.ts";
export { eachLike, like } from "../../packages/pact-matchers/src/matchers.ts";

// anything the pact-matchers DSL builds, or plain JSON
export type Template = unknown;

// Pact v2 flat matching rules, e.g. { "$.body.tags[*].name": { match: "type" } }
export type MatchingRules = Record<string, Rule>;
export const toMatchingRules = (t: Template): MatchingRules =>
  toV2MatchingRules(processBody(t).rules);

// registry: requestId -> template, kept on the global object (not module scope) so
// duplicate bundles in one realm share it. Cypress runs the app and the spec in
// different windows, so there the adapter is pointed at the app window's registry.
const REGISTRY_KEY = Symbol.for("pact-msw-adapter.templates");
export type PactTemplateRegistry = Map<string, Template>;
export const getPactTemplateRegistry = (
  scope: object = globalThis,
): PactTemplateRegistry => {
  const g = scope as Record<symbol, PactTemplateRegistry | undefined>;
  g[REGISTRY_KEY] ??= new Map();
  return g[REGISTRY_KEY];
};
export const pactRegistry = getPactTemplateRegistry();

// take + delete, so the registry never grows across tests
export const takePactTemplate = (
  requestId: string,
  registry: PactTemplateRegistry = pactRegistry,
) => {
  const t = registry.get(requestId);
  registry.delete(requestId);
  return t;
};

export const pactJson = (
  requestId: string,
  template: Template,
  init?: ResponseInit,
) => {
  pactRegistry.set(requestId, template);
  return HttpResponse.json(reify(template), init);
};

// wrapper flavour: resolver gets a `pact` helper already bound to the requestId
export const withPact =
  <A extends { requestId: string }, R>(
    resolver: (
      args: A & {
        pact: { json: (t: Template, init?: ResponseInit) => Response };
      },
    ) => R,
  ) =>
  (args: A) =>
    resolver({
      ...args,
      pact: { json: (t, init) => pactJson(args.requestId, t, init) },
    });
