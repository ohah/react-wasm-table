import { describe, expect, it } from "bun:test";
import React from "react";
import { Text, Badge, Flex, ProgressBar, Box } from "../components";
import { resolveInstruction } from "../resolve-instruction";

describe("Canvas components", () => {
  describe("Text", () => {
    it("returns a TextInstruction when called directly", () => {
      const result = Text({ value: "hello", color: "red" });
      expect(result).toEqual({
        type: "text",
        value: "hello",
        style: { color: "red" },
      });
    });

    it("returns a TextInstruction via JSX + resolveInstruction", () => {
      const element = <Text value="hello" fontWeight="bold" />;
      const result = resolveInstruction(element);
      expect(result).toEqual({
        type: "text",
        value: "hello",
        style: { fontWeight: "bold" },
      });
    });

    it("omits undefined style properties", () => {
      const result = Text({ value: "plain" });
      expect(result).toEqual({ type: "text", value: "plain", style: {} });
    });
  });

  describe("Badge", () => {
    it("returns a BadgeInstruction when called directly", () => {
      const result = Badge({
        value: "Active",
        color: "white",
        backgroundColor: "#4caf50",
      });
      expect(result).toEqual({
        type: "badge",
        value: "Active",
        style: { color: "white", backgroundColor: "#4caf50" },
      });
    });

    it("returns a BadgeInstruction via JSX + resolveInstruction", () => {
      const element = <Badge value="Done" color="white" backgroundColor="green" />;
      const result = resolveInstruction(element);
      expect(result.type).toBe("badge");
      expect(result.value).toBe("Done");
    });
  });

  describe("Flex", () => {
    it("resolves children into RenderInstructions", () => {
      const element = (
        <Flex direction="row" gap={8}>
          <Text value="A" />
          <Badge value="B" />
        </Flex>
      );
      const result = resolveInstruction(element);
      expect(result.type).toBe("flex");
      if (result.type === "flex") {
        expect(result.direction).toBe("row");
        expect(result.gap).toBe(8);
        expect(result.children).toHaveLength(2);
        expect(result.children[0]!.type).toBe("text");
        expect(result.children[1]!.type).toBe("badge");
      }
    });
  });

  describe("Stub components", () => {
    it("ProgressBar returns a StubInstruction", () => {
      const result = ProgressBar({ value: 75, max: 100, color: "blue" });
      expect(result).toEqual({
        type: "stub",
        component: "ProgressBar",
        props: { value: 75, max: 100, color: "blue" },
      });
    });

    it("Box returns a StubInstruction", () => {
      const result = Box({ padding: 8 });
      expect(result).toEqual({
        type: "stub",
        component: "Box",
        props: { padding: 8 },
      });
    });

    it("stub via JSX + resolveInstruction", () => {
      const element = <ProgressBar value={50} />;
      const result = resolveInstruction(element);
      expect(result.type).toBe("stub");
      if (result.type === "stub") {
        expect(result.component).toBe("ProgressBar");
      }
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
