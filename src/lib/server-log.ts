import "server-only";

type LogContext = Record<string, unknown>;

const ENABLED =
  process.env.NODE_ENV !== "production" || process.env.PROJETO_GARAGEM_DEBUG === "true";

function sanitize(context?: LogContext) {
  if (!context) return undefined;

  const sensitive = /(?:password|token|secret|authorization|cookie|session|api[_-]?key)/i;
  const scrub = (value: unknown, key = ""): unknown => {
    if (sensitive.test(key)) return "[redacted]";
    if (typeof value === "string") return value.slice(0, 1_000);
    if (Array.isArray(value)) return value.slice(0, 20).map((item) => scrub(item));
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 30).map(([childKey, childValue]) => [childKey, scrub(childValue, childKey)]));
    }
    return value;
  };

  return Object.fromEntries(
    Object.entries(context)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, scrub(value, key)])
  );
}

export const serverLog = {
  error(scope: string, context?: LogContext) {
    if (!ENABLED) return;
    console.error(`[ProjetoGaragem:${scope}]`, sanitize(context));
  },
  warn(scope: string, context?: LogContext) {
    if (!ENABLED) return;
    console.warn(`[ProjetoGaragem:${scope}]`, sanitize(context));
  },
  info(scope: string, context?: LogContext) {
    if (!ENABLED) return;
    console.info(`[ProjetoGaragem:${scope}]`, sanitize(context));
  },
};
