import { PactFile, MatchedRequest } from "./pactMswAdapter";
import { omit } from "lodash";
import { JSONValue } from "./utils/utils";
// const { MatchersV3 } = require("@pact-foundation/pact");
import { MatchersV3 } from "@pact-foundation/pact";
const pjson = require("../package.json");

export const readBody = async (input: Request | Response) => {
  // so we don't reread body somewhere
  const clone = input.clone();

  if (clone.body === null) return undefined;

  const contentType = clone.headers.get("content-type");
  if (contentType?.startsWith("application/json")) {
    return clone.json() as Promise<JSONValue>;
  } else if (contentType?.startsWith("multipart/form-data")) {
    return clone.formData();
  }

  // default to text
  return clone.text();
};

// const serialiseResponseObject = (key: string, value: unknown): object => {
//   if (MatchersV3.isMatcher(value)) {
//     return {
//       [key]: value.value,
//     };
//   }

//   if (value === null) {
//     return { [key]: "" };
//   }

//   if (Array.isArray(value)) {
//     const serialisedArray = value.map((item) => serialiseResponse(item));
//     return { [key]: serialisedArray };
//   }

//   if (typeof value === "object" && value !== null) {
//     const fields = Object.entries(value);
//     const serialisedFields = fields.reduce((acc, [fieldKey, fieldValue]) => {
//       return {
//         ...acc,
//         ...serialiseResponseObject(fieldKey, fieldValue),
//       };
//     }, {});
//     return { [key]: serialisedFields };
//   }

//   return { [key]: value };
// };

// const serialiseResponse = (field: unknown): object | undefined => {
//   if (MatchersV3.isMatcher(field)) {
//     return serialiseResponse(field.value);
//   }

//   if (field === null) {
//     return undefined;
//   }

//   if (Array.isArray(field)) {
//     return field.map((item) => serialiseResponse(item));
//   }

//   if (typeof field === "object") {
//     const fields = Object.entries(field);
//     const serialisedFields = fields.reduce((acc, [fieldKey, fieldValue]) => {
//       return {
//         ...acc,
//         ...serialiseResponseObject(fieldKey, fieldValue),
//       };
//     }, {});
//     return serialisedFields;
//   }

//   return field;
// };

const buildMatchingRules = (
  field: unknown,
  path: string = "$"
): object | undefined => {
  let matchingRules: any = {};

  if (field === null) {
    return undefined;
  }

  if (typeof field === "object") {
    // Traverse the object to find nested matchers
    Object.entries(field).forEach(([key, value]) => {
      const newPath = `${path}.${key}`;
      const nestedMatchingRules = buildMatchingRules(value, newPath);
      matchingRules = { ...matchingRules, ...nestedMatchingRules };
    });
  }

  if (path === "$") {
    return matchingRules;
  }

  // if (Array.isArray(field)) {
  //   matchingRules[path] = {
  //     combine: "AND",
  //     matchers: [
  //       {
  //         match: "type",
  //         min: 1,
  //       },
  //     ],
  //   };
  // }else{
  if (typeof field !== "object") {
    matchingRules[path] = {
      matchers: [
        {
          match: "type",
        },
      ],
    };
  }
  // }

  return matchingRules;
};

export const convertMswMatchToPact = async ({
  consumer,
  provider,
  matches,
  headers,
  options,
}: {
  consumer: string;
  provider: string;
  matches: MatchedRequest[];
  headers?: { excludeHeaders: string[] | undefined };
  options?: { useFuzzyMatchers: boolean; pactVersion: string };
}): Promise<PactFile> => {
  const pactFile: PactFile = {
    consumer: { name: consumer },
    provider: { name: provider },
    interactions: await Promise.all(
      matches.map(async (match) => {
        return {
          description: match.requestId,
          providerState: "",
          request: {
            method: match.request.method,
            path: new URL(match.request.url).pathname,
            headers: omit(
              Object.fromEntries(match.request.headers.entries()),
              headers?.excludeHeaders ?? []
            ),
            body: await readBody(match.request),
            query: new URL(match.request.url).search?.split("?")[1],
          },
          response: {
            status: match.response.status,
            headers: omit(
              Object.fromEntries(match.response.headers.entries()),
              headers?.excludeHeaders ?? []
            ),
            body: await readBody(match.response),
            matchingRules: options?.useFuzzyMatchers
              ? {
                  body: buildMatchingRules(await readBody(match.response)),
                  header: {},
                  status: {},
                }
              : undefined,
          },
        };
      })
    ),
    metadata: {
      pactSpecification: {
        version: options?.pactVersion || "2.0.0",
      },
      client: {
        name: "pact-msw-adapter",
        version: pjson.version,
      },
    },
  };

  return pactFile;
};
