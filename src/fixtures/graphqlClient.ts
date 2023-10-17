import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import gql from 'graphql-tag';
import fetch from 'cross-fetch';

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: new HttpLink({ uri: 'http://127.0.0.1:4000/graphql', fetch }),
  headers: {
    foo: 'bar',
  },
});

export function GetBooksQuery() {
  return client
    .query({
      query: gql`
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

// For testing
// GetBooksQuery().then(results => {
//   console.log(results);
// })
