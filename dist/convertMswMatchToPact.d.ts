import { PactFile, MswMatch } from './mswPact';
export declare const convertMswMatchToPact: ({ consumer, provider, matches, }: {
    consumer: string;
    provider: string;
    matches: MswMatch[];
}) => PactFile;
