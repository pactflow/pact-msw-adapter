import { DefaultRequestBody, MockedRequest } from "msw";
import { SetupServerApi } from "msw/node";
import { j2s, writeData2File } from "./utils/utils";
import { convertMswMatchToPact } from "./convertMswMatchToPact";
import { IsomorphicResponse } from "@mswjs/interceptors";

interface MswPactOptions {
  timeout?: number;
  debug?: boolean;
  writePact?: boolean;
  consumerName?: string;
  providerName?: string;
}

export const setupMswPact = ({
  server,
  options,
}: {
  server: SetupServerApi;
  options: MswPactOptions;
}) => {
  const { consumerName, providerName, debug, writePact } = options;

  const timeoutValue = options.timeout ?? 200;

  let pactReadIndex = 0;

  const mswHandledReqRes: {
    matchedReq: Promise<MockedRequest<DefaultRequestBody>>;
    matchedRes: Promise<IsomorphicResponse>;
  }[] = [];

  const pactResults: {
    consumer: {
      name: string;
    };
    provider: {
      name: string;
    };
    interactions: {
      description: string;
      providerState: string;
      request: {
        method: string;
        path: string;
        headers: any;
        body: DefaultRequestBody;
      };
      response: {
        status: number;
        headers: any;
        body: any;
      };
    }[];
    metadata: {
      pactSpecification: {
        version: string;
      };
    };
  }[] = [];

  return {
    listen: () => {
      server.on("request:unhandled", (unhandled) => {
        const { url } = unhandled;
        console.log("This request was unhandled by msw: " + url);
      });

      const requestMatch: Promise<
        MockedRequest<DefaultRequestBody>
      > = new Promise((resolve) => {
        server.on("request:match", resolve);
      });

      const responseMocked: Promise<IsomorphicResponse> = new Promise(
        (resolve) => {
          server.on("response:mocked", resolve);
        }
      );

      mswHandledReqRes.push({
        matchedReq: requestMatch,
        matchedRes: responseMocked,
      });

      return mswHandledReqRes;
    },
    returnPact: async () => {
      try {
        const pactResult = Promise.all([
          mswHandledReqRes[pactReadIndex].matchedReq,
          mswHandledReqRes[pactReadIndex].matchedRes,
        ])
          .then((data) => {
            const request = data[0]; // MockedRequest<DefaultRequestBody>
            const response = data[1];
            if (!request || !response) {
              return "This request was unhandled by msw";
            }
            console.log("Request matched and response mocked");
            const pactFile = convertMswMatchToPact({
              request,
              response,
              consumerName,
              providerName,
            });

            if (debug) {
              console.log(j2s(request));
              console.log(j2s(response));
              console.log(j2s(pactFile));
            }

            if (writePact) {
              const filePath = `./msw_generated_pacts/msw_pact_${request.id}.json`;
              writeData2File(filePath, pactFile);
            }
            if (pactFile) {
              pactResults.push(pactFile);
              pactReadIndex++;
            }
            return pactFile;
          })
          .catch((err) => {
            throw new Error(err);
          });

        const timeout = new Promise((resolve) => {
          const wait = setTimeout(() => {
            clearTimeout(wait);
            resolve("Could not find pact match");
          }, timeoutValue);
        }) as Promise<string>;

        const pactResultOrTimeout = await Promise.race([pactResult, timeout]);
        return pactResultOrTimeout;
      } catch (err) {
        const genericError = "Unknown error occurred listening to pact";
        console.error(genericError);
        throw new Error(genericError);
      }
    },
    returnAllPacts: () => {
      return pactResults;
    },
    clearPacts: () => {
      pactResults.length = 0;
      return;
    },
  };
};
