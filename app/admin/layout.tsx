import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { getSiteControl } from '../../lib/site-control';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [supabase, control] = await Promise.all([createClient(), getSiteControl()]);
  const fullTestAccess = control.enabled('testing.full_access');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: roles } = await supabase.from('member_roles').select('role').eq('member_id', user.id);
  const roleSet = new Set((roles ?? []).map((item) => item.role));
  const isSuperadmin = fullTestAccess || roleSet.has('superadmin');
  const isAdmin = fullTestAccess || roleSet.has('admin') || isSuperadmin;
  const isEditor = fullTestAccess || roleSet.has('editor');
  if (!fullTestAccess && !isAdmin && !isEditor) redirect('/area-socios?mensaje=No%20tienes%20permisos%20de%20administración.');

  return <main className="wrap admin-page">
    {fullTestAccess && <p className="notice">Modo de prueba total activo: cualquier usuario autenticado puede recorrer todas las secciones administrativas. Las reglas RLS de Supabase siguen protegiendo las operaciones de datos.</p>}
    <nav className="admin-nav">
      <Link href="/admin">Resumen</Link>
      {isAdmin && <Link href="/admin/socios">Socios</Link>}
      <Link href="/admin/eventos">Eventos</Link>
      <Link href="/admin/aportaciones">Aportaciones</Link>
      <Link href="/admin/contenidos">Contenidos</Link>
      <Link href="/admin/rutas">Rutas</Link>
      {isAdmin && <Link href="/admin/comunicaciones">Comunicaciones</Link>}
      {isSuperadmin && <Link href="/admin/sistema">Sistema</Link>}
      <Link href="/area-socios">Área de socios</Link>
    </nav>
    {children}
  </main>;
}
