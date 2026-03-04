import { describe, expect, it, mock } from "bun:test";

// Polyfill DOM globals for non-browser test environment
if (typeof globalThis.MouseEvent === "undefined") {
  (globalThis as any).MouseEvent = class MockMouseEvent {
    type: string;
    clientX: number;
    constructor(type: string, init?: { clientX?: number }) {
      this.type = type;
      this.clientX = init?.clientX ?? 0;
    }
  };
}
if (typeof globalThis.window === "undefined") {
  const listeners = new Map<string, Set<Function>>();
  (globalThis as any).window = {
    addEventListener(type: string, fn: Function) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener(type: string, fn: Function) {
      listeners.get(type)?.delete(fn);
    },
    dispatchEvent(event: any) {
      const fns = listeners.get(event.type);
      if (fns) for (const fn of fns) fn(event);
    },
  };
}

import React from "react";
import {
  Text,
  Badge,
  Sparkline,
  Flex,
  ProgressBar,
  Box,
  Stack,
  Color,
  Tag,
  Rating,
  Chip,
  Link,
  Image,
  Checkbox,
  Radio,
  Label,
  Input,
  Switch,
  Icon,
  Avatar,
  NumberInput,
  Select,
  DatePicker,
  Dropdown,
} from "../components";
import { resolveInstruction } from "../resolve-instruction";
import { progressBarCellRenderer } from "../renderer/components/progressbar";
import { createCellRendererRegistry } from "../renderer/components";
import type { Theme } from "../types";
import type {
  RenderInstruction,
  TextInstruction,
  BadgeInstruction,
  SparklineInstruction,
  BoxInstruction,
  StackInstruction,
  StubInstruction,
  ColorInstruction,
  TagInstruction,
  RatingInstruction,
  ChipInstruction,
  LinkInstruction,
  ImageInstruction,
  CheckboxInstruction,
  RadioInstruction,
  InputInstruction,
  ProgressBarInstruction,
  SwitchInstruction,
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

  describe("Sparkline", () => {
    it("returns a SparklineInstruction when called directly", () => {
      const result = Sparkline({ data: [1, 2, 3], color: "blue" }) as RenderInstruction;
      const expected: SparklineInstruction = {
        type: "sparkline",
        data: [1, 2, 3],
        style: { color: "blue" },
      };
      expect(result).toEqual(expected);
    });

    it("returns a SparklineInstruction via JSX + resolveInstruction", () => {
      const element = <Sparkline data={[10, 20, 30]} variant="area" />;
      const result = resolveInstruction(element);
      const expected: SparklineInstruction = {
        type: "sparkline",
        data: [10, 20, 30],
        style: { variant: "area" },
      };
      expect(result).toEqual(expected);
    });

    it("omits style when no style properties given", () => {
      const result = Sparkline({ data: [1, 2] }) as RenderInstruction;
      expect(result).toEqual({ type: "sparkline", data: [1, 2] });
      expect((result as SparklineInstruction).style).toBeUndefined();
    });

    it("accepts style object; individual props override", () => {
      const result = Sparkline({
        data: [1, 2, 3],
        style: { color: "gray", strokeWidth: 2 },
        color: "red",
      }) as RenderInstruction;
      const expected: SparklineInstruction = {
        type: "sparkline",
        data: [1, 2, 3],
        style: { color: "red", strokeWidth: 2 },
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

  describe("Box", () => {
    it("returns a BoxInstruction when called directly", () => {
      const result = Box({ padding: 8 }) as RenderInstruction;
      const expected: BoxInstruction = {
        type: "box",
        padding: 8,
        children: [],
      };
      expect(result).toEqual(expected);
    });

    it("returns BoxInstruction with resolved children", () => {
      const result = Box({
        padding: 8,
        borderWidth: 1,
        children: <Text value="inner" />,
      }) as RenderInstruction;
      expect(result.type).toBe("box");
      if (result.type === "box") {
        expect(result.padding).toBe(8);
        expect(result.borderWidth).toBe(1);
        expect(result.children).toHaveLength(1);
        expect(result.children[0]).toEqual({ type: "text", value: "inner" });
      }
    });

    it("Box via JSX + resolveInstruction", () => {
      const element = (
        <Box padding={4}>
          <Text value="x" />
        </Box>
      );
      const result = resolveInstruction(element);
      expect(result.type).toBe("box");
      if (result.type === "box") {
        expect(result.children).toHaveLength(1);
      }
    });

    it("returns BoxInstruction with multiple children", () => {
      const result = Box({
        padding: 4,
        children: [<Text key="a" value="first" />, <Badge key="b" value="second" />],
      }) as RenderInstruction;
      expect(result.type).toBe("box");
      if (result.type === "box") {
        expect(result.children).toHaveLength(2);
        expect(result.children[0]).toEqual({ type: "text", value: "first" });
        expect(result.children[1]).toMatchObject({ type: "badge", value: "second" });
      }
    });

    it("accepts style object; individual props override style", () => {
      const result = Box({
        style: { padding: 16, backgroundColor: "#eee" },
        padding: 8,
        borderWidth: 1,
      }) as RenderInstruction;
      expect(result.type).toBe("box");
      if (result.type === "box") {
        expect(result.padding).toBe(8);
        expect(result.backgroundColor).toBe("#eee");
        expect(result.borderWidth).toBe(1);
      }
    });

    it("omits style when no box props given", () => {
      const result = Box({}) as RenderInstruction;
      expect(result.type).toBe("box");
      if (result.type === "box") {
        expect(result.children).toEqual([]);
        expect(Object.keys(result)).toEqual(expect.arrayContaining(["type", "children"]));
      }
    });
  });

  describe("Stack", () => {
    it("returns a StackInstruction when called directly", () => {
      const result = Stack({ direction: "row", gap: 8 }) as RenderInstruction;
      const expected: StackInstruction = {
        type: "stack",
        direction: "row",
        gap: 8,
        children: [],
      };
      expect(result).toEqual(expected);
    });

    it("returns StackInstruction with resolved children", () => {
      const result = Stack({
        direction: "column",
        children: <Text value="a" />,
      }) as RenderInstruction;
      expect(result.type).toBe("stack");
      if (result.type === "stack") {
        expect(result.direction).toBe("column");
        expect(result.children).toHaveLength(1);
        expect(result.children[0]).toEqual({ type: "text", value: "a" });
      }
    });

    it("defaults to row and gap 4", () => {
      const result = Stack({}) as RenderInstruction;
      expect(result.type).toBe("stack");
      if (result.type === "stack") {
        expect(result.direction).toBe("row");
        expect(result.gap).toBe(4);
      }
    });

    it("Stack via JSX + resolveInstruction", () => {
      const element = (
        <Stack direction="column">
          <Text value="x" />
        </Stack>
      );
      const result = resolveInstruction(element);
      expect(result.type).toBe("stack");
      if (result.type === "stack") {
        expect(result.children).toHaveLength(1);
      }
    });
  });

  describe("Color", () => {
    it("returns a ColorInstruction when called directly", () => {
      const result = Color({ value: "#ff0000", borderRadius: 4 }) as RenderInstruction;
      const expected: ColorInstruction = {
        type: "color",
        value: "#ff0000",
        style: { borderRadius: 4 },
      };
      expect(result).toEqual(expected);
    });

    it("returns a ColorInstruction via JSX + resolveInstruction", () => {
      const element = <Color value="#00ff00" borderWidth={2} borderColor="#333" />;
      const result = resolveInstruction(element);
      expect(result.type).toBe("color");
      if (result.type === "color") {
        expect(result.value).toBe("#00ff00");
        expect(result.style).toEqual({ borderWidth: 2, borderColor: "#333" });
      }
    });

    it("omits style when no style properties given", () => {
      const result = Color({ value: "#000" }) as RenderInstruction;
      expect(result).toEqual({ type: "color", value: "#000" });
      expect((result as ColorInstruction).style).toBeUndefined();
    });

    it("accepts style object; individual props override", () => {
      const result = Color({
        value: "#fff",
        style: { borderRadius: 8, borderColor: "#ccc" },
        borderRadius: 4,
      }) as RenderInstruction;
      const expected: ColorInstruction = {
        type: "color",
        value: "#fff",
        style: { borderRadius: 4, borderColor: "#ccc" },
      };
      expect(result).toEqual(expected);
    });
  });

  describe("Tag", () => {
    it("returns a TagInstruction when called directly", () => {
      const result = Tag({ value: "New", color: "#1565c0" }) as RenderInstruction;
      const expected: TagInstruction = {
        type: "tag",
        value: "New",
        style: { color: "#1565c0" },
      };
      expect(result).toEqual(expected);
    });

    it("returns a TagInstruction via JSX + resolveInstruction", () => {
      const element = <Tag value="Active" borderColor="green" borderRadius={8} />;
      const result = resolveInstruction(element);
      expect(result.type).toBe("tag");
      if (result.type === "tag") {
        expect(result.value).toBe("Active");
        expect(result.style).toEqual({ borderColor: "green", borderRadius: 8 });
      }
    });

    it("omits style when no style properties given", () => {
      const result = Tag({ value: "Plain" }) as RenderInstruction;
      expect(result).toEqual({ type: "tag", value: "Plain" });
    });

    it("accepts style object; individual props override", () => {
      const result = Tag({
        value: "x",
        style: { color: "gray", fontSize: 14 },
        color: "red",
      }) as RenderInstruction;
      const expected: TagInstruction = {
        type: "tag",
        value: "x",
        style: { color: "red", fontSize: 14 },
      };
      expect(result).toEqual(expected);
    });
  });

  describe("Rating", () => {
    it("returns a RatingInstruction when called directly", () => {
      const result = Rating({ value: 3, max: 5 }) as RenderInstruction;
      const expected: RatingInstruction = {
        type: "rating",
        value: 3,
        style: { max: 5 },
      };
      expect(result).toEqual(expected);
    });

    it("returns a RatingInstruction via JSX + resolveInstruction", () => {
      const element = <Rating value={4} color="#f59e0b" />;
      const result = resolveInstruction(element);
      expect(result.type).toBe("rating");
      if (result.type === "rating") {
        expect(result.value).toBe(4);
        expect(result.style).toEqual({ color: "#f59e0b" });
      }
    });

    it("omits style when no style properties given", () => {
      const result = Rating({ value: 2 }) as RenderInstruction;
      expect(result).toEqual({ type: "rating", value: 2 });
    });

    it("accepts style object; individual props override", () => {
      const result = Rating({
        value: 3,
        style: { max: 10, color: "gray" },
        color: "gold",
      }) as RenderInstruction;
      const expected: RatingInstruction = {
        type: "rating",
        value: 3,
        style: { max: 10, color: "gold" },
      };
      expect(result).toEqual(expected);
    });
  });

  describe("Chip", () => {
    it("returns a ChipInstruction when called directly", () => {
      const result = Chip({
        value: "React",
        color: "white",
        backgroundColor: "#1976d2",
      }) as RenderInstruction;
      const expected: ChipInstruction = {
        type: "chip",
        value: "React",
        style: { color: "white", backgroundColor: "#1976d2" },
      };
      expect(result).toEqual(expected);
    });

    it("returns a ChipInstruction via JSX + resolveInstruction", () => {
      const element = <Chip value="Tag" closable />;
      const result = resolveInstruction(element);
      expect(result.type).toBe("chip");
      if (result.type === "chip") {
        expect(result.value).toBe("Tag");
        expect(result.style).toEqual({ closable: true });
      }
    });

    it("omits style when no style properties given", () => {
      const result = Chip({ value: "Simple" }) as RenderInstruction;
      expect(result).toEqual({ type: "chip", value: "Simple" });
    });

    it("accepts style object; individual props override", () => {
      const result = Chip({
        value: "x",
        style: { color: "gray", borderRadius: 4 },
        backgroundColor: "blue",
      }) as RenderInstruction;
      const expected: ChipInstruction = {
        type: "chip",
        value: "x",
        style: { color: "gray", backgroundColor: "blue", borderRadius: 4 },
      };
      expect(result).toEqual(expected);
    });
  });

  describe("Link", () => {
    it("returns a LinkInstruction when called directly", () => {
      const result = Link({
        value: "Click me",
        href: "https://example.com",
        color: "#2563eb",
      }) as RenderInstruction;
      const expected: LinkInstruction = {
        type: "link",
        value: "Click me",
        href: "https://example.com",
        style: { color: "#2563eb" },
      };
      expect(result).toEqual(expected);
    });

    it("returns a LinkInstruction via JSX + resolveInstruction", () => {
      const element = <Link value="Home" underline={false} />;
      const result = resolveInstruction(element);
      expect(result.type).toBe("link");
      if (result.type === "link") {
        expect(result.value).toBe("Home");
        expect(result.style).toEqual({ underline: false });
      }
    });

    it("omits style when no style properties given", () => {
      const result = Link({ value: "plain" }) as RenderInstruction;
      expect(result).toEqual({ type: "link", value: "plain" });
    });

    it("omits href when not provided", () => {
      const result = Link({ value: "no href" }) as RenderInstruction;
      expect(result).toEqual({ type: "link", value: "no href" });
      expect((result as LinkInstruction).href).toBeUndefined();
    });

    it("accepts style object; individual props override", () => {
      const result = Link({
        value: "x",
        style: { color: "gray", fontSize: 14 },
        color: "red",
      }) as RenderInstruction;
      const expected: LinkInstruction = {
        type: "link",
        value: "x",
        style: { color: "red", fontSize: 14 },
      };
      expect(result).toEqual(expected);
    });
  });

  describe("Image", () => {
    it("returns an ImageInstruction when called directly", () => {
      const result = Image({
        src: "https://example.com/photo.png",
        alt: "Photo",
        objectFit: "cover",
      }) as RenderInstruction;
      const expected: ImageInstruction = {
        type: "image",
        src: "https://example.com/photo.png",
        alt: "Photo",
        style: { objectFit: "cover" },
      };
      expect(result).toEqual(expected);
    });

    it("returns an ImageInstruction via JSX + resolveInstruction", () => {
      const element = <Image src="https://example.com/img.jpg" borderRadius={8} opacity={0.5} />;
      const result = resolveInstruction(element);
      expect(result.type).toBe("image");
      if (result.type === "image") {
        expect(result.src).toBe("https://example.com/img.jpg");
        expect(result.style).toEqual({ borderRadius: 8, opacity: 0.5 });
      }
    });

    it("omits style when no style properties given", () => {
      const result = Image({ src: "https://example.com/plain.png" }) as RenderInstruction;
      expect(result).toEqual({ type: "image", src: "https://example.com/plain.png" });
      expect((result as ImageInstruction).style).toBeUndefined();
    });

    it("includes optional HTML img attributes when provided", () => {
      const result = Image({
        src: "https://example.com/img.jpg",
        alt: "Alt text",
        width: 200,
        height: 150,
        crossOrigin: "anonymous",
        referrerPolicy: "no-referrer",
        decoding: "async",
        fetchPriority: "high",
      }) as RenderInstruction;
      expect(result.type).toBe("image");
      if (result.type === "image") {
        expect(result.src).toBe("https://example.com/img.jpg");
        expect(result.alt).toBe("Alt text");
        expect(result.width).toBe(200);
        expect(result.height).toBe(150);
        expect(result.crossOrigin).toBe("anonymous");
        expect(result.referrerPolicy).toBe("no-referrer");
        expect(result.decoding).toBe("async");
        expect(result.fetchPriority).toBe("high");
      }
    });

    it("omits optional HTML attributes when not provided", () => {
      const result = Image({ src: "https://example.com/min.png" }) as RenderInstruction;
      if (result.type === "image") {
        expect(result.alt).toBeUndefined();
        expect(result.width).toBeUndefined();
        expect(result.height).toBeUndefined();
        expect(result.crossOrigin).toBeUndefined();
        expect(result.referrerPolicy).toBeUndefined();
        expect(result.decoding).toBeUndefined();
        expect(result.fetchPriority).toBeUndefined();
      }
    });

    it("accepts style object; individual props override", () => {
      const result = Image({
        src: "https://example.com/img.jpg",
        style: { objectFit: "contain", borderRadius: 16 },
        objectFit: "cover",
      }) as RenderInstruction;
      const expected: ImageInstruction = {
        type: "image",
        src: "https://example.com/img.jpg",
        style: { objectFit: "cover", borderRadius: 16 },
      };
      expect(result).toEqual(expected);
    });

    it("attaches event handlers via _handlers", () => {
      const onClick = () => {};
      const result = Image({
        src: "https://example.com/img.jpg",
        onClick,
      }) as any;
      expect(result._handlers).toBeDefined();
      expect(result._handlers.onClick).toBe(onClick);
    });
  });

  describe("Checkbox", () => {
    it("returns a CheckboxInstruction when called directly", () => {
      const result = Checkbox({ checked: true }) as RenderInstruction;
      expect(result.type).toBe("checkbox");
      if (result.type === "checkbox") {
        expect(result.checked).toBe(true);
        expect(result.children).toEqual([]);
      }
    });

    it("returns a CheckboxInstruction via JSX + resolveInstruction", () => {
      const element = (
        <Checkbox checked={false}>
          <Text value="label" />
        </Checkbox>
      );
      const result = resolveInstruction(element);
      expect(result.type).toBe("checkbox");
      if (result.type === "checkbox") {
        expect(result.checked).toBe(false);
        expect(result.children).toHaveLength(1);
        expect(result.children[0]!.type).toBe("text");
      }
    });

    it("includes disabled when provided", () => {
      const result = Checkbox({ checked: false, disabled: true }) as RenderInstruction;
      if (result.type === "checkbox") {
        expect(result.disabled).toBe(true);
      }
    });

    it("omits disabled when not provided", () => {
      const result = Checkbox({ checked: true }) as RenderInstruction;
      if (result.type === "checkbox") {
        expect(result.disabled).toBeUndefined();
      }
    });

    it("attaches event handlers via _handlers", () => {
      const onClick = () => {};
      const result = Checkbox({ checked: true, onClick }) as any;
      expect(result._handlers).toBeDefined();
      expect(result._handlers.onClick).toBe(onClick);
    });

    it("includes style when provided", () => {
      const result = Checkbox({
        checked: true,
        style: { size: 20, checkedColor: "red" },
      }) as RenderInstruction;
      if (result.type === "checkbox") {
        expect(result.style).toEqual({ size: 20, checkedColor: "red" });
      }
    });

    it("omits style when not provided", () => {
      const result = Checkbox({ checked: true }) as RenderInstruction;
      if (result.type === "checkbox") {
        expect(result.style).toBeUndefined();
      }
    });

    it("resolves Label children via JSX", () => {
      const element = (
        <Checkbox checked={true}>
          <Label value="Accept terms" />
        </Checkbox>
      );
      const result = resolveInstruction(element);
      if (result.type === "checkbox") {
        expect(result.children).toHaveLength(1);
        expect(result.children[0]!.type).toBe("label");
      }
    });
  });

  describe("Radio", () => {
    it("returns a RadioInstruction when called directly", () => {
      const result = Radio({ checked: true }) as RenderInstruction;
      expect(result.type).toBe("radio");
      if (result.type === "radio") {
        expect(result.checked).toBe(true);
        expect(result.children).toEqual([]);
      }
    });

    it("returns a RadioInstruction via JSX + resolveInstruction", () => {
      const element = (
        <Radio checked={false}>
          <Text value="label" />
        </Radio>
      );
      const result = resolveInstruction(element);
      expect(result.type).toBe("radio");
      if (result.type === "radio") {
        expect(result.checked).toBe(false);
        expect(result.children).toHaveLength(1);
        expect(result.children[0]!.type).toBe("text");
      }
    });

    it("includes disabled when provided", () => {
      const result = Radio({ checked: false, disabled: true }) as RenderInstruction;
      if (result.type === "radio") {
        expect(result.disabled).toBe(true);
      }
    });

    it("omits disabled when not provided", () => {
      const result = Radio({ checked: true }) as RenderInstruction;
      if (result.type === "radio") {
        expect(result.disabled).toBeUndefined();
      }
    });

    it("attaches event handlers via _handlers", () => {
      const onClick = () => {};
      const result = Radio({ checked: true, onClick }) as any;
      expect(result._handlers).toBeDefined();
      expect(result._handlers.onClick).toBe(onClick);
    });

    it("includes style when provided", () => {
      const result = Radio({
        checked: true,
        style: { size: 20, checkedColor: "green" },
      }) as RenderInstruction;
      if (result.type === "radio") {
        expect(result.style).toEqual({ size: 20, checkedColor: "green" });
      }
    });

    it("omits style when not provided", () => {
      const result = Radio({ checked: true }) as RenderInstruction;
      if (result.type === "radio") {
        expect(result.style).toBeUndefined();
      }
    });

    it("resolves Label children via JSX", () => {
      const element = (
        <Radio checked={false}>
          <Label value="Option A" />
        </Radio>
      );
      const result = resolveInstruction(element);
      if (result.type === "radio") {
        expect(result.children).toHaveLength(1);
        expect(result.children[0]!.type).toBe("label");
      }
    });
  });

  describe("Label", () => {
    it("returns a LabelInstruction when called directly", () => {
      const result = Label({ value: "hello" }) as RenderInstruction;
      expect(result.type).toBe("label");
      if (result.type === "label") {
        expect(result.value).toBe("hello");
      }
    });

    it("returns a LabelInstruction via JSX + resolveInstruction", () => {
      const element = <Label value="test" />;
      const result = resolveInstruction(element);
      expect(result.type).toBe("label");
      if (result.type === "label") {
        expect(result.value).toBe("test");
      }
    });

    it("omits style when no style properties given", () => {
      const result = Label({ value: "plain" }) as RenderInstruction;
      if (result.type === "label") {
        expect(result.style).toBeUndefined();
      }
    });

    it("accepts style object; individual props override", () => {
      const result = Label({
        value: "styled",
        style: { color: "gray", fontSize: 14 },
        color: "red",
      }) as RenderInstruction;
      if (result.type === "label") {
        expect(result.style).toEqual({ color: "red", fontSize: 14 });
      }
    });

    it("attaches event handlers via _handlers", () => {
      const onClick = () => {};
      const result = Label({ value: "click me", onClick }) as any;
      expect(result._handlers).toBeDefined();
      expect(result._handlers.onClick).toBe(onClick);
    });
  });

  describe("Input", () => {
    it("returns an InputInstruction when called directly", () => {
      const result = Input({ value: "hello" }) as RenderInstruction;
      expect(result.type).toBe("input");
      if (result.type === "input") {
        expect(result.value).toBe("hello");
      }
    });

    it("returns an InputInstruction via JSX + resolveInstruction", () => {
      const element = <Input value="test" placeholder="Enter..." />;
      const result = resolveInstruction(element);
      expect(result.type).toBe("input");
      if (result.type === "input") {
        expect(result.value).toBe("test");
        expect(result.placeholder).toBe("Enter...");
      }
    });

    it("maps type prop to inputType", () => {
      const result = Input({ type: "email" }) as RenderInstruction;
      if (result.type === "input") {
        expect(result.inputType).toBe("email");
      }
    });

    it("includes disabled and readOnly when provided", () => {
      const result = Input({ disabled: true, readOnly: true }) as RenderInstruction;
      if (result.type === "input") {
        expect(result.disabled).toBe(true);
        expect(result.readOnly).toBe(true);
      }
    });

    it("omits optional props when not provided", () => {
      const result = Input({}) as RenderInstruction;
      if (result.type === "input") {
        expect(result.inputType).toBeUndefined();
        expect(result.value).toBeUndefined();
        expect(result.placeholder).toBeUndefined();
        expect(result.disabled).toBeUndefined();
        expect(result.readOnly).toBeUndefined();
      }
    });

    it("attaches DOM handlers in _domHandlers", () => {
      const onChange = () => {};
      const onFocus = () => {};
      const result = Input({ onChange, onFocus }) as any;
      expect(result._domHandlers).toBeDefined();
      expect(result._domHandlers.onChange).toBe(onChange);
      expect(result._domHandlers.onFocus).toBe(onFocus);
    });

    it("accepts style object; individual props override", () => {
      const result = Input({
        style: { fontSize: 14, color: "gray" },
        color: "red",
      }) as RenderInstruction;
      if (result.type === "input") {
        expect(result.style).toEqual({ fontSize: 14, color: "red" });
      }
    });

    it("omits style when no style properties given", () => {
      const result = Input({ value: "plain" }) as RenderInstruction;
      if (result.type === "input") {
        expect(result.style).toBeUndefined();
      }
    });

    it("includes min, max, step when provided", () => {
      const result = Input({
        type: "number",
        min: 0,
        max: 100,
        step: 5,
      }) as RenderInstruction;
      if (result.type === "input") {
        expect(result.min).toBe(0);
        expect(result.max).toBe(100);
        expect(result.step).toBe(5);
      }
    });

    it("omits min, max, step when not provided", () => {
      const result = Input({}) as RenderInstruction;
      if (result.type === "input") {
        expect(result.min).toBeUndefined();
        expect(result.max).toBeUndefined();
        expect(result.step).toBeUndefined();
      }
    });
  });

  describe("Switch", () => {
    it("returns SwitchInstruction with type 'switch'", () => {
      const result = resolveInstruction(Switch({ checked: true }));
      expect(result).not.toBeNull();
      expect((result as any).type).toBe("switch");
      expect((result as any).checked).toBe(true);
    });

    it("passes disabled prop", () => {
      const result = resolveInstruction(Switch({ checked: false, disabled: true }));
      expect((result as any).disabled).toBe(true);
    });

    it("applies style props", () => {
      const result = resolveInstruction(
        Switch({
          checked: true,
          trackColor: "#ccc",
          activeTrackColor: "#10b981",
          thumbColor: "#fff",
          width: 44,
          height: 24,
        }),
      );
      const s = (result as any).style;
      expect(s.trackColor).toBe("#ccc");
      expect(s.activeTrackColor).toBe("#10b981");
      expect(s.thumbColor).toBe("#fff");
      expect(s.width).toBe(44);
      expect(s.height).toBe(24);
    });
  });

  describe("ProgressBar", () => {
    it("returns a ProgressBarInstruction when called directly", () => {
      const result = ProgressBar({ value: 75, max: 100, color: "blue" }) as RenderInstruction;
      const expected: ProgressBarInstruction = {
        type: "progressbar",
        value: 75,
        max: 100,
        style: { color: "blue" },
      };
      expect(result).toEqual(expected);
    });

    it("returns a ProgressBarInstruction via JSX + resolveInstruction", () => {
      const element = <ProgressBar value={50} />;
      const result = resolveInstruction(element);
      expect(result.type).toBe("progressbar");
      if (result.type === "progressbar") {
        expect(result.value).toBe(50);
      }
    });

    it("omits style when no style properties given", () => {
      const result = ProgressBar({ value: 30 }) as RenderInstruction;
      expect(result).toEqual({ type: "progressbar", value: 30 });
      expect((result as ProgressBarInstruction).style).toBeUndefined();
    });

    it("accepts style object; individual props override", () => {
      const result = ProgressBar({
        value: 60,
        style: { color: "gray", height: 10 },
        color: "red",
      }) as RenderInstruction;
      const expected: ProgressBarInstruction = {
        type: "progressbar",
        value: 60,
        style: { color: "red", height: 10 },
      };
      expect(result).toEqual(expected);
    });

    it("includes max when specified", () => {
      const result = ProgressBar({ value: 7, max: 10 }) as RenderInstruction;
      if (result.type === "progressbar") {
        expect(result.max).toBe(10);
      }
    });

    it("includes _onChange in instruction when onChange is provided", () => {
      const onChange = (_v: number) => {};
      const result = ProgressBar({ value: 50, onChange }) as any;
      expect(result._onChange).toBe(onChange);
    });

    it("creates internal onClick and onMouseDown handlers when onChange is provided", () => {
      const onChange = (_v: number) => {};
      const result = ProgressBar({ value: 50, onChange }) as any;
      expect(result._handlers).toBeDefined();
      expect(typeof result._handlers.onClick).toBe("function");
      expect(typeof result._handlers.onMouseDown).toBe("function");
    });

    it("does not create _onChange or internal handlers when onChange is not provided", () => {
      const result = ProgressBar({ value: 50 }) as any;
      expect(result._onChange).toBeUndefined();
      // _handlers should be undefined when no event handlers at all
      expect(result._handlers).toBeUndefined();
    });

    it("preserves user onClick while wrapping with onChange logic", () => {
      let userClickCalled = false;
      const userOnClick = () => {
        userClickCalled = true;
      };
      const onChange = (_v: number) => {};
      const result = ProgressBar({ value: 50, onClick: userOnClick, onChange }) as any;
      expect(result._handlers).toBeDefined();
      expect(typeof result._handlers.onClick).toBe("function");
      // The internal onClick wraps the user onClick — both should exist
      // (We can't fully test the call without a full GridCellEvent, but handler must be a function)
    });
  });
});

describe("stub components", () => {
  it("Icon returns a StubInstruction with component 'Icon'", () => {
    const result = Icon({ color: "red", size: 24 }) as any;
    expect(result.type).toBe("stub");
    expect(result.component).toBe("Icon");
    expect(result.props).toEqual({ color: "red", size: 24 });
  });

  it("Avatar returns a StubInstruction with component 'Avatar'", () => {
    const result = Avatar({ src: "https://example.com/avatar.png" }) as any;
    expect(result.type).toBe("stub");
    expect(result.component).toBe("Avatar");
    expect(result.props).toEqual({ src: "https://example.com/avatar.png" });
  });

  it("NumberInput returns a StubInstruction with component 'NumberInput'", () => {
    const result = NumberInput({ min: 0, max: 100 }) as any;
    expect(result.type).toBe("stub");
    expect(result.component).toBe("NumberInput");
    expect(result.props).toEqual({ min: 0, max: 100 });
  });

  it("Select returns a StubInstruction with component 'Select'", () => {
    const result = Select({ options: ["a", "b"] }) as any;
    expect(result.type).toBe("stub");
    expect(result.component).toBe("Select");
    expect(result.props).toEqual({ options: ["a", "b"] });
  });

  it("DatePicker returns a StubInstruction with component 'DatePicker'", () => {
    const result = DatePicker({ format: "YYYY-MM-DD" }) as any;
    expect(result.type).toBe("stub");
    expect(result.component).toBe("DatePicker");
    expect(result.props).toEqual({ format: "YYYY-MM-DD" });
  });

  it("Dropdown returns a StubInstruction with component 'Dropdown'", () => {
    const result = Dropdown({ items: [1, 2, 3] }) as any;
    expect(result.type).toBe("stub");
    expect(result.component).toBe("Dropdown");
    expect(result.props).toEqual({ items: [1, 2, 3] });
  });

  it("stub merges style with rest props (rest overrides style)", () => {
    const result = Icon({ style: { color: "blue", size: 16 }, color: "red" }) as any;
    expect(result.type).toBe("stub");
    expect(result.component).toBe("Icon");
    expect(result.props).toEqual({ color: "red", size: 16 });
  });

  it("stub returns undefined props when no props given", () => {
    const result = Icon({}) as any;
    expect(result.type).toBe("stub");
    expect(result.component).toBe("Icon");
    expect(result.props).toBeUndefined();
  });
});

describe("ProgressBar with onChange handlers", () => {
  // Helper to populate the bar geometry cache by drawing a progressbar cell
  const defaultTheme: Theme = {
    headerBackground: "#f5f5f5",
    headerColor: "#333",
    headerFontSize: 13,
    cellBackground: "#fff",
    cellColor: "#333",
    fontSize: 13,
    borderColor: "#e0e0e0",
    borderWidth: 0.5,
    borderStyle: "solid",
    selectedBackground: "#1976d2",
    fontFamily: "system-ui, sans-serif",
  };

  function buildBuf(cells: [number, number, number, number, number, number][]): Float32Array {
    const stride = 16;
    const buf = new Float32Array(cells.length * stride);
    for (let i = 0; i < cells.length; i++) {
      const [row, col, x, y, w, h] = cells[i]!;
      const off = i * stride;
      buf[off] = row;
      buf[off + 1] = col;
      buf[off + 2] = x;
      buf[off + 3] = y;
      buf[off + 4] = w;
      buf[off + 5] = h;
    }
    return buf;
  }

  function mockCtx() {
    return {
      font: "",
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      textBaseline: "",
      textAlign: "",
      globalAlpha: 1,
      scale: mock(() => {}),
      clearRect: mock(() => {}),
      fillRect: mock(() => {}),
      strokeRect: mock(() => {}),
      beginPath: mock(() => {}),
      moveTo: mock(() => {}),
      lineTo: mock(() => {}),
      stroke: mock(() => {}),
      measureText: mock(() => ({ width: 40 })),
      fillText: mock(() => {}),
      roundRect: mock(() => {}),
      rect: mock(() => {}),
      fill: mock(() => {}),
      save: mock(() => {}),
      restore: mock(() => {}),
      clip: mock(() => {}),
      drawImage: mock(() => {}),
      arc: mock(() => {}),
    } as unknown as CanvasRenderingContext2D;
  }

  /** Populate barGeometryCache for a cell at row,col by drawing a progressbar */
  function populateBarCache(row: number, col: number) {
    const buf = buildBuf([[row, col, 10, 40, 200, 36]]);
    const ctx = mockCtx();
    progressBarCellRenderer.draw(
      { type: "progressbar", value: 50 },
      {
        ctx,
        buf,
        cellIdx: 0,
        theme: defaultTheme,
        registry: createCellRendererRegistry(),
        computeChildLayout: (input: Float32Array) => new Float32Array(0),
      },
    );
  }

  function makeCellEvent(contentX: number, row: number, col: number) {
    let defaultPrevented = false;
    return {
      cell: { row, col },
      contentX,
      contentY: 50,
      viewportX: contentX,
      viewportY: 50,
      nativeEvent: new MouseEvent("click", { clientX: contentX }),
      preventDefault: () => {
        defaultPrevented = true;
      },
      get defaultPrevented() {
        return defaultPrevented;
      },
    } as any;
  }

  it("creates instruction with onClick handler when onChange is set", () => {
    const onChange = (_v: number) => {};
    const result = ProgressBar({ value: 50, onChange }) as any;
    expect(result).not.toBeNull();
    expect(result._handlers?.onClick).toBeDefined();
  });

  it("creates instruction with onMouseDown handler when onChange is set", () => {
    const onChange = (_v: number) => {};
    const result = ProgressBar({ value: 50, onChange }) as any;
    expect(result._handlers?.onMouseDown).toBeDefined();
  });

  it("does not have internal handlers when onChange is not set", () => {
    const result = ProgressBar({ value: 50 }) as any;
    expect(result._handlers).toBeUndefined();
  });

  it("defaults max to 100", () => {
    const result = ProgressBar({ value: 50 }) as any;
    expect(result.max).toBeUndefined();
  });

  it("includes max when explicitly provided", () => {
    const result = ProgressBar({ value: 7, max: 10 }) as any;
    expect(result.max).toBe(10);
  });

  it("onClick handler computes value from contentX and calls onChange", () => {
    populateBarCache(5, 2);
    const values: number[] = [];
    const onChange = (v: number) => values.push(v);
    const result = ProgressBar({ value: 50, onChange }) as any;
    const event = makeCellEvent(110, 5, 2);
    result._handlers.onClick(event);
    expect(values.length).toBe(1);
    expect(values[0]).toBeGreaterThanOrEqual(0);
    expect(values[0]).toBeLessThanOrEqual(100);
  });

  it("onClick handler returns current value when no bar geometry", () => {
    const values: number[] = [];
    const onChange = (v: number) => values.push(v);
    const result = ProgressBar({ value: 75, onChange }) as any;
    // Use a row/col that hasn't been cached
    const event = makeCellEvent(110, 999, 999);
    result._handlers.onClick(event);
    expect(values[0]).toBe(75);
  });

  it("onClick handler calls user onClick before onChange", () => {
    populateBarCache(6, 3);
    const calls: string[] = [];
    const userOnClick = () => calls.push("userClick");
    const onChange = () => calls.push("onChange");
    const result = ProgressBar({ value: 50, onClick: userOnClick, onChange }) as any;
    result._handlers.onClick(makeCellEvent(110, 6, 3));
    expect(calls).toEqual(["userClick", "onChange"]);
  });

  it("onMouseDown handler computes initial ratio and calls onChange", () => {
    populateBarCache(7, 0);
    const values: number[] = [];
    const onChange = (v: number) => values.push(v);
    const result = ProgressBar({ value: 50, onChange }) as any;
    const event = makeCellEvent(60, 7, 0);
    result._handlers.onMouseDown(event);
    expect(values.length).toBe(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("onMouseDown handler returns early when no bar geometry", () => {
    const values: number[] = [];
    const onChange = (v: number) => values.push(v);
    const result = ProgressBar({ value: 50, onChange }) as any;
    const event = makeCellEvent(60, 888, 888);
    result._handlers.onMouseDown(event);
    // userOnMouseDown may still be called but onChange should not (no geo)
    expect(values.length).toBe(0);
  });

  it("onMouseDown handler calls user onMouseDown before processing", () => {
    populateBarCache(8, 1);
    const calls: string[] = [];
    const userOnMouseDown = () => calls.push("userMouseDown");
    const onChange = () => calls.push("onChange");
    const result = ProgressBar({ value: 50, onMouseDown: userOnMouseDown, onChange }) as any;
    result._handlers.onMouseDown(makeCellEvent(60, 8, 1));
    expect(calls[0]).toBe("userMouseDown");
    expect(calls[1]).toBe("onChange");
  });

  it("onMouseDown handler registers mousemove/mouseup and updates via drag", () => {
    populateBarCache(9, 0);
    const values: number[] = [];
    const onChange = (v: number) => values.push(v);
    const result = ProgressBar({ value: 50, onChange }) as any;
    const event = makeCellEvent(110, 9, 0);
    result._handlers.onMouseDown(event);
    const initialCount = values.length;

    // Simulate mouse move
    const moveEvent = new MouseEvent("mousemove", { clientX: 150 });
    window.dispatchEvent(moveEvent);
    expect(values.length).toBeGreaterThan(initialCount);

    // Simulate mouse up — should remove listeners
    const upEvent = new MouseEvent("mouseup");
    window.dispatchEvent(upEvent);
    const countAfterUp = values.length;

    // Further moves should not trigger onChange
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 200 }));
    expect(values.length).toBe(countAfterUp);
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
