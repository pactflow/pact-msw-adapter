import { writeFileSync, existsSync, mkdirSync } from "fs";
import { MswPactOptions } from "../mswPact";
var path = require("path");

const ensureDirExists = (filePath: string) => {
  var dirname = path.dirname(filePath);
  if (existsSync(dirname)) {
    return true;
  }
  ensureDirExists(dirname);
  mkdirSync(dirname);
};

const j2s = (json: Object) => JSON.stringify(json);

const writeData2File = (filePath: string, data: Object) => {
  ensureDirExists(filePath);
  writeFileSync(filePath, j2s(data));
};

const checkUrlFilters = (urlString: string, options?: MswPactOptions) => {
  const includeFilter = !options?.includeUrl || options?.includeUrl.some(inc => urlString.includes(inc));
  const excludeFilter = !options?.excludeUrl || !options?.excludeUrl.some(exc => urlString.includes(exc));
  return includeFilter && excludeFilter;
};

const addTimeout = async<T> (promise: Promise<T>, label: string, timeout: number) => {
  const asyncTimeout = new Promise<void>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`[msw-pact] ${label} timed out after ${timeout}ms`));
    }, timeout);
  });

  return Promise.race([promise, asyncTimeout]);
}

export { j2s, ensureDirExists, writeData2File, checkUrlFilters, addTimeout };
