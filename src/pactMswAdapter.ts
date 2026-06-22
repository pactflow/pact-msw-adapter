// biome-ignore-all lint/complexity/noExcessiveLinesPerFunction: library init and event handler functions are inherently long
// biome-ignore-all lint/style/useExportsLast: exports are interspersed with implementations by design in this public API module
// biome-ignore lint/correctness/noNodejsModules: bare "events" (no node: prefix) lets bundlers polyfill EventEmitter for browser contexts (Cypress + setupWorker)
// biome-ignore lint/style/useNodejsImportProtocol: intentionally omitting node: prefix so webpack/Vite polyfills apply; node:events explicitly opts out of polyfilling
import { EventEmitter } from "events";
import type { SetupWorker } from "msw/browser";
import type { SetupServer } from "msw/node";
// biome-ignore lint/style/noExportedImports: convertMswMatchToPact is used internally and re-exported as part of the public API
import { convertMswMatchToPact } from "./convertMswMatchToPact.ts";
import {
  addTimeout,
  checkUrlFilters,
  createWriter,
  type JsonValue,
  type Logger,
  log,
  logGroup,
} from "./utils/utils.ts";

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
  writeToFile: (
    writer?: (path: string, data: object) => void | Promise<void>,
  ) => Promise<void>;
  clear: () => void;
}
const DEFAULT_TIMEOUT_MS = 200;

export const setupPactMswAdapter = ({
  options: externalOptions,
  worker,
  server,
}: {
  options: PactMswAdapterOptions;
  worker?: SetupWorker;
  server?: SetupServer;
}): PactMswAdapter => {
  if (!(worker || server)) {
    throw new Error("Either a worker or server must be provided");
  }

  const mswMocker = worker ? worker : server;

  if (!mswMocker) {
    throw new Error("Could not setup either the worker or server");
  }
  const emitter = new EventEmitter();

  const options: PactMswAdapterOptionsInternal = {
    logger: console,
    ...externalOptions,
    timeout: externalOptions.timeout || DEFAULT_TIMEOUT_MS,
    debug: externalOptions.debug ?? false,
    pactOutDir: externalOptions.pactOutDir || "./msw_generated_pacts/",
  };

  logGroup(`Adapter enabled${options.debug ? " on debug mode" : ""}`, {
    logger: options.logger,
  });
  if (options.debug) {
    logGroup(["options:", options], {
      endGroup: true,
      mode: "debug",
      logger: options.logger,
    });
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

  mswMocker.events.on("request:match", ({ request, requestId }) => {
    if (!checkUrlFilters({ request, requestId }, options)) {
      return;
    }
    if (options.debug) {
      logGroup(["Matching request", request], {
        endGroup: true,
        mode: "debug",
        logger: options.logger,
      });
    }

    const startTime = Date.now();

    pendingRequests.push({ request, requestId });
    activeRequestIds.push(requestId);

    setTimeout(() => {
      const expired = { requestId, startTime, request };
      const activeIdx = activeRequestIds.indexOf(requestId);
      if (activeIdx >= 0) {
        // Could be removed if completed or the test ended
        activeRequestIds.splice(activeIdx, 1);
        expiredRequests.push(expired);
      }
      emitter.emit("pact-msw-adapter:expired", expired);
    }, options.timeout);
  });

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: response matching logic requires handling expired, orphaned, and active request states
  mswMocker.events.on("response:mocked", ({ response, requestId }) => {
    logGroup(JSON.stringify(response), {
      endGroup: true,
      logger: options.logger,
    });

    const reqIdx = pendingRequests.findIndex(
      (pending) => pending.requestId === requestId,
    );
    if (reqIdx < 0) {
      return; // Filtered and (expired and cleared) requests
    }

    const endTime = Date.now();

    const { request } = pendingRequests.splice(reqIdx, 1)[0];
    const activeReqIdx = activeRequestIds.indexOf(requestId);
    if (activeReqIdx < 0) {
      // Expired requests and responses from previous tests

      const oldReqId = oldRequestIds.find((id) => id === requestId);
      const expiredReq = expiredRequests.find(
        (expired) => expired.requestId === requestId,
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
      logGroup(["Mocked response", response], {
        endGroup: true,
        mode: "debug",
        logger: options.logger,
      });
    }

    activeRequestIds.splice(activeReqIdx, 1);
    const match: MatchedRequest = {
      request,
      requestId,
      response,
    };
    emitter.emit("pact-msw-adapter:match", match);
    matches.push(match);
  });

  mswMocker.events.on("request:unhandled", ({ request, requestId }) => {
    if (!checkUrlFilters({ request, requestId }, options)) {
      return;
    }

    unhandledRequests.push(request.url);
    log(`Unhandled request: ${request.url}`, {
      mode: "warn",
      logger: options.logger,
    });
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

      if (unhandledRequests.length > 0) {
        errors += `Requests with missing msw handlers:\n ${unhandledRequests.join(
          "\n",
        )}\n`;
        unhandledRequests.length = 0;
      }

      if (expiredRequests.length > 0) {
        errors += `Expired requests:\n${expiredRequests
          .map((expired) => ({
            expired,
            pending: pendingRequests.find(
              (pending) => pending.requestId === expired.requestId,
            ),
          }))
          .filter(
            (
              item,
            ): item is { expired: ExpiredRequest; pending: PendingRequest } =>
              Boolean(item.expired) && Boolean(item.pending),
          )
          .map(({ expired, pending }) => {
            const pathname = new URL(pending.request.url).pathname;
            return `${pathname}${expired.duration ? `took ${expired.duration}ms and` : ""} timed out after ${options.timeout}ms`;
          })
          .join("\n")}\n`;
        expiredRequests.length = 0;
      }

      if (orphanResponses.length > 0) {
        errors += `Orphan responses:\n${orphanResponses.join("\n")}\n`;
        orphanResponses.length = 0;
      }

      if (errors.length > 0) {
        throw new Error(`Found errors on msw requests.\n${errors}`);
      }
    },
    writeToFile: async (
      writer: (
        path: string,
        data: object,
      ) => void | Promise<void> = createWriter(),
    ) => {
      // TODO - dedupe pactResults so we only have one file per consumer/provider pair
      // Note: There are scenarios such as feature flagging where you want more than one file per consumer/provider pair
      logGroup(
        [
          "Found the following number of matches to write to a file:- " +
            matches.length,
        ],
        { endGroup: true, logger: options.logger },
      );
      logGroup(JSON.stringify(matches), {
        endGroup: true,
        logger: options.logger,
      });

      let pactFiles: PactFile[];
      try {
        pactFiles = await transformMswToPact(
          matches,
          activeRequestIds,
          options,
          emitter,
        );
      } catch (error) {
        logGroup(["An error occurred parsing the JSON file", error], {
          logger: options.logger,
        });
        throw new Error("error generating pact files");
      }

      if (!pactFiles) {
        logGroup(
          [
            // biome-ignore lint/security/noSecrets: log message, not a secret
            "writeToFile() was called but no pact files were generated, did you forget to await the writeToFile() method?",
            matches.length,
          ],
          { endGroup: true, logger: options.logger },
        );
      }

      await Promise.all(
        pactFiles.map((pactFile) => {
          const filePath =
            options.pactOutDir +
            "/" +
            [pactFile.consumer.name, pactFile.provider.name].join("-") +
            ".json";
          return writer(filePath, pactFile);
        }),
      );
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
  emitter: EventEmitter,
): Promise<PactFile[]> => {
  try {
    // TODO: Lock new requests, error on clear/new-test if locked

    const requestsCompleted = new Promise<void>((resolve) => {
      if (activeRequestIds.length === 0) {
        resolve();
        return;
      }

      const events = [
        "pact-msw-adapter:expired",
        "pact-msw-adapter:match",
        "pact-msw-adapter:new-test",
        "pact-msw-adapter:clear",
      ];
      const listener = () => {
        if (activeRequestIds.length === 0) {
          for (const ev of events) {
            emitter.off(ev, listener);
          }
          resolve();
        }
      };
      for (const ev of events) {
        emitter.on(ev, listener);
      }
    });
    await addTimeout(
      requestsCompleted,
      "requests completed listener",
      options.timeout * 2,
    );

    const matchProvider = (match: MatchedRequest) => {
      if (typeof options.providers === "function") {
        return options.providers(match);
      }
      return Object.entries(options.providers).find(([_, paths]) =>
        paths.some((path) => match.request.url.includes(path)),
      )?.[0];
    };

    const matchesByProvider: { [key: string]: MatchedRequest[] } = {};
    for (const match of matches) {
      const provider = matchProvider(match) ?? "unknown";
      if (!matchesByProvider[provider]) {
        matchesByProvider[provider] = [];
      }
      matchesByProvider[provider].push(match);
    }

    const pactFiles = await Promise.all(
      Object.entries(matchesByProvider).map(([provider, providerMatches]) =>
        convertMswMatchToPact({
          consumer: options.consumer,
          provider,
          matches: providerMatches,
          headers: { excludeHeaders: options.excludeHeaders },
        }),
      ),
    );
    return pactFiles;
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }

    const errToThrow = err && typeof err === "string" ? new Error(err) : err;
    options.logger.groupCollapsed(
      "%c[pact-msw-adapter] Unexpected error.",
      "color:coral;font-weight:bold;",
    );
    options.logger.info(errToThrow);
    options.logger.groupEnd();
    throw errToThrow;
  }
};

export interface PactInteraction {
  description: string;
  providerState: string;
  request: {
    method: string;
    path: string;
    headers: Record<string, string>;
    body: JsonValue | FormData | string | undefined;
    query?: string;
  };
  response: {
    status: number;
    headers: Record<string, string>;
    body: JsonValue | FormData | string | undefined;
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
