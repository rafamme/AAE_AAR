import Link from 'next/link';
import { createClient } from '../../lib/supabase/server';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ count: pendingMembers }, { count: activeMembers }, { count: pendingContributions }, { count: publishedContributions }, { data: roles }] = await Promise.all([
    supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('contributions').select('*', { count: 'exact', head: true }).eq('status', 'draft').not('submitted_at', 'is', null),
    supabase.from('contributions').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    user ? supabase.from('member_roles').select('role').eq('member_id', user.id) : Promise.resolve({ data: [] as { role: string }[] }),
  ]);
  const isSuperadmin = (roles ?? []).some((item) => item.role === 'superadmin');

  return <>
    <header className="page-heading"><div><div className="muted">AAE-AAR · Gestión interna</div><h1>Administración</h1><p>Socios, revisión editorial, contenidos públicos y operación del portal.</p></div></header>
    <section className="admin-stats">
      <article><strong>{pendingMembers ?? 0}</strong><span>Altas pendientes</span></article>
      <article><strong>{activeMembers ?? 0}</strong><span>Socios activos</span></article>
      <article><strong>{pendingContributions ?? 0}</strong><span>Aportaciones por revisar</span></article>
      <article><strong>{publishedContributions ?? 0}</strong><span>Aportaciones publicadas</span></article>
    </section>
    <section className="dashboard-grid">
      <Link className="dashboard-card" href="/admin/socios"><h2>Gestión de socios</h2><p>Validación de altas, estados, número de socio y roles.</p></Link>
      <Link className="dashboard-card" href="/admin/aportaciones"><h2>Revisión editorial</h2><p>Revisar, publicar o archivar aportaciones enviadas.</p></Link>
      <Link className="dashboard-card" href="/admin/contenidos"><h2>Gestión de contenidos</h2><p>Localidades, monumentos, noticias, eventos y medios.</p></Link>
      {isSuperadmin && <Link className="dashboard-card" href="/admin/sistema"><h2>Control del sistema</h2><p>Activa módulos, configura el sitio, consulta auditoría y administra privilegios superiores.</p></Link>}
    </section>
  </>;
}
