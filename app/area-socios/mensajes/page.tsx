import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { getSiteControl } from '../../../lib/site-control';

type DirectoryMember = { id:string; display_name:string };
type Participant = { thread_id:string; member_id:string; last_read_at:string|null };
type Thread = { id:string; subject:string|null; created_at:string; is_announcement:boolean };
type Message = { thread_id:string; sender_id:string; body:string; created_at:string };

export default async function MessagesPage() {
  const [supabase,control] = await Promise.all([createClient(),getSiteControl()]);
  const fullTestAccess=control.enabled('testing.full_access');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase.from('members').select('status').eq('id', user.id).single();
  if (!fullTestAccess && (!me || me.status !== 'active')) redirect('/area-socios?mensaje=La%20mensajería%20solo%20está%20disponible%20para%20socios%20activos.');

  const [{ data: threads }, { data: participants }, { data: messages }, { data: directory }] = await Promise.all([
    supabase.from('message_threads').select('id,subject,created_at,is_announcement').order('created_at', { ascending:false }),
    supabase.from('message_participants').select('thread_id,member_id,last_read_at'),
    supabase.from('messages').select('thread_id,sender_id,body,created_at').order('created_at', { ascending:false }),
    supabase.rpc('member_directory'),
  ]);

  const names = new Map(((directory ?? []) as DirectoryMember[]).map(member => [member.id, member.display_name]));
  const participantRows = (participants ?? []) as Participant[];
  const messageRows = (messages ?? []) as Message[];
  const items = ((threads ?? []) as Thread[]).map(thread => {
    const people = participantRows.filter(row => row.thread_id === thread.id);
    const other = people.find(row => row.member_id !== user.id);
    const mine = people.find(row => row.member_id === user.id);
    const latest = messageRows.find(message => message.thread_id === thread.id);
    const unread = Boolean(latest && latest.sender_id !== user.id && (!mine?.last_read_at || new Date(latest.created_at) > new Date(mine.last_read_at)));
    return { thread, otherName: thread.is_announcement ? 'AAE-AAR' : other ? names.get(other.member_id) ?? 'Socio AAE-AAR' : 'Conversación', latest, unread };
  });

  return <main className="wrap member-area messages-page">
    <header className="page-heading"><div><div className="muted">AAE-AAR · Área privada</div><h1>Mensajes</h1><p className="directory-intro">Conversaciones privadas y comunicados de la asociación.</p></div><div className="top-actions"><Link className="button-link" href="/area-socios/directorio">Nuevo mensaje</Link><Link className="button-link secondary" href="/area-socios">Área de socios</Link></div></header>
    {fullTestAccess&&<p className="notice">Modo de prueba total activo: no se bloquea el acceso por estado del socio.</p>}
    {items.length === 0 ? <section className="empty-state">Todavía no tienes conversaciones ni comunicados. Puedes iniciar una conversación desde el directorio de socios.</section> : <section className="message-thread-list">{items.map(({thread,otherName,latest,unread}) => <Link key={thread.id} href={`/area-socios/mensajes/${thread.id}`} className={`message-thread-card ${unread ? 'unread' : ''}`}><div><div className="catalog-card-meta">{thread.is_announcement ? (unread ? 'Nuevo comunicado' : 'Comunicado') : (unread ? 'Nuevo mensaje' : 'Conversación')}</div><h2>{thread.is_announcement ? thread.subject : otherName}</h2><p>{latest?.body ?? thread.subject ?? 'Sin mensajes'}</p></div><time>{new Date(latest?.created_at ?? thread.created_at).toLocaleString('es-ES',{dateStyle:'medium',timeStyle:'short'})}</time></Link>)}</section>}
  </main>;
}