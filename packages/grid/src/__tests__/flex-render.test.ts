import { describe, expect, it } from "bun:test";
import { flexRender } from "../flex-render";

describe("flexRender", () => {
  it("should return null for null component", () => {
    expect(flexRender(null, {})).toBeNull();
  });

  it("should return null for undefined component", () => {
    expect(flexRender(undefined, {})).toBeNull();
  });

  it("should return string as-is", () => {
    expect(flexRender("Hello", {})).toBe("Hello");
  });

  it("should call function and return string result", () => {
    const fn = () => "rendered";
    expect(flexRender(fn, {})).toBe("rendered");
  });

  it("should call function and return null for null result", () => {
    const fn = () => null;
    expect(flexRender(fn, {})).toBeNull();
  });

  it("should call function and return null for undefined result", () => {
    const fn = () => undefined;
    expect(flexRender(fn, {})).toBeNull();
  });

  it("should resolve RenderInstruction from function", () => {
    const fn = () => ({ type: "text", value: "hello" });
    const result = flexRender(fn, {});
    expect(result).toEqual({ type: "text", value: "hello" });
  });

  it("should pass props to function", () => {
    const fn = (props: { name: string }) => `Hello ${props.name}`;
    expect(flexRender(fn, { name: "World" })).toBe("Hello World");
  });

  it("should resolve badge instruction", () => {
    const fn = () => ({
      type: "badge",
      value: "active",
      style: { backgroundColor: "green" },
    });
    const result = flexRender(fn, {});
    expect(result).toEqual({
      type: "badge",
      value: "active",
      style: { backgroundColor: "green" },
    });
  });

  it("should convert non-instruction object result via resolveInstruction", () => {
    // A number returned from a function gets stringified
    const fn = () => 42;
    const result = flexRender(fn, {});
    expect(result).toEqual({ type: "text", value: "42" });
  });
});
