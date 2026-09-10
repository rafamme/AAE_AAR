import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { getSiteControl } from '../../../lib/site-control';

function fmt(value:string){return new Intl.DateTimeFormat('es-ES',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Madrid'}).format(new Date(value))}

export default async function AdminEventsPage({searchParams}:{searchParams:Promise<{mensaje?:string}>}){
  const [supabase,control]=await Promise.all([createClient(),getSiteControl()]);
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/login');
  if(!control.enabled('testing.full_access')){
    const {data:roles}=await supabase.from('member_roles').select('role').eq('member_id',user.id);
    const roleSet=new Set((roles??[]).map((r)=>r.role));
    if(!roleSet.has('superadmin')&&!roleSet.has('admin')&&!roleSet.has('editor')) redirect('/area-socios');
  }

  const [{data:events},{data:registrations}]=await Promise.all([
    supabase.from('events').select('id,title,starts_at,ends_at,capacity,registered_count,status,locations(name,region,country)').order('starts_at',{ascending:false}),
    supabase.from('event_members').select('event_id,status'),
  ]);
  const counts=new Map<string,number>();
  for(const row of registrations??[]) if(row.status==='registered'||row.status==='attended') counts.set(row.event_id,(counts.get(row.event_id)??0)+1);
  const {mensaje}=await searchParams;

  return <>
    <header className="page-heading"><div><div className="muted">Administración</div><h1>Eventos e inscripciones</h1><p>Consulta cada evento en su ficha administrativa y gestiona asistentes, aforo y estado de participación.</p></div><Link className="button-link secondary" href="/admin/contenidos/eventos">Crear o editar eventos</Link></header>
    {mensaje&&<p className="notice">{mensaje}</p>}
    <section className="admin-member-list">
      {(events??[]).map((event:any)=>{const active=counts.get(event.id)??0;const remaining=event.capacity==null?null:Math.max(event.capacity-active,0);return <article className="admin-member-card" key={event.id}>
        <div className="admin-member-title"><div><div className="catalog-card-meta">{fmt(event.starts_at)} · {event.status}</div><h2>{event.title}</h2><p>{event.locations?.name??'Lugar por confirmar'} · <strong>{active}</strong> inscritos/asistentes{event.capacity==null?' · sin límite de aforo':` de ${event.capacity} · ${remaining} plazas libres`}</p></div><Link className="button-link" href={`/admin/eventos/${event.id}`}>Abrir ficha</Link></div>
      </article>})}
      {(events??[]).length===0&&<div className="empty-state">No hay eventos creados.</div>}
    </section>
  </>;
}
