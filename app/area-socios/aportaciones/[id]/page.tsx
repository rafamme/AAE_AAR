import { notFound, redirect } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import ContributionForm from '../ContributionForm';

export default async function ContributionPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{mensaje?:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/login');
  const {data:member}=await supabase.from('members').select('status').eq('id',user.id).single();
  if(!member||member.status!=='active') redirect('/area-socios');
  const [{data:contribution},{data:locations},{data:monuments}]=await Promise.all([
    supabase.from('contributions').select('id,title,description,content,location_id,monument_id,submitted_at,status,proposal_type,proposed_name,proposed_country,proposed_region,proposed_latitude,proposed_longitude,proposed_century,proposed_style,proposed_architectural_type,proposed_website_url').eq('id',id).eq('contributor_id',user.id).maybeSingle(),
    supabase.from('locations').select('id,name').eq('status','published').order('name'),
    supabase.from('monuments').select('id,name,location_id').eq('status','published').order('name')
  ]);
  if(!contribution) notFound();
  const {mensaje}=await searchParams;
  return <main className="wrap contribution-page"><header className="page-heading"><div><div className="muted">AAE-AAR · Aportaciones</div><h1>{contribution.title}</h1></div></header><ContributionForm contribution={contribution} locations={locations??[]} monuments={monuments??[]} message={mensaje}/></main>;
}
