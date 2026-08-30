import Link from 'next/link';
import { requestPasswordReset } from '../auth/actions';

export default function RecoverPage() {
  return <main className="auth-shell"><section className="auth-card"><div className="muted">AAE-AAR · Acceso</div><h1>Recuperar contraseña</h1><p>Introduce el correo asociado a tu cuenta.</p><form action={requestPasswordReset} className="form-grid"><label>Email<input name="email" type="email" required autoComplete="email"/></label><button type="submit">Enviar instrucciones</button></form><p><Link href="/login">← Volver al acceso</Link></p></section></main>;
}
