import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import { sendReply } from '../actions';

type DirectoryMember = { id:string; display_name:string };
type Participant = { member_id:string };
type Message = { id:string; sender_id:string; body:string; created_at:string; edited_at:string|null };

export default async function MessageThreadPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{mensaje?:string}>}) {
  const { id } = await params;
  const { mensaje } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase.from('members').select('status').eq('id', user.id).single();
  if (!me || me.status !== 'active') redirect('/area-socios?mensaje=La%20mensajería%20solo%20está%20disponible%20para%20socios%20activos.');

  const { data: thread } = await supabase.from('message_threads').select('id,subject').eq('id', id).maybeSingle();
  if (!thread) notFound();
  const [{ data: participants }, { data: messages }, { data: directory }] = await Promise.all([
    supabase.from('message_participants').select('member_id').eq('thread_id', id),
    supabase.from('messages').select('id,sender_id,body,created_at,edited_at').eq('thread_id', id).order('created_at', { ascending:true }),
    supabase.rpc('member_directory'),
  ]);
  await supabase.from('message_participants').update({ last_read_at: new Date().toISOString() }).eq('thread_id', id).eq('member_id', user.id);

  const names = new Map(((directory ?? []) as DirectoryMember[]).map(member => [member.id, member.display_name]));
  const other = ((participants ?? []) as Participant[]).find(row => row.member_id !== user.id);
  const otherName = other ? names.get(other.member_id) ?? 'Socio AAE-AAR' : 'Conversación';

  return <main className="wrap member-area message-thread-page"><header className="page-heading"><div><div className="muted">AAE-AAR · Mensajería privada</div><h1>{otherName}</h1><p>{thread.subject}</p></div><Link className="button-link secondary" href="/area-socios/mensajes">Bandeja</Link></header>{mensaje && <p className="notice">{mensaje}</p>}<section className="message-history">{((messages ?? []) as Message[]).map(message => <article className={`message-bubble ${message.sender_id === user.id ? 'mine' : ''}`} key={message.id}><div className="message-meta"><strong>{message.sender_id === user.id ? 'Tú' : otherName}</strong><time>{new Date(message.created_at).toLocaleString('es-ES',{dateStyle:'medium',timeStyle:'short'})}</time></div><p>{message.body}</p>{message.edited_at && <span className="muted">Editado</span>}</article>)}</section><form action={sendReply} className="message-reply-form"><input type="hidden" name="thread_id" value={id}/><label>Responder<textarea name="body" rows={5} required placeholder="Escribe una respuesta…" /></label><button type="submit">Enviar respuesta</button></form></main>;
}
