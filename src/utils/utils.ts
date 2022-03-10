import { MswPactAdapterOptions } from "../mswPactAdapter";
var path = require("path");
let fs: any; // dynamic import

const logPrefix = '[msw-pact-adapter]';
const logColors = {
  log: 'forestgreen',
  warning: 'gold',
  error: 'coral'
};

const log = (message: any, options?: { group?: boolean, mode?: 'log' | 'warning' | 'error' }) => {
  const group = options?.group || false;
  const mode = options?.mode || 'log';
  const color = logColors[mode];

  const logFunction = group ? console.groupCollapsed : console.log;
  logFunction(`%c${logPrefix} %c${message}`, `color:${color}`, 'color:inherit');
}

const warning = (message: any) => log(message, { mode: 'warning' });
const logGroup = (message: any | any[], options?: { endGroup?: boolean }) => {
  const isArray = message instanceof Array;
  if (isArray) {
    const [label, ...content] = message;
    log(label, { group: true });
    content.forEach((c: any) => console.log(c));
  } else {
    log(message, { group: true });
  }

  if (options?.endGroup) {
    console.groupEnd();
  }
}

const ensureDirExists = (filePath: string) => {
  var dirname = path.dirname(filePath);
  if (fs.existsSync?.(dirname)) {
    return true;
  }
  fs.mkdirSync?.(dirname);
};

const writeData2File = (filePath: string, data: Object) => {
  if (!fs) {
    try {
      fs = require('fs');
    } catch (e) {}
  }
  if (!fs?.existsSync) {
    log('You need a node environment to save files.', { mode: 'warning', group: true });
    console.log('filePath:', filePath);
    console.log('contents:', data);
    console.groupEnd();
  } else {
    ensureDirExists(filePath);
    fs.writeFileSync?.(filePath, JSON.stringify(data));
  }
};

const checkUrlFilters = (urlString: string, options: MswPactAdapterOptions) => {
  const providerFilter = Object.values(options.providers)
    ?.some(validPaths => validPaths.some(path => urlString.includes(path)));
  const includeFilter = !options.includeUrl || options.includeUrl.some(inc => urlString.includes(inc));
  const excludeFilter = !options.excludeUrl || !options.excludeUrl.some(exc => urlString.includes(exc));
  const matchIsAllowed = includeFilter && excludeFilter && providerFilter
  if (options.debug) {
    logGroup(['Checking request against url filters', { urlString, providerFilter, includeFilter, excludeFilter, matchIsAllowed }]);
  }

  return matchIsAllowed;
};

const addTimeout = async<T>(promise: Promise<T>, label: string, timeout: number) => {
  const asyncTimeout = new Promise<void>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`[msw-pact-adapter] ${label} timed out after ${timeout}ms`));
    }, timeout);
  });

  return Promise.race([promise, asyncTimeout]);
}

export { log, warning, logGroup, writeData2File, checkUrlFilters, addTimeout };
