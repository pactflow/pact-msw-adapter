// src/mocks/browser.ts
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers.ts";

// This configures a Service Worker with the given request handlers.
export const worker = setupWorker(...handlers);

// https://mswjs.io/docs/api/setup-worker/use#examples
//
// Make the `worker` and `rest` references available globally,
// so they can be accessed in both runtime and test suites.
(window as Window & { msw?: unknown }).msw = {
	worker,
};
