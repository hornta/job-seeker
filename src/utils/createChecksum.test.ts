import { describe, expect, it } from "vitest";
import { createChecksum } from "./createChecksum.ts";

describe("createChecksum", () => {
	it("should generate consistent checksum for identical objects", () => {
		const obj1 = { a: 1, b: 2, c: 3 };
		const obj2 = { a: 1, b: 2, c: 3 };
		expect(createChecksum(obj1)).toBe(createChecksum(obj2));
	});

	it("should generate same checksum regardless of property order", () => {
		const obj1 = { a: 1, b: 2, c: 3 };
		const obj2 = { c: 3, a: 1, b: 2 };
		const obj3 = { b: 2, c: 3, a: 1 };
		const checksum1 = createChecksum(obj1);
		const checksum2 = createChecksum(obj2);
		const checksum3 = createChecksum(obj3);
		expect(checksum1).toBe(checksum2);
		expect(checksum2).toBe(checksum3);
	});

	it("should generate different checksums for different values", () => {
		const obj1 = { a: 1, b: 2 };
		const obj2 = { a: 1, b: 3 };
		expect(createChecksum(obj1)).not.toBe(createChecksum(obj2));
	});

	it("should handle nested objects with property order independence", () => {
		const obj1 = { outer: { a: 1, b: 2 }, x: 10 };
		const obj2 = { x: 10, outer: { b: 2, a: 1 } };
		expect(createChecksum(obj1)).toBe(createChecksum(obj2));
	});

	it("should handle deeply nested objects", () => {
		const obj1 = { level1: { level2: { level3: { a: 1, b: 2 } } } };
		const obj2 = { level1: { level2: { level3: { b: 2, a: 1 } } } };
		expect(createChecksum(obj1)).toBe(createChecksum(obj2));
	});

	it("should handle arrays (order matters for arrays)", () => {
		const obj1 = { arr: [1, 2, 3] };
		const obj2 = { arr: [3, 2, 1] };
		expect(createChecksum(obj1)).not.toBe(createChecksum(obj2));
	});

	it("should generate same checksum for identical arrays", () => {
		const obj1 = { arr: [1, 2, 3] };
		const obj2 = { arr: [1, 2, 3] };
		expect(createChecksum(obj1)).toBe(createChecksum(obj2));
	});

	it("should handle arrays of objects with property order independence", () => {
		const obj1 = {
			items: [
				{ a: 1, b: 2 },
				{ c: 3, d: 4 },
			],
		};
		const obj2 = {
			items: [
				{ b: 2, a: 1 },
				{ d: 4, c: 3 },
			],
		};
		expect(createChecksum(obj1)).toBe(createChecksum(obj2));
	});

	it("should handle string values", () => {
		const obj1 = { name: "test", value: "hello" };
		const obj2 = { value: "hello", name: "test" };
		expect(createChecksum(obj1)).toBe(createChecksum(obj2));
	});

	it("should handle boolean values", () => {
		const obj1 = { flag: true, active: false };
		const obj2 = { active: false, flag: true };
		expect(createChecksum(obj1)).toBe(createChecksum(obj2));
	});

	it("should handle null values", () => {
		const obj1 = { value: null, other: 123 };
		const obj2 = { other: 123, value: null };
		expect(createChecksum(obj1)).toBe(createChecksum(obj2));
	});

	it("should handle empty objects", () => {
		const obj1 = {};
		const obj2 = {};
		expect(createChecksum(obj1)).toBe(createChecksum(obj2));
	});

	it("should handle empty arrays", () => {
		const obj1 = { arr: [] };
		const obj2 = { arr: [] };
		expect(createChecksum(obj1)).toBe(createChecksum(obj2));
	});

	it("should handle primitive values directly", () => {
		expect(createChecksum(123)).toBe(createChecksum(123));
		expect(createChecksum("hello")).toBe(createChecksum("hello"));
		expect(createChecksum(true)).toBe(createChecksum(true));
		expect(createChecksum(null)).toBe(createChecksum(null));
	});

	it("should generate different checksums for different primitives", () => {
		expect(createChecksum(123)).not.toBe(createChecksum(124));
		expect(createChecksum("hello")).not.toBe(createChecksum("world"));
		expect(createChecksum(true)).not.toBe(createChecksum(false));
	});

	it("should return a 64-character hex string (SHA-256)", () => {
		const checksum = createChecksum({ a: 1 });
		expect(checksum).toMatch(/^[a-f0-9]{64}$/);
		expect(checksum.length).toBe(64);
	});

	it("should throw TypeError for undefined values", () => {
		const obj = { a: 1, b: undefined };
		expect(() => createChecksum(obj)).toThrow(TypeError);
		expect(() => createChecksum(obj)).toThrow(
			"Unsupported type for checksum: undefined",
		);
	});

	it("should throw TypeError for functions", () => {
		const obj = { a: 1, b: () => {} };
		expect(() => createChecksum(obj)).toThrow(TypeError);
		expect(() => createChecksum(obj)).toThrow(
			"Unsupported type for checksum: function",
		);
	});

	it("should throw TypeError for symbols", () => {
		const obj = { a: 1, b: Symbol("test") };
		expect(() => createChecksum(obj)).toThrow(TypeError);
		expect(() => createChecksum(obj)).toThrow(
			"Unsupported type for checksum: symbol",
		);
	});

	it("should throw TypeError for bigint values", () => {
		const obj = { a: 1, b: 123n };
		expect(() => createChecksum(obj)).toThrow(TypeError);
		expect(() => createChecksum(obj)).toThrow(
			"Unsupported type for checksum: bigint",
		);
	});

	it("should throw TypeError for undefined at top level", () => {
		expect(() => createChecksum(undefined)).toThrow(TypeError);
	});

	it("should throw TypeError for functions in nested objects", () => {
		const obj = { nested: { a: 1, b: () => {} } };
		expect(() => createChecksum(obj)).toThrow(TypeError);
	});

	it("should throw TypeError for undefined in arrays", () => {
		const obj = { arr: [1, 2, undefined] };
		expect(() => createChecksum(obj)).toThrow(TypeError);
	});

	it("should handle complex nested structure", () => {
		const obj1 = {
			users: [
				{ id: 1, name: "Alice", active: true },
				{ id: 2, name: "Bob", active: false },
			],
			config: { timeout: 5000, retry: 3 },
			metadata: { version: "1.0.0", timestamp: null },
		};
		const obj2 = {
			metadata: { timestamp: null, version: "1.0.0" },
			users: [
				{ name: "Alice", active: true, id: 1 },
				{ active: false, name: "Bob", id: 2 },
			],
			config: { retry: 3, timeout: 5000 },
		};
		expect(createChecksum(obj1)).toBe(createChecksum(obj2));
	});
});
