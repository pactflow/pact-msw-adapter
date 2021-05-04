import { DefaultRequestBody, MockedRequest } from "msw";
import { SetupServerApi } from "msw/node";
import { j2s, writeData2File } from "./utils/utils";
import { convertMswMatchToPact } from "./convertMswMatchToPact";
import { IsomorphicResponse } from "@mswjs/interceptors";

interface MswPactOptions {
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
  server.on("request:unhandled", (unhandled) => {
    const { url } = unhandled;
    console.log("This request was unhandled by msw: " + url);
  });

  const requestMatch = new Promise((resolve) => {
    server.on("request:match", resolve);
  });

  const responseMocked = new Promise((resolve) => {
    server.on("response:mocked", resolve);
  });

  return Promise.all([requestMatch, responseMocked])
    .then((data) => {
      console.log("Request matched and response mocked");
      const request = data[0] as MockedRequest<DefaultRequestBody>; // MockedRequest<DefaultRequestBody>
      const response = data[1] as IsomorphicResponse;
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
    .catch((e) => {
      console.log(e);
    });
};
