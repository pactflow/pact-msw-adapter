// Ported from pact-js src/v3/types.ts (MIT), matcher shapes only.
export type AnyJson =
  | string
  | number
  | boolean
  | null
  | AnyJson[]
  | { [key: string]: AnyJson };
export interface JsonMap {
  [key: string]: AnyJson;
}

/** Pact integration JSON matcher, the shape the FFI consumes. */
export interface Matcher<T> {
  "pact:matcher:type": string;
  "pact:generator:type"?: string;
  value?: T | Record<string, T>;
}

export interface V3RegexMatcher extends Matcher<string> {
  regex: string;
  example?: string;
}

export interface MinLikeMatcher<T> extends Matcher<T> {
  min: number;
}

export interface MaxLikeMatcher<T> extends Matcher<T> {
  max: number;
}

export interface DateTimeMatcher extends Matcher<string> {
  format: string;
}

export interface ArrayContainsMatcher extends Matcher<unknown[]> {
  variants: unknown[];
}

export interface ProviderStateInjectedValue<T> extends Matcher<T> {
  expression: string;
}

export interface StatusCodeMatcher<T> extends Matcher<T> {
  status: HTTPResponseStatusClass | number[];
}

export interface RulesMatcher<T> extends Matcher<T> {
  rules: Matcher<T>[];
}

// const object rather than enum so the source runs under type-stripping
export const HTTPResponseStatusClass = {
  Information: "information",
  Success: "success",
  Redirect: "redirect",
  ClientError: "clientError",
  ServerError: "serverError",
  NonError: "nonError",
  Error: "error",
} as const;
export type HTTPResponseStatusClass =
  (typeof HTTPResponseStatusClass)[keyof typeof HTTPResponseStatusClass];
