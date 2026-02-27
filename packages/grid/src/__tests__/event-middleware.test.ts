import { describe, expect, it } from "bun:test";
import {
  composeMiddleware,
  type EventChannel,
  type EventMiddleware,
  type GridEvent,
} from "../event-middleware";

function makeFakeEvent(overrides?: Record<string, unknown>): GridEvent {
  return {
    defaultPrevented: false,
    preventDefault() {
      (this as any).defaultPrevented = true;
    },
    ...overrides,
  } as unknown as GridEvent;
}

describe("composeMiddleware", () => {
  it("calls final directly when no middlewares", () => {
    const calls: string[] = [];
    const dispatch = composeMiddleware([], (ch, ev) => {
      calls.push(`final:${ch}`);
    });
    dispatch("cellClick", makeFakeEvent());
    expect(calls).toEqual(["final:cellClick"]);
  });

  it("calls final when single middleware calls next()", () => {
    const calls: string[] = [];
    const mw: EventMiddleware = (ch, ev, next) => {
      calls.push("mw");
      next();
    };
    const dispatch = composeMiddleware([mw], (ch) => {
      calls.push("final");
    });
    dispatch("headerClick", makeFakeEvent());
    expect(calls).toEqual(["mw", "final"]);
  });

  it("skips final when middleware does not call next()", () => {
    const calls: string[] = [];
    const mw: EventMiddleware = (ch, ev, next) => {
      calls.push("mw-blocked");
      // intentionally not calling next()
    };
    const dispatch = composeMiddleware([mw], (ch) => {
      calls.push("final");
    });
    dispatch("cellClick", makeFakeEvent());
    expect(calls).toEqual(["mw-blocked"]);
  });

  it("executes multiple middlewares in order", () => {
    const calls: string[] = [];
    const mw1: EventMiddleware = (ch, ev, next) => {
      calls.push("mw1");
      next();
    };
    const mw2: EventMiddleware = (ch, ev, next) => {
      calls.push("mw2");
      next();
    };
    const mw3: EventMiddleware = (ch, ev, next) => {
      calls.push("mw3");
      next();
    };
    const dispatch = composeMiddleware([mw1, mw2, mw3], () => {
      calls.push("final");
    });
    dispatch("scroll", makeFakeEvent());
    expect(calls).toEqual(["mw1", "mw2", "mw3", "final"]);
  });

  it("second middleware can block without reaching final", () => {
    const calls: string[] = [];
    const mw1: EventMiddleware = (ch, ev, next) => {
      calls.push("mw1");
      next();
    };
    const mw2: EventMiddleware = (_ch, _ev, _next) => {
      calls.push("mw2-blocked");
    };
    const dispatch = composeMiddleware([mw1, mw2], () => {
      calls.push("final");
    });
    dispatch("keyDown", makeFakeEvent());
    expect(calls).toEqual(["mw1", "mw2-blocked"]);
  });

  it("throws if next() is called more than once", () => {
    const mw: EventMiddleware = (_ch, _ev, next) => {
      next();
      expect(() => next()).toThrow("next() called more than once");
    };
    const dispatch = composeMiddleware([mw], () => {});
    dispatch("cellClick", makeFakeEvent());
  });

  it("passes channel and event through the chain", () => {
    const receivedChannels: EventChannel[] = [];
    const receivedEvents: GridEvent[] = [];

    const mw: EventMiddleware = (ch, ev, next) => {
      receivedChannels.push(ch);
      receivedEvents.push(ev);
      next();
    };
    const event = makeFakeEvent({ custom: 42 });
    const dispatch = composeMiddleware([mw], (ch, ev) => {
      receivedChannels.push(ch);
      receivedEvents.push(ev);
    });
    dispatch("touchStart", event);
    expect(receivedChannels).toEqual(["touchStart", "touchStart"]);
    expect(receivedEvents[0]).toBe(event);
    expect(receivedEvents[1]).toBe(event);
  });

  it("middleware can call preventDefault and next — final still runs", () => {
    const calls: string[] = [];
    const mw: EventMiddleware = (_ch, ev, next) => {
      ev.preventDefault();
      next();
    };
    const dispatch = composeMiddleware([mw], (_ch, ev) => {
      calls.push(ev.defaultPrevented ? "prevented" : "not-prevented");
    });
    dispatch("cellClick", makeFakeEvent());
    expect(calls).toEqual(["prevented"]);
  });
});
