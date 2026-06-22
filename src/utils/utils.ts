import type {
	PactMswAdapterOptionsInternal,
	PendingRequest,
} from "../pactMswAdapter.ts";

const logPrefix = "[pact-msw-adapter]";
const logColors = {
	debug: "gray",
	info: "forestgreen",
	warn: "gold",
	error: "coral",
};

type LogLevel = "debug" | "info" | "warn" | "error";
type Logger = Pick<typeof console, LogLevel | "groupEnd" | "groupCollapsed">;

const log = (
	message: unknown,
	options: { group?: boolean; mode?: LogLevel; logger: Logger },
) => {
	const group = options?.group;
	const mode = options?.mode || "info";
	const color = logColors[mode];

	const logFunction = group
		? options.logger.groupCollapsed
		: options.logger[mode];
	logFunction(`%c${logPrefix} %c${message}`, `color:${color}`, "color:inherit");
};

const logGroup = (
	message: unknown,
	options: { endGroup?: boolean; mode?: LogLevel; logger: Logger },
) => {
	const isArray = Array.isArray(message);
	if (isArray) {
		const [label, ...content] = message as unknown[];
		log(label, { group: true, mode: options.mode, logger: options.logger });
		for (const c of content) {
			options.logger[options?.mode || "info"](c);
		}
	} else {
		log(message, { group: true, mode: options.mode, logger: options.logger });
	}

	if (options?.endGroup) {
		options.logger.groupEnd();
	}
};

const createWriter = () => async (filePath: string, data: object) => {
	// biome-ignore lint/correctness/noNodejsModules: dynamic import defers Node.js resolution so this module loads in browser contexts
	const { existsSync, mkdirSync, writeFileSync } = await import(/* webpackIgnore: true */ "node:fs");
	// biome-ignore lint/correctness/noNodejsModules: dynamic import defers Node.js resolution so this module loads in browser contexts
	const { dirname } = await import(/* webpackIgnore: true */ "node:path");
	const dir = dirname(filePath);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
	writeFileSync(filePath, JSON.stringify(data));
};

const hasProvider = (
	pending: PendingRequest,
	options: PactMswAdapterOptionsInternal,
) => {
	if (typeof options.providers === "function") {
		return options.providers(pending) !== null;
	}
	return Object.values(options.providers)?.some((validPaths) =>
		validPaths.some((path) => pending.request.url.includes(path)),
	);
};

const checkUrlFilters = (
	pending: PendingRequest,
	options: PactMswAdapterOptionsInternal,
) => {
	const urlString = pending.request.url.toString();
	const providerFilter = hasProvider(pending, options);
	const includeFilter =
		!options.includeUrl ||
		options.includeUrl.some((inc) => urlString.includes(inc));
	const excludeFilter = !options.excludeUrl?.some((exc) =>
		urlString.includes(exc),
	);
	const matchIsAllowed = includeFilter && excludeFilter && providerFilter;
	if (options.debug) {
		logGroup(
			[
				"Checking request against url filters",
				{
					urlString,
					providerFilter,
					includeFilter,
					excludeFilter,
					matchIsAllowed,
				},
			],
			{ logger: options.logger },
		);
	}

	return matchIsAllowed;
};

const addTimeout = <T>(promise: Promise<T>, label: string, timeout: number) => {
	const asyncTimeout = new Promise<void>((_, reject) => {
		setTimeout(() => {
			reject(
				new Error(`[pact-msw-adapter] ${label} timed out after ${timeout}ms`),
			);
		}, timeout).unref();
	});

	return Promise.race([promise, asyncTimeout]);
};

export type JsonValue =
	| string
	| number
	| boolean
	| null
	| { [key: string]: JsonValue }
	| JsonValue[];

export {
	type Logger,
	log,
	logGroup,
	createWriter,
	checkUrlFilters,
	addTimeout,
};
