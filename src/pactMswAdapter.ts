import { SetupWorker } from "msw/browser";
import { SetupServer } from "msw/node";
import {
  JSONValue,
  Logger,
  addTimeout,
  checkUrlFilters,
  createWriter,
  log,
  logGroup,
} from "./utils/utils";
import { convertMswMatchToPact } from "./convertMswMatchToPact";
import { EventEmitter } from "events";
export interface PactMswAdapterOptions {
  timeout?: number;
  debug?: boolean;
  pactOutDir?: string;
  consumer: string;
  providers:
    | { [name: string]: string[] }
    | ((event: PendingRequest) => string | null);
  includeUrl?: string[];
  excludeUrl?: string[];
  excludeHeaders?: string[];
  logger?: Logger;
}
export interface PactMswAdapterOptionsInternal {
  timeout: number;
  debug: boolean;
  pactOutDir: string;
  consumer: string;
  providers:
    | { [name: string]: string[] }
    | ((event: PendingRequest) => string | null);
  includeUrl?: string[];
  excludeUrl?: string[];
  excludeHeaders?: string[];
  logger: Logger;
}

export interface PactMswAdapter {
  emitter: EventEmitter;
  newTest: () => void;
  verifyTest: () => void;
  writeToFile: (writer?: (path: string, data: object) => void) => Promise<void>;
  clear: () => void;
}
export const setupPactMswAdapter = ({
  options: externalOptions,
  worker,
  server,
}: {
  options: PactMswAdapterOptions;
  worker?: SetupWorker;
  server?: SetupServer;
}): PactMswAdapter => {
  if (!worker && !server) {
    throw new Error("Either a worker or server must be provided");
  }

  const isWorker = worker ? !!worker : false;
  const mswMocker = worker ? worker : server;

  if (!mswMocker) {
    throw new Error("Could not setup either the worker or server");
  }
  const emitter = new EventEmitter();

  const options: PactMswAdapterOptionsInternal = {
    logger: console,
    ...externalOptions,
    timeout: externalOptions.timeout || 200,
    debug: externalOptions.debug || false,
    pactOutDir: externalOptions.pactOutDir || "./msw_generated_pacts/",
  };

  logGroup(`Adapter enabled${options.debug ? " on debug mode" : ""}`, { logger: options.logger });
  if (options.debug) {
    logGroup(["options:", options], { endGroup: true, mode: "debug", logger: options.logger });
  } else {
    options.logger.groupEnd();
  }

  // This can include expired requests
  const pendingRequests: PendingRequest[] = []; // Requests waiting for their responses

  const unhandledRequests: string[] = []; // Requests that need to be handled
  const expiredRequests: ExpiredRequest[] = []; // Requests that have expired (timeout)
  const orphanResponses: string[] = []; // Responses from previous tests

  const oldRequestIds: string[] = []; // Pending requests from previous tests
  const activeRequestIds: string[] = []; // Pending requests which are still valid
  const matches: MatchedRequest[] = []; // Completed request-response pairs

  mswMocker.events.on("request:match", ({request, requestId}) => {
    if (!checkUrlFilters({request, requestId}, options)) return;
    if (options.debug) {
      logGroup(["Matching request", request], { endGroup: true, mode: "debug", logger: options.logger });
    }

    const startTime = Date.now();

    pendingRequests.push({request, requestId});
    activeRequestIds.push(requestId);

    setTimeout(() => {
      const expired = { requestId, startTime, request }
      const activeIdx = activeRequestIds.indexOf(requestId);
      emitter.emit("pact-msw-adapter:expired", expired);
      if (activeIdx >= 0) {
        // Could be removed if completed or the test ended
        activeRequestIds.splice(activeIdx, 1);
        expiredRequests.push(expired);
      }
    }, options.timeout);
  });

  mswMocker.events.on(
    "response:mocked",
    async ({ response, requestId }) => {
      logGroup(JSON.stringify(response), { endGroup: true, logger: options.logger });

      const reqIdx = pendingRequests.findIndex((pending) => pending.requestId === requestId);
      if (reqIdx < 0) return; // Filtered and (expired and cleared) requests

      const endTime = Date.now();

      const {request} = pendingRequests.splice(reqIdx, 1)[0];
      const activeReqIdx = activeRequestIds.indexOf(requestId);
      if (activeReqIdx < 0) {
        // Expired requests and responses from previous tests

        const oldReqId = oldRequestIds.find((id) => id === requestId);
        const expiredReq = expiredRequests.find(
          (expired) => expired.requestId === requestId
        );
        if (oldReqId) {
          orphanResponses.push(request.url);
          log(`Orphan response: ${request.url}`, {
            mode: "warn",
            group: expiredReq !== undefined,
            logger: options.logger,
          });
        }

        if (expiredReq) {
          if (!oldReqId) {
            const pathname = new URL(request.url).pathname;
            log(`Expired request to ${pathname}`, {
              mode: "warn",
              group: true,
              logger: options.logger,
            });
          }

          expiredReq.duration = endTime - expiredReq.startTime;
          options.logger.info("url:", request.url);
          options.logger.info("timeout:", options.timeout);
          options.logger.info("duration:", expiredReq.duration);
          options.logger.groupEnd();
        }

        return;
      }

      if (options.debug) {
        logGroup(["Mocked response", response], { endGroup: true, mode: "debug", logger: options.logger });
      }

      activeRequestIds.splice(activeReqIdx, 1);
      const match: MatchedRequest = {
        request,
        requestId,
        response,
      };
      emitter.emit("pact-msw-adapter:match", match);
      matches.push(match);
    }
  );

  mswMocker.events.on("request:unhandled", ({ request, requestId }) => {
    if (!checkUrlFilters({ request, requestId }, options)) return;

    unhandledRequests.push(request.url);
    log(`Unhandled request: ${request.url}`, { mode: "warn", logger: options.logger });
  });

  return {
    emitter,
    newTest: () => {
      oldRequestIds.push(...activeRequestIds);
      activeRequestIds.length = 0;
      emitter.emit("pact-msw-adapter:new-test");
    },
    verifyTest: () => {
      let errors = "";

      if (unhandledRequests.length) {
        errors += `Requests with missing msw handlers:\n ${unhandledRequests.join(
          "\n"
        )}\n`;
        unhandledRequests.length = 0;
      }

      if (expiredRequests.length) {
        errors += `Expired requests:\n${expiredRequests
          .map((expired) => ({
            expired,
            pending: pendingRequests.find((pending) => pending.requestId === expired.requestId),
          }))
          .filter(({ expired, pending }) => expired && pending)
          .map(({ expired, pending }) => {
            const pathname = new URL(pending!.request.url).pathname;
            return `${pathname}${expired.duration ? `took ${expired.duration}ms and` : ""} timed out after ${options.timeout}ms`;
          })
          .join("\n")}\n`;
        expiredRequests.length = 0;
      }

      if (orphanResponses.length) {
        errors += `Orphan responses:\n${orphanResponses.join("\n")}\n`;
        orphanResponses.length = 0;
      }

      if (errors.length > 0) {
        throw new Error(`Found errors on msw requests.\n${errors}`);
      }
    },
    writeToFile: async (
      writer: (path: string, data: object) => void = createWriter(options)
    ) => {
      // TODO - dedupe pactResults so we only have one file per consumer/provider pair
      // Note: There are scenarios such as feature flagging where you want more than one file per consumer/provider pair
      logGroup(
        [
          "Found the following number of matches to write to a file:- " +
            matches.length,
        ],
        { endGroup: true, logger: options.logger }
      );
      logGroup(JSON.stringify(matches), { endGroup: true, logger: options.logger });

      let pactFiles: PactFile[];
      try {
        pactFiles = await transformMswToPact(
          matches,
          activeRequestIds,
          options,
          emitter
        );
      } catch (error) {
        logGroup(["An error occurred parsing the JSON file", error], { logger: options.logger });
        throw new Error("error generating pact files");
      }

      if (!pactFiles) {
        logGroup(
          [
            "writeToFile() was called but no pact files were generated, did you forget to await the writeToFile() method?",
            matches.length,
          ],
          { endGroup: true, logger: options.logger }
        );
      }

      pactFiles.forEach((pactFile) => {
        const filePath =
          options.pactOutDir +
          "/" +
          [pactFile.consumer.name, pactFile.provider.name].join("-") +
          ".json";
        writer(filePath, pactFile);
      });
    },
    clear: () => {
      pendingRequests.length = 0;

      unhandledRequests.length = 0;
      expiredRequests.length = 0;
      orphanResponses.length = 0;

      oldRequestIds.length = 0;
      activeRequestIds.length = 0;
      matches.length = 0;
      emitter.emit("pact-msw-adapter:clear");
      return;
    },
  };
};

export { convertMswMatchToPact };
const transformMswToPact = async (
  matches: MatchedRequest[],
  activeRequestIds: string[],
  options: PactMswAdapterOptionsInternal,
  emitter: EventEmitter
): Promise<PactFile[]> => {
  try {
    // TODO: Lock new requests, error on clear/new-test if locked

    const requestsCompleted = new Promise<void>((resolve) => {
      if (activeRequestIds.length === 0) {
        resolve();
        return;
      }

      const events = [
        "pact-msw-adapter:expired ",
        "pact-msw-adapter:match",
        "pact-msw-adapter:new-test",
        "pact-msw-adapter:clear",
      ];
      const listener = () => {
        if (activeRequestIds.length === 0) {
          events.forEach((ev) => emitter.off(ev, listener));
          resolve();
        }
      };
      events.forEach((ev) => emitter.on(ev, listener));
    });
    await addTimeout(
      requestsCompleted,
      "requests completed listener",
      options.timeout * 2
    );

    const pactFiles: PactFile[] = [];

    const matchProvider = (match: MatchedRequest) => {
      if (typeof options.providers === "function") return options.providers(match);
      return Object.entries(options.providers)
        .find(([_, paths]) =>
          paths.some((path) => match.request.url.includes(path))
        )?.[0];
    }

    const matchesByProvider: { [key: string]: MatchedRequest[] } = {};
    matches.forEach((match) => {
      const provider = matchProvider(match) ?? "unknown";
      if (!matchesByProvider[provider]) matchesByProvider[provider] = [];
      matchesByProvider[provider].push(match);
    });

    for (const [provider, providerMatches] of Object.entries(
      matchesByProvider
    )) {
      const pactFile = await convertMswMatchToPact({
        consumer: options.consumer,
        provider,
        matches: providerMatches,
        headers: {
          excludeHeaders: options.excludeHeaders,
        },
      });
      if (pactFile) {
        pactFiles.push(pactFile);
      }
    }
    return pactFiles;
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }

    if (err && typeof err === "string") err = new Error(err);

    options.logger.groupCollapsed(
      "%c[pact-msw-adapter] Unexpected error.",
      "color:coral;font-weight:bold;"
    );
    options.logger.info(err);
    options.logger.groupEnd();
    throw err;
  }
};

export interface PactInteraction {
  description: string;
  providerState: string;
  request: {
    method: string;
    path: string;
    headers: any;
    body: JSONValue | FormData | undefined;
    query?: string;
  };
  response: {
    status: number;
    headers: any;
    body: any;
    matchingRules?: object;
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

export interface PactFileMetaData {
  pactSpecification: {
    version: string;
  };
  client: {
    name: string;
    version: string;
  };
}

export interface PendingRequest {
  request: Request;
  requestId: string;
}

export interface MatchedRequest extends PendingRequest {
  response: Response;
}

export interface ExpiredRequest extends PendingRequest {
  startTime: number;
  duration?: number;
}
