// SPIKE: minimal matcher DSL + requestId-keyed registry so an msw resolver
// can hand a matcher template to the adapter's response:mocked handler.
import { HttpResponse } from "msw";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type Matcher =
  | { "pact:matcher:type": "type"; value: Template }
  | { "pact:matcher:type": "type"; min: number; value: Template[] };
export type Template = Json | Matcher | Template[] | { [k: string]: Template };

export const like = (value: Template): Matcher => ({
  "pact:matcher:type": "type",
  value,
});
export const eachLike = (value: Template, min = 1): Matcher => ({
  "pact:matcher:type": "type",
  min,
  value: Array.from({ length: min }, () => value),
});

const isMatcher = (t: unknown): t is Matcher =>
  typeof t === "object" && t !== null && "pact:matcher:type" in t;

export const reify = (t: Template): Json => {
  if (isMatcher(t)) return reify(t.value as Template);
  if (Array.isArray(t)) return t.map(reify);
  if (typeof t === "object" && t !== null)
    return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, reify(v)]));
  return t;
};

// Pact v2 flat matching rules, e.g. { "$.body.tags[*].name": { match: "type" } }
export type MatchingRules = Record<string, { match: string; min?: number }>;
export const toMatchingRules = (
  t: Template,
  path = "$.body",
  rules: MatchingRules = {},
): MatchingRules => {
  if (isMatcher(t)) {
    rules[path] = "min" in t ? { match: "type", min: t.min } : { match: "type" };
    if ("min" in t) toMatchingRules(t.value[0], `${path}[*]`, rules);
    else toMatchingRules(t.value, path, rules);
  } else if (Array.isArray(t)) {
    t.forEach((v, i) => toMatchingRules(v, `${path}[${i}]`, rules));
  } else if (typeof t === "object" && t !== null) {
    for (const [k, v] of Object.entries(t)) toMatchingRules(v, `${path}.${k}`, rules);
  }
  return rules;
};

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
    resolver: (args: A & { pact: { json: (t: Template, init?: ResponseInit) => Response } }) => R,
  ) =>
  (args: A) =>
    resolver({
      ...args,
      pact: { json: (t, init) => pactJson(args.requestId, t, init) },
    });
