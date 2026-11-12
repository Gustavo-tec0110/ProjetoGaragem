import fs from 'node:fs';
import path from 'node:path';

export function preparePrelaunchAuthHarness(root) {
  if (!root.startsWith('/tmp/garagem-auth-')) throw new Error('Disposable auth checkout required');
  const dir=path.join(root,'src/app/test-harness/prelaunch-profile');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'page.tsx'), `
import { ProfileExperience, type ProfileTabKey } from '@/components/garage/profile-experience';
import { getSupabaseServerUser } from '@/lib/supabase/auth-server';
import type { ProfileRow } from '@/lib/types';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{aba?:string,other?:string}>}) {
 const user=await getSupabaseServerUser();if(!user)return <main>Entre para continuar.</main>;
 const params=await searchParams;const isOwner=params.other!=='1';
 const profile={id:isOwner?user.id:'99999999-9999-4999-8999-999999999999',username:'fixture-local',display_name:'Fixture local',
   bio:null,avatar_url:null,cover_url:null,city:null,state:null,social_links:{},is_saves_public:false,is_likes_public:false,
   followers_count:0,following_count:0,cars_count:0} as ProfileRow;
 return <main className="mx-auto max-w-6xl p-4 pt-24"><ProfileExperience profile={profile} isOwner={isOwner}
   viewerLoggedIn viewerFollows={false} activeTab={(params.aba??'projetos') as ProfileTabKey}
   baseHref="/test-harness/prelaunch-profile" showPrivateTools /></main>;
}
`);
}
