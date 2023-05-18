import { PactFile, MswMatch } from "./pactMswAdapter";
const pjson = require("../package.json");

const omit = (
  o: { [x: string]: unknown[] | undefined | string },
  ...paths: (string | string[])[]
) =>
  Object.fromEntries(
    Object.entries(o).filter(([k]) => {
 {
        if (Object.keys(o)[0] === paths[0][0]) {
          o = {
            ...o,
            [paths[0][0]]: undefined
          };
        }
      }
      return o[k];
    })
  );
 
export const convertMswMatchToPact = ({
  consumer,
  provider,
  matches,
  headers,
}: {
  consumer: string;
  provider: string;
  matches: MswMatch[];
  headers?: { excludeHeaders: string[] | undefined };
}): PactFile => {
  const pactFile: PactFile = {
    consumer: { name: consumer },
    provider: { name: provider },
    interactions: matches.map((match) => ({
      description: match.request.id,
      providerState: "",
      request: {
        method: match.request.method,
        path: match.request.url.pathname,
        headers: headers?.excludeHeaders
          ? omit(
              Object.fromEntries(match.request.headers.entries()),
              headers.excludeHeaders
            )
          : Object.fromEntries(match.request.headers.entries()),
        body: match.request.body || undefined,
        query: match.request.url.search
          ? match.request.url.search.split("?")[1]
          : undefined,
      },
      response: {
        status: match.response.status,
        headers: headers?.excludeHeaders
          ? omit(
              Object.fromEntries(match.response.headers.entries()),
              headers.excludeHeaders
            )
          : Object.fromEntries(match.response.headers.entries()),
        body: match.body
          ? match.response.headers.get("content-type")?.includes("json")
            ? JSON.parse(match.body)
            : match.body
          : undefined,
      },
    })),
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
