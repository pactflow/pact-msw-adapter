import { DefaultRequestBody, MockedRequest, SetupWorkerApi } from 'msw';
import { addTimeout, checkUrlFilters, log, logGroup, warning, writeData2File } from './utils/utils';
import { convertMswMatchToPact } from './convertMswMatchToPact';
import { EventEmitter } from 'events';
import { SetupServerApi } from 'msw/lib/types/node/glossary';
import { IsomorphicResponse } from '@mswjs/interceptors'
export interface MswPactAdapterOptions {
  timeout?: number;
  debug?: boolean;
  pactOutDir?: string;
  consumer: string;
  providers: { [name: string]: string[] };
  includeUrl?: string[];
  excludeUrl?: string[];
  excludeHeaders?: string[];
}
export interface MswPactAdapterOptionsInternal {
  timeout: number;
  debug: boolean;
  pactOutDir: string;
  consumer: string;
  providers: { [name: string]: string[] };
  includeUrl?: string[];
  excludeUrl?: string[];
  excludeHeaders?: string[];
}

export const setupMswPactAdapter = ({
  options: externalOptions,
  worker,
  server
}: {
  options: MswPactAdapterOptions;
  worker?: SetupWorkerApi;
  server?: SetupServerApi;
}) => {
  if (!worker && !server) {
    throw new Error('Either a worker or server must be provided')
  }

  const mswMocker = worker ? worker : server

  if (!mswMocker) {
    throw new Error('Could not setup either the worker or server')
  }
  const emitter = new EventEmitter();

  const options: MswPactAdapterOptionsInternal = {
    ...externalOptions,
    timeout: externalOptions.timeout || 200,
    debug: externalOptions.debug || false,
    pactOutDir: externalOptions.pactOutDir || './msw_generated_pacts/'
  };

  logGroup(`Adapter enabled${options.debug ? ' on debug mode' : ''}`);
  if (options.debug) {
    logGroup(['options:', options], { endGroup: true });
  } else {
    console.groupEnd();
  }


  // This can include expired requests
  const pendingRequests: MockedRequest[] = []; // Requests waiting for their responses

  const unhandledRequests: string[] = []; // Requests that need to be handled
  const expiredRequests: ExpiredRequest[] = []; // Requests that have expired (timeout)
  const orphanResponses: string[] = []; // Responses from previous tests

  const oldRequestIds: string[] = []; // Pending requests from previous tests
  const activeRequestIds: string[] = []; // Pending requests which are still valid
  const matches: MswMatch[] = []; // Completed request-response pairs


  mswMocker.events.on('request:match', (req) => {
    const url = req.url.toString();
    if (!checkUrlFilters(url, options)) return;
    if (options.debug) {
      logGroup(['Matching request', req], { endGroup: true });
    }

    const startTime = Date.now();

    pendingRequests.push(req);
    activeRequestIds.push(req.id);

    setTimeout(() => {
      const activeIdx = activeRequestIds.indexOf(req.id);
      emitter.emit('pact-msw-adapter:expired', req);
      if (activeIdx >= 0) { // Could be removed if completed or the test ended
        activeRequestIds.splice(activeIdx, 1);
        expiredRequests.push({
          reqId: req.id,
          startTime
        });
      }

    }, options.timeout);
  });

  mswMocker.events.on('response:mocked', (response: Response | IsomorphicResponse, reqId: string) => {
    const reqIdx = pendingRequests.findIndex(req => req.id === reqId);
    if (reqIdx < 0) return; // Filtered and (expired and cleared) requests

    const endTime = Date.now();

    const request = pendingRequests.splice(reqIdx, 1)[0];
    const activeReqIdx = activeRequestIds.indexOf(reqId);
    if (activeReqIdx < 0) {
      // Expired requests and responses from previous tests

      const oldReqId = oldRequestIds.find(id => id === reqId);
      const expiredReq = expiredRequests.find(expired => expired.reqId === reqId);
      if (oldReqId) {
        orphanResponses.push(request.url.toString());
        log(`Orphan response: ${request.url}`, { mode: 'warning', group: expiredReq !== undefined });
      }

      if (expiredReq) {
        if (!oldReqId) {
          log(`Expired request to ${request.url.pathname}`, { mode: 'warning', group: true });
        }

        expiredReq.duration = endTime - expiredReq.startTime;
        console.log('url:', request.url);
        console.log('timeout:', options.timeout);
        console.log('duration:', expiredReq.duration);
        console.groupEnd();
      }

      return;
    }

    if (options.debug) {
      logGroup(['Mocked response', response], { endGroup: true });
    }

    activeRequestIds.splice(activeReqIdx, 1);
    const match = { request, response: response as Response };
    emitter.emit('pact-msw-adapter:match', match);
    matches.push(match);
  });

  mswMocker.events.on('request:unhandled', (req) => {
    const url = req.url.toString();
    if (!checkUrlFilters(url, options)) return;

    unhandledRequests.push(url);
    warning(`Unhandled request: ${url}`);
  });

  return {
    emitter,
    newTest: () => {
      oldRequestIds.push(...activeRequestIds);
      activeRequestIds.length = 0;
      emitter.emit('pact-msw-adapter:new-test');
    },
    verifyTest: () => {
      let errors = '';

      if (unhandledRequests.length) {
        errors += `Requests with missing msw handlers:\n ${unhandledRequests.join('\n')}\n`;
        unhandledRequests.length = 0;
      }

      if (expiredRequests.length) {
        errors += `Expired requests:\n${expiredRequests
          .map(expired => ({ expired, req: pendingRequests.find(req => req.id === expired.reqId) }))
          .filter(({ expired, req }) => expired && req)
          .map(({ expired, req }) => `${req!.url.pathname}${expired.duration ? `took ${expired.duration}ms and` : ''
            } timed out after ${options.timeout}ms`)
          .join('\n')}\n`;
        expiredRequests.length = 0;
      }

      if (orphanResponses.length) {
        errors += `Orphan responses:\n${orphanResponses.join('\n')}\n`;
        orphanResponses.length = 0;
      }

      if (errors.length > 0) {
        throw new Error(`Found errors on msw requests.\n${errors}`);
      }
    },
    writeToFile: async (writer: (path: string, data: object) => void = writeData2File) => {
      // TODO - dedupe pactResults so we only have one file per consumer/provider pair
      // Note: There are scenarios such as feature flagging where you want more than one file per consumer/provider pair
      logGroup(['Found the following number of matches to write to a file:- ' + matches.length]);

      const pactFiles = await transformMswToPact(matches, activeRequestIds, options, emitter);
      if (!pactFiles) {
        logGroup(['writeToFile() was called but no pact files were generated, did you forget to await the writeToFile() method?', matches.length], { endGroup: true });

      }


      pactFiles.forEach((pactFile) => {
        const filePath =
          options.pactOutDir + '/' +
          [
            pactFile.consumer.name,
            pactFile.provider.name,
            Date.now().toString(),
          ].join('-') +
          '.json';
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
      emitter.emit('pact-msw-adapter:clear');
      return;
    },
  };
};

export { convertMswMatchToPact };
const transformMswToPact = async (
  matches: MswMatch[],
  activeRequestIds: string[],
  options: MswPactAdapterOptionsInternal,
  emitter: EventEmitter
): Promise<PactFile[]> => {
  try {
    // TODO: Lock new requests, error on clear/new-test if locked

    const requestsCompleted = new Promise<void>(resolve => {
      if (activeRequestIds.length === 0) {
        resolve();
        return;
      }

      const events = ['pact-msw-adapter:expired ', 'pact-msw-adapter:match', 'pact-msw-adapter:new-test', 'pact-msw-adapter:clear'];
      const listener = () => {
        if (activeRequestIds.length === 0) {
          events.forEach((ev) => emitter.off(ev, listener));
          resolve();
        }
      };
      events.forEach((ev) => emitter.on(ev, listener));
    });
    await addTimeout(requestsCompleted, 'requests completed listener', options.timeout * 2);

    const pactFiles: PactFile[] = [];
    const providers = Object.entries(options.providers);
    const matchesByProvider: { [key: string]: MswMatch[] } = {};
    matches.forEach((match) => {
      const url = match.request.url.toString();
      const provider = providers.find(([_, paths]) => paths.some(path => url.includes(path)))?.[0] || 'unknown';
      if (!matchesByProvider[provider]) matchesByProvider[provider] = [];
      matchesByProvider[provider].push(match);
    });


    for (const [provider, providerMatches] of Object.entries(matchesByProvider)) {
      const pactFile =
        convertMswMatchToPact(
          { consumer: options.consumer, provider, matches: providerMatches, headers: { excludeHeaders: options.excludeHeaders } })
      if (pactFile) {
        pactFiles.push(pactFile);
      }
    }
    return pactFiles;
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }

    if (err && typeof (err) === 'string')
      err = new Error(err);

    console.groupCollapsed('%c[pact-msw-adapter] Unexpected error.', 'color:coral;font-weight:bold;');
    console.log(err);
    console.groupEnd();
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
  consumer: PactParticipants['consumer'];
  provider: PactParticipants['provider'];
  interactions: PactInteraction[];
  metadata: PactFileMetaData;
}

export interface PactFileMetaData {
  pactSpecification: {
    version: string;
  };
}

export interface MswMatch {
  request: MockedRequest;
  response: Response | IsomorphicResponse;
}

export interface ExpiredRequest {
  reqId: string;
  startTime: number;
  duration?: number;
}
