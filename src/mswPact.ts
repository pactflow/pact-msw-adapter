import { DefaultRequestBody, MockedRequest, SetupWorkerApi } from "msw";
import { addTimeout, checkUrlFilters, j2s, writeData2File } from "./utils/utils";
import { convertMswMatchToPact } from "./convertMswMatchToPact";

export interface MswPactOptions {
  timeout?: number;
  debug?: boolean;
  writePact?: boolean;
  pactOutDir?: string;
  consumerName?: string;
  providerName?: string;
  includeUrl?: string[];
  excludeUrl?: string[];
}

export const setupMswPact = ({
  server,
  options,
}: {
  server: SetupWorkerApi;
  options?: MswPactOptions;
}) => {
  // TODO - support provider in a single test file?

  console.groupCollapsed(
    `%c[msw-pact] %cAdapter enabled ${options?.debug ? 'on debug mode' : ''}`,
    'color:forestgreen;font-weight:bold;', 'color:silver;font-weight:400;');
  console.log('options:', options);
  console.groupEnd();

  const mswHandledReqRes: MswMatchedRequest[] = [];
  const pactResults: PactResults[] = [];

  return {
    listen: () => {
      if (options?.debug) {
        console.log("[msw-pact] Listening for new matches");
      }
    
      const requestMatch: Promise<MockedRequest<DefaultRequestBody>>
        = new Promise((resolve) => server.on("request:match", resolve));

      const responseMocked: Promise<Response>
        = new Promise((resolve) =>
          server.on("response:mocked", (res) => resolve(res)));

      const match: MswMatchedRequest = {
        matchedReq: requestMatch,
        matchedRes: responseMocked,
      };

      server.on("request:unhandled", (unhandled) => {
        const { url } = unhandled;

        if (checkUrlFilters(url.toString(), options)) {
          match.errors = `[msw-pact] Unhandled request: ${url}`;
        }
      });

      mswHandledReqRes.push(match);

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
        // Note: There are scenarios such as feature flagging where you want more than one file per consumer/provider pair

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
  const results = await Promise.all(
    mswHandledReqRes.map(async (m) => {
      const asyncReq = m.matchedReq.then(req => {
        if (!req || !checkUrlFilters(req.url.toString(), options)) {
          return;
        }

        if (options?.debug) {
          console.groupCollapsed("[msw-pact] Request matched");
          console.log(req);
          console.groupEnd();
        }

        return req;
      });

      const asyncRes = m.matchedRes.then(res => {
        if (!res || !checkUrlFilters(res.url.toString(), options)) {
          return;
        }

        if (options?.debug) {
          console.groupCollapsed("[msw-pact] Response mocked");
          console.log(res);
          console.groupEnd();
        }

        return res;
      });
      
      try {
        return await Promise.all([
          addTimeout(asyncReq, 'request match', timeoutValue),
          addTimeout(asyncRes, 'response mock', timeoutValue)
        ])
        .then(async (data) => {
          if (m.errors) {
            throw new Error(m.errors);
          }

          const request = data[0];
          const response = data[1];
          if (!request || !response) {
            throw new Error("[msw-pact] Request unhandled by msw");
          }

          console.groupCollapsed("[msw-pact] Request matched and response mocked");
          // TODO - this method will convert a single res/req to
          // a single pact file, we probably just want to convert
          // to an interaction object, and write all the pacts to a single
          // file once in writeAllPacts.
          // however what happens if we have multiple consumer/providers
          // in a single test file?
          try {
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
          } finally {
            console.groupEnd();
          }
        });
      } catch (err) {
        if (err instanceof Error) {
          throw err;
        }

        if (err && typeof(err) === 'string')
          err = new Error(err);
  
        console.groupCollapsed('%c[msw-pact] Unexpected error.', 'color:coral;font-weight:bold;');
        console.log(err);
        console.groupEnd();
        throw err;
      }
    })
  );
  mswHandledReqRes.length = 0;
  return results;
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
  errors?: string;
}
