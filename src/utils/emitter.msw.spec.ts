import { describe, expect, it, vi } from "vitest";
import { Emitter } from "./emitter.ts";

interface TestEvents {
  ping: [];
  payload: [{ id: string }, number];
}

describe("Emitter", () => {
  it("calls listeners with the emitted arguments", () => {
    const emitter = new Emitter<TestEvents>();
    const listener = vi.fn();

    emitter.on("payload", listener);
    emitter.emit("payload", { id: "a" }, 1);

    expect(listener).toHaveBeenCalledWith({ id: "a" }, 1);
  });

  it("calls listeners synchronously, as Node's EventEmitter does", () => {
    const emitter = new Emitter<TestEvents>();
    const calls: string[] = [];

    emitter.on("ping", () => calls.push("listener"));
    emitter.emit("ping");
    calls.push("after emit");

    expect(calls).toEqual(["listener", "after emit"]);
  });

  it("calls every listener registered for an event, in order", () => {
    const emitter = new Emitter<TestEvents>();
    const calls: string[] = [];

    emitter.on("ping", () => calls.push("first"));
    emitter.on("ping", () => calls.push("second"));
    emitter.emit("ping");

    expect(calls).toEqual(["first", "second"]);
  });

  it("stops calling a listener removed with off()", () => {
    const emitter = new Emitter<TestEvents>();
    const listener = vi.fn();

    emitter.on("ping", listener);
    emitter.off("ping", listener);
    emitter.emit("ping");

    expect(listener).not.toHaveBeenCalled();
  });

  it("leaves other listeners registered when one is removed", () => {
    const emitter = new Emitter<TestEvents>();
    const removed = vi.fn();
    const kept = vi.fn();

    emitter.on("ping", removed);
    emitter.on("ping", kept);
    emitter.off("ping", removed);
    emitter.emit("ping");

    expect(removed).not.toHaveBeenCalled();
    expect(kept).toHaveBeenCalledTimes(1);
  });

  it("calls a once() listener a single time", () => {
    const emitter = new Emitter<TestEvents>();
    const listener = vi.fn();

    emitter.once("ping", listener);
    emitter.emit("ping");
    emitter.emit("ping");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(emitter.listenerCount("ping")).toBe(0);
  });

  it("removes listeners for a single event with removeAllListeners(type)", () => {
    const emitter = new Emitter<TestEvents>();
    const ping = vi.fn();
    const payload = vi.fn();

    emitter.on("ping", ping);
    emitter.on("payload", payload);
    emitter.removeAllListeners("ping");
    emitter.emit("ping");
    emitter.emit("payload", { id: "a" }, 1);

    expect(ping).not.toHaveBeenCalled();
    expect(payload).toHaveBeenCalledTimes(1);
  });

  it("removes every listener with removeAllListeners()", () => {
    const emitter = new Emitter<TestEvents>();
    const ping = vi.fn();
    const payload = vi.fn();

    emitter.on("ping", ping);
    emitter.on("payload", payload);
    emitter.removeAllListeners();
    emitter.emit("ping");
    emitter.emit("payload", { id: "a" }, 1);

    expect(ping).not.toHaveBeenCalled();
    expect(payload).not.toHaveBeenCalled();
  });

  it("ignores emits for events without listeners", () => {
    const emitter = new Emitter<TestEvents>();

    expect(() => emitter.emit("ping")).not.toThrow();
  });

  it("ignores off() for a listener that was never registered", () => {
    const emitter = new Emitter<TestEvents>();

    expect(() => emitter.off("ping", vi.fn())).not.toThrow();
  });
});
