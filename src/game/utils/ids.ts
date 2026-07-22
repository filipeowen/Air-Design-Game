export function createId(prefix: string, parts: readonly (string | number)[]): string {
  return `${prefix}-${parts.join("-").toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
}
