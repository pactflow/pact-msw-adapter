import { MswPactOptions } from "../mswPact";
declare const log: (message: any, options?: {
    group?: boolean | undefined;
    mode?: "log" | "warning" | "error" | undefined;
} | undefined) => void;
declare const warning: (message: any) => void;
declare const logGroup: (message: any | any[], options?: {
    endGroup?: boolean | undefined;
} | undefined) => void;
declare const writeData2File: (filePath: string, data: Object) => void;
declare const checkUrlFilters: (urlString: string, options: MswPactOptions) => boolean;
declare const addTimeout: <T>(promise: Promise<T>, label: string, timeout: number) => Promise<void | T>;
export { log, warning, logGroup, writeData2File, checkUrlFilters, addTimeout };
