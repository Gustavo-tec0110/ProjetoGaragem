import "server-only";

type LogContext = Record<string, unknown>;

const ENABLED =
  process.env.NODE_ENV !== "production" || process.env.PROJETO_GARAGEM_DEBUG === "true";

function sanitize(context?: LogContext) {
  if (!context) return undefined;

  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined)
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
