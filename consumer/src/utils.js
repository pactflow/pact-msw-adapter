import { writeFileSync, existsSync, mkdirSync } from "fs";
var path = require("path");

const ensureDirExists = (filePath) => {
  var dirname = path.dirname(filePath);
  if (existsSync(dirname)) {
    return true;
  }
  ensureDirExists(dirname);
  mkdirSync(dirname);
};

const j2s = (json) => JSON.stringify(json);
const s2j = (string) => JSON.parse(string);

const writeData2File = (filePath, data) => {
  ensureDirExists(filePath);
  writeFileSync(filePath, j2s(data));
};
export { j2s, ensureDirExists, writeData2File, s2j };
