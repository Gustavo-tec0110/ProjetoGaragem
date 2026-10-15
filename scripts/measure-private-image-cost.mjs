import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { runInNewContext } from "node:vm";
import { Blob, Buffer } from "node:buffer";
import sharp from "sharp";
import ts from "typescript";
import * as limits from "../src/lib/security/limits.ts";

const exports = {};
runInNewContext(ts.transpileModule(readFileSync("src/lib/images/resize.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, { exports, Blob, Buffer, require: (name) => {
  if (name === "server-only") return {};
  if (name === "sharp") return sharp;
  if (name === "@/lib/security/limits") return limits;
  throw new Error(`Unexpected benchmark dependency: ${name}`);
} });
const original = readFileSync("public/ref/hero-opala-ss.webp");
const rows = [];
for (const width of [384, 640, 1080]) {
  const times = [];
  let bytes = 0;
  for (let run = 0; run < 10; run++) {
    const started = performance.now();
    const output = await exports.resizeProjectImage(new Blob([original], { type: "image/webp" }), { width, quality: 75 });
    times.push(performance.now() - started);
    bytes = output.size;
  }
  times.sort((a, b) => a - b);
  rows.push({ width, quality: 75, originalBytes: original.length, variantBytes: bytes,
    processingMedianMs: Math.round(times[5]), processingP95Ms: Math.round(times[9]),
    per10000Gets: { authorizationRPCs: 20000, upstreamBytes: original.length * 10000, downstreamBytes: bytes * 10000 } });
}
const report = { mode: "local-real-sharp-processing", node: process.version, rows,
  limitations: "Excludes Supabase authorization/download latency, Netlify billing memory and network. No provider requests or real private images. Each authorized GET uses two RPCs and no shared image cache. HEAD currently performs the same processing." };
mkdirSync("docs/evidencias-integracao-final", { recursive: true });
writeFileSync("docs/evidencias-integracao-final/image-cost.json", `${JSON.stringify(report, null, 2)}\n`);
