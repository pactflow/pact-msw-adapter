"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTimeout = exports.checkUrlFilters = exports.writeData2File = exports.logGroup = exports.warning = exports.log = void 0;
var path = require("path");
var fs; // dynamic import
var logPrefix = '[msw-pact]';
var logColors = {
    log: 'forestgreen',
    warning: 'gold',
    error: 'coral'
};
var log = function (message, options) {
    var group = (options === null || options === void 0 ? void 0 : options.group) || false;
    var mode = (options === null || options === void 0 ? void 0 : options.mode) || 'log';
    var color = logColors[mode];
    var logFunction = group ? console.groupCollapsed : console.log;
    logFunction("%c" + logPrefix + " %c" + message, "color:" + color, 'color:inherit');
};
exports.log = log;
var warning = function (message) { return log(message, { mode: 'warning' }); };
exports.warning = warning;
var logGroup = function (message, options) {
    var isArray = message instanceof Array;
    if (isArray) {
        var label = message[0], content = message.slice(1);
        log(label, { group: true });
        content.forEach(function (c) { return console.log(c); });
    }
    else {
        log(message, { group: true });
    }
    if (options === null || options === void 0 ? void 0 : options.endGroup) {
        console.groupEnd();
    }
};
exports.logGroup = logGroup;
var ensureDirExists = function (filePath) {
    var _a, _b;
    var dirname = path.dirname(filePath);
    if ((_a = fs.existsSync) === null || _a === void 0 ? void 0 : _a.call(fs, dirname)) {
        return true;
    }
    (_b = fs.mkdirSync) === null || _b === void 0 ? void 0 : _b.call(fs, dirname);
};
var writeData2File = function (filePath, data) {
    var _a;
    if (!fs) {
        try {
            fs = require('fs');
        }
        catch (e) { }
    }
    if (!(fs === null || fs === void 0 ? void 0 : fs.existsSync)) {
        log('You need a node environment to save files.', { mode: 'warning', group: true });
        console.log('filePath:', filePath);
        console.log('contents:', data);
        console.groupEnd();
    }
    else {
        ensureDirExists(filePath);
        (_a = fs.writeFileSync) === null || _a === void 0 ? void 0 : _a.call(fs, filePath, JSON.stringify(data));
    }
};
exports.writeData2File = writeData2File;
var checkUrlFilters = function (urlString, options) {
    var _a;
    var providerFilter = (_a = Object.values(options.providers)) === null || _a === void 0 ? void 0 : _a.some(function (validPaths) { return validPaths.some(function (path) { return urlString.includes(path); }); });
    var includeFilter = !options.includeUrl || options.includeUrl.some(function (inc) { return urlString.includes(inc); });
    var excludeFilter = !options.excludeUrl || !options.excludeUrl.some(function (exc) { return urlString.includes(exc); });
    var matchIsAllowed = includeFilter && excludeFilter && providerFilter;
    if (options.debug) {
        logGroup(['Checking request against url filters', { urlString: urlString, providerFilter: providerFilter, includeFilter: includeFilter, excludeFilter: excludeFilter, matchIsAllowed: matchIsAllowed }]);
    }
    return matchIsAllowed;
};
exports.checkUrlFilters = checkUrlFilters;
var addTimeout = function (promise, label, timeout) { return __awaiter(void 0, void 0, void 0, function () {
    var asyncTimeout;
    return __generator(this, function (_a) {
        asyncTimeout = new Promise(function (_, reject) {
            setTimeout(function () {
                reject(new Error("[msw-pact] " + label + " timed out after " + timeout + "ms"));
            }, timeout);
        });
        return [2 /*return*/, Promise.race([promise, asyncTimeout])];
    });
}); };
exports.addTimeout = addTimeout;
