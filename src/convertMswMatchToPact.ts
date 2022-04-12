import { PactFile, MswMatch } from "./pactMswAdapter";
import { omit } from "lodash";
import { HeadersObject, Headers } from "headers-polyfill";
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
    interactions: matches.map((match) => {
      console.log(match);
      return {
        description: match.request.id,
        providerState: "",
        request: {
          method: match.request.method,
          path: match.request.url.pathname,
          headers: headers?.excludeHeaders
            ? omit(match.request.headers["_headers"], headers.excludeHeaders)
            : match.request.headers["_headers"],
          body: match.request.bodyUsed ? match.request.body : undefined,
        },
        response: {
          status: match.response.status,
          headers: headers?.excludeHeaders
            ? omit(
                (match.response.headers as Headers)["_headers"],
                headers.excludeHeaders
              )
            : (match.response.headers as Headers)["_headers"],
          body: match.response.body
            ? match.response.headers.get("content-type")?.includes("json") &&
              (typeof match.response.body === "string" ||
                match.response.body instanceof String)
              ? JSON.parse(match.response.body as string)
              : match.response.body
            : undefined,
        },
      };
    }),
    metadata: {
      pactSpecification: {
        version: "2.0.0",
      },
    },
  };
  return pactFile;
};
