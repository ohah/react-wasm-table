import { describe, expect, it } from "bun:test";
import React from "react";
import { Text, Badge, Flex, ProgressBar, Box } from "../components";
import { resolveInstruction } from "../resolve-instruction";
import type {
  RenderInstruction,
  TextInstruction,
  BadgeInstruction,
  StubInstruction,
} from "../types";

describe("Canvas components", () => {
  describe("Text", () => {
    it("returns a TextInstruction when called directly", () => {
      const result = Text({ value: "hello", color: "red" }) as RenderInstruction;
      const expected: TextInstruction = {
        type: "text",
        value: "hello",
        style: { color: "red" },
      };
      expect(result).toEqual(expected);
    });

    it("returns a TextInstruction via JSX + resolveInstruction", () => {
      const element = <Text value="hello" fontWeight="bold" />;
      const result = resolveInstruction(element);
      const expected: TextInstruction = {
        type: "text",
        value: "hello",
        style: { fontWeight: "bold" },
      };
      expect(result).toEqual(expected);
    });

    it("omits style when no style properties given", () => {
      const result = Text({ value: "plain" }) as RenderInstruction;
      expect(result).toEqual({ type: "text", value: "plain" });
      expect((result as TextInstruction).style).toBeUndefined();
    });

    it("accepts style object; individual props override", () => {
      const result = Text({
        value: "x",
        style: { color: "gray", fontSize: 14 },
        color: "red",
      }) as RenderInstruction;
      const expected: TextInstruction = {
        type: "text",
        value: "x",
        style: { color: "red", fontSize: 14 },
      };
      expect(result).toEqual(expected);
    });
  });

  describe("Badge", () => {
    it("returns a BadgeInstruction when called directly", () => {
      const result = Badge({
        value: "Active",
        color: "white",
        backgroundColor: "#4caf50",
      }) as RenderInstruction;
      const expected: BadgeInstruction = {
        type: "badge",
        value: "Active",
        style: { color: "white", backgroundColor: "#4caf50" },
      };
      expect(result).toEqual(expected);
    });

    it("returns a BadgeInstruction via JSX + resolveInstruction", () => {
      const element = <Badge value="Done" color="white" backgroundColor="green" />;
      const result = resolveInstruction(element);
      expect(result.type).toBe("badge");
      if (result.type === "badge") expect(result.value).toBe("Done");
    });

    it("accepts style object; individual props override", () => {
      const result = Badge({
        value: "x",
        style: { color: "gray", borderRadius: 2 },
        backgroundColor: "blue",
      }) as RenderInstruction;
      const expected: BadgeInstruction = {
        type: "badge",
        value: "x",
        style: { color: "gray", backgroundColor: "blue", borderRadius: 2 },
      };
      expect(result).toEqual(expected);
    });
  });

  describe("Flex", () => {
    it("resolves children into RenderInstructions", () => {
      const element = (
        <Flex flexDirection="row" gap={8}>
          <Text value="A" />
          <Badge value="B" />
        </Flex>
      );
      const result = resolveInstruction(element);
      expect(result.type).toBe("flex");
      if (result.type === "flex") {
        expect(result.flexDirection).toBe("row");
        expect(result.gap).toBe(8);
        expect(result.children).toHaveLength(2);
        expect(result.children[0]).toBeDefined();
        expect(result.children[0]!.type).toBe("text");
        expect(result.children[1]).toBeDefined();
        expect(result.children[1]!.type).toBe("badge");
      }
    });

    it("accepts ReactNode children (only valid elements resolved)", () => {
      const element = (
        <Flex flexDirection="column" gap={4}>
          {null}
          <Text value="Only" />
          {"ignored"}
        </Flex>
      );
      const result = resolveInstruction(element);
      expect(result.type).toBe("flex");
      if (result.type === "flex") {
        expect(result.flexDirection).toBe("column");
        expect(result.gap).toBe(4);
        expect(result.children).toHaveLength(1);
        expect(result.children[0]!.type).toBe("text");
      }
    });

    it("passes through Taffy-style props", () => {
      const element = (
        <Flex
          flexDirection="row-reverse"
          flexWrap="wrap"
          rowGap={10}
          columnGap={6}
          alignItems="center"
          alignContent="space-between"
          justifyContent="flex-end"
        >
          <Text value="X" />
        </Flex>
      );
      const result = resolveInstruction(element);
      expect(result.type).toBe("flex");
      if (result.type === "flex") {
        expect(result.flexDirection).toBe("row-reverse");
        expect(result.flexWrap).toBe("wrap");
        expect(result.rowGap).toBe(10);
        expect(result.columnGap).toBe(6);
        expect(result.alignItems).toBe("center");
        expect(result.alignContent).toBe("space-between");
        expect(result.justifyContent).toBe("flex-end");
      }
    });

    it("accepts style object like a normal flex node", () => {
      const element = (
        <Flex style={{ flexDirection: "column", gap: 12, alignItems: "center" }}>
          <Text value="A" />
        </Flex>
      );
      const result = resolveInstruction(element);
      expect(result.type).toBe("flex");
      if (result.type === "flex") {
        expect(result.flexDirection).toBe("column");
        expect(result.gap).toBe(12);
        expect(result.alignItems).toBe("center");
      }
    });

    it("individual props override style object", () => {
      const element = (
        <Flex style={{ flexDirection: "column", gap: 8 }} flexDirection="row" gap={4}>
          <Text value="X" />
        </Flex>
      );
      const result = resolveInstruction(element);
      expect(result.type).toBe("flex");
      if (result.type === "flex") {
        expect(result.flexDirection).toBe("row");
        expect(result.gap).toBe(4);
      }
    });
  });

  describe("Stub components", () => {
    it("ProgressBar returns a StubInstruction", () => {
      const result = ProgressBar({
        value: 75,
        max: 100,
        color: "blue",
      }) as RenderInstruction;
      const expected: StubInstruction = {
        type: "stub",
        component: "ProgressBar",
        props: { value: 75, max: 100, color: "blue" },
      };
      expect(result).toEqual(expected);
    });

    it("Box returns a StubInstruction", () => {
      const result = Box({ padding: 8 }) as RenderInstruction;
      const expected: StubInstruction = {
        type: "stub",
        component: "Box",
        props: { padding: 8 },
      };
      expect(result).toEqual(expected);
    });

    it("stub via JSX + resolveInstruction", () => {
      const element = <ProgressBar value={50} />;
      const result = resolveInstruction(element);
      expect(result.type).toBe("stub");
      if (result.type === "stub") {
        expect(result.component).toBe("ProgressBar");
      }
    });

    it("stub merges style with rest; rest overrides style", () => {
      const result = ProgressBar({
        style: { color: "gray" },
        value: 50,
        color: "blue",
      }) as RenderInstruction;
      const expected: StubInstruction = {
        type: "stub",
        component: "ProgressBar",
        props: { color: "blue", value: 50 },
      };
      expect(result).toEqual(expected);
    });
  });
});

describe("resolveInstruction", () => {
  it("passes through a RenderInstruction as-is", () => {
    const instruction = { type: "text" as const, value: "hello" };
    expect(resolveInstruction(instruction)).toBe(instruction);
  });

  it("converts a plain string to TextInstruction", () => {
    expect(resolveInstruction("hello")).toEqual({
      type: "text",
      value: "hello",
    });
  });

  it("converts null to empty TextInstruction", () => {
    expect(resolveInstruction(null)).toEqual({ type: "text", value: "" });
  });

  it("converts undefined to empty TextInstruction", () => {
    expect(resolveInstruction(undefined)).toEqual({
      type: "text",
      value: "",
    });
  });

  it("converts a number to TextInstruction", () => {
    expect(resolveInstruction(42)).toEqual({ type: "text", value: "42" });
  });
});
