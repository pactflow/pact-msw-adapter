"use strict";
// Using the example graphql api here: https://www.apollographql.com/blog/graphql/examples/building-a-graphql-api/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@apollo/server");
const graphql_tag_1 = __importDefault(require("graphql-tag"));
const { startStandaloneServer } = require('@apollo/server/standalone');
// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = (0, graphql_tag_1.default) `
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.



  # This "Book" type defines the queryable fields: 'title' and 'author'.
  type Book {
    title: String
    author: String
  }

  # The "GetBooksQuery" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "GetBooksQuery" query returns an array of zero or more Books (defined above).
  type Query {
    books: [Book]
  }
`;
const books = [
    {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
    },
    {
        title: 'Wuthering Heights',
        author: 'Emily Brontë',
    },
];
// Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.
const resolvers = {
    Query: {
        books: () => books,
    },
};
// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new server_1.ApolloServer({ typeDefs, resolvers });
startStandaloneServer(server, {
    listen: {
        port: 4000,
        path: '/graphql',
    },
    //@ts-ignore
}).then((url) => {
    console.log(`🚀  Server ready at ${url.url}`);
});
