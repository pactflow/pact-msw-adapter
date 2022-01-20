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

export { j2s, ensureDirExists, writeData2File, checkUrlFilters };
