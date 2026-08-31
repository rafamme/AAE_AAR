import Link from 'next/link';
import { redirect } from 'next/navigation';
import { logout } from '../auth/actions';
import { createClient } from '../../lib/supabase/server';

export default async function MembersAreaPage({searchParams}:{searchParams:Promise<{mensaje?:string}>}) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) redirect('/login');

  const { data: member } = await supabase
    .from('members')
    .select('first_name,last_name,member_number,status')
    .eq('id', user.id)
    .single();

  if (!member) redirect('/login?mensaje=No%20se%20ha%20encontrado%20el%20perfil%20de%20socio.');
  const { mensaje } = await searchParams;
  const isActive = member.status === 'active';

  return <main className="wrap member-area"><header className="member-header"><div><div className="muted">AAE-AAR · Área privada</div><h1>Hola, {member.first_name}</h1><p>{member.member_number ? `Socio nº ${member.member_number}` : 'Número de socio pendiente'} · Estado: <strong>{member.status}</strong></p></div><form action={logout}><button className="secondary" type="submit">Cerrar sesión</button></form></header>{mensaje&&<p className="notice">{mensaje}</p>}{!isActive&&<section className="status-card"><h2>Alta pendiente de validación</h2><p>Puedes completar tus datos personales mientras la asociación revisa tu solicitud. El directorio, la mensajería y otras funciones privadas se activarán cuando tu estado pase a activo.</p></section>}<section className="dashboard-grid"><Link className="dashboard-card" href="/area-socios/perfil"><h2>Mi perfil</h2><p>Datos personales, contacto y privacidad.</p></Link>{isActive ? <Link className="dashboard-card" href="/area-socios/directorio"><h2>Directorio de socios</h2><p>Encuentra otros miembros y consulta los datos que hayan elegido compartir.</p></Link> : <div className="dashboard-card disabled"><h2>Directorio de socios</h2><p>Disponible tras la activación.</p></div>}{isActive ? <Link className="dashboard-card" href="/area-socios/eventos"><h2>Mis eventos</h2><p>Consulta tus inscripciones y accede a la agenda.</p></Link> : <div className="dashboard-card disabled"><h2>Mis eventos</h2><p>Disponible tras la activación.</p></div>}{isActive ? <Link className="dashboard-card" href="/area-socios/aportaciones"><h2>Mis aportaciones</h2><p>Prepara propuestas patrimoniales y envíalas a revisión.</p></Link> : <div className="dashboard-card disabled"><h2>Mis aportaciones</h2><p>Disponible tras la activación.</p></div>}<div className={`dashboard-card ${isActive ? '' : 'disabled'}`}><h2>Mensajes</h2><p>{isActive ? 'Próximamente.' : 'Disponible tras la activación.'}</p></div></section><p><Link href="/eventos">Agenda pública</Link> · <Link href="/">Volver al mapa público</Link></p></main>;
}
