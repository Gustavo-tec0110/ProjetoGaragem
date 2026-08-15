type PerformanceContext = Record<string, string | number | boolean | null | undefined>;

const enabled =
  process.env.NODE_ENV !== "production" ||
  process.env.PROJETO_GARAGEM_PERF === "true" ||
  process.env.NEXT_PUBLIC_PROJETO_GARAGEM_PERF === "true";

function rounded(durationMs: number) {
  return Math.round(durationMs * 10) / 10;
}

export function logPerformance(
  layer: string,
  operation: string,
  durationMs: number,
  context?: PerformanceContext
) {
  if (!enabled) return;
  console.info(`[perf:${layer}] ${operation}`, {
    durationMs: rounded(durationMs),
    ...context,
  });
}

export function performanceTimer(
  layer: string,
  operation: string,
  context?: PerformanceContext
) {
  const startedAt = performance.now();

  return {
    elapsed() {
      return performance.now() - startedAt;
    },
    lap(name: string, lapStartedAt: number, lapContext?: PerformanceContext) {
      logPerformance(layer, `${operation}.${name}`, performance.now() - lapStartedAt, {
        ...context,
        ...lapContext,
      });
    },
    end(endContext?: PerformanceContext) {
      const durationMs = performance.now() - startedAt;
      logPerformance(layer, operation, durationMs, { ...context, ...endContext });
      return durationMs;
    },
  };
}

export async function measurePerformance<T>(
  layer: string,
  operation: string,
  task: () => Promise<T>,
  context?: PerformanceContext
) {
  const timer = performanceTimer(layer, operation, context);
  try {
    return await task();
  } finally {
    timer.end();
  }
}
