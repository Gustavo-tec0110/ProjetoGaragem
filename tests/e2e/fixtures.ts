import {
  expect,
  test as base,
  type ConsoleMessage,
  type Page,
  type Request,
  type Response,
  type TestInfo,
} from "@playwright/test";

type RuntimeMonitor = {
  issues: string[];
};

const CRITICAL_RESOURCE_TYPES = new Set([
  "document",
  "fetch",
  "script",
  "stylesheet",
  "xhr",
]);

function installRuntimeMonitor(page: Page, testInfo: TestInfo): RuntimeMonitor {
  const monitor: RuntimeMonitor = { issues: [] };

  page.on("console", (message: ConsoleMessage) => {
    const text = message.text();
    if (
      message.type() === "error" ||
      (message.type() === "warning" && /hydrat|did not match/i.test(text))
    ) {
      monitor.issues.push(`console.${message.type()}: ${text}`);
    }
  });

  page.on("pageerror", (error: Error) => {
    monitor.issues.push(`pageerror: ${error.message}`);
  });

  page.on("requestfailed", (request: Request) => {
    if (!CRITICAL_RESOURCE_TYPES.has(request.resourceType())) return;
    const reason = request.failure()?.errorText ?? "falha sem detalhe";
    if (/ERR_ABORTED|NS_BINDING_ABORTED/i.test(reason)) return;
    monitor.issues.push(`requestfailed: ${request.method()} ${request.url()} — ${reason}`);
  });

  page.on("response", (response: Response) => {
    if (response.status() < 500) return;
    monitor.issues.push(
      `response: ${response.status()} ${response.request().method()} ${response.url()}`
    );
  });

  testInfo.annotations.push({
    type: "runtime-monitor",
    description: "Console, hydration, page errors, requests criticas e respostas 5xx",
  });

  return monitor;
}

export const test = base.extend<{ runtimeMonitor: RuntimeMonitor }>({
  runtimeMonitor: [
    async ({ page }, use, testInfo) => {
      const monitor = installRuntimeMonitor(page, testInfo);
      await use(monitor);

      if (monitor.issues.length) {
        await testInfo.attach("runtime-issues", {
          body: Buffer.from(JSON.stringify(monitor.issues, null, 2)),
          contentType: "application/json",
        });
      }

      expect.soft(monitor.issues, "erros de runtime encontrados").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
