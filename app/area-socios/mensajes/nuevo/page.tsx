import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import { startDirectMessage } from '../actions';

type DirectoryMember = { id:string; display_name:string; member_number:number|null; city:string|null; region:string|null; country:string|null };

export default async function NewMessagePage({searchParams}:{searchParams:Promise<{destinatario?:string;mensaje?:string}>}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase.from('members').select('status').eq('id', user.id).single();
  if (!me || me.status !== 'active') redirect('/area-socios?mensaje=La%20mensajería%20solo%20está%20disponible%20para%20socios%20activos.');
  const { destinatario = '', mensaje } = await searchParams;
  const { data } = await supabase.rpc('member_directory');
  const members = ((data ?? []) as DirectoryMember[]).filter(member => member.id !== user.id);
  const selected = members.find(member => member.id === destinatario);

  return <main className="wrap member-area message-compose-page"><p><Link href="/area-socios/mensajes">← Mensajes</Link></p><header className="page-heading"><div><div className="muted">AAE-AAR · Área privada</div><h1>Nuevo mensaje</h1><p className="directory-intro">Elige un socio del directorio y escribe el primer mensaje de la conversación.</p></div></header>{mensaje && <p className="notice">{mensaje}</p>}<form action={startDirectMessage} className="message-compose-form"><label>Destinatario<select name="target_member_id" required defaultValue={selected?.id ?? ''}><option value="">Selecciona un socio</option>{members.map(member => <option value={member.id} key={member.id}>{member.display_name}{member.member_number ? ` · Socio nº ${member.member_number}` : ''}</option>)}</select></label>{selected && <p className="muted">{[selected.city,selected.region,selected.country].filter(Boolean).join(' · ')}</p>}<label>Mensaje<textarea name="body" rows={8} required placeholder="Escribe tu mensaje…" /></label><div className="form-actions"><button type="submit">Enviar mensaje</button><Link className="button-link secondary" href="/area-socios/directorio">Volver al directorio</Link></div></form></main>;
}
