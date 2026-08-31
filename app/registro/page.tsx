import Link from 'next/link';
import { register } from '../auth/actions';
import { getSiteControl } from '../../lib/site-control';

export default async function RegisterPage({searchParams}:{searchParams:Promise<{mensaje?:string}>}) {
  const [{ mensaje }, control] = await Promise.all([searchParams, getSiteControl()]);
  const disabled = control.enabled('system.maintenance') || !control.enabled('auth.registration');
  return <main className="auth-shell"><section className="auth-card"><div className="muted">AAE-AAR · Solicitud de alta</div><h1>Crear cuenta</h1>{mensaje&&<p className="notice">{mensaje}</p>}{disabled ? <><p>El registro de nuevos socios está temporalmente cerrado.</p><p><Link href="/login">Volver al acceso de socios</Link></p></> : <><p>La cuenta se crea como pendiente hasta su validación por la asociación.</p><form action={register} className="form-grid"><label>Nombre<input name="first_name" required autoComplete="given-name"/></label><label>Apellidos<input name="last_name" required autoComplete="family-name"/></label><label>Email<input name="email" type="email" required autoComplete="email"/></label><label>Contraseña<input name="password" type="password" minLength={8} required autoComplete="new-password"/></label><label>Repetir contraseña<input name="confirm_password" type="password" minLength={8} required autoComplete="new-password"/></label><button type="submit">Solicitar alta</button></form><p><Link href="/login">Ya tengo cuenta</Link></p></>}</section></main>;
}
