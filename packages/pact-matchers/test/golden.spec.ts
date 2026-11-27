// Golden tests: push each template through the real pact FFI (via pact-js) and
// check our body / matchingRules / generators match what lands in the pact file.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MatchersV3,
  PactV3,
  SpecificationVersion,
} from "@pact-foundation/pact";
import { afterAll, describe, expect, it } from "vitest";
import * as M from "../src/index.ts";

const dir = mkdtempSync(join(tmpdir(), "pact-matchers-golden-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

let n = 0;
async function ffi(template: unknown, spec: SpecificationVersion) {
  const provider = `p${n++}`;
  const pact = new PactV3({
    consumer: "c",
    provider,
    dir,
    spec,
    logLevel: "error",
  });
  pact.addInteraction({
    uponReceiving: "a request",
    withRequest: { method: "GET", path: "/" },
    // biome-ignore lint/suspicious/noExplicitAny: raw integration JSON
    willRespondWith: { status: 200, body: template as any },
  });
  await pact.executeTest(async (ms) => {
    await fetch(ms.url);
  });
  const file = JSON.parse(
    readFileSync(join(dir, `c-${provider}.json`), "utf8"),
  );
  return file.interactions[0].response;
}

const uuidEx = "ba4bd1f2-8d3e-4b6c-9a8c-2b6b0f6d0b4a";

const cases: Record<string, unknown> = {
  like: { id: M.like(1), name: M.like("x") },
  eachLike: { tags: M.eachLike({ name: M.like("a") }) },
  eachLikeMin: { tags: M.eachLike(M.like(1), 3) },
  atLeastAtMost: {
    a: M.atLeastLike({ x: 1 }, 2),
    b: M.atMostLike("x", 3),
    c: M.constrainedArrayLike(M.integer(1), 1, 4),
    d: M.atLeastOneLike(true),
  },
  numbers: {
    i: M.integer(5),
    d: M.decimal(1.5),
    n: M.number(3),
    b: M.boolean(),
  },
  generatedNumbers: { i: M.integer(), d: M.decimal(), n: M.number() },
  strings: {
    s: M.string("hi"),
    r: M.regex(/\d+/u, "123"),
    e: M.email(),
    h: M.hexadecimal(),
  },
  dates: {
    dt: M.datetime("yyyy-MM-dd'T'HH:mm:ss", "2026-01-01T00:00:00"),
    ts: M.timestamp("yyyy-MM-dd'T'HH:mm:ss", "2026-01-01T00:00:00"),
    d: M.date("yyyy-MM-dd", "2026-01-01"),
    t: M.time("HH:mm", "10:00"),
    iso: M.iso8601DateTimeWithMillis(),
  },
  misc: {
    inc: M.includes("ab"),
    nul: M.nullValue(),
    eq: M.equal({ a: 1 }),
    u: M.uuid(uuidEx),
    ug: M.uuid(),
    ps: M.fromProviderState("${id}", 10),
    mockUrl: M.url(["users", M.regex(/\d+/u, "1")]),
    url: M.url2("http://localhost:1234", ["users", M.regex(/\d+/u, "1")]),
  },
  eachKeyValue: {
    k: M.eachKeyMatches({ abc: 1 }, M.regex(/[a-z]+/u, "abc")),
    v: M.eachValueMatches({ abc: "x" }, M.like("x")),
    kl: M.eachKeyLike("key", { n: M.like(1) }),
  },
  arrayContaining: {
    items: M.arrayContaining(
      { id: M.integer(1), kind: "a" },
      { name: M.string("b"), at: M.datetime("yyyy-MM-dd", "2026-01-01") },
      { n: M.integer() },
    ),
  },
  rootArray: M.eachLike({ id: M.like(1) }),
  rootArrayPlain: [{ id: M.like(1) }, M.like("x")],
  nested: {
    a: { b: [{ c: M.like(1) }, [M.like(2), { d: M.regex("x+", "xx") }]] },
  },
  quirkyKeys: {
    "with space": M.like(1),
    "it's": M.like(2),
    "back\\slash": M.like(3),
    "123": M.like(4),
    "+7": M.like(5),
    _ok: M.like(6),
    "a.b": M.like(7),
    "-1": M.like(8),
  },
  pactKeysDropped: { a: 1, "pact:ignored": "x" },
  rawIntegrationJson: {
    multi: {
      "pact:matcher:type": [
        { "pact:matcher:type": "regex", regex: "\\d+" },
        { "pact:matcher:type": "type" },
      ],
      value: "1",
    },
    minStr: { "pact:matcher:type": "type", min: "2", value: [1, 2] },
    real: { "pact:matcher:type": "real", value: 1.5 },
    minType: { "pact:matcher:type": "min", min: 1, value: [1] },
    maxType: { "pact:matcher:type": "max", max: 2, value: [1] },
    values: {
      "pact:matcher:type": "values",
      value: { a: { b: 1 }, c: [1, 2] },
    },
    notEmpty: { "pact:matcher:type": "notEmpty", value: "x" },
    semver: { "pact:matcher:type": "semver", value: "1.0.0" },
    status: {
      "pact:matcher:type": "statusCode",
      status: "success",
      value: 200,
    },
    contentType: {
      "pact:matcher:type": "contentType",
      value: "application/json",
    },
    plugin: { "pact:matcher:type": "custom-thing", value: 1, opt: true },
    typeWithGen: {
      "pact:matcher:type": "type",
      "pact:generator:type": "RandomString",
      size: 5,
      value: "abc",
    },
    genOnly: {
      "pact:matcher:type": "type",
      "pact:generator:type": "RandomHexadecimal",
      value: "ab",
    },
    dateGen: {
      "pact:matcher:type": "date",
      "pact:generator:type": "Date",
      format: "yyyy-MM-dd",
      expression: "+1 day",
      value: "2026-01-01",
    },
    nestedEachValue: {
      "pact:matcher:type": "eachValue",
      rules: [
        {
          "pact:matcher:type": "eachValue",
          rules: [{ "pact:matcher:type": "type", value: { q: 1 } }],
          value: { x: { "pact:matcher:type": "integer", value: 1 } },
        },
      ],
      value: { k: { inner: 1 } },
    },
    eachValueArray: {
      "pact:matcher:type": "eachValue",
      rules: [
        {
          "pact:matcher:type": "type",
          value: [{ "pact:matcher:type": "integer", value: 1 }],
        },
      ],
      value: { k: [1] },
    },
    eachKeyGuess: {
      "pact:matcher:type": "eachKey",
      rules: [
        { regex: "[a-z]+" },
        { min: 1 },
        { timestamp: "yyyy" },
        { match: "type", max: 3 },
      ],
      value: { a: 1 },
    },
  },
};

const ours = (template: unknown) => {
  const { body, rules, generators } = M.processBody(template);
  return { body, rules, generators };
};

// Rules for matchers nested under eachValue only landed in libpact_ffi 0.5.13
// (pact-reference 1f1c2e61). The FFI bundled with pact-js 17.1.4 drops them;
// we follow 0.5.13, so these paths are expected on our side only.
const newerFfiOnly: Record<string, Record<string, M.V3RuleList>> = {
  rawIntegrationJson: {
    "$.eachValueArray.*[*]": {
      combine: "AND",
      matchers: [{ match: "integer" }],
    },
    "$.nestedEachValue.*.*": {
      combine: "AND",
      matchers: [{ match: "integer" }],
    },
  },
};

describe("v3 against the FFI", () => {
  for (const [name, template] of Object.entries(cases)) {
    it(name, async () => {
      const res = await ffi(
        template,
        SpecificationVersion.SPECIFICATION_VERSION_V3,
      );
      const { body, rules, generators } = ours(template);
      const v3Rules = M.toV3MatchingRules(rules);
      const v3Gens = M.toV3Generators(generators);

      expect(res.body).toEqual(body);
      // toEqual on the lists also pins duplicates: eachLike(like(1), 3) puts
      // {match:type} on [*] three times in the FFI output, and in ours
      expect({ ...res.matchingRules?.body, ...newerFfiOnly[name] }).toEqual(
        v3Rules,
      );
      expect(res.generators?.body ?? {}).toEqual(v3Gens);
    });
  }
});

describe("v2 against the FFI", () => {
  const v2Cases = [
    "like",
    "eachLike",
    "eachLikeMin",
    "atLeastAtMost",
    "strings",
    "nested",
    "quirkyKeys",
    "rootArray",
  ];
  for (const name of v2Cases) {
    it(name, async () => {
      const res = await ffi(
        cases[name],
        SpecificationVersion.SPECIFICATION_VERSION_V2,
      );
      const { body, rules } = ours(cases[name]);
      expect(res.body).toEqual(body);
      expect(res.matchingRules ?? {}).toEqual(M.toV2MatchingRules(rules));
    });
  }
});

describe("DSL parity with pact-js MatchersV3", () => {
  const calls: [string, unknown[]][] = [
    ["like", [{ a: 1 }]],
    ["eachLike", [{ a: 1 }, 2]],
    ["atLeastLike", [1, 2]],
    ["atMostLike", [1, 2]],
    ["constrainedArrayLike", [1, 1, 3]],
    ["atLeastOneLike", ["x"]],
    ["eachKeyLike", ["k", 1]],
    ["boolean", []],
    ["integer", [1]],
    ["integer", []],
    ["decimal", [1.5]],
    ["decimal", []],
    ["number", [2]],
    ["number", []],
    ["string", []],
    ["regex", [/a+/u, "aa"]],
    ["regex", ["a+", "aa"]],
    ["email", []],
    ["ipv4Address", []],
    ["ipv6Address", []],
    ["iso8601DateTime", []],
    ["iso8601DateTimeWithMillis", []],
    ["iso8601Date", []],
    ["iso8601Time", []],
    ["rfc1123Timestamp", []],
    ["hexadecimal", []],
    ["contentType", ["text/plain"]],
    ["equal", [{ a: 1 }]],
    ["datetime", ["yyyy", "2026"]],
    ["timestamp", ["yyyy", "2026"]],
    ["time", ["HH", "10"]],
    ["date", ["yyyy", "2026"]],
    ["includes", ["x"]],
    ["nullValue", []],
    ["url", [["b", "c"]]],
    ["url2", ["http://a", ["b"]]],
    ["arrayContaining", [{ a: 1 }, 2]],
    ["fromProviderState", ["${x}", 1]],
    ["uuid", [uuidEx]],
    ["uuid", []],
    ["matchStatus", [200]],
  ];
  for (const [fn, args] of calls) {
    it(`${fn}(${args.map((a) => JSON.stringify(a)).join(", ")})`, () => {
      // biome-ignore lint/suspicious/noExplicitAny: dynamic dispatch over both DSLs
      const theirs = (MatchersV3 as any)[fn](...args);
      // biome-ignore lint/suspicious/noExplicitAny: dynamic dispatch over both DSLs
      expect((M as any)[fn](...args)).toEqual(theirs);
    });
  }
  it("eachKeyMatches / eachValueMatches", () => {
    expect(M.eachKeyMatches({ a: 1 }, M.regex(/a/u, "a"))).toEqual(
      MatchersV3.eachKeyMatches({ a: 1 }, MatchersV3.regex(/a/u, "a")),
    );
    expect(M.eachValueMatches({ a: 1 }, M.like(1))).toEqual(
      MatchersV3.eachValueMatches({ a: 1 }, MatchersV3.like(1)),
    );
  });
  it("reify", () => {
    const t = cases.arrayContaining;
    expect(M.reify(t)).toEqual(MatchersV3.reify(t as never));
  });
  it("url with a RegExp fragment asks for regex() instead", () => {
    expect(() => M.url([/\d+/u])).toThrow(/regex\(\/\\d\+\/, "example"\)/u);
  });
});
