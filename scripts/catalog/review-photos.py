"""Verify primary licenses and download authorized originals; require a manual visual decision to apply.
Usage: python3 scripts/catalog/review-photos.py verify|apply
No search score, filename or license filter can approve a photograph.
"""
import argparse,copy,hashlib,html,json,re,time
from pathlib import Path
import requests
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];DOC=ROOT/'docs/catalogo-2026-10-27';BATCH=DOC/'completion';OUT=ROOT/'artifacts/catalog-photo-completion-2026-10-27'
def read(p):return json.loads(p.read_text())
def write(p,x):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def sha(b):return hashlib.sha256(b).hexdigest()
def model(text):return json.JSONDecoder().raw_decode(text[text.index('modelExport: ')+13:])[0]
def verify_flickr(slug,choice):
 page=choice['page'];ident=page.rstrip('/').split('/')[-1]
 assert re.match(r'^https://www\.flickr\.com/photos/[^/]+/\d+/$',page)
 r=requests.get(page,timeout=25);r.raise_for_status();m=model(r.text)['main'];photo=next(x['data'] for x in m['photo-models'] if isinstance(x.get('data'),dict) and x['data'].get('id')==ident)
 lic=next(x['data'] for x in m['license-models'] if str(x['data']['id'])==str(photo['license']));assert str(lic['id']) in ['4','5','6','9','10','11','12','13'],'Incompatible license '+lic['name']
 person=photo['owner']['data'];sizes=[v['data'] for v in photo['sizes']['data'].values() if isinstance(v,dict) and isinstance(v.get('data'),dict)];sz=max(sizes,key=lambda s:s['width']*s['height']);url=sz['url'];url='https:'+url if url.startswith('//') else url
 description=photo.get('description','')
 def visit(node):
  nonlocal description
  if isinstance(node,dict):
   if node.get('_flickrModelRegistry')=='photo-engagement-models' and node.get('id')==ident and node.get('description'):description=node['description']
   for value in node.values():visit(value)
  elif isinstance(node,list):
   for value in node:visit(value)
 visit(m)
 license={'9':'CC0 1.0','10':'Public domain'}.get(str(lic['id']),lic['name']);author=person.get('realname') or person.get('username');title='Flickr:'+ident+' — '+photo['title']
 evidence={'LicenseShortName':{'value':license},'LicenseUrl':{'value':lic['url']},'Restrictions':{'value':''},'sourcePage':page,'sourcePageSha256':sha(r.content),'provider':'Flickr','verifiedOn':'2026-10-27','author':author,'providerLicenseId':str(lic['id']),'providerLicenseName':lic['name'],'sourceDimensions':[sz['width'],sz['height']]}
 (OUT/'raw'/f'verified-flickr-{ident}.html').write_bytes(r.content)
 source={'title':title,'provider':'Flickr','page':page,'original':url,'width':sz['width'],'height':sz['height'],'license':license,'licenseUrl':lic['url'],'author':author,'description':description or photo['title'],'restrictions':''}
 if str(lic['id'])=='10':source['rightsMark']='Public Domain Mark 1.0'
 if '-ND' in license:source['technicalChangesOnly']=True
 return source,evidence

def verify_commons(slug,choice):
 c=choice['cachedCandidate'];p=ROOT/c['index'];row=next(x for x in read(p) if x['id']==str(c['id']))
 assert row['page'].startswith('https://commons.wikimedia.org/wiki/File:')
 assert re.match(r'^(CC BY(?:-SA)? (?:1\.0|2\.0|2\.5|3\.0|4\.0)|CC0|Public domain)',row['license']);assert not row['evidence'].get('Restrictions',{}).get('value')
 source={k:row[k] for k in ['title','page','original','width','height','license','licenseUrl','author','description']};source.update(provider='Wikimedia Commons',restrictions='')
 if choice.get('cachedInput'):
  source['inputRepresentation']='licensed cached preview, without enlargement';source['previewUrl']=row['preview']
  source['attribution']='A conversão usa a versão licenciada em cache de 500 px, sem ampliação; o download posterior do original retornou HTTP 403.'
 evidence=copy.deepcopy(row['evidence']);evidence['verifiedOn']={'value':'2026-10-27'};evidence['metadataCache']={'value':str(c['index'])};return source,evidence

def verify():
 results={}
 for slug,choice in read(BATCH/'shortlist.json').items():
  try:
   source,evidence=verify_commons(slug,choice) if choice.get('cachedCandidate') else verify_flickr(slug,choice)
   ident=choice['candidate'];dest=OUT/'candidates'/(ident+'.jpg')
   if choice.get('cachedInput'):
    cached=(ROOT/choice['cachedInput']).resolve();assert cached.is_relative_to(ROOT/'artifacts');dest.write_bytes(cached.read_bytes())
   if not dest.exists():
    r=requests.get(source['original'],timeout=30);r.raise_for_status();dest.write_bytes(r.content)
   with Image.open(dest) as im:
    assert im.format in ['JPEG','PNG','WEBP'],im.format;w,h=im.size;im.verify();assert max(w,h)>=480,'Insufficient resolution'
   digest=sha(dest.read_bytes());evidence['sourceSha256']=digest
   results[slug]={'source':source,'evidence':evidence,'file':str(dest.relative_to(ROOT)),'inputSha256':digest,'dimensions':[w,h]}
   print(slug,source['license'],[w,h],flush=True)
  except Exception as error:results[slug]={'error':str(error)};print(slug,str(error),flush=True)
  time.sleep(1)
 write(BATCH/'verified.json',results)

def apply():
 frozen=read(BATCH/'preserved-62.json');reviews=read(DOC/'photo-review.json');licenses=read(DOC/'license-evidence.json');selected=read(BATCH/'shortlist.json');verified=read(BATCH/'verified.json');accepted={}
 for slug,old in frozen.items():
  assert reviews[slug]==old,slug
  assert sha((ROOT/('public'+old['output']['path'])).read_bytes())==old['output']['sha256'],slug
 for slug,choice in selected.items():
  if choice.get('visualDecision')!='approved':continue
  assert slug not in frozen,slug;v=verified[slug];assert not v.get('error'),v
  assert len(choice['reason'])>=40;assert sha((ROOT/v['file']).read_bytes())==v['inputSha256'];prior=reviews[slug]
  accepted[slug]=choice|{'source':v['source'],'inputSha256':v['inputSha256']}
  # A resumed application must preserve an already generated approval verbatim.
  if prior.get('status')=='approved':
   assert prior.get('source')==v['source'] and prior.get('file')==v['file'],'Refusing to replace an existing approval: '+slug
   assert prior.get('reason')==choice['reason'],'Existing decision changed: '+slug
   if prior.get('output'):assert sha((ROOT/('public'+prior['output']['path'])).read_bytes())==prior['output']['sha256'],slug
   continue
  row=copy.deepcopy(prior);row.update(status='approved',reason=choice['reason'],source=v['source'],file=v['file'],reviewedOn='2026-10-27',licenseVerifiedOn='2026-10-27',completionBatch='licensed-photos-completion-2026-10-27',priorPendingReason=prior.get('reason'));row.pop('output',None)
  reviews[slug]=row;licenses[v['source']['title']]=v['evidence'];accepted[slug]=choice|{'source':v['source'],'inputSha256':v['inputSha256']}
 write(DOC/'photo-review.json',reviews);write(DOC/'license-evidence.json',licenses);write(BATCH/'approved.json',accepted);print('Applied',len(accepted),'manual visual approvals')

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('command',choices=['verify','apply']);a=p.parse_args();verify() if a.command=='verify' else apply()
