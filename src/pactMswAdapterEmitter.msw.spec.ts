import { setupServer } from "msw/node";
import { describe, expect, it, vi } from "vitest";
import { setupPactMswAdapter } from "./pactMswAdapter.ts";

const emptyConsole = () => {
  const noop = () => undefined;
  return {
    log: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    group: noop,
    groupCollapsed: noop,
    groupEnd: noop,
  };
};

const createAdapter = () =>
  setupPactMswAdapter({
    server: setupServer(),
    options: {
      consumer: "testConsumer",
      providers: { testProvider: ["/products"] },
      logger: emptyConsole(),
    },
  });

describe("setupPactMswAdapter emitter", () => {
  it("emits pact-msw-adapter:new-test when a new test starts", () => {
    const adapter = createAdapter();
    const listener = vi.fn();

    adapter.emitter.on("pact-msw-adapter:new-test", listener);
    adapter.newTest();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("emits pact-msw-adapter:clear when the adapter is cleared", () => {
    const adapter = createAdapter();
    const listener = vi.fn();

    adapter.emitter.on("pact-msw-adapter:clear", listener);
    adapter.clear();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stops notifying a listener removed with off()", () => {
    const adapter = createAdapter();
    const listener = vi.fn();

    adapter.emitter.on("pact-msw-adapter:new-test", listener);
    adapter.emitter.off("pact-msw-adapter:new-test", listener);
    adapter.newTest();

    expect(listener).not.toHaveBeenCalled();
  });
});
