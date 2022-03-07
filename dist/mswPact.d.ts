/// <reference types="node" />
import { DefaultRequestBody, MockedRequest, SetupWorkerApi } from 'msw';
import { convertMswMatchToPact } from './convertMswMatchToPact';
import { EventEmitter } from 'events';
import { SetupServerApi } from 'msw/lib/types/node/glossary';
import { IsomorphicResponse } from '@mswjs/interceptors';
export interface MswPactOptions {
    timeout?: number;
    debug?: boolean;
    pactOutDir?: string;
    consumer: string;
    providers: {
        [name: string]: string[];
    };
    includeUrl?: string[];
    excludeUrl?: string[];
}
export interface MswPactOptionsInternal {
    timeout: number;
    debug: boolean;
    pactOutDir: string;
    consumer: string;
    providers: {
        [name: string]: string[];
    };
    includeUrl?: string[];
    excludeUrl?: string[];
}
export declare const setupMswPact: ({ options: externalOptions, worker, server }: {
    options: MswPactOptions;
    worker?: SetupWorkerApi | undefined;
    server?: SetupServerApi | undefined;
}) => {
    emitter: EventEmitter;
    newTest: () => void;
    verifyTest: () => void;
    writeToFile: (writer?: (path: string, data: object) => void) => Promise<void>;
    clear: () => void;
};
export { convertMswMatchToPact };
export interface PactInteraction {
    description: string;
    providerState: string;
    request: {
        method: string;
        path: string;
        headers: any;
        body: DefaultRequestBody;
    };
    response: {
        status: number;
        headers: any;
        body: any;
    };
}
export interface PactParticipants {
    consumer: {
        name: string;
    };
    provider: {
        name: string;
    };
}
export interface PactFile {
    consumer: PactParticipants['consumer'];
    provider: PactParticipants['provider'];
    interactions: PactInteraction[];
    metadata: PactFileMetaData;
}
export interface PactFileMetaData {
    pactSpecification: {
        version: string;
    };
}
export interface MswMatch {
    request: MockedRequest;
    response: Response | IsomorphicResponse;
}
export interface ExpiredRequest {
    reqId: string;
    startTime: number;
    duration?: number;
}
