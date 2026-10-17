/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const stages = ['current-first', 'old-template', 'current-repeat', 'no-explore-prefetch', 'final'];
const keys = ['score', 'lcpMs', 'cls', 'tbtMs', 'fcpMs', 'jsTransferBytes', 'requests', 'loadEventMs', 'lcpRenderDelayMs'];
const median = (numbers) => { const a = [...numbers].sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
const output = {};
for (const stage of stages) {
  const folder = path.join(root, stage, 'mobile');
  const samples = JSON.parse(fs.readFileSync(path.join(folder, 'summary.json'))).summary;
  output[stage] = {};
  for (const route of [...new Set(samples.map((sample) => sample.route))]) {
    const rows = samples.filter((sample) => sample.route === route).map((sample) => {
      const lhr = JSON.parse(fs.readFileSync(path.join(folder, `${route}-${sample.run}.json`)));
      const breakdown = lhr.audits['lcp-breakdown-insight']?.details?.items;
      return {
        ...sample,
        loadEventMs: lhr.audits.metrics?.details?.items?.[0]?.observedLoad ?? null,
        lcpRenderDelayMs: breakdown?.[0]?.items?.find((item) => item.subpart === 'elementRenderDelay')?.duration ?? null,
        lcpElement: breakdown?.[1]?.nodeLabel ?? null,
        supabaseScript: (lhr.audits['network-requests']?.details?.items ?? []).some((item) => item.resourceType === 'Script' && item.url.includes('19hvplwf37y2e')),
      };
    });
    const stats = {};
    for (const key of keys) {
      const numbers = rows.map((row) => row[key]).filter((value) => typeof value === 'number');
      stats[key] = numbers.length ? { median: median(numbers), min: Math.min(...numbers), max: Math.max(...numbers) } : null;
    }
    output[stage][route] = { count: rows.length, stats, lcpElements: [...new Set(rows.map((row) => row.lcpElement))], supabaseScriptRuns: rows.filter((row) => row.supabaseScript).length, samples: rows };
  }
}
fs.writeFileSync(path.join(root, 'statistics.json'), JSON.stringify(output, null, 2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(output).map(([stage, routes]) => [stage, Object.fromEntries(Object.entries(routes).map(([route, data]) => [route, { stats: data.stats, lcpElements: data.lcpElements, supabaseScriptRuns: data.supabaseScriptRuns }]))])), null, 2));
