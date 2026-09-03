import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { updateEventRegistrationStatus } from '../actions';

function fmt(value:string){return new Intl.DateTimeFormat('es-ES',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Madrid'}).format(new Date(value))}

const statusLabel:Record<string,string>={registered:'Inscrito',cancelled:'Cancelado',attended:'Asistió',no_show:'No asistió'};

export default async function AdminEventsPage({searchParams}:{searchParams:Promise<{mensaje?:string}>}){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/login');
  const {data:roles}=await supabase.from('member_roles').select('role').eq('member_id',user.id);
  const roleSet=new Set((roles??[]).map((r)=>r.role));
  if(!roleSet.has('superadmin')&&!roleSet.has('admin')&&!roleSet.has('editor')) redirect('/area-socios');

  const {data:events}=await supabase.from('events').select('id,title,starts_at,ends_at,capacity,registered_count,status,locations(name,region,country)').order('starts_at',{ascending:false});
  const {data:registrations}=await supabase.from('event_members').select('event_id,member_id,registered_at,status,members(member_number,first_name,last_name,email_public)').order('registered_at',{ascending:true});
  const grouped=new Map<string,any[]>();
  for(const row of registrations??[]){if(!grouped.has(row.event_id))grouped.set(row.event_id,[]);grouped.get(row.event_id)!.push(row)}
  const {mensaje}=await searchParams;

  return <>
    <header className="page-heading"><div><div className="muted">Administración</div><h1>Eventos e inscripciones</h1><p>Controla aforo, asistentes y estado final de participación.</p></div><Link className="button-link secondary" href="/admin/contenidos/eventos">Editar eventos</Link></header>
    {mensaje&&<p className="notice">{mensaje}</p>}
    <section className="admin-member-list">
      {(events??[]).map((event:any)=>{const rows=grouped.get(event.id)??[];const remaining=event.capacity==null?null:Math.max(event.capacity-event.registered_count,0);return <article className="admin-member-card" key={event.id}>
        <div className="admin-member-title"><div><div className="catalog-card-meta">{fmt(event.starts_at)} · {event.status}</div><h2>{event.title}</h2><p>{event.locations?.name??'Lugar por confirmar'} · <strong>{event.registered_count}</strong> inscritos{event.capacity==null?' · sin límite de aforo':` de ${event.capacity} · ${remaining} plazas libres`}</p></div></div>
        {rows.length?<div className="admin-member-list">{rows.map((r:any)=><div className="admin-member-card" key={`${r.event_id}-${r.member_id}`}>
          <div><strong>{r.members?.first_name} {r.members?.last_name}</strong><div className="muted">{r.members?.member_number?`Socio nº ${r.members.member_number}`:'Sin número'} · {statusLabel[r.status]??r.status}</div></div>
          <form action={updateEventRegistrationStatus} className="admin-inline-form">
            <input type="hidden" name="event_id" value={event.id}/><input type="hidden" name="member_id" value={r.member_id}/>
            <label>Estado<select name="status" defaultValue={r.status}><option value="registered">Inscrito</option><option value="cancelled">Cancelado</option><option value="attended">Asistió</option><option value="no_show">No asistió</option></select></label>
            <button type="submit">Guardar</button>
          </form>
        </div>)}</div>:<div className="empty-state">No hay inscripciones para este evento.</div>}
      </article>})}
    </section>
  </>;
}
