import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';
import { Buffer } from 'node:buffer';

const exports={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/profile/image-preview.ts','utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText,{exports,DataView,Uint8Array,require:()=>({IMAGE_UPLOAD_MAX_BYTES:5*1024*1024,IMAGE_UPLOAD_MAX_PIXELS:16_000_000})});
const header=bytes=>JSON.parse(JSON.stringify(exports.profileImageHeader(bytes)));
for(const format of ['png','jpeg','webp'])test(`PERF-09: parse actual ${format} header without allocating a bitmap`,async()=>{
  const bytes=await sharp({create:{width:1200,height:800,channels:3,background:'#ca2211'}})[format]().toBuffer();
  assert.deepEqual(header(bytes),{width:1200,height:800,orientation:1});
});
for(let orientation=1;orientation<=8;orientation++)test(`PERF-09: JPEG EXIF ${orientation} preserves oriented geometry`,async()=>{
  const bytes=await sharp({create:{width:4000,height:3000,channels:3,background:'#ca2211'}}).jpeg().withMetadata({orientation}).toBuffer();
  assert.deepEqual(header(bytes),{width:orientation>=5?3000:4000,height:orientation>=5?4000:3000,orientation});
});
for(const format of ['png','webp'])test(`PERF-09: ${format} EXIF is included in dimension preflight`,async()=>{
  const bytes=await sharp({create:{width:1200,height:800,channels:3,background:'#ca2211'}})[format]().withMetadata({orientation:6}).toBuffer();
  assert.deepEqual(header(bytes),{width:800,height:1200,orientation:6});
});
test('PERF-09: malformed headers, oversized pixels and forged chunk lengths fail before decode',async()=>{
  assert.throws(()=>header(Buffer.from('not an image')),/ler esta imagem/);
  const png=await sharp({create:{width:100,height:80,channels:3,background:'#fff'}}).png().toBuffer();
  const oversized=Buffer.from(png);oversized.writeUInt32BE(100000,16);oversized.writeUInt32BE(100000,20);
  assert.throws(()=>header(oversized),/16 megapixels/);
  const truncated=png.subarray(0,24);assert.throws(()=>header(truncated),/incompleto/);
  const webp=await sharp(png).webp().toBuffer();const forged=Buffer.from(webp);forged.writeUInt32LE(0xffffffff,16);
  assert.throws(()=>header(forged),/incompleta/);
});
