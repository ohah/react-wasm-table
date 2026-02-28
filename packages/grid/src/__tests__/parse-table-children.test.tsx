import { describe, expect, it } from "bun:test";
import React from "react";
import { parseTableChildren } from "../react/parse-table-children";
import { Thead, Tbody, Tfoot, Tr, Th, Td } from "../react/table-components";

describe("parseTableChildren", () => {
  it("should return hasStructure false for no children", () => {
    const result = parseTableChildren(null);
    expect(result.hasStructure).toBe(false);
    expect(result.headerRows).toEqual([]);
    expect(result.bodyRows).toEqual([]);
    expect(result.footerRows).toEqual([]);
  });

  it("should return hasStructure false for non-structural children", () => {
    const result = parseTableChildren(<div>hello</div>);
    expect(result.hasStructure).toBe(false);
  });

  it("should parse Thead > Tr > Th structure", () => {
    const children = (
      <Thead>
        <Tr>
          <Th>Name</Th>
          <Th>Age</Th>
        </Tr>
      </Thead>
    );
    const result = parseTableChildren(children);
    expect(result.hasStructure).toBe(true);
    expect(result.headerRows.length).toBe(1);
    expect(result.headerRows[0]!.cells.length).toBe(2);
    expect(result.headerRows[0]!.cells[0]!.content).toBe("Name");
    expect(result.headerRows[0]!.cells[1]!.content).toBe("Age");
  });

  it("should parse Tbody > Tr > Td structure", () => {
    const children = (
      <Tbody>
        <Tr>
          <Td>Alice</Td>
          <Td>30</Td>
        </Tr>
        <Tr>
          <Td>Bob</Td>
          <Td>25</Td>
        </Tr>
      </Tbody>
    );
    const result = parseTableChildren(children);
    expect(result.hasStructure).toBe(true);
    expect(result.bodyRows.length).toBe(2);
    expect(result.bodyRows[0]!.cells[0]!.content).toBe("Alice");
    expect(result.bodyRows[1]!.cells[0]!.content).toBe("Bob");
  });

  it("should parse Tfoot structure", () => {
    const children = (
      <Tfoot>
        <Tr>
          <Td>Total</Td>
          <Td>55</Td>
        </Tr>
      </Tfoot>
    );
    const result = parseTableChildren(children);
    expect(result.hasStructure).toBe(true);
    expect(result.footerRows.length).toBe(1);
    expect(result.footerRows[0]!.cells[0]!.content).toBe("Total");
  });

  it("should handle colSpan on Th", () => {
    const children = (
      <Thead>
        <Tr>
          <Th colSpan={2}>Full Name</Th>
          <Th>Age</Th>
        </Tr>
      </Thead>
    );
    const result = parseTableChildren(children);
    expect(result.headerRows[0]!.cells[0]!.colSpan).toBe(2);
    expect(result.headerRows[0]!.cells[1]!.colSpan).toBe(1);
  });

  it("should default colSpan to 1", () => {
    const children = (
      <Thead>
        <Tr>
          <Th>Name</Th>
        </Tr>
      </Thead>
    );
    const result = parseTableChildren(children);
    expect(result.headerRows[0]!.cells[0]!.colSpan).toBe(1);
  });

  it("should parse combined Thead + Tbody as array children", () => {
    const children = [
      <Thead key="h">
        <Tr>
          <Th>Header</Th>
        </Tr>
      </Thead>,
      <Tbody key="b">
        <Tr>
          <Td>Body</Td>
        </Tr>
      </Tbody>,
    ];
    const result = parseTableChildren(children);
    expect(result.hasStructure).toBe(true);
    expect(result.headerRows.length).toBe(1);
    expect(result.bodyRows.length).toBe(1);
  });

  it("should ignore non-Tr children inside Thead", () => {
    const children = (
      <Thead>
        <div>ignored</div>
        <Tr>
          <Th>Valid</Th>
        </Tr>
      </Thead>
    );
    const result = parseTableChildren(children);
    expect(result.headerRows.length).toBe(1);
    expect(result.headerRows[0]!.cells[0]!.content).toBe("Valid");
  });

  it("should ignore non-Th/Td children inside Tr", () => {
    const children = (
      <Tbody>
        <Tr>
          <span>ignored</span>
          <Td>valid</Td>
        </Tr>
      </Tbody>
    );
    const result = parseTableChildren(children);
    expect(result.bodyRows[0]!.cells.length).toBe(1);
    expect(result.bodyRows[0]!.cells[0]!.content).toBe("valid");
  });
});
