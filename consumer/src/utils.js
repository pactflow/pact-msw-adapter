import { existsSync, mkdirSync } from "fs";
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

export { j2s, ensureDirExists };
