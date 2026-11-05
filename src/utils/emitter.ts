/**
 * Event emitter backed by the web-standard `EventTarget`, so the adapter runs in
 * browsers without a bundler polyfill for Node's `events` module. `EventTarget` and
 * `CustomEvent` are globals in browsers and in Node >=22, this package's minimum.
 */

/**
 * Maps event names to the argument tuple their listeners receive. Written in terms of
 * `Events` itself so interfaces satisfy it — an interface has no implicit index signature,
 * so a plain `Record<string, unknown[]>` constraint would reject one.
 */
export type EventMap<Events> = Record<keyof Events & string, unknown[]>;

export class Emitter<Events extends EventMap<Events>> {
  private readonly target = new EventTarget();

  // Keyed by the caller's own listener so `off()` can find the wrapper registered for it.
  private readonly wrappers = new Map<string, Map<unknown, EventListener>>();

  on<Type extends keyof Events & string>(
    type: Type,
    listener: (...args: Events[Type]) => void,
  ): this {
    const wrapper = this.wrap(type, listener);
    this.target.addEventListener(type, wrapper);
    return this;
  }

  once<Type extends keyof Events & string>(
    type: Type,
    listener: (...args: Events[Type]) => void,
  ): this {
    const wrapper = this.wrap(type, listener, { removeOnCall: true });
    this.target.addEventListener(type, wrapper, { once: true });
    return this;
  }

  off<Type extends keyof Events & string>(
    type: Type,
    listener: (...args: Events[Type]) => void,
  ): this {
    const byListener = this.wrappers.get(type);
    const wrapper = byListener?.get(listener);
    if (wrapper) {
      this.target.removeEventListener(type, wrapper);
      byListener?.delete(listener);
    }
    return this;
  }

  emit<Type extends keyof Events & string>(
    type: Type,
    ...args: Events[Type]
  ): boolean {
    return this.target.dispatchEvent(new CustomEvent(type, { detail: args }));
  }

  removeAllListeners(type?: keyof Events & string): this {
    const types: string[] = [];
    if (type === undefined) {
      types.push(...this.wrappers.keys());
    } else {
      types.push(type);
    }

    for (const eventType of types) {
      const byListener = this.wrappers.get(eventType);
      if (byListener) {
        for (const wrapper of byListener.values()) {
          this.target.removeEventListener(eventType, wrapper);
        }
        this.wrappers.delete(eventType);
      }
    }
    return this;
  }

  listenerCount(type: keyof Events & string): number {
    return this.wrappers.get(type)?.size ?? 0;
  }

  /** Keeps the original listener as the key so `off()` can find the wrapper it registered. */
  private wrap<Type extends keyof Events & string>(
    type: Type,
    listener: (...args: Events[Type]) => void,
    { removeOnCall = false }: { removeOnCall?: boolean } = {},
  ): EventListener {
    const wrapper = ((event: Event) => {
      if (removeOnCall) {
        this.wrappers.get(type)?.delete(listener);
      }
      listener(...((event as CustomEvent<Events[Type]>).detail ?? []));
    }) as EventListener;

    let byListener = this.wrappers.get(type);
    if (!byListener) {
      byListener = new Map();
      this.wrappers.set(type, byListener);
    }
    byListener.set(listener, wrapper);

    return wrapper;
  }
}
