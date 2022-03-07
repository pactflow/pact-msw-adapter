"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.convertMswMatchToPact = exports.setupMswPact = void 0;
var utils_1 = require("./utils/utils");
var convertMswMatchToPact_1 = require("./convertMswMatchToPact");
Object.defineProperty(exports, "convertMswMatchToPact", { enumerable: true, get: function () { return convertMswMatchToPact_1.convertMswMatchToPact; } });
var events_1 = require("events");
var setupMswPact = function (_a) {
    var externalOptions = _a.options, worker = _a.worker, server = _a.server;
    if (!worker && !server) {
        throw new Error('Either a worker or server must be provided');
    }
    var mswMocker = worker ? worker : server;
    if (!mswMocker) {
        throw new Error('Could not setup either the worker or server');
    }
    var emitter = new events_1.EventEmitter();
    var options = __assign(__assign({}, externalOptions), { timeout: externalOptions.timeout || 200, debug: externalOptions.debug || false, pactOutDir: externalOptions.pactOutDir || './msw_generated_pacts/' });
    utils_1.logGroup("Adapter enabled" + (options.debug ? ' on debug mode' : ''));
    if (options.debug) {
        utils_1.logGroup(['options:', options], { endGroup: true });
    }
    else {
        console.groupEnd();
    }
    // This can include expired requests
    var pendingRequests = []; // Requests waiting for their responses
    var unhandledRequests = []; // Requests that need to be handled
    var expiredRequests = []; // Requests that have expired (timeout)
    var orphanResponses = []; // Responses from previous tests
    var oldRequestIds = []; // Pending requests from previous tests
    var activeRequestIds = []; // Pending requests which are still valid
    var matches = []; // Completed request-response pairs
    mswMocker.events.on('request:match', function (req) {
        var url = req.url.toString();
        if (!utils_1.checkUrlFilters(url, options))
            return;
        if (options.debug) {
            utils_1.logGroup(['Matching request', req], { endGroup: true });
        }
        var startTime = Date.now();
        pendingRequests.push(req);
        activeRequestIds.push(req.id);
        setTimeout(function () {
            var activeIdx = activeRequestIds.indexOf(req.id);
            emitter.emit('msw-pact:expired', req);
            if (activeIdx >= 0) { // Could be removed if completed or the test ended
                activeRequestIds.splice(activeIdx, 1);
                expiredRequests.push({
                    reqId: req.id,
                    startTime: startTime
                });
            }
        }, options.timeout);
    });
    mswMocker.events.on('response:mocked', function (response, reqId) {
        var reqIdx = pendingRequests.findIndex(function (req) { return req.id === reqId; });
        if (reqIdx < 0)
            return; // Filtered and (expired and cleared) requests
        var endTime = Date.now();
        var request = pendingRequests.splice(reqIdx, 1)[0];
        var activeReqIdx = activeRequestIds.indexOf(reqId);
        if (activeReqIdx < 0) {
            // Expired requests and responses from previous tests
            var oldReqId = oldRequestIds.find(function (id) { return id === reqId; });
            var expiredReq = expiredRequests.find(function (expired) { return expired.reqId === reqId; });
            if (oldReqId) {
                orphanResponses.push(request.url.toString());
                utils_1.log("Orphan response: " + request.url, { mode: 'warning', group: expiredReq !== undefined });
            }
            if (expiredReq) {
                if (!oldReqId) {
                    utils_1.log("Expired request to " + request.url.pathname, { mode: 'warning', group: true });
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
            utils_1.logGroup(['Mocked response', response], { endGroup: true });
        }
        activeRequestIds.splice(activeReqIdx, 1);
        var match = { request: request, response: response };
        emitter.emit('msw-pact:match', match);
        matches.push(match);
    });
    mswMocker.events.on('request:unhandled', function (req) {
        var url = req.url.toString();
        if (!utils_1.checkUrlFilters(url, options))
            return;
        unhandledRequests.push(url);
        utils_1.warning("Unhandled request: " + url);
    });
    return {
        emitter: emitter,
        newTest: function () {
            oldRequestIds.push.apply(oldRequestIds, activeRequestIds);
            activeRequestIds.length = 0;
            emitter.emit('msw-pact:new-test');
        },
        verifyTest: function () {
            var errors = '';
            if (unhandledRequests.length) {
                errors += "Requests with missing msw handlers:\n " + unhandledRequests.join('\n') + "\n";
                unhandledRequests.length = 0;
            }
            if (expiredRequests.length) {
                errors += "Expired requests:\n" + expiredRequests
                    .map(function (expired) { return ({ expired: expired, req: pendingRequests.find(function (req) { return req.id === expired.reqId; }) }); })
                    .filter(function (_a) {
                    var expired = _a.expired, req = _a.req;
                    return expired && req;
                })
                    .map(function (_a) {
                    var expired = _a.expired, req = _a.req;
                    return "" + req.url.pathname + (expired.duration ? "took " + expired.duration + "ms and" : '') + " timed out after " + options.timeout + "ms";
                })
                    .join('\n') + "\n";
                expiredRequests.length = 0;
            }
            if (orphanResponses.length) {
                errors += "Orphan responses:\n" + orphanResponses.join('\n') + "\n";
                orphanResponses.length = 0;
            }
            if (errors.length > 0) {
                throw new Error("Found errors on msw requests.\n" + errors);
            }
        },
        writeToFile: function (writer) {
            if (writer === void 0) { writer = utils_1.writeData2File; }
            return __awaiter(void 0, void 0, void 0, function () {
                var pactFiles;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            // TODO - dedupe pactResults so we only have one file per consumer/provider pair
                            // Note: There are scenarios such as feature flagging where you want more than one file per consumer/provider pair
                            utils_1.logGroup(['Found the following number of matches to write to a file:- ' + matches.length]);
                            return [4 /*yield*/, transformMswToPact(matches, activeRequestIds, options, emitter)];
                        case 1:
                            pactFiles = _a.sent();
                            if (!pactFiles) {
                                utils_1.logGroup(['writeToFile() was called but no pact files were generated, did you forget to await the writeToFile() method?', matches.length], { endGroup: true });
                            }
                            pactFiles.forEach(function (pactFile) {
                                var filePath = options.pactOutDir + '/' +
                                    [
                                        pactFile.consumer.name,
                                        pactFile.provider.name,
                                        Date.now().toString(),
                                    ].join('-') +
                                    '.json';
                                writer(filePath, pactFile);
                            });
                            return [2 /*return*/];
                    }
                });
            });
        },
        clear: function () {
            pendingRequests.length = 0;
            unhandledRequests.length = 0;
            expiredRequests.length = 0;
            orphanResponses.length = 0;
            oldRequestIds.length = 0;
            activeRequestIds.length = 0;
            matches.length = 0;
            emitter.emit('msw-pact:clear');
            return;
        },
    };
};
exports.setupMswPact = setupMswPact;
var transformMswToPact = function (matches, activeRequestIds, options, emitter) { return __awaiter(void 0, void 0, void 0, function () {
    var requestsCompleted, pactFiles, providers_1, matchesByProvider_1, _i, _a, _b, provider, providerMatches, pactFile, err_1;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                requestsCompleted = new Promise(function (resolve) {
                    if (activeRequestIds.length === 0) {
                        resolve();
                        return;
                    }
                    var events = ['msw-pact:expired ', 'msw-pact:match', 'msw-pact:new-test', 'msw-pact:clear'];
                    var listener = function () {
                        if (activeRequestIds.length === 0) {
                            events.forEach(function (ev) { return emitter.off(ev, listener); });
                            resolve();
                        }
                    };
                    events.forEach(function (ev) { return emitter.on(ev, listener); });
                });
                return [4 /*yield*/, utils_1.addTimeout(requestsCompleted, 'requests completed listener', options.timeout * 2)];
            case 1:
                _c.sent();
                pactFiles = [];
                providers_1 = Object.entries(options.providers);
                matchesByProvider_1 = {};
                matches.forEach(function (match) {
                    var _a;
                    var url = match.request.url.toString();
                    var provider = ((_a = providers_1.find(function (_a) {
                        var _ = _a[0], paths = _a[1];
                        return paths.some(function (path) { return url.includes(path); });
                    })) === null || _a === void 0 ? void 0 : _a[0]) || 'unknown';
                    if (!matchesByProvider_1[provider])
                        matchesByProvider_1[provider] = [];
                    matchesByProvider_1[provider].push(match);
                });
                for (_i = 0, _a = Object.entries(matchesByProvider_1); _i < _a.length; _i++) {
                    _b = _a[_i], provider = _b[0], providerMatches = _b[1];
                    pactFile = convertMswMatchToPact_1.convertMswMatchToPact({ consumer: options.consumer, provider: provider, matches: providerMatches });
                    if (pactFile) {
                        pactFiles.push(pactFile);
                    }
                }
                return [2 /*return*/, pactFiles];
            case 2:
                err_1 = _c.sent();
                if (err_1 instanceof Error) {
                    throw err_1;
                }
                if (err_1 && typeof (err_1) === 'string')
                    err_1 = new Error(err_1);
                console.groupCollapsed('%c[msw-pact] Unexpected error.', 'color:coral;font-weight:bold;');
                console.log(err_1);
                console.groupEnd();
                throw err_1;
            case 3: return [2 /*return*/];
        }
    });
}); };
