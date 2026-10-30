// Additional fixtures live only in the isolated /tmp checkout, never in the app's source routes.
import fs from 'node:fs';
import process from 'node:process';
import path from 'node:path';
const root = path.resolve(process.argv[2] ?? '');
if (!root.startsWith('/tmp/') || !fs.existsSync(path.join(root, 'package.json'))) throw new Error('Provide an existing isolated checkout under /tmp.');
const directory = path.join(root, 'src/app/test-harness/uiux');
fs.mkdirSync(directory, { recursive:true });
fs.writeFileSync(path.join(directory, "controls.tsx"), "\"use client\";\nimport { CarForm } from '@/components/garage/car-form';\nimport { CommentForm } from '@/components/garage/comments';\nimport { ProjectShareActions } from '@/components/projects/project-share-actions';\nimport { PremiumCard } from '@/components/ui/premium-card';\nimport AppError from '@/app/error';\nexport function Controls() {\n return <>\n <PremiumCard className=\"p-8\">Card de teste local</PremiumCard>\n <section aria-label=\"Formulários locais\"><CarForm mode=\"edit\" /><CommentForm carId=\"local-uiux\" slug=\"local-uiux\" viewerLoggedIn /></section>\n <section aria-label=\"Compartilhamento local\"><ProjectShareActions title=\"Projeto local\" /></section>\n <section aria-label=\"Erro local\"><AppError error={new Error('fixture')} unstable_retry={() => {}} /></section>\n </>;\n}\n");
fs.writeFileSync(path.join(directory, "page.tsx"), "import { notFound } from 'next/navigation';\nimport { Controls } from './controls';\nimport { ProfileExperience } from '@/components/garage/profile-experience';\nimport type { ProfileRow } from '@/lib/types';\nexport default function Page() {\n if (process.env.NODE_ENV !== 'development' || process.env.MODIFICATION_PHOTOS_TEST_HARNESS !== '1') notFound();\n const profile = { id:'00000000-0000-4000-8000-000000000000', display_name:'Perfil de teste local',username:'uiux-local', social_links:{},followers_count:0,following_count:0,is_saves_public:true,is_likes_public:true } as ProfileRow;\n return <div className=\"pt-24\"><ProfileExperience profile={profile} isOwner={false} viewerLoggedIn={false} viewerFollows={false} activeTab=\"projetos\" baseHref=\"/test-harness/uiux\" /><Controls /></div>;\n}\n");
const compare = path.join(root, 'src/app/test-harness/uiux-compare');
fs.mkdirSync(compare, { recursive:true });
fs.writeFileSync(path.join(compare,'page.tsx'), fs.readFileSync(path.join(root,'src/app/comparar/page.tsx'),'utf8').replace('@/lib/projects/server','./data'));
fs.writeFileSync(path.join(compare,'data.ts'), `
import { enrichProject } from '@/lib/projects/utils';
const makeProject = (slug: string, title: string, powerCv: number) => enrichProject({
  id: slug, slug, title, source:'local', ownerName:'Fixture local', ownerUsername:'fixture',
  carModel:'Chevrolet Opala',brand:'Chevrolet',model:'Opala',year:1978,engine:'4.1',
  style:'Clássicos',status:'Em evolução',shortDescription:'Dados locais para testar comparação',description:'Fixture',
  mainImage:'/ref/hero-opala-ss.webp',gallery:['/ref/hero-opala-ss.webp'],installedParts:[],plannedParts:[],
  estimatedCost:1000,likes:0,saves:0,views:0,comments:0,tags:['Clássicos'],city:'Salvador',state:'BA',
  createdAt:'2026-10-28',updatedAt:'2026-10-28',isPublic:true,powerCv,weightKg:1200,torqueNm:250,
});
const projects = [makeProject('fixture-a','Opala de teste A',140),makeProject('fixture-b','Opala de teste B',180)];
export async function getProjectCollection() { return { allProjects:projects }; }
export async function getProjectsBySlugs(slugs: string[]) { return projects.filter(p=>slugs.includes(p.slug)); }
`);
