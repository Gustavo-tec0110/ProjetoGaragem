import fs from "node:fs";
import sharp from "sharp";
import { expect, test } from "./fixtures";
import { test as benchmarkTest } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
});

async function image(width: number, height: number, orientation = 1, format: "jpeg" | "png" | "webp" = "jpeg") {
  const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><path fill="#f00" d="M0 0h${width/2}v${height}H0z"/><path fill="#00f" d="M${width/2} 0H${width}v${height}H${width/2}z"/></svg>`);
  return { name:`fixture.${format}`,mimeType:`image/${format}`,buffer:await sharp(svg)[format]().withMetadata({orientation}).toBuffer() };
}

for(const format of ["jpeg","png","webp"] as const) test(`PERF-09: ${format} EXIF 6 preserves native orientation and original export`,async({page})=>{
  await page.goto('/test-harness/profile-image-editor');
  await page.getByTestId('editor-file-input').setInputFiles(await image(1200,800,6,format));
  const preview=page.getByAltText('Prévia do recorte');await expect(preview).toBeVisible();
  expect(await preview.evaluate(async(i:HTMLImageElement)=>{await i.decode();return [i.naturalWidth,i.naturalHeight];})).toEqual(format==='webp'?[1200,800]:[800,1200]);
  await page.getByRole('button',{name:'Aplicar recorte'}).click();const applied=page.getByTestId('applied-image');await expect(applied).toBeVisible();
  const pixels=await applied.evaluate(async(i:HTMLImageElement)=>{
    await i.decode();const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(i,0,0);
    return {size:[c.width,c.height],top:[...ctx.getImageData(c.width/2,20,1,1).data],bottom:[...ctx.getImageData(c.width/2,c.height-20,1,1).data],left:[...ctx.getImageData(20,c.height/2,1,1).data],right:[...ctx.getImageData(c.width-20,c.height/2,1,1).data]};
  });
  expect(pixels.size).toEqual([512,512]);
  expect((format==='webp'?pixels.left:pixels.top)[0]).toBeGreaterThan(235);expect((format==='webp'?pixels.right:pixels.bottom)[2]).toBeGreaterThan(235);
});

test('PERF-09: pixel limit refuses a valid header before browser decoding',async({page})=>{
  await page.addInitScript(()=>{
    const original=HTMLImageElement.prototype.decode;Object.assign(window,{fixtureBitmapCalls:0});
    HTMLImageElement.prototype.decode=function(this:HTMLImageElement){
      if(this.src.startsWith('blob:'))(window as unknown as {fixtureBitmapCalls:number}).fixtureBitmapCalls++;
      return original.call(this);
    };
  });
  await page.goto('/test-harness/profile-image-editor');const fixture=await image(5000,4000,1,'png');
  await page.getByTestId('editor-file-input').setInputFiles(fixture);
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('16 megapixels');
  expect(await page.evaluate(()=>(window as unknown as {fixtureBitmapCalls:number}).fixtureBitmapCalls)).toBe(0);
  await expect(page.getByRole('button',{name:'Aplicar recorte'})).toBeDisabled();
});

benchmarkTest('PERF-09: 12 MP preview benchmark, original output and URL cleanup',async({page},info)=>{
  test.skip(process.env.PROFILE_IMAGE_EDITOR_BASELINE_BENCHMARK !== '1' || info.project.name!=='desktop-chromium',
    'Requires the isolated baseline app with both versions of the profile image editor.');
  benchmarkTest.setTimeout(180_000);const fixture=await image(4000,3000,6);const rows=[];
  const exports: Record<string,string>={};
  let errors:string[]=[];page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.addInitScript(()=>{
    const active=new Set<string>(),create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
    URL.createObjectURL=blob=>{const url=create(blob);active.add(url);return url;};
    URL.revokeObjectURL=url=>{active.delete(url);revoke(url);};
    Object.assign(window,{fixtureActiveUrls:active});
  });
  for(const mode of ['before','after'])for(let run=1;run<=3;run++) {
    errors=[];
    await page.goto('/test-harness/profile-image-editor'+(mode==='before'?'-before':''));
    const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    const start=performance.now();await page.getByTestId('editor-file-input').setInputFiles(fixture);
    const preview=page.getByAltText('Prévia do recorte');await expect(preview).toBeVisible();
    const size=await preview.evaluate(async(i:HTMLImageElement)=>{await i.decode();return [i.naturalWidth,i.naturalHeight];});
    const selectionToPreviewMs=performance.now()-start;
    expect(size).toEqual([3000,4000]); // reduced preview experiment was rejected
    if(run===1) {
      await page.getByRole('button',{name:'Aplicar recorte'}).click();const result=page.getByTestId('applied-image');await expect(result).toBeVisible();
      exports[mode]=await result.evaluate(async(i:HTMLImageElement)=>{
        const bytes=await(await fetch(i.src)).arrayBuffer();const digest=await crypto.subtle.digest('SHA-256',bytes);
        return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
      });
      await expect.poll(()=>page.evaluate(()=>(window as unknown as {fixtureActiveUrls:Set<string>}).fixtureActiveUrls.size)).toBe(1); // applied result only
    } else {
      await page.getByRole('button',{name:'Cancelar recorte'}).click();
      await expect.poll(()=>page.evaluate(()=>(window as unknown as {fixtureActiveUrls:Set<string>}).fixtureActiveUrls.size)).toBe(0);
    }
    await page.waitForTimeout(100);
    rows.push({mode,run,selectionToPreviewMs,pixels:size[0]*size[1],size,errors});
    if(mode==='after')expect(errors).toEqual([]);
    await cdp.detach();
  }
  expect(exports.after).toEqual(exports.before);
  fs.writeFileSync('docs/auditorias/finalizacao-20261031/recorte-browser.json',JSON.stringify({environment:'real old/new component, synthetic JPEG 12MP EXIF6, Chromium headless CPU4x; bitmap pixel count is not native RAM measurement',exportsIdentical:true,exports,rows},null,2)+'\n');
});
