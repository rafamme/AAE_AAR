import { redirect } from 'next/navigation';
import { updatePassword } from '../auth/actions';
import { createClient } from '../../lib/supabase/server';

export default async function UpdatePasswordPage({searchParams}:{searchParams:Promise<{mensaje?:string}>}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');
  const { mensaje } = await searchParams;
  return <main className="auth-shell"><section className="auth-card"><div className="muted">AAE-AAR · Seguridad</div><h1>Nueva contraseña</h1>{mensaje&&<p className="notice">{mensaje}</p>}<form action={updatePassword} className="form-grid"><label>Nueva contraseña<input name="password" type="password" minLength={8} required autoComplete="new-password"/></label><label>Repetir contraseña<input name="confirm_password" type="password" minLength={8} required autoComplete="new-password"/></label><button type="submit">Guardar contraseña</button></form></section></main>;
}
