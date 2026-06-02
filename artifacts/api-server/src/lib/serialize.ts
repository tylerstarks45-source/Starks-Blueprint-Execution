/**
 * Serializes a value from the database for JSON responses.
 * Converts Date objects to ISO strings so Zod schemas (which expect strings) don't throw.
 */
export function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
