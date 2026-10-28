"""Build an honest per-component completion ledger from actual local research.
This report does not approve photographs or change remote state.
"""
import collections,csv,hashlib,html,json,re
from pathlib import Path
from urllib.parse import urlparse,unquote
ROOT=Path(__file__).resolve().parents[2];DOC=ROOT/'docs/catalogo-2026-10-27';D=DOC/'completion';O=ROOT/'artifacts/catalog-photo-completion-2026-10-27'
def read(p):return json.loads(p.read_text())
def write(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
plan=read(D/'plan.json');frozen=read(D/'preserved-62.json');reviews=read(DOC/'photo-review.json');assets=read(ROOT/'src/lib/modifications/catalog-assets.json');definitions=read(ROOT/'src/lib/modifications/catalog-definitions.json');licenses=read(DOC/'license-evidence.json')
for slug,row in frozen.items():
 assert reviews[slug]==row,slug
 assert sha(ROOT/('public'+row['output']['path']))==row['output']['sha256'],slug
results={t['id']:read(O/'raw'/(t['id']+'.json')) for t in plan['tasks'] if (O/'raw'/(t['id']+'.json')).exists()}
groups=[read(p) for p in sorted(D.glob('manufacturer-search-*.json'))];short=read(D/'shortlist.json');approved=read(D/'approved.json') if (D/'approved.json').exists() else {}
visual=[]
for name in ['prior-neutral-queue.json','profile-review-queue.json','phrase-review-queue.json','flickr-review-queue.json','pxhere-review-queue.json','commons-review-queue.json']:
 if (O/name).exists():visual.extend(read(O/name))
stop={'car','automotive','engine','racing','wheel','of','for','the','and','a','an','kit','system'}
def leads(item):
 group=next(g for g in groups if item['slug'] in g['items']);terms=set(re.findall('[a-z]+',item['english'].lower()))-stop;found=[]
 for h in group['discoveredPages']:
  u=h['url'];host=urlparse(u).netloc
  if any(x in host for x in ['reddit','wikipedia','manual','facebook','instagram','youtube','pinterest','patents','arxiv','data.epo','archive.org','pdfcoffee','marketpublishers','device.report']):continue
  text=unquote(h['title']+' '+u).lower();score=sum(t in text for t in terms)/max(1,len(terms))
  if '.pdf' in u:score-=.4
  if score>=.7:found.append((score,h))
 found.sort(key=lambda x:x[0],reverse=True)
 return [h|{'status':'discovery-lead-only; no license or ownership inferred'} for _,h in found[:3]]
brief={
 'motor-performance':'Vista de três quartos mostrando o componente inteiro, bocais, fixações e conexões; remover motor/veículo/contexto de oficina do enquadramento.',
 'suspensao':'Vista de três quartos com buchas, articulações ou fixações visíveis; apresentar o conjunto próprio completo, desmontado do veículo.',
 'freios':'Vista de três quartos com conexões hidráulicas, superfície de atrito ou fixações identificáveis; não usar peças de bicicleta nem material excessivamente desgastado.',
 'rodas-pneus':'Vista de três quartos da peça isolada, mostrando furos, roscas, assento ou banda de rodagem conforme o componente.',
 'transmissao':'Vista de três quartos da peça completa, mostrando eixos, engrenagens ou conexões; não substituir componente por carcaça vazia ou conjunto diferente.',
 'interior':'Vista de três quartos do acessório fora do veículo, com pontos de montagem visíveis; evitar painel/cabine inteira como representação.',
 'exterior':'Vista de três quartos da peça desmontada e inteira; peças longas em enquadramento horizontal, sem usar veículo equipado para substituir a fotografia do acessório.',
 'iluminacao':'Vista frontal de três quartos do conjunto isolado, com lente e fixação visíveis; aceitar somente fotografia real, não render de jogo/modelagem.',
 'eletrica-eletronica':'Vista de três quartos do componente isolado, com conectores e identificação funcional visíveis; não usar placas eletrônicas genéricas ou sensores de outra finalidade.',
 'som':'Vista de três quartos do equipamento isolado, incluindo controles/conectores relevantes; distinguir amplificador, crossover, conversor e transdutor.'}
ledger=[]
for item in plan['items']:
 slug=item['slug'];tasks=[t for t in plan['tasks'] if t['slug']==slug];searches=[]
 for t in tasks:
  r=results.get(t['id']);searches.append({'id':t['id'],'provider':t['provider'],'query':t['query'],'language':t['language'],'url':r.get('searchUrl') if r else None,'result':'not-executed' if r is None else 'failed' if r.get('error') else 'response-received','error':r.get('error') if r else None,'candidateEntries':len(r['candidates']) if r else 0,'evidenceFile':str((O/'raw'/(t['id']+'.json')).relative_to(ROOT))})
 pages=leads(item);failures=sum(s['result']=='failed' for s in searches);entries=sum(s['candidateEntries'] for s in searches);row=reviews[slug];specific=short.get(slug,{}).get('reason') if short.get(slug,{}).get('visualDecision') in ['rejected','withheld'] else None
 status='approved' if row['status']=='approved' else 'unresolved'
 reason=None if status=='approved' else specific or f'Não foi aprovada fotografia profissional de {item["name"]} com correspondência visual e condição de uso verificável na pesquisa executada. Há {entries} entradas de resultado (incluindo repetições/irrelevâncias), {failures} falhas de coleta; os resultados e filtros não provam licença nem adequação. As páginas de fornecedor abaixo são somente pistas, sem autorização de reutilização demonstrada.'
 ledger.append(item|{'status':status,'searches':searches,'supplierDiscoveryPages':pages,'impediment':reason,'nextAction':None if status=='approved' else f'Obter autorização escrita do titular para fotografia real de {item["name"]}, com uso em catálogo público e conversão WebP; ou licenciar fotografia comercial adequada; ou produzir fotografia própria dessa peça com cessão/autorização do fotógrafo. Não substituir por outro componente.','ownPhotoBrief':None if status=='approved' else f'{item["name"]}: '+brief[item['category']]+' Fundo branco/neutro, luz difusa, peça completa, foco integral, preferencialmente original de 1600 px ou mais; saída proporcional 512 × 512 sem corte.','approvedImage':assets[slug]['image']})
write(D/'component-ledger.json',ledger);pending=[x for x in ledger if x['status']!='approved']
with (D/'blocked-items.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['slug','componente','categoria','impedimento','consultas_planejadas','respostas_sem_erro','falhas','fontes_para_investigar_sem_licenca_presumida','alternativa_necessaria','brief_foto_propria'])
 for x in pending:w.writerow([x['slug'],x['name'],x['category'],x['impediment'],len(x['searches']),sum(s['result']=='response-received' for s in x['searches']),sum(s['result']=='failed' for s in x['searches']),' | '.join(p['url'] for p in x['supplierDiscoveryPages']),x['nextAction'],x['ownPhotoBrief']])
counts=collections.Counter(x['provider'] for x in results.values());by_provider={}
for provider,count in counts.items():
 rs=[x for x in results.values() if x['provider']==provider];by_provider[provider]={'queriesWithResultFile':count,'responsesWithoutError':sum(not x.get('error') for x in rs),'errors':sum(bool(x.get('error')) for x in rs),'candidateEntries':sum(len(x['candidates']) for x in rs)}
paths={x['image'] for x in assets.values() if x['image']};n=sum(bool(x['image']) for x in assets.values());files=[ROOT/('public'+p) for p in paths]
summary={'date':'2026-10-27','mode':'local-only','target':263,'initialApprovedBindings':62,'preservedApprovals':62,'newApprovedBindings':n-62,'approvedBindings':n,'pendingBindings':263-n,'uniqueFiles':len(paths),'coveragePercent':round(n/263*100,2),'plannedComponentSearches':len(plan['tasks']),'componentSearchResultFiles':len(results),'notExecutedTasks':len(plan['tasks'])-len(results),'providerSearches':by_provider,'manufacturerDiscoveryQueries':sum(len(g['queries']) for g in groups),'uniqueCandidateEntries':len({(r['provider'],c['id']) for r in results.values() for c in r['candidates']}),'snapshot62Sha256':sha(D/'preserved-62.json'),'productionWrites':0,'pushed':False,'published':False,'complete':n==263,'note':'A resposta HTTP, o número de candidatos e as consultas não são aprovações. Falhas e modelos de busca indisponíveis não são tratados como resultados vazios comprovados; a pesquisa não prova inexistência mundial de imagens licenciáveis.'}
write(D/'summary.json',summary)
sources={}
for slug,a in approved.items():
 s=a['source'];sources[s['title']]={'source':s,'evidence':licenses[s['title']],'inputSha256':a['inputSha256'],'binding':slug}
write(D/'source-evidence.json',sources)
criteria={'requiredApprovedComponents':263,'actualApprovedComponents':n,'allComponentsCovered':n==263,'approvedFileCount':len(paths),'missingApprovedFiles':[str(p.relative_to(ROOT)) for p in files if not p.exists()],'previous62Preserved':True,'sourcesDocumented':all(reviews[s]['source']['title'] in licenses for s,x in assets.items() if x['image']),'newPhotosVisuallyApproved':all(short[s]['visualDecision']=='approved' for s in approved),'uniformWebp512VerifiedByTests':'see validation.json','functionalAndVisualTests':'see validation.json','conclusion':'COMPLETE' if n==263 else 'INCOMPLETE'}
# Retain matching validation, while avoiding a stale pass after coverage changes.
if (D/'validation.json').exists():
 validation=read(D/'validation.json')
 if validation.get('actualApproved')==n and validation.get('pending')==263-n:
  previous=read(D/'acceptance.json') if (D/'acceptance.json').exists() else {}
  for key in ['uniformWebp512VerifiedByTests','functionalAndVisualTests','uniformProfessionalPresentationForAll263','brokenApprovedImages','remainingUnapprovedComponents']:
   if key in previous:criteria[key]=previous[key]
write(D/'acceptance.json',criteria)
escape=html.escape
cards=[]
for row in definitions:
 slug=row['slug'];a=assets[slug];entry=next((x for x in ledger if x['slug']==slug),None);approved_row=reviews[slug]
 photo=f'<img loading="lazy" src="../../../public{escape(a["image"])}" alt="{escape(row["name"])}">' if a['image'] else '<div class="placeholder">Foto em revisão</div>'
 details=f'<p>{escape(approved_row["source"]["author"])} · {escape(approved_row["source"]["license"])}</p><a href="{escape(approved_row["source"]["page"])}">Fonte e licença</a>' if a['image'] else f'<p>{escape(entry["impediment"])}</p><details><summary>Alternativa para concluir</summary><p>{escape(entry["nextAction"])}</p><p>{escape(entry["ownPhotoBrief"])}</p></details>'
 cards.append(f'<article data-category="{escape(row["category"])}" data-status="{"approved" if a["image"] else "pending"}"><h2>{escape(row["name"])}</h2>{photo}{details}<small>{escape(slug)}</small></article>')
(D/'review.html').write_text('''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Revisão fotográfica local — Projeto Garagem</title><style>body{font:15px/1.5 system-ui;margin:24px;background:#f5f5f5;color:#222}header{position:sticky;top:0;background:#f5f5f5;padding:8px;z-index:2}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}article{background:white;padding:16px;border:1px solid #ddd;border-radius:10px}img,.placeholder{width:100%;height:240px;object-fit:contain;background:#fafafa}.placeholder{display:grid;place-items:center;color:#777}h2{font-size:18px}input,select{padding:10px;max-width:100%;margin:4px}small{display:block;color:#777}p{overflow-wrap:anywhere}a{color:#914200}</style><header><h1>Revisão fotográfica local</h1><p>'''+f'{n}/263 registros aprovados; {263-n} pendentes. Reformulação '+('completa' if n==263 else 'INCOMPLETA')+'''. Sem publicação, push ou produção.</p><input id="q" placeholder="Buscar componente"><select id="status"><option value="">Todos</option><option value="pending">Pendentes</option><option value="approved">Aprovados</option></select><span id="count"></span></header><main>'''+''.join(cards)+'''</main><script>function filter(){let n=0;for(const a of document.querySelectorAll('article')){const show=a.textContent.toLocaleLowerCase().includes(document.querySelector('#q').value.toLocaleLowerCase())&&(!document.querySelector('#status').value||a.dataset.status===document.querySelector('#status').value);a.hidden=!show;if(show)n++}document.querySelector('#count').textContent=n+' componentes'}document.querySelector('#q').addEventListener('input',filter);document.querySelector('#status').addEventListener('change',filter);filter()</script></html>''')
print(json.dumps(summary,ensure_ascii=False))
