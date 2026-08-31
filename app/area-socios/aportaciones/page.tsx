import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';

export default async function ContributionsPage({ searchParams }:{ searchParams:Promise<{mensaje?:string}> }) {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: member } = await supabase.from('members').select('status').eq('id',user.id).single();
  if (!member || member.status !== 'active') redirect('/area-socios?mensaje=Las%20aportaciones%20están%20disponibles%20solo%20para%20socios%20activos.');

  const { data: contributions } = await supabase
    .from('contributions')
    .select('id,title,description,status,submitted_at,reviewed_at,created_at,updated_at')
    .eq('contributor_id',user.id)
    .order('updated_at',{ascending:false});
  const { mensaje } = await searchParams;

  return <main className="wrap contribution-page"><header className="page-heading"><div><div className="muted">AAE-AAR · Área privada</div><h1>Mis aportaciones</h1><p>Prepara propuestas sobre localidades o monumentos y envíalas a revisión editorial.</p></div><Link className="button-link" href="/area-socios/aportaciones/nueva">Nueva aportación</Link></header>{mensaje&&<p className="notice">{mensaje}</p>}<section className="contribution-list">{(contributions??[]).length===0?<div className="empty-state">Todavía no has creado ninguna aportación.</div>:(contributions??[]).map(item=>{const state=item.status!=='draft'?item.status:item.submitted_at?'En revisión':'Borrador';return <Link key={item.id} className="contribution-card" href={`/area-socios/aportaciones/${item.id}`}><div><span className="contribution-state">{state}</span><h2>{item.title}</h2><p>{item.description||'Sin resumen.'}</p></div><span>→</span></Link>})}</section><p><Link href="/area-socios">← Volver al área de socios</Link></p></main>;
}
