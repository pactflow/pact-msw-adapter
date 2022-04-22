import { PactFile, MswMatch } from "./pactMswAdapter";
import { omit } from "lodash";
import { IsomorphicResponse } from "@mswjs/interceptors";
export const convertMswMatchToPact = ({
  consumer,
  provider,
  matches,
  headers,
  isWorker
}: {
  consumer: string;
  provider: string;
  matches: MswMatch[];
  headers?: { excludeHeaders: string[] | undefined };
  isWorker?: boolean;
}): PactFile => {
  const pactFile: PactFile = {
    consumer: { name: consumer },
    provider: { name: provider },
    interactions: matches.map((match) => {
      let responseHeaders;
      let isServer = false;
      let matcher: any;
      if(!isWorker){
        console.log("isWorker? - this should be false",isWorker);
        let serverResponse = match.response as IsomorphicResponse;
        responseHeaders = serverResponse.headers["_headers"];
        if (!responseHeaders) throw new Error()
        matcher = serverResponse;
        isServer = true;

      }else {
        console.log("isWorker? - this should be true",isWorker);
        let workerResponse = match.response as Response;
        // matcher  = workerResponse
        matcher.body = workerResponse.text();
        matcher = {
          ...workerResponse,
          ...matcher,
        };
        console.log(workerResponse);
      }

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
            ? omit(responseHeaders, headers.excludeHeaders)
            : responseHeaders,
          body: match.response.body
            ? typeof match.response.body === "string" ||
              match.response.body instanceof String
              ? JSON.parse(match.response.body.toString())
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
