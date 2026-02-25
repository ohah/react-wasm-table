import { describe, expect, it } from "bun:test";
import { InstructionBuilder } from "../instruction-builder";
import type { ColumnProps } from "../../types";

function col(id: string, overrides?: Partial<ColumnProps>): ColumnProps {
  return { id, width: 100, header: id, ...overrides };
}

describe("InstructionBuilder", () => {
  const builder = new InstructionBuilder();

  it("creates a text instruction for plain values", () => {
    const result = builder.build(col("name"), "Alice");
    expect(result).toEqual({ type: "text", value: "Alice" });
  });

  it("converts numbers to text", () => {
    const result = builder.build(col("age"), 25);
    expect(result).toEqual({ type: "text", value: "25" });
  });

  it("handles null values", () => {
    const result = builder.build(col("name"), null);
    expect(result).toEqual({ type: "text", value: "" });
  });

  it("handles undefined values", () => {
    const result = builder.build(col("name"), undefined);
    expect(result).toEqual({ type: "text", value: "" });
  });

  it("uses render function when provided", () => {
    const column = col("status", {
      children: (value) => ({
        type: "badge",
        value: String(value),
        style: { color: "white", backgroundColor: "green", borderRadius: 4 },
      }),
    });
    const result = builder.build(column, "active");
    expect(result.type).toBe("badge");
    expect(result.value).toBe("active");
  });

  it("falls back to text if render function throws", () => {
    const column = col("bad", {
      children: () => {
        throw new Error("render error");
      },
    });
    const result = builder.build(column, "value");
    expect(result.type).toBe("text");
    expect(result.value).toBe("value");
  });

  it("falls back to text if render function returns invalid", () => {
    const column = col("bad", {
      children: () => "not an instruction" as never,
    });
    const result = builder.build(column, "value");
    expect(result.type).toBe("text");
  });
});
