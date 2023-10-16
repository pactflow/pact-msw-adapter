import ApolloClient from 'apollo-boost';
import { InMemoryCache } from 'apollo-cache-inmemory';
import gql from 'graphql-tag';
import fetch from 'node-fetch';

const client = new ApolloClient({
  cache: new InMemoryCache(),
  fetch,
  uri: 'http://127.0.0.1:4000',
  headers: {
    foo: 'bar',
  },
});

export function GetBooksQuery() {
  return client
    .query({
      query: gql`
        query GetBooks {
            books {
                title
                author
            }
        }
      `,
    })
    .then((result) => result.data);
}
