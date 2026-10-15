import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { URL } from "node:url";
import { chromium } from "@playwright/test";

const origin = new URL(process.env.BENCH_ORIGIN ?? "http://127.0.0.1:3107");
if (!["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)) throw new Error("Benchmark must use an isolated local server");
const cli = process.env.LIGHTHOUSE_CLI;
if (!cli) throw new Error("Set LIGHTHOUSE_CLI to the installed Lighthouse cli/index.js");
const output = "docs/evidencias-integracao-final/lighthouse";
mkdirSync(output, { recursive: true });
const rows = [];
const settings = {
  buildId: readFileSync(".next/BUILD_ID", "utf8").trim(),
  lighthouse: JSON.parse(readFileSync(path.resolve(path.dirname(cli), "../package.json"), "utf8")).version,
  runsPerRouteAndDevice: 1, storageReset: true, environment: "isolated-local-production-empty-catalog",
  comparison: "same viewport/throttling settings as performance stage 3; no controlled old/new causal claim",
};
for (const device of ["mobile", "desktop"]) {
  const mobile = device === "mobile";
  for (const [name, route] of [["inicial", "/"], ["explorar", "/explorar"], ["login", "/login"]]) {
    const file = `${output}/${name}-${device}.json`;
    execFileSync(process.execPath, [cli, new URL(route, origin).href,
      "--output=json", `--output-path=${file}`, "--only-categories=performance,accessibility,best-practices,seo",
      `--form-factor=${device}`, `--screenEmulation.mobile=${mobile}`,
      `--screenEmulation.width=${mobile ? 412 : 1366}`, `--screenEmulation.height=${mobile ? 823 : 768}`,
      "--screenEmulation.deviceScaleFactor=1", "--throttling-method=simulate",
      `--throttling.cpuSlowdownMultiplier=${mobile ? 4 : 1}`, `--throttling.rttMs=${mobile ? 150 : 40}`,
      `--throttling.throughputKbps=${mobile ? 1638.4 : 10240}`, "--quiet",
      "--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage"],
    { stdio: "inherit", env: { ...process.env, CHROME_PATH: chromium.executablePath() } });
    const report = JSON.parse(readFileSync(file, "utf8"));
    const requests = report.audits["network-requests"]?.details?.items ?? [];
    const row = { route, device, scores: Object.fromEntries(Object.entries(report.categories)
      .map(([key, value]) => [key, value.score === null ? null : Math.round(value.score * 100)])),
      lcpMs: Math.round(report.audits["largest-contentful-paint"].numericValue),
      tbtMs: Math.round(report.audits["total-blocking-time"].numericValue),
      cls: report.audits["cumulative-layout-shift"].numericValue,
      jsTransferBytes: requests.filter((request) => request.resourceType === "Script")
        .reduce((sum, request) => sum + (request.transferSize ?? 0), 0) };
    rows.push(row);
    writeFileSync(`${output}/summary.json`, `${JSON.stringify({ settings, rows }, null, 2)}\n`);
  }
}
