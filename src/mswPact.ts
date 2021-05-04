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
        // TODO not sure about pactReadIndex, the expectation is
        // this step is called after every test, but it will assume there is only
        // only one mock interaction which probably isn't a safe assumption!
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
            // TODO - this method will convert a single res/req to
            // a single pact file, we probably just want to convert
            // to an interaction object, and write all the pacts to a single
            // file once in writeAllPacts.
            // however what happens if we have multiple consumer/providers
            // in a single test file?
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

            // TODO - move write logic to writeAllPacts method on main api
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
      // this assumes that returnPact() has been called to populate the pactResults array
      // but if its empty, we could read them from mswHandledReqRes[]
      return pactResults;
    },
    clear: () => {
      mswHandledReqRes.length = 0;
      pactResults.length = 0;
      return;
    },
  };
};
