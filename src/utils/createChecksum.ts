import { createHash } from "node:crypto";

/**
 * Normalizes a value for consistent hashing by:
 * - Recursively sorting object keys alphabetically
 * - Validating that the value contains only serializable types
 * - Throwing errors for unsupported types (functions, symbols, undefined)
 * @param value - The value to normalize
 * @returns The normalized value ready for JSON stringification
 * @throws {TypeError} If the value contains unsupported types
 */
function normalizeForChecksum(value: unknown): unknown {
	if (value === null) {
		return null;
	}

	const type = typeof value;
	if (type === "string" || type === "number" || type === "boolean") {
		return value;
	}

	if (
		type === "undefined" ||
		type === "function" ||
		type === "symbol" ||
		type === "bigint"
	) {
		throw new TypeError(
			`Unsupported type for checksum: ${type}. Only primitives, objects, and arrays are allowed.`,
		);
	}

	if (Array.isArray(value)) {
		return value.map((item) => normalizeForChecksum(item));
	}

	if (type === "object") {
		const obj = value as Record<string, unknown>;
		const sortedKeys = Object.keys(obj).sort();
		const normalized: Record<string, unknown> = {};

		for (const key of sortedKeys) {
			normalized[key] = normalizeForChecksum(obj[key]);
		}

		return normalized;
	}

	throw new TypeError(
		`Unsupported type for checksum: ${type}. Only primitives, objects, and arrays are allowed.`,
	);
}

/**
 * Creates a SHA-256 checksum from a plain JavaScript object.
 * The checksum is order-independent for object properties at all nesting levels.
 * @param obj - The object to checksum (must contain only primitives, objects, and arrays)
 * @returns A 64-character hex string representing the SHA-256 hash
 * @throws {TypeError} If the object contains unsupported types (functions, symbols, undefined, bigint)
 * @example
 * ```ts
 * const obj1 = { b: 2, a: 1 };
 * const obj2 = { a: 1, b: 2 };
 * createChecksum(obj1) === createChecksum(obj2); // true
 * ```
 */
export function createChecksum(obj: unknown): string {
	const normalized = normalizeForChecksum(obj);
	const jsonString = JSON.stringify(normalized);
	const hash = createHash("sha256");
	hash.update(jsonString);
	return hash.digest("hex");
}
