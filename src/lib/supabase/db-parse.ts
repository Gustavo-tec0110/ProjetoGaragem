export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export function asJsonStringArray(value: unknown): string[] {
  // `jsonb` pode chegar como array JS, ou string dependendo do client/config.
  if (Array.isArray(value)) return asStringArray(value);
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return asStringArray(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

export function asTextArray(value: unknown): string[] {
  // `text[]` normalmente chega como array JS.
  return asStringArray(value);
}

export function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

