import { redirect } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import ContributionForm from '../ContributionForm';

export default async function NewContributionPage({searchParams}:{searchParams:Promise<{mensaje?:string}>}){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/login');
  const {data:member}=await supabase.from('members').select('status').eq('id',user.id).single();
  if(!member||member.status!=='active') redirect('/area-socios');
  const [{data:locations},{data:monuments}]=await Promise.all([
    supabase.from('locations').select('id,name').eq('status','published').order('name'),
    supabase.from('monuments').select('id,name,location_id').eq('status','published').order('name')
  ]);
  const {mensaje}=await searchParams;
  return <main className="wrap contribution-page"><header className="page-heading"><div><div className="muted">AAE-AAR · Aportaciones</div><h1>Nueva aportación</h1></div></header><ContributionForm locations={locations??[]} monuments={monuments??[]} message={mensaje}/></main>;
}
