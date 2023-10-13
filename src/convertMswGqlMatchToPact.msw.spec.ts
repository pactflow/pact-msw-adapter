
/**
 * TODO:
 * Create a "sampleGqlMatch" like we are doing for the regular rest test (const sampleMatch: MswMatch[] = [ {...data: "myData"}])
 * 
 * Should probably keep it to the same generated pactfile as listed in the original test, except with queries instead of requests
 */

// Example graphql pact file (from running examples/graphql/ in the pact-js repo):
const pactFileExample = {
    "consumer": {
      "name": "GraphQLConsumer"
    },
    "interactions": [
      {
        "description": "a hello request",
        "request": {
          "body": {
            "operationName": "HelloQuery",
            "query": "\n          query HelloQuery {\n            hello\n          }\n        ",
            "variables": {
              "foo": "bar"
            }
          },
          "headers": {
            "Content-Type": "application/json"
          },
          "matchingRules": {
            "$.body.query": {
              "match": "regex",
              "regex": "\\s*query\\s*HelloQuery\\s*\\{\\s*hello\\s*\\}\\s*"
            }
          },
          "method": "POST",
          "path": "/graphql"
        },
        "response": {
          "body": {
            "data": {
              "hello": "Hello world!"
            }
          },
          "headers": {
            "Content-Type": "application/json; charset=utf-8"
          },
          "matchingRules": {
            "$.body.data.hello": {
              "match": "type"
            }
          },
          "status": 200
        }
      }
    ],
    "metadata": {
      "pact-js": {
        "version": "11.0.2"
      },
      "pactRust": {
        "ffi": "0.4.0",
        "models": "1.0.4"
      },
      "pactSpecification": {
        "version": "2.0.0"
      }
    },
    "provider": {
      "name": "GraphQLProvider"
    }
  }

