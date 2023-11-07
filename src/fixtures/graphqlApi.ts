// Using the example graphql api here: https://www.apollographql.com/blog/graphql/examples/building-a-graphql-api/

import { ApolloServer } from "@apollo/server";
import gql from "graphql-tag";
const { startStandaloneServer } = require("@apollo/server/standalone");

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = gql`
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
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
  },
  {
    title: "Wuthering Heights",
    author: "Emily Brontë",
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
export const server = new ApolloServer({ typeDefs, resolvers });

export const runStandaloneServer = async (server: any) => {
  await startStandaloneServer(server, {
    listen: {
      port: 4000,
      path: "/graphql",
    },
    //@ts-ignore
  }).then((url) => {
    console.log(`🚀  Server ready at ${url.url}`);
  });
};

if (process.argv[2] == "run"){
  runStandaloneServer(server)
}