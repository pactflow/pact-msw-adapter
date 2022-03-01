import { PactFile, MswMatch } from './mswPact';

export const convertMswMatchToPact = async ({
  consumer,
  provider,
  matches,
}: {
  consumer: string;
  provider: string;
  matches: MswMatch[];
}): Promise<PactFile> => {
  const pactFile: PactFile = {
    consumer: { name: consumer },
    provider: { name: provider },
    interactions:
      await Promise.all(matches.map(async (match) => 
      ({
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
            ? match.response.headers.get("content-type")?.includes("json")
              ? (await match.response.json())
              : match.response.body
            : undefined,
        },
      }))),
    metadata: {
      pactSpecification: {
        version: '2.0.0',
      },
    },
  };
  return pactFile;
};
