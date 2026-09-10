import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import { getSiteControl } from '../../../../lib/site-control';
import { updateEventRegistrationStatus } from '../../actions';

function fmt(value:string|null){return value?new Intl.DateTimeFormat('es-ES',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Madrid'}).format(new Date(value)):'—'}
const statusLabel:Record<string,string>={registered:'Inscrito',cancelled:'Cancelado',attended:'Asistió',no_show:'No asistió'};

export default async function AdminEventDetailPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{mensaje?:string}>}){
  const {id}=await params;
  const [supabase,control]=await Promise.all([createClient(),getSiteControl()]);
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/login');
  if(!control.enabled('testing.full_access')){
    const {data:roles}=await supabase.from('member_roles').select('role').eq('member_id',user.id);
    const roleSet=new Set((roles??[]).map(r=>r.role));
    if(!roleSet.has('superadmin')&&!roleSet.has('admin')&&!roleSet.has('editor')) redirect('/area-socios');
  }

  const [{data:event},{data:registrations}]=await Promise.all([
    supabase.from('events').select('id,title,description,starts_at,ends_at,capacity,registered_count,status,location_id,locations(name,region,country)').eq('id',id).maybeSingle(),
    supabase.from('event_members').select('event_id,member_id,registered_at,status,members(member_number,first_name,last_name,email_public,phone)').eq('event_id',id).order('registered_at',{ascending:true}),
  ]);
  if(!event) notFound();
  const {mensaje}=await searchParams;
  const rows=registrations??[];
  const activeRows=rows.filter((r:any)=>r.status==='registered'||r.status==='attended');
  const remaining=event.capacity==null?null:Math.max(event.capacity-activeRows.length,0);

  return <>
    <p><Link href="/admin/eventos">← Volver a eventos</Link></p>
    <header className="page-heading"><div><div className="catalog-card-meta">{event.status} · {fmt(event.starts_at)}</div><h1>{event.title}</h1><p>{event.description||'Sin descripción.'}</p></div><Link className="button-link secondary" href={`/admin/contenidos/eventos/${event.id}`}>Editar contenido</Link></header>
    {mensaje&&<p className="notice">{mensaje}</p>}
    <section className="admin-stats">
      <article><strong>{rows.length}</strong><span>Registros totales</span></article>
      <article><strong>{activeRows.length}</strong><span>Inscritos/asistentes</span></article>
      <article><strong>{event.capacity??'∞'}</strong><span>Aforo</span></article>
      <article><strong>{remaining??'∞'}</strong><span>Plazas libres</span></article>
    </section>
    <div className="admin-review-layout">
      <article className="detail-copy"><h2>Inscripciones</h2>{rows.length?<div className="admin-member-list">{rows.map((r:any)=><div className="admin-member-card" key={`${r.event_id}-${r.member_id}`}>
        <div><strong><Link href={`/admin/socios/${r.member_id}`}>{r.members?.first_name} {r.members?.last_name}</Link></strong><div className="muted">{r.members?.member_number?`Socio nº ${r.members.member_number}`:'Sin número'} · {r.members?.email_public||'Sin email público'} · {statusLabel[r.status]??r.status}</div></div>
        <form action={updateEventRegistrationStatus} className="admin-inline-form"><input type="hidden" name="event_id" value={event.id}/><input type="hidden" name="member_id" value={r.member_id}/><label>Estado<select name="status" defaultValue={r.status}><option value="registered">Inscrito</option><option value="cancelled">Cancelado</option><option value="attended">Asistió</option><option value="no_show">No asistió</option></select></label><button type="submit">Guardar</button></form>
      </div>)}</div>:<div className="empty-state">No hay inscripciones para este evento.</div>}</article>
      <aside className="facts-card"><h2>Datos del evento</h2><dl><div><dt>Inicio</dt><dd>{fmt(event.starts_at)}</dd></div><div><dt>Fin</dt><dd>{fmt(event.ends_at)}</dd></div><div><dt>Lugar</dt><dd>{(event as any).locations?.name??'Por confirmar'}</dd></div><div><dt>Región</dt><dd>{[(event as any).locations?.region,(event as any).locations?.country].filter(Boolean).join(' · ')||'—'}</dd></div><div><dt>Estado</dt><dd>{event.status}</dd></div><div><dt>Aforo</dt><dd>{event.capacity??'Sin límite'}</dd></div></dl></aside>
    </div>
  </>;
}
