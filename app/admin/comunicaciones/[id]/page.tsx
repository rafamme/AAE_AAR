import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import { getSiteControl } from '../../../../lib/site-control';

export default async function AdminCommunicationDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const [supabase,control]=await Promise.all([createClient(),getSiteControl()]);
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/login');
  if(!control.enabled('testing.full_access')){
    const {data:roles}=await supabase.from('member_roles').select('role').eq('member_id',user.id);
    const roleSet=new Set((roles??[]).map(r=>r.role));
    if(!roleSet.has('admin')&&!roleSet.has('superadmin')) redirect('/admin');
  }

  const [{data:thread},{data:messages},{data:participants}]=await Promise.all([
    supabase.from('message_threads').select('id,subject,thread_type,is_announcement,created_by,created_at,updated_at').eq('id',id).maybeSingle(),
    supabase.from('messages').select('id,sender_id,body,created_at,members:sender_id(first_name,last_name,member_number)').eq('thread_id',id).order('created_at',{ascending:true}),
    supabase.from('message_participants').select('member_id,joined_at,last_read_at,members(member_number,first_name,last_name,email_public)').eq('thread_id',id).order('joined_at',{ascending:true}),
  ]);
  if(!thread) notFound();

  return <>
    <p><Link href="/admin/comunicaciones">← Volver a comunicaciones</Link></p>
    <header className="page-heading"><div><div className="catalog-card-meta">{thread.is_announcement?'Comunicado':'Conversación'} · {new Date(thread.created_at).toLocaleString('es-ES')}</div><h1>{thread.subject}</h1><p>Ficha administrativa del hilo, participantes, lectura y mensajes.</p></div></header>
    <section className="admin-stats">
      <article><strong>{participants?.length??0}</strong><span>Participantes</span></article>
      <article><strong>{messages?.length??0}</strong><span>Mensajes</span></article>
      <article><strong>{(participants??[]).filter((p:any)=>p.last_read_at).length}</strong><span>Con lectura registrada</span></article>
      <article><strong>{thread.is_announcement?'Sí':'No'}</strong><span>Comunicado general</span></article>
    </section>
    <div className="admin-review-layout">
      <article className="detail-copy"><h2>Mensajes</h2>{(messages??[]).length?<div className="message-thread-list">{(messages??[]).map((message:any)=><div className="message-thread-card" key={message.id}><div><div className="catalog-card-meta">{message.members?`${message.members.first_name} ${message.members.last_name}`:'Sistema/usuario'} · {new Date(message.created_at).toLocaleString('es-ES')}</div><p className="prewrap">{message.body}</p></div></div>)}</div>:<div className="empty-state">Este hilo no contiene mensajes.</div>}</article>
      <aside className="facts-card"><h2>Participantes</h2>{(participants??[]).length?<div className="admin-member-list">{(participants??[]).map((p:any)=><div key={p.member_id}><strong><Link href={`/admin/socios/${p.member_id}`}>{p.members?.first_name} {p.members?.last_name}</Link></strong><div className="muted">{p.members?.member_number?`Socio nº ${p.members.member_number}`:'Sin número'} · {p.members?.email_public||'Sin email público'}</div><div className="muted">Lectura: {p.last_read_at?new Date(p.last_read_at).toLocaleString('es-ES'):'sin registrar'}</div></div>)}</div>:<p className="muted">Sin participantes registrados.</p>}</aside>
    </div>
  </>;
}
