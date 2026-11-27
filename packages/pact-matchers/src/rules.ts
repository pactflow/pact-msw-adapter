// Turns a matcher template (integration JSON) into a plain body plus matching
// rules and generators. A straight port of pact_ffi mock_server/bodies.rs
// (process_object / process_array / process_matcher) and the bits of
// pact_models it leans on, so the output lines up with what the FFI writes.
import type { AnyJson } from "./types.ts";

interface JsonObject {
  [k: string]: AnyJson;
}
export interface Rule {
  match: string;
  [k: string]: AnyJson;
}
export interface GeneratorJson {
  type: string;
  [k: string]: AnyJson;
}
export type RuleCategory = Map<string, Rule[]>;
export type GeneratorCategory = Map<string, GeneratorJson>;

export interface ProcessedBody {
  body: AnyJson;
  rules: RuleCategory;
  generators: GeneratorCategory;
}

const isObject = (v: unknown): v is JsonObject =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// --- DocPath ------------------------------------------------------------------

const IDENT = /^[_A-Za-z][_A-Za-z0-9]*$/u;
// Rust's usize::from_str, which takes an optional leading '+'
const USIZE = /^\+?\d+$/u;

const pushField = (path: string, key: string) =>
  IDENT.test(key)
    ? `${path}.${key}`
    : `${path}['${key.replace(/[\\']/gu, "\\$&")}']`;

const join = (path: string, part: string) => {
  if (part === "*") return `${path}.*`;
  if (part === "[*]") return `${path}[*]`;
  if (USIZE.test(part)) return `${path}[${Number(part)}]`;
  return pushField(path, part);
};

// --- json_utils ---------------------------------------------------------------

const jsonToString = (v: AnyJson | undefined): string =>
  typeof v === "string" ? v : v == null ? "" : JSON.stringify(v);

const jsonToNum = (v: AnyJson | undefined): number | undefined => {
  if (typeof v === "number")
    return v >= 0 || !Number.isInteger(v)
      ? Math.max(0, Math.trunc(v))
      : undefined;
  if (typeof v === "string" && USIZE.test(v)) return Number(v);
  return undefined;
};

const fieldAsString = (m: JsonObject, f: string) =>
  f in m ? jsonToString(m[f]) : undefined;

// --- generators ---------------------------------------------------------------

const i32 = (m: JsonObject, f: string, d: number) =>
  typeof m[f] === "number" && Number.isInteger(m[f]) ? (m[f] as number) : d;
const u16 = (m: JsonObject, f: string, d: number) =>
  typeof m[f] === "number" && Number.isInteger(m[f]) && (m[f] as number) >= 0
    ? (m[f] as number)
    : d;

const formatAndExpression = (type: string, m: JsonObject): GeneratorJson => {
  const g: GeneratorJson = { type };
  const format = fieldAsString(m, "format");
  const expression = fieldAsString(m, "expression");
  if (format !== undefined) g.format = format;
  if (expression !== undefined) g.expression = expression;
  return g;
};

/** Generator::from_map followed by to_json */
export function generatorFromMap(
  type: string,
  m: JsonObject,
): GeneratorJson | undefined {
  switch (type) {
    case "RandomInt":
      return { type, min: i32(m, "min", 0), max: i32(m, "max", 10) };
    case "Uuid":
      return "format" in m
        ? { type, format: jsonToString(m.format) }
        : { type };
    case "RandomDecimal":
    case "RandomHexadecimal":
      return { type, digits: u16(m, "digits", 10) };
    case "RandomString":
      return { type, size: u16(m, "size", 10) };
    case "Regex":
      return "regex" in m ? { type, regex: jsonToString(m.regex) } : undefined;
    case "Date":
    case "Time":
    case "DateTime":
      return formatAndExpression(type, m);
    case "RandomBoolean":
      return { type };
    case "ProviderState": {
      if (!("expression" in m)) return undefined;
      const g: GeneratorJson = { type, expression: jsonToString(m.expression) };
      if ("dataType" in m) g.dataType = m.dataType;
      return g;
    }
    case "MockServerURL":
      return {
        type,
        example: fieldAsString(m, "example") ?? "",
        regex: fieldAsString(m, "regex") ?? "",
      };
    case "":
      return undefined;
    default:
      return { ...m, type } as GeneratorJson;
  }
}

const generatorFromJson = (attrs: JsonObject) => {
  const g = attrs.generator;
  return isObject(g) && typeof g.type === "string"
    ? generatorFromMap(g.type, g)
    : undefined;
};

// --- matching rules -----------------------------------------------------------

const VALUES_MATCHERS = new Set(["values", "eachValue", "arrayContains"]);
const isValuesMatcher = (r: Rule) => VALUES_MATCHERS.has(r.match);

const typeRule = (min?: number, max?: number): Rule => {
  const r: Rule = { match: "type" };
  if (min !== undefined) r.min = min;
  if (max !== undefined) r.max = max;
  return r;
};

/** MatchingRule::from_json (rule objects nested in eachKey / eachValue) */
function ruleFromJson(v: AnyJson): Rule {
  if (!isObject(v)) throw new Error("Matching rule JSON is not an Object");
  const t = v.match ?? v["pact:matcher:type"];
  if (t !== undefined) return createRule(jsonToString(t), v, !("match" in v));
  if ("regex" in v) return { match: "regex", regex: jsonToString(v.regex) };
  const min = jsonToNum(v.min);
  if (min !== undefined) return typeRule(min);
  const max = jsonToNum(v.max);
  if (max !== undefined) return typeRule(undefined, max);
  if ("timestamp" in v)
    return { match: "datetime", format: jsonToString(v.timestamp) };
  if ("time" in v) return { match: "time", format: jsonToString(v.time) };
  if ("date" in v) return { match: "date", format: jsonToString(v.date) };
  throw new Error(
    "Matching rule missing 'match' field and unable to guess its type",
  );
}

const eachRule = (match: "eachKey" | "eachValue", a: JsonObject): Rule => {
  const rules = a.rules;
  if (rules !== undefined && !Array.isArray(rules))
    throw new Error(
      `${match} matcher config is not valid. Was expected an array`,
    );
  const r: Rule = { match, rules: (rules ?? []).map(ruleFromJson) };
  const value = jsonToString(a.value);
  if (value !== "") r.value = value;
  const generator = generatorFromJson(a);
  if (generator) r.generator = generator;
  return r;
};

const formatOf = (a: JsonObject, t: string) => jsonToString(a.format ?? a[t]);

/** MatchingRule::create_rule followed by to_json */
function createRule(
  type: string,
  a: JsonObject,
  integrationJson: boolean,
): Rule {
  switch (type) {
    case "regex":
      if (!("regex" in a))
        throw new Error("Regex matcher missing 'regex' field");
      return { match: "regex", regex: jsonToString(a.regex) };
    case "equality":
      return { match: "equality" };
    case "include":
      if (!("value" in a))
        throw new Error("Include matcher missing 'value' field");
      return { match: "include", value: jsonToString(a.value) };
    case "type":
      return typeRule(jsonToNum(a.min), jsonToNum(a.max));
    case "number":
    case "integer":
    case "decimal":
    case "boolean":
    case "null":
      return { match: type };
    case "real":
      return { match: "decimal" };
    case "min":
    case "min-type": {
      const min = jsonToNum(a.min);
      if (min === undefined) throw new Error("Min matcher missing 'min' field");
      return typeRule(min);
    }
    case "max":
    case "max-type": {
      const max = jsonToNum(a.max);
      if (max === undefined) throw new Error("Max matcher missing 'max' field");
      return typeRule(undefined, max);
    }
    case "timestamp":
    case "datetime":
      return { match: "datetime", format: formatOf(a, type) };
    case "date":
    case "time":
      return { match: type, format: formatOf(a, type) };
    case "contentType":
    case "content-type":
      if (!("value" in a))
        throw new Error("ContentType matcher missing 'value' field");
      return { match: "contentType", value: jsonToString(a.value) };
    case "values":
      return { match: "values" };
    case "statusCode":
    case "status-code":
      return { match: "statusCode", status: a.status ?? "success" };
    case "notEmpty":
    case "not-empty":
      return { match: "notEmpty" };
    case "semver":
      return { match: "semver" };
    case "eachKey":
    case "each-key":
      return eachRule("eachKey", a);
    case "eachValue":
    case "each-value":
      return eachRule("eachValue", a);
    case "arrayContains":
    case "array-contains":
      throw new Error("arrayContains is only supported in a body template");
    case "":
      throw new Error("Matching rule type can not be empty");
    default: {
      // plugin rule: keeps every other attribute (minus the example value)
      const r: Rule = { match: type };
      for (const [k, v] of Object.entries(a)) {
        if (
          k === "match" ||
          k === "pact:matcher:type" ||
          k === "pact:generator:type"
        )
          continue;
        if (integrationJson && k === "value") continue;
        r[k] = v;
      }
      return r;
    }
  }
}

// matcher definition expressions, e.g. "matching(type, 'x')"
const isMatcherDef = (s: string) => /^\s*[a-zA-Z]+\s*\(/u.test(s);

function matchersFromIntegrationJson(m: JsonObject): Rule[] {
  const t = m["pact:matcher:type"];
  if (t === undefined) return [];
  if (Array.isArray(t)) {
    return t.map((v) => {
      const vt = isObject(v) ? v["pact:matcher:type"] : undefined;
      if (vt === undefined)
        throw new Error(
          `Failed to create matching rule from JSON '${JSON.stringify(t)}': there is no 'pact:matcher:type' attribute`,
        );
      return createRule(jsonToString(vt), v as JsonObject, true);
    });
  }
  const s = jsonToString(t);
  if (
    !["eachKey", "eachValue", "notEmpty", "arrayContains"].includes(s) &&
    isMatcherDef(s)
  )
    throw new Error(
      `Matcher definition expressions are not supported yet: ${s}`,
    );
  return [createRule(s, m, true)];
}

// --- body processing (bodies.rs) ----------------------------------------------

class Ctx {
  rules: RuleCategory = new Map();
  generators: GeneratorCategory = new Map();
  addRule(path: string, rule: Rule) {
    const list = this.rules.get(path);
    if (list) list.push(rule);
    else this.rules.set(path, [rule]);
  }
}

function processArray(
  arr: AnyJson[],
  ctx: Ctx,
  path: string,
  typeMatcher: boolean,
  skipMatchers: boolean,
): AnyJson[] {
  return arr.map((val, index) => {
    const itemPath = typeMatcher ? `${path}[*]` : `${path}[${index}]`;
    if (isObject(val)) return processObject(val, ctx, itemPath, skipMatchers);
    if (Array.isArray(val))
      return processArray(val, ctx, itemPath, false, skipMatchers);
    return val;
  });
}

function processObject(
  obj: JsonObject,
  ctx: Ctx,
  path: string,
  typeMatcher: boolean,
): AnyJson {
  if ("pact:matcher:type" in obj)
    return processMatcher(obj, ctx, path, typeMatcher);
  const out: JsonObject = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith("pact:")) continue;
    const itemPath = typeMatcher ? join(path, "*") : join(path, key);
    out[key] = isObject(val)
      ? processObject(val, ctx, itemPath, false)
      : Array.isArray(val)
        ? processArray(val, ctx, itemPath, false, false)
        : val;
  }
  return out;
}

function processVariant(variant: AnyJson) {
  const ctx = new Ctx();
  const value = isObject(variant)
    ? processObject(variant, ctx, "$", false)
    : Array.isArray(variant)
      ? processArray(variant, ctx, "$", false, false)
      : variant;
  return { value, ctx };
}

function processMatcher(
  obj: JsonObject,
  ctx: Ctx,
  path: string,
  skipMatchers: boolean,
): AnyJson {
  const type = obj["pact:matcher:type"];
  let rules: Rule[];
  let value: AnyJson;

  if (type === "arrayContains" || type === "array-contains") {
    const variants = obj.variants;
    if (!Array.isArray(variants))
      throw new Error(
        "ArrayContains 'variants' attribute is missing or not an array",
      );
    const processed = variants.map(processVariant);
    value = processed.map((p) => p.value);
    rules = [
      {
        match: "arrayContains",
        variants: processed.map(({ ctx: v }, index) => {
          const variant: JsonObject = { index, rules: v3Category(v.rules) };
          if (v.generators.size)
            variant.generators = Object.fromEntries(v.generators);
          return variant;
        }),
      },
    ];
  } else {
    rules = matchersFromIntegrationJson(obj);
    const hasValuesMatcher = rules.some(isValuesMatcher);
    const inner = obj.value;
    value = isObject(inner)
      ? processObject(inner, ctx, path, hasValuesMatcher)
      : Array.isArray(inner)
        ? processArray(inner, ctx, path, true, skipMatchers)
        : (inner ?? null);
    if (rules.some((r) => r.match === "eachValue"))
      addEachValueRuleMatchers(obj, ctx, path);
  }

  const gen = obj["pact:generator:type"];
  if (gen !== undefined) {
    const g = generatorFromMap(jsonToString(gen), obj);
    if (g) ctx.generators.set(path, g);
  }

  for (const r of rules) ctx.addRule(path, r);
  return value;
}

function addEachValueRuleMatchers(obj: JsonObject, ctx: Ctx, path: string) {
  const rules = obj.rules;
  if (!Array.isArray(rules)) return;
  const valuesPath = join(path, "*");
  // generators found in here are dropped, same as the FFI
  const scratch = new Ctx();
  scratch.rules = ctx.rules;
  for (const rule of rules) {
    if (!isObject(rule)) continue;
    const t = rule["pact:matcher:type"];
    const isEachValue = t === "eachValue" || t === "each-value";
    const v = rule.value;
    if (isObject(v))
      processObject(v, scratch, valuesPath, isEachValue || t === "values");
    else if (Array.isArray(v))
      processArray(v, scratch, valuesPath, true, false);
    if (isEachValue) addEachValueRuleMatchers(rule, ctx, valuesPath);
  }
}

/** Process a body template the way the FFI does for a JSON body. */
export function processBody(template: unknown): ProcessedBody {
  const ctx = new Ctx();
  const t = template as AnyJson;
  const body = isObject(t)
    ? processObject(t, ctx, "$", false)
    : Array.isArray(t)
      ? processArray(t, ctx, "$", false, false)
      : t;
  return { body, rules: ctx.rules, generators: ctx.generators };
}

// --- serialisers --------------------------------------------------------------

// a type alias, not an interface, so it stays assignable to AnyJson
export type V3RuleList = {
  combine: "AND";
  matchers: Rule[];
};

const v3Category = (rules: RuleCategory) => {
  const out: Record<string, V3RuleList> = {};
  for (const [path, matchers] of rules)
    out[path] = { combine: "AND", matchers };
  return out;
};

/** v3/v4 `matchingRules.body` */
export const toV3MatchingRules = (
  rules: RuleCategory,
): Record<string, V3RuleList> => v3Category(rules);

/** v3/v4 `generators.body` */
export const toV3Generators = (
  generators: GeneratorCategory,
): Record<string, GeneratorJson> => Object.fromEntries(generators);

/** v2 flat `matchingRules`, first rule per path, `$` rewritten to `$.body` */
export const toV2MatchingRules = (
  rules: RuleCategory,
): Record<string, Rule> => {
  const out: Record<string, Rule> = {};
  for (const [path, list] of rules)
    out[path.replaceAll("$", "$.body")] = list[0] ?? ({} as Rule);
  return out;
};
