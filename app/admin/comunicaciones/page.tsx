import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { sendAnnouncement } from '../actions';

export default async function AdminCommunicationsPage({searchParams}:{searchParams:Promise<{mensaje?:string}>}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: roles } = await supabase.from('member_roles').select('role').eq('member_id', user.id);
  const roleSet = new Set((roles ?? []).map((row) => row.role));
  if (!roleSet.has('admin') && !roleSet.has('superadmin')) redirect('/admin');
  const { mensaje } = await searchParams;
  const { data: announcements } = await supabase
    .from('message_threads')
    .select('id,subject,created_at,messages(body,created_at)')
    .eq('is_announcement', true)
    .order('created_at', { ascending:false })
    .limit(20);

  return <>
    <header className="page-heading"><div><div className="muted">Administración · Comunicaciones</div><h1>Comunicados a socios</h1><p>Envía avisos internos a todos los socios activos. Cada comunicado aparecerá en su bandeja de mensajes.</p></div></header>
    {mensaje && <p className="notice">{mensaje}</p>}
    <section className="card">
      <h2>Nuevo comunicado</h2>
      <form action={sendAnnouncement} className="admin-inline-form">
        <label>Asunto<input name="subject" maxLength={160} required placeholder="Asunto del comunicado" /></label>
        <label>Mensaje<textarea name="body" rows={7} maxLength={10000} required placeholder="Escribe el comunicado…" /></label>
        <button type="submit">Enviar a socios activos</button>
      </form>
    </section>
    <section>
      <h2>Comunicados recientes</h2>
      <div className="message-thread-list">{(announcements ?? []).length ? (announcements ?? []).map((thread:any) => {
        const latest = Array.isArray(thread.messages) ? thread.messages[thread.messages.length - 1] : null;
        return <Link className="message-thread-card" href={`/area-socios/mensajes/${thread.id}`} key={thread.id}><div><div className="catalog-card-meta">Comunicado</div><h3>{thread.subject}</h3><p>{latest?.body ?? ''}</p></div><time>{new Date(thread.created_at).toLocaleString('es-ES',{dateStyle:'medium',timeStyle:'short'})}</time></Link>;
      }) : <div className="empty-state">Todavía no se han enviado comunicados.</div>}</div>
    </section>
  </>;
}
