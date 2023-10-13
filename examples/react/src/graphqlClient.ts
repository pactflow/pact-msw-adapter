import ApolloClient from 'apollo-boost';
import { InMemoryCache } from 'apollo-cache-inmemory';
import gql from 'graphql-tag';

const client = new ApolloClient({
  cache: new InMemoryCache(),
  uri: 'http://127.0.0.1:4000',
  headers: {
    foo: 'bar',
  },
});

export function query() {
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
      variables: {
        foo: 'bar',
      },
    })
    .then((result) => result.data);
}

query().then(results => {
  console.log(results);
})
