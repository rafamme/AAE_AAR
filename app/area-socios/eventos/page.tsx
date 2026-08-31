import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';

function fmt(value:string){return new Intl.DateTimeFormat('es-ES',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Madrid'}).format(new Date(value))}

export default async function MyEventsPage(){
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect('/login');
  const {data:member}=await supabase.from('members').select('status').eq('id',user.id).single(); if(member?.status!=='active') redirect('/area-socios?mensaje=Los%20eventos%20están%20disponibles%20para%20socios%20activos.');
  const {data:registrations}=await supabase.from('event_members').select('registered_at,status,events(id,title,starts_at,ends_at,locations(name,region,country))').eq('member_id',user.id).order('registered_at',{ascending:false});
  return <main className="wrap member-area"><div className="page-heading"><div><div className="muted">AAE-AAR · Área privada</div><h1>Mis eventos</h1><p>Actividades en las que estás inscrito.</p></div><Link className="button-link secondary" href="/eventos">Ver agenda</Link></div><section className="event-list">{registrations?.length?registrations.map((r:any)=><Link className="event-card" href={`/eventos/${r.events.id}`} key={r.events.id}><div><div className="catalog-card-meta">{fmt(r.events.starts_at)}</div><h2>{r.events.title}</h2><div className="muted">{r.events.locations?.name ?? 'Lugar por confirmar'}</div></div><div className="event-capacity">Inscrito</div></Link>):<div className="empty-state">Todavía no estás inscrito en ninguna actividad.</div>}</section><p><Link href="/area-socios">← Volver al área de socios</Link></p></main>;
}
