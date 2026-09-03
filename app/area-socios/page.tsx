import Link from 'next/link';
import { redirect } from 'next/navigation';
import { logout } from '../auth/actions';
import { createClient } from '../../lib/supabase/server';
import { getSiteControl } from '../../lib/site-control';

export default async function MembersAreaPage({searchParams}:{searchParams:Promise<{mensaje?:string}>}) {
  const [supabase,control]=await Promise.all([createClient(),getSiteControl()]);
  const freeTestAccess=control.enabled('testing.member_area_open');
  const fullTestAccess=control.enabled('testing.full_access');
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  const { mensaje } = await searchParams;

  if (!user) {
    if (!freeTestAccess) redirect('/login');
    return <main className="wrap member-area">
      <header className="member-header"><div><div className="muted">AAE-AAR · Área de socios</div><h1>Modo de pruebas</h1><p>Acceso temporal sin identificación para revisar navegación, estructura y diseño.</p></div><Link className="button-link secondary" href="/login">Iniciar sesión real</Link></header>
      {mensaje&&<p className="notice">{mensaje}</p>}
      <section className="status-card test-access-card"><h2>Acceso libre temporal activo</h2><p>La navegación pública de pruebas está abierta. Para probar funciones reales de socio o administración inicia sesión con cualquier cuenta.</p></section>
      <section className="dashboard-grid">
        <div className="dashboard-card test-preview"><h2>Mi perfil</h2><p>Requiere una sesión para disponer de una identidad sobre la que guardar cambios.</p><span className="muted">Inicia sesión para probar</span></div>
        <div className="dashboard-card test-preview"><h2>Directorio de socios</h2><p>Requiere sesión para identificar al usuario que realiza la consulta.</p><span className="muted">Inicia sesión para probar</span></div>
        <Link className="dashboard-card" href="/eventos"><h2>Mis eventos</h2><p>Abre la agenda pública para comprobar el flujo visual de actividades.</p><strong>Ver agenda →</strong></Link>
        <Link className="dashboard-card" href="/patrimonio"><h2>Mi planificación</h2><p>Usa el catálogo público para revisar el recorrido de selección de localidades y monumentos.</p><strong>Explorar patrimonio →</strong></Link>
        <div className="dashboard-card test-preview"><h2>Mis aportaciones</h2><p>Inicia sesión con cualquier usuario para entrar en el flujo completo de pruebas.</p><span className="muted">Inicia sesión para probar</span></div>
        <div className="dashboard-card test-preview"><h2>Mensajes</h2><p>Inicia sesión con cualquier usuario para probar la mensajería disponible para esa cuenta.</p><span className="muted">Inicia sesión para probar</span></div>
      </section>
      <p><Link href="/patrimonio">Patrimonio</Link> · <Link href="/eventos">Agenda</Link> · <Link href="/">Volver al mapa público</Link></p>
    </main>;
  }

  const { data: member } = await supabase.from('members').select('first_name,last_name,member_number,status').eq('id', user.id).single();
  if (!member) redirect('/login?mensaje=No%20se%20ha%20encontrado%20el%20perfil%20de%20socio.');
  const isActive = fullTestAccess || member.status === 'active';
  const [{ data: unread }, { count: plannedCount }] = isActive ? await Promise.all([
    supabase.rpc('unread_message_count'),
    supabase.from('member_saved_places').select('*',{count:'exact',head:true}).eq('member_id',user.id).eq('wants_to_visit',true),
  ]) : [{data:0},{count:0}];
  const unreadCount = Number(unread ?? 0);

  return <main className="wrap member-area"><header className="member-header"><div><div className="muted">AAE-AAR · Área privada</div><h1>Hola, {member.first_name}</h1><p>{member.member_number ? `Socio nº ${member.member_number}` : 'Número de socio pendiente'} · Estado real: <strong>{member.status}</strong></p></div><form action={logout}><button className="secondary" type="submit">Cerrar sesión</button></form></header>{fullTestAccess?<p className="notice">Modo de prueba total activo: el estado del socio no bloquea ninguna sección de navegación.</p>:freeTestAccess&&<p className="notice">Modo de pruebas libre activo para visitantes anónimos.</p>}{mensaje&&<p className="notice">{mensaje}</p>}{!isActive&&<section className="status-card"><h2>Alta pendiente de validación</h2><p>Puedes completar tus datos personales mientras la asociación revisa tu solicitud.</p></section>}<section className="dashboard-grid"><Link className="dashboard-card" href="/area-socios/perfil"><h2>Mi perfil</h2><p>Datos personales, contacto y privacidad.</p></Link>{isActive ? <Link className="dashboard-card" href="/area-socios/directorio"><h2>Directorio de socios</h2><p>Encuentra otros miembros y consulta los datos que hayan elegido compartir.</p></Link> : <div className="dashboard-card disabled"><h2>Directorio de socios</h2><p>Disponible tras la activación.</p></div>}{isActive ? <Link className="dashboard-card" href="/area-socios/eventos"><h2>Mis eventos</h2><p>Consulta tus inscripciones y accede a la agenda.</p></Link> : <div className="dashboard-card disabled"><h2>Mis eventos</h2><p>Disponible tras la activación.</p></div>}{isActive ? <Link className="dashboard-card" href="/area-socios/visitas"><h2>Mi planificación{plannedCount ? ` · ${plannedCount} por visitar` : ''}</h2><p>Favoritos, lugares pendientes y rutas personales.</p></Link> : <div className="dashboard-card disabled"><h2>Mi planificación</h2><p>Disponible tras la activación.</p></div>}{isActive ? <Link className="dashboard-card" href="/area-socios/aportaciones"><h2>Mis aportaciones</h2><p>Prepara propuestas patrimoniales y envíalas a revisión.</p></Link> : <div className="dashboard-card disabled"><h2>Mis aportaciones</h2><p>Disponible tras la activación.</p></div>}{isActive ? <Link className={`dashboard-card ${unreadCount > 0 ? 'unread' : ''}`} href="/area-socios/mensajes"><h2>Mensajes{unreadCount > 0 ? ` · ${unreadCount} sin leer` : ''}</h2><p>Conversaciones privadas y comunicados de la asociación.</p></Link> : <div className="dashboard-card disabled"><h2>Mensajes</h2><p>Disponible tras la activación.</p></div>}<Link className="dashboard-card" href="/admin"><h2>Administración</h2><p>En modo de prueba total, cualquier usuario autenticado puede recorrer el panel administrativo.</p></Link></section><p><Link href="/eventos">Agenda pública</Link> · <Link href="/">Volver al mapa público</Link></p></main>;
}
