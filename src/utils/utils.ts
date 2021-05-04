import { writeFileSync, existsSync, mkdirSync } from "fs";
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
export { j2s, ensureDirExists, writeData2File };
