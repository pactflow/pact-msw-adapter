import { afterEach, describe, expect, it } from "vitest";
import { addTimeout } from "./utils.ts";

const nodeSetTimeout = globalThis.setTimeout;

/**
 * Browsers return a numeric handle from `setTimeout`, Node returns a `Timeout`
 * object carrying the Node-only `unref()`. Swapping in the browser shape is enough
 * to reproduce browser behaviour without booting a real browser.
 */
const useBrowserSetTimeout = () => {
  let nextHandle = 0;
  globalThis.setTimeout = ((callback: () => void, ms?: number) => {
    nextHandle += 1;
    nodeSetTimeout(callback, ms);
    return nextHandle;
  }) as unknown as typeof globalThis.setTimeout;
};

const never = () => new Promise<never>(() => undefined);

describe("addTimeout", () => {
  afterEach(() => {
    globalThis.setTimeout = nodeSetTimeout;
  });

  it("resolves with the promise value when it settles before the timeout", async () => {
    await expect(
      addTimeout(Promise.resolve("done"), "label", 50),
    ).resolves.toBe("done");
  });

  it("rejects with a labelled error when the promise outlives the timeout", async () => {
    await expect(addTimeout(never(), "slow thing", 10)).rejects.toThrow(
      "[pact-msw-adapter] slow thing timed out after 10ms",
    );
  });

  it("resolves in a browser, where setTimeout returns a number without unref()", async () => {
    useBrowserSetTimeout();

    await expect(
      addTimeout(Promise.resolve("done"), "label", 50),
    ).resolves.toBe("done");
  });

  it("still times out in a browser rather than failing on the missing unref()", async () => {
    useBrowserSetTimeout();

    // Guards the inverted race: a pending promise must lose to the timeout and
    // surface the timeout error, not a TypeError from calling unref() on a number.
    await expect(addTimeout(never(), "slow thing", 10)).rejects.toThrow(
      "[pact-msw-adapter] slow thing timed out after 10ms",
    );
  });

  it("waits for a slow promise in a browser instead of rejecting immediately", async () => {
    useBrowserSetTimeout();

    const slow = new Promise<string>((resolve) => {
      nodeSetTimeout(() => resolve("done"), 10);
    });

    await expect(addTimeout(slow, "label", 1000)).resolves.toBe("done");
  });
});
