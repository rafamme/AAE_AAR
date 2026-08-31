import Link from 'next/link';
import { createClient } from '../../lib/supabase/server';

export default async function AdminPage() {
  const supabase = await createClient();
  const [{ count: pendingMembers }, { count: activeMembers }, { count: pendingContributions }, { count: publishedContributions }] = await Promise.all([
    supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('contributions').select('*', { count: 'exact', head: true }).eq('status', 'draft').not('submitted_at', 'is', null),
    supabase.from('contributions').select('*', { count: 'exact', head: true }).eq('status', 'published'),
  ]);

  return <>
    <header className="page-heading"><div><div className="muted">AAE-AAR · Gestión interna</div><h1>Administración</h1><p>Resumen de socios y flujo editorial.</p></div></header>
    <section className="admin-stats">
      <article><strong>{pendingMembers ?? 0}</strong><span>Altas pendientes</span></article>
      <article><strong>{activeMembers ?? 0}</strong><span>Socios activos</span></article>
      <article><strong>{pendingContributions ?? 0}</strong><span>Aportaciones por revisar</span></article>
      <article><strong>{publishedContributions ?? 0}</strong><span>Aportaciones publicadas</span></article>
    </section>
    <section className="dashboard-grid">
      <Link className="dashboard-card" href="/admin/socios"><h2>Gestión de socios</h2><p>Validación de altas, estados, número de socio y roles.</p></Link>
      <Link className="dashboard-card" href="/admin/aportaciones"><h2>Revisión editorial</h2><p>Revisar, publicar o archivar aportaciones enviadas.</p></Link>
    </section>
  </>;
}
