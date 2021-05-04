import { DefaultRequestBody, MockedRequest } from "msw";
import { SetupServerApi } from "msw/node";
import { j2s, writeData2File } from "./utils/utils";
import { convertMswMatchToPact } from "./convertMswMatchToPact";
import { IsomorphicResponse } from "@mswjs/interceptors";

interface MswPactOptions {
  timeout?:number;
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
  const { consumerName, providerName, debug, writePact} = options;

  const timeoutValue = options.timeout ?? 200
  
  let requestMatch: Promise<unknown>;
  let responseMocked: Promise<unknown>;
  return {
    listen: () => {
      server.on("request:unhandled", (unhandled) => {
        const { url } = unhandled;
        console.log("This request was unhandled by msw: " + url);
      });

      requestMatch = new Promise((resolve) => {
        server.on("request:match", resolve);
      });

      responseMocked = new Promise((resolve) => {
        server.on("response:mocked", resolve);
      });
      return { requestMatch, responseMocked };
    },
    //  returnPact:({requestMatch,responseMocked}:{requestMatch:Promise<unknown>,responseMocked:Promise<unknown>})=>{
    returnPact: async () => {
      try {
        const pactResult =   Promise.all([ requestMatch,  responseMocked])
          .then((data) => {
            const request = data[0] as MockedRequest<DefaultRequestBody>; // MockedRequest<DefaultRequestBody>
            const response = data[1] as IsomorphicResponse;
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
            return pactFile;
          })
          .catch((err) => {
            throw new Error(err);
          });

        const timeout =   new Promise((resolve) => {
          const wait = setTimeout(() => {
            clearTimeout(wait);
             resolve("Could not find pact match");
          }, timeoutValue);
        });

        const pactResultOrTimeout =  Promise.race([pactResult, timeout]);
        return pactResultOrTimeout
      } catch (err) {
        const genericError = "Unknown error occurred listening to pact";
        console.error(genericError);
        throw new Error(genericError);
      }
    },
  };
};
