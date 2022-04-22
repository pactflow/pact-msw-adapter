import { PactFile, MswMatch } from "./pactMswAdapter";
import { omit } from "lodash";
export const convertMswMatchToPact =  ({
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
    interactions:  matches.map(  (match) => {
      return {
        description: match.request.id,
        providerState: '',
        request: {
          method: match.request.method,
          path: match.request.url.pathname,
          headers: headers?.excludeHeaders
            ? omit(match.request.headers['_headers'], headers.excludeHeaders)
            : match.request.headers['_headers'],
          body: match.request.bodyUsed ? match.request.body : undefined
        },
        response: {
          status: match.response.status,
          headers: headers?.excludeHeaders
            ? omit(
                Object.fromEntries(match.headers.entries()),
                headers.excludeHeaders
              )
            : Object.fromEntries(match.headers.entries()),
          // headers: isWorker
          //   ? headers?.excludeHeaders
          //     ? omit(
          //         Object.fromEntries(match.headers.entries()),
          //         headers.excludeHeaders
          //       )
          //     : Object.fromEntries(match.headers.entries())
          //   : headers?.excludeHeaders
          //   ? omit(match.headers, headers.excludeHeaders)
          //   : match.headers,
          // body: match.body ? JSON.parse(match.body) : undefined
          body: match.body
            ? match.headers.get('content-type')?.includes('json')
              ? JSON.parse(match.body)
              : match.body
            : // body: match.body
              //   ? !isWorker
              //     ? // @ts-ignore
              //       match.headers.get('content-type')?.includes('json')
              //       ? JSON.parse(match.body)
              //       : match.body
              //     : match.headers.get('content-type')?.includes('json')
              //     ? JSON.parse(match.body)
              //     : match.body
              undefined
        }
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
