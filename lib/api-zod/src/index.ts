export * from "./generated/api";
export * from "./generated/types";

// getSystemLogs / getBusinessLogs each have BOTH a path param (`id`) and query
// params. Orval emits a zod path-param object (in generated/api) and a react
// query-param TYPE (in generated/types) with the SAME name, which makes the two
// `export *` above ambiguous (TS2308). Prefer the zod path objects here; the
// query-param zod objects are uniquely named `*QueryParams` and remain exported.
export { GetSystemLogsParams, GetBusinessLogsParams } from "./generated/api";
