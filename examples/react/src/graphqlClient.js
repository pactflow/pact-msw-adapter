"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetBooksQuery = void 0;
const client_1 = require("@apollo/client");
const graphql_tag_1 = __importDefault(require("graphql-tag"));
const cross_fetch_1 = __importDefault(require("cross-fetch"));
const client = new client_1.ApolloClient({
    cache: new client_1.InMemoryCache(),
    link: new client_1.HttpLink({ uri: 'http://127.0.0.1:4000/graphql', fetch: cross_fetch_1.default }),
    headers: {
        foo: 'bar',
    },
});
function GetBooksQuery() {
    return client
        .query({
        query: (0, graphql_tag_1.default) `
        query GetBooksQuery {
            books {
                title
                author
            }
        }
      `,
    })
        //@ts-ignore
        .then((result) => result.data);
}
exports.GetBooksQuery = GetBooksQuery;
// For testing
// GetBooksQuery().then(results => {
//   console.log(results);
// })
