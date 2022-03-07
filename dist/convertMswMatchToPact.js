"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertMswMatchToPact = void 0;
var convertMswMatchToPact = function (_a) {
    var consumer = _a.consumer, provider = _a.provider, matches = _a.matches;
    var pactFile = {
        consumer: { name: consumer },
        provider: { name: provider },
        interactions: matches.map(function (match) {
            var _a;
            return ({
                description: match.request.id,
                providerState: "",
                request: {
                    method: match.request.method,
                    path: match.request.url.pathname,
                    headers: match.request.headers['_headers'],
                    body: match.request.bodyUsed ? match.request.body : undefined,
                },
                response: {
                    status: match.response.status,
                    headers: match.response.headers,
                    body: match.response.body
                        ? ((_a = match.response.headers.get("content-type")) === null || _a === void 0 ? void 0 : _a.includes("json"))
                            ? (JSON.parse(match.response.body))
                            : match.response.body
                        : undefined,
                },
            });
        }),
        metadata: {
            pactSpecification: {
                version: '2.0.0',
            },
        },
    };
    return pactFile;
};
exports.convertMswMatchToPact = convertMswMatchToPact;
