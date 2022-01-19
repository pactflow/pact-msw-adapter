import { DefaultRequestBody, MockedRequest, SetupWorkerApi } from "msw";
import { j2s, writeData2File } from "./utils/utils";
import { convertMswMatchToPact } from "./convertMswMatchToPact";

export interface MswPactOptions {
  timeout?: number;
  debug?: boolean;
  writePact?: boolean;
  pactOutDir?: string;
  consumerName?: string;
  providerName?: string;
}

export const setupMswPact = ({
  server,
  options,
}: {
  server: SetupWorkerApi;
  options?: MswPactOptions;
}) => {
  // TODO - support provider in a single test file?

  const mswHandledReqRes: MswMatchedRequest[] = [];
  const pactResults: PactResults[] = [];

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

      const responseMocked: Promise<Response> = new Promise(
        (resolve) => {
          server.on("response:mocked", (res) => resolve(res));
        }
      );

      mswHandledReqRes.push({
        matchedReq: requestMatch,
        matchedRes: responseMocked,
      });

      return mswHandledReqRes;
    },
    returnPacts: async () => {
      return transformMswToPact({
        mswHandledReqRes,
        options,
        pactResults,
      });
    },
    returnAllPacts: async () => {
      if (pactResults.length === 0 && mswHandledReqRes.length !== 0) {
        // Ensure we have some transformed pacts to return to the user
        await transformMswToPact({
          mswHandledReqRes,
          options,
          pactResults,
        });
        return pactResults;
      }
      return pactResults;
    },
    clear: () => {
      pactResults.length = 0;
      return;
    },
    writePacts: (pactsToProcess?: PactResults[]) => {
      pactsToProcess = pactsToProcess ?? pactResults;

      if (pactsToProcess) {
        // TODO - dedupe pactResults so we only have one file per consumer/provider pair
        pactsToProcess.map((pacts) => {
          const pactFile: PactFile = {
            ...pacts,
            metadata: {
              pactSpecification: {
                version: "2.0.0",
              },
            },
          };
          const filePath =
            (options?.pactOutDir ?? "./msw_generated_pacts/") +
            [
              pactFile.consumer.name,
              pactFile.provider.name,
              Date.now().toString(),
            ].join("-") +
            ".json";
          writeData2File(filePath, pactFile);
          return;
        });
        return;
      } else {
        return new Error("No pacts are available to write");
      }
    },
  };
};

export { convertMswMatchToPact };
const transformMswToPact = async ({
  mswHandledReqRes,
  options,
  pactResults,
}: {
  mswHandledReqRes: MswMatchedRequest[];
  options?: MswPactOptions;
  pactResults: PactResults[];
}) => {
  const timeoutValue = options?.timeout ?? 200;
  try {
    const results = await Promise.all(
      mswHandledReqRes.map(async (m) => {
        const pactResult = Promise.all([m.matchedReq, m.matchedRes])
          .then(async (data) => {
            const request = data[0];
            const response = data[1];
            if (!request || !response) {
              return { error: "This request was unhandled by msw" };
            }
            console.log("Request matched and response mocked");
            // TODO - this method will convert a single res/req to
            // a single pact file, we probably just want to convert
            // to an interaction object, and write all the pacts to a single
            // file once in writeAllPacts.
            // however what happens if we have multiple consumer/providers
            // in a single test file?
            const pactFile = await convertMswMatchToPact({
              request,
              response,
              consumerName: options?.consumerName,
              providerName: options?.providerName,
            });

            if (options?.debug) {
              console.log(j2s(request));
              console.log(j2s(response));
              console.log(j2s(pactFile));
            }

            if (pactFile) {
              pactResults.push(pactFile);
            }
            if (pactFile) {
              pactResults.push(pactFile);
            }
            return pactFile;
          })
          .catch((err) => {
            throw new Error(err);
          });

        const timeout = new Promise(
          (resolve: (value: { error: string }) => void) => {
            const wait = setTimeout(() => {
              clearTimeout(wait);
              resolve({
                error:
                  "Timed out waiting for request match in MSW, did you remember to issue a request to your mock?",
              });
            }, timeoutValue);
          }
        );

        const pactResultOrTimeout = await Promise.race([pactResult, timeout]);
        return pactResultOrTimeout;
      })
    );
    mswHandledReqRes.length = 0;
    return results;
  } catch (err) {
    const genericError = "Unknown error occurred listening to pact";
    console.error(genericError);
    throw new Error(genericError);
  }
};

export interface PactInteraction {
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
}

export interface PactParticipants {
  consumer: {
    name: string;
  };
  provider: {
    name: string;
  };
}

export interface PactFile {
  consumer: PactParticipants["consumer"];
  provider: PactParticipants["provider"];
  interactions: PactInteraction[];
  metadata: PactFileMetaData;
}

export interface PactResults {
  consumer: PactParticipants["consumer"];
  provider: PactParticipants["provider"];
  interactions: PactInteraction[];
}

export interface PactFileMetaData {
  pactSpecification: {
    version: string;
  };
}

export interface MswMatchedRequest {
  matchedReq: Promise<MockedRequest<DefaultRequestBody>>;
  matchedRes: Promise<Response>;
}
