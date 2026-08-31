import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: roles } = await supabase.from('member_roles').select('role').eq('member_id', user.id);
  const roleSet = new Set((roles ?? []).map((item) => item.role));
  const isAdmin = roleSet.has('admin');
  const isEditor = roleSet.has('editor');
  if (!isAdmin && !isEditor) redirect('/area-socios?mensaje=No%20tienes%20permisos%20de%20administración.');

  return <main className="wrap admin-page">
    <nav className="admin-nav">
      <Link href="/admin">Resumen</Link>
      {isAdmin && <Link href="/admin/socios">Socios</Link>}
      <Link href="/admin/aportaciones">Aportaciones</Link>
      <Link href="/admin/contenidos">Contenidos</Link>
      <Link href="/area-socios">Área de socios</Link>
    </nav>
    {children}
  </main>;
}
