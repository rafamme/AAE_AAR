import Link from 'next/link';
import { login } from '../auth/actions';

export default async function LoginPage({searchParams}:{searchParams:Promise<{mensaje?:string}>}) {
  const { mensaje } = await searchParams;
  return <main className="auth-shell"><section className="auth-card"><div className="muted">AAE-AAR · Área de socios</div><h1>Iniciar sesión</h1>{mensaje&&<p className="notice">{mensaje}</p>}<form action={login} className="form-grid"><label>Email<input name="email" type="email" required autoComplete="email"/></label><label>Contraseña<input name="password" type="password" required autoComplete="current-password"/></label><button type="submit">Entrar</button></form><p><Link href="/recuperar-clave">¿Olvidaste tu contraseña?</Link></p><p>¿Aún no tienes acceso? <Link href="/registro">Solicitar alta</Link></p><p><Link href="/">← Volver al mapa</Link></p></section></main>;
}
