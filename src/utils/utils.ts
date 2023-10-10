import { MockedRequest } from "msw";
import { PactMswAdapterOptionsInternal } from "../pactMswAdapter";
var path = require("path");
let fs: any; // dynamic import

const logPrefix = '[pact-msw-adapter]';
const logColors = {
  debug: 'gray',
  info: 'forestgreen',
  warn: 'gold',
  error: 'coral'
};

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type Logger = Pick<typeof console, LogLevel | 'groupEnd' | 'groupCollapsed'>

const log = (message: any, options: { group?: boolean, mode?: LogLevel, logger: Logger }) => {
  const group = options?.group || false;
  const mode = options?.mode || 'info';
  const color = logColors[mode];

  const logFunction = group ? options.logger.groupCollapsed : options.logger[mode];
  logFunction(`%c${logPrefix} %c${message}`, `color:${color}`, 'color:inherit');
}

const logGroup = (message: any | any[], options: { endGroup?: boolean; mode?: LogLevel; logger: Logger }) => {
  const isArray = message instanceof Array;
  if (isArray) {
    const [label, ...content] = message;
    log(label, { group: true, mode: options.mode, logger: options.logger });
    content.forEach((c: any) => options.logger[options?.mode || 'info'](c));
  } else {
    log(message, { group: true, mode: options.mode, logger: options.logger });
  }

  if (options?.endGroup) {
    options.logger.groupEnd();
  }
}

const ensureDirExists = (filePath: string) => {
  var dirname = path.dirname(filePath);
  if (fs.existsSync?.(dirname)) {
    return true;
  }
  fs.mkdirSync?.(dirname);
};

const createWriter = (options: PactMswAdapterOptionsInternal) => (filePath: string, data: Object) => {
  if (!fs) {
    try {
      fs = require('fs');
    } catch (e) {}
  }
  if (!fs?.existsSync) {
    log('You need a node environment to save files.', { mode: 'warn', group: true, logger: options.logger });
    options.logger.info('filePath:', filePath);
    options.logger.info('contents:', data);
    options.logger.groupEnd();
  } else {
    ensureDirExists(filePath);
    fs.writeFileSync?.(filePath, JSON.stringify(data));
  }
};

const hasProvider = (request: MockedRequest, options: PactMswAdapterOptionsInternal) => {
  if (typeof options.providers === 'function') {
    return options.providers(request) !== null;
  }
  return Object.values(options.providers)
    ?.some(validPaths => validPaths.some(path => request.url.toString().includes(path)));
};

const checkUrlFilters = (request: MockedRequest, options: PactMswAdapterOptionsInternal) => {
  const urlString = request.url.toString();
  const providerFilter = hasProvider(request, options);
  const includeFilter = !options.includeUrl || options.includeUrl.some(inc => urlString.includes(inc));
  const excludeFilter = !options.excludeUrl || !options.excludeUrl.some(exc => urlString.includes(exc));
  const matchIsAllowed = includeFilter && excludeFilter && providerFilter
  if (options.debug) {
    logGroup(['Checking request against url filters', { urlString, providerFilter, includeFilter, excludeFilter, matchIsAllowed }], { logger: options.logger });
  }

  return matchIsAllowed;
};

const addTimeout = async<T>(promise: Promise<T>, label: string, timeout: number) => {
  const asyncTimeout = new Promise<void>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`[pact-msw-adapter] ${label} timed out after ${timeout}ms`));
    }, timeout).unref();
  });

  return Promise.race([promise, asyncTimeout]);
}

export { log, logGroup, createWriter, checkUrlFilters, addTimeout };
