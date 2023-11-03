import { PactFile, MatchedRequest } from "./pactMswAdapter";
import { omit } from "lodash";
import { JSONValue } from "./utils/utils";
const pjson = require("../package.json");

export const readBody = async (input: Request | Response) => {
  // so we don't reread body somewhere
  const clone = input.clone();

  if (clone.body === null) return undefined

  const contentType = clone.headers.get("content-type");
  if (contentType?.startsWith("application/json")) {
    return clone.json() as Promise<JSONValue>;
  } else if (contentType?.startsWith("multipart/form-data")) {
    return clone.formData();
  }

  // default to text
  return clone.text();
}

export const convertMswMatchToPact = async ({
  consumer,
  provider,
  matches,
  headers,
}: {
  consumer: string;
  provider: string;
  matches: MatchedRequest[];
  headers?: { excludeHeaders: string[] | undefined };
}): Promise<PactFile> => {
  const pactFile: PactFile = {
    consumer: { name: consumer },
    provider: { name: provider },
    interactions: await Promise.all(matches.map(async (match) => ({
      description: match.requestId,
      providerState: "",
      request: {
        method: match.request.method,
        path: new URL(match.request.url).pathname,
        headers: omit(
          Object.fromEntries(match.request.headers.entries()),
          headers?.excludeHeaders ?? []
        ),
        body: await readBody(match.request),
        query: new URL(match.request.url).search?.split("?")[1]
      },
      response: {
        status: match.response.status,
        headers: omit(
          Object.fromEntries(match.response.headers.entries()),
          headers?.excludeHeaders ?? []
        ),
        body: await readBody(match.response),
      },
    }))),
    metadata: {
      pactSpecification: {
        version: "2.0.0",
      },
      client: {
        name: "pact-msw-adapter",
        version: pjson.version,
      },
    },
  };

  return pactFile;
};
