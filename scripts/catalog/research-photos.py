"""Resumable, read-only catalog research. Results never approve photographs.
Usage: python3 scripts/catalog/research-photos.py plan|search|sheets [provider]
Only publicly documented CC/PD candidates reach the licensed preview stage.
Downloads of full-size images require separate primary-page verification.
"""
import argparse,concurrent.futures,hashlib,html,io,json,re,threading,time
from pathlib import Path
import requests
from bs4 import BeautifulSoup
from PIL import Image,ImageOps,ImageDraw,ImageFont,ImageStat
ROOT=Path(__file__).resolve().parents[2]
DOC=ROOT/'docs/catalogo-2026-10-27/completion';OUT=ROOT/'artifacts/catalog-photo-completion-2026-10-27'
# Use requests' standard, truthful client identification. Flickr sometimes
# returns a 200 page without its search model for the previous custom header.
HEADERS={}
ALLOWED={4,5,6,9,10,11,12,13}
def read(p):return json.loads(p.read_text())
def write(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def model(text):return json.JSONDecoder().raw_decode(text[text.index('modelExport: ')+13:])[0]
def flickr_rows(data):
 models=data['main'].get('search-photos-lite-models',[])
 if not models:
  raise ValueError('Provider omitted search result model; absence is not a confirmed zero-result search')
 rows=models[0].get('data',{}).get('photos',{}).get('data',{}).get('_data',[]);found=[]
 for row in rows:
  d=row.get('data',{})
  if not isinstance(d,dict) or not d.get('id'):continue
  sizes=d.get('sizes',{}).get('data',{});sizes={k:v['data'] for k,v in sizes.items() if isinstance(v,dict) and isinstance(v.get('data'),dict)}
  found.append({k:d.get(k) for k in ['id','title','description','license','ownerNsid','pathAlias','username','realname']}|{'sizes':sizes,'page':f'https://www.flickr.com/photos/{d.get("pathAlias") or d.get("ownerNsid")}/{d["id"]}/'})
 return found

def plan():
 if (DOC/'plan.json').exists():
  existing=read(DOC/'plan.json')
  print('Preserved existing resumable plan:',len(existing['items']),'items,',len(existing['tasks']),'searches',flush=True)
  return
 definitions=read(ROOT/'src/lib/modifications/catalog-definitions.json');frozen=read(DOC/'preserved-62.json');terms=read(ROOT/'artifacts/catalog-expansion-2026-10-27/photo-queries.json')
 tasks=[];items=[]
 for d in definitions:
  slug=d['slug']
  if slug in frozen:continue
  en=terms[slug];pt=d['name'];syn=d['aliases']
  variants=[('pt',pt+' peça automotiva'),('en-isolated',en+' isolated'),('technical',en+' '+syn)]
  if slug=='instrumentacao-eletrica':variants[-1]=('technical','automotive gauge cluster instruments')
  items.append({'slug':slug,'name':pt,'category':d['category'],'english':en,'technicalSynonyms':syn,'status':'awaiting-research','queries':[x[1] for x in variants]})
  for language,query in variants:
   tasks.append({'id':f'flickr-{slug}-{language}','provider':'Flickr','slug':slug,'query':query,'language':language,'licensedOnly':True})
  # Catalog discovery does not imply permission to reuse the manufacturer's photographs.
  tasks.append({'id':f'flickr-{slug}-catalog','provider':'Flickr','slug':slug,'query':en+' product','language':'en','licensedOnly':False})
  tasks.append({'id':f'pxhere-{slug}','provider':'PxHere','slug':slug,'query':en,'language':'en','licensedOnly':True})
 write(DOC/'plan.json',{'initialApproved':len(frozen),'initialPending':len(items),'items':items,'tasks':tasks,'note':'Search results, filename/title matches and background scores never constitute visual or license approval.'})
 print('Planned',len(items),'components and',len(tasks),'new source searches',flush=True)

lock=threading.Lock();last={}
def pace(provider):
 with lock:
  delay=max(0,last.get(provider,0)+.85-time.monotonic())
  if delay:time.sleep(delay)
  last[provider]=time.monotonic()
RETRY=False
rate_limited=set()
def search_task(task):
 p=OUT/'raw'/(task['id']+'.json')
 if p.exists():
  cached=read(p)
  if not RETRY or not cached.get('error'):return cached
  write(OUT/'raw'/'prior-attempts'/p.name,cached)
 result=task|{'retrievedOn':'2026-10-27','candidates':[]}
 if task['provider'] in rate_limited:
  result.update(error='Provider returned HTTP 429; further requests deferred',deferred=True)
  write(p,result);return result
 try:
  pace(task['provider'])
  if task['provider']=='Flickr':
   params={'text':task['query'],'content_types':'0','media':'photos'}
   if task.get('colorCodes'):params['color_codes']=task['colorCodes']
   if task['licensedOnly']:params['license']=task.get('sourceLicenseIds','4,5,9,10,11,12')
   r=requests.get('https://www.flickr.com/search/',params=params,headers=HEADERS,timeout=22);result['searchUrl']=r.url
   if r.status_code==429:rate_limited.add(task['provider'])
   r.raise_for_status();result['candidates']=flickr_rows(model(r.text))
  else:
   r=requests.get('https://pxhere.com/en/photos',params={'q':task['query']},headers=HEADERS,timeout=20);result['searchUrl']=r.url
   if r.status_code==429:rate_limited.add(task['provider'])
   r.raise_for_status();soup=BeautifulSoup(r.text,'html.parser')
   for a in soup.select('a.current-item-photo'):
    img=a.find('img')
    if not img:continue
    result['candidates'].append({'id':a['href'].split('/')[-1],'title':img.get('alt'),'preview':img.get('data-src',img.get('src')),'page':'https://pxhere.com'+a['href'],'provider':'PxHere','licenseUnverified':True})
  result['responseSha256']=hashlib.sha256(r.content).hexdigest()
 except Exception as error:result['error']=str(error)
 write(p,result);return result

def search(provider):
 tasks=read(DOC/'plan.json')['tasks'];tasks=[t for t in tasks if not provider or t['provider'].lower()==provider.lower()]
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  for n,result in enumerate(pool.map(search_task,tasks),1):
   if n%10==0 or result.get('error'):print(n,'/',len(tasks),result['id'],len(result['candidates']),result.get('error',''),flush=True)
 print('Finished',len(tasks),'search tasks',flush=True)

def preview(candidate):
 c=dict(candidate);p=OUT/'previews'/(c['key']+'.jpg')
 try:
  if not p.exists():
   r=requests.get(c['preview'],headers=HEADERS,timeout=18);r.raise_for_status();im=Image.open(io.BytesIO(r.content));im.convert('RGB').save(p,quality=87)
  im=Image.open(p).convert('RGB');w,h=im.size;edge=max(1,min(w,h)//12)
  borders=[im.crop((0,0,w,edge)),im.crop((0,h-edge,w,h)),im.crop((0,0,edge,h)),im.crop((w-edge,0,w,h))]
  c['backgroundScore']=sum(sum(ImageStat.Stat(b).mean)/3/255-.65*sum(ImageStat.Stat(b).stddev)/3/100-.7*(max(ImageStat.Stat(b).mean)-min(ImageStat.Stat(b).mean))/100 for b in borders)/4
  c['previewFile']=str(p.relative_to(ROOT))
 except Exception as error:c['downloadError']=str(error);c['backgroundScore']=-10
 return c

def sheets(provider):
 candidates={};bindings={}
 for p in sorted((OUT/'raw').glob('*.json')):
  d=read(p)
  if provider and d.get('provider','').lower()!=provider.lower():continue
  for rank,row in enumerate(d.get('candidates',[])):
   c=dict(row);pr=d['provider'];key=pr.lower()+'-'+c['id']
   if pr=='Flickr':
    if c.get('license') not in ALLOWED:continue
    sz=c.get('sizes',{});sz=sz.get('n') or sz.get('w') or sz.get('m')
    if not sz:continue
    c['preview']='https:'+sz['url'] if sz['url'].startswith('//') else sz['url']
   c.update(key=key,provider=pr,slug=d.get('slug'),rank=rank)
   candidates.setdefault(key,c);bindings.setdefault(key,set()).add(d.get('slug'))
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
  for n,c in enumerate(pool.map(preview,candidates.values()),1):
   candidates[c['key']]=c|{'matchedSlugs':sorted(bindings[c['key']])}
   if n%200==0:print('Previews',n,flush=True)
 write(OUT/f'{provider.lower()}-candidates.json',list(candidates.values()))
 selected=sorted([x for x in candidates.values() if x.get('previewFile')],key=lambda c:c['backgroundScore'],reverse=True)
 # Keep a manageable studio-first queue, plus the two strongest candidates for every item.
 selected=[c for c in selected if c['backgroundScore']>.50]
 seen={c['key'] for c in selected}
 for slug in [x['slug'] for x in read(DOC/'plan.json')['items']]:
  group=sorted([c for c in candidates.values() if slug in c['matchedSlugs'] and c.get('previewFile')],key=lambda c:c['backgroundScore'],reverse=True)[:2]
  for c in group:
   if c['key'] not in seen:seen.add(c['key']);selected.append(c)
 write(OUT/f'{provider.lower()}-review-queue.json',selected)
 font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
 for n,start in enumerate(range(0,len(selected),24),1):
  canvas=Image.new('RGB',(1440,1240),'#f5f5f5');draw=ImageDraw.Draw(canvas)
  for j,c in enumerate(selected[start:start+24]):
   x=j%6*240;y=j//6*310;im=ImageOps.contain(Image.open(ROOT/c['previewFile']).convert('RGB'),(230,215));canvas.paste(im,(x+(240-im.width)//2,y+(215-im.height)//2))
   text='\n'.join([','.join(c['matchedSlugs'])[:65],c['key'],str(c.get('title',''))[:70],str(c.get('license',''))])
   import textwrap
   draw.multiline_text((x+4,y+220),'\n'.join(line for part in text.split('\n') for line in textwrap.wrap(part,29))[:245],font=font,fill='black',spacing=2)
  canvas.save(OUT/'sheets'/f'{provider.lower()}-{n:03}.jpg',quality=87)
 print('Unique candidates',len(candidates),'queue',len(selected),'sheets',(len(selected)+23)//24,flush=True)

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('command',choices=['plan','search','retry-errors','sheets']);parser.add_argument('provider',nargs='?',default='')
 a=parser.parse_args()
 if a.command=='plan':plan()
 elif a.command in ['search','retry-errors']:
  RETRY=a.command=='retry-errors';search(a.provider)
 else:sheets(a.provider)
