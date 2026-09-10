import { redirect } from 'next/navigation';
import { updatePassword } from '../auth/actions';
import { createClient } from '../../lib/supabase/server';
import { getSiteControl } from '../../lib/site-control';

export default async function UpdatePasswordPage({searchParams}:{searchParams:Promise<{mensaje?:string}>}) {
  const [supabase, control] = await Promise.all([createClient(), getSiteControl()]);
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');
  const configuredMin = Number(control.setting('auth.password_min_length','8'));
  const minLength = Number.isInteger(configuredMin) && configuredMin >= 8 && configuredMin <= 128 ? configuredMin : 8;
  const { mensaje } = await searchParams;
  return <main className="auth-shell"><section className="auth-card"><div className="muted">AAE-AAR · Seguridad</div><h1>Nueva contraseña</h1>{mensaje&&<p className="notice">{mensaje}</p>}<form action={updatePassword} className="form-grid"><label>Nueva contraseña<input name="password" type="password" minLength={minLength} required autoComplete="new-password"/><span className="muted">Mínimo {minLength} caracteres</span></label><label>Repetir contraseña<input name="confirm_password" type="password" minLength={minLength} required autoComplete="new-password"/></label><button type="submit">Guardar contraseña</button></form></section></main>;
}
