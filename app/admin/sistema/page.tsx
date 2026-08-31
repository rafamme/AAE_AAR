import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { setFeatureFlag, setSiteSetting } from './actions';

export default async function SystemControlPage({ searchParams }: { searchParams: Promise<{ mensaje?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: roles } = await supabase.from('member_roles').select('role').eq('member_id', user.id);
  if (!(roles ?? []).some((item) => item.role === 'superadmin')) redirect('/admin');

  const [{ data: flags }, { data: settings }, { data: audit }, { count: superadmins }] = await Promise.all([
    supabase.from('feature_flags').select('key,label,description,enabled,updated_at').order('key'),
    supabase.from('site_settings').select('key,value,label,description,is_public,updated_at').order('key'),
    supabase.from('system_audit_log').select('id,action,entity_type,entity_key,created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('member_roles').select('*', { count: 'exact', head: true }).eq('role', 'superadmin'),
  ]);
  const { mensaje } = await searchParams;

  return <>
    <header className="page-heading"><div><div className="muted">AAE-AAR · Superadministración</div><h1>Control del sistema</h1><p>Configuración global, disponibilidad de módulos, seguridad operativa y auditoría.</p></div></header>
    {mensaje && <p className="notice">{mensaje}</p>}

    <section className="admin-stats">
      <article><strong>{superadmins ?? 0}</strong><span>Superadministradores</span></article>
      <article><strong>{(flags ?? []).filter((flag) => flag.enabled).length}</strong><span>Módulos activos</span></article>
      <article><strong>{(flags ?? []).filter((flag) => !flag.enabled).length}</strong><span>Módulos desactivados</span></article>
      <article><strong>{audit?.length ?? 0}</strong><span>Cambios recientes</span></article>
    </section>

    <section className="admin-member-list">
      <article className="admin-member-card">
        <div className="admin-member-title"><div><div className="catalog-card-meta">Disponibilidad</div><h2>Módulos y funciones</h2><p>Estos interruptores controlan las principales capacidades del portal. Mensajería, aportaciones e inscripciones están reforzadas también en base de datos.</p></div></div>
        <div className="admin-member-list">
          {(flags ?? []).map((flag) => <div className="admin-inline-form" key={flag.key}>
            <div><strong>{flag.label}</strong><div className="muted">{flag.description || flag.key}</div></div>
            <span className="catalog-card-meta">{flag.enabled ? 'Activo' : 'Desactivado'}</span>
            <form action={setFeatureFlag}>
              <input type="hidden" name="key" value={flag.key}/>
              <input type="hidden" name="enabled" value={flag.enabled ? 'false' : 'true'}/>
              <button className={flag.enabled ? 'secondary' : ''} type="submit">{flag.enabled ? 'Desactivar' : 'Activar'}</button>
            </form>
          </div>)}
        </div>
      </article>

      <article className="admin-member-card">
        <div className="admin-member-title"><div><div className="catalog-card-meta">Configuración</div><h2>Ajustes globales</h2><p>Valores compartidos por el portal. Los ajustes marcados como públicos pueden ser leídos por la web pública.</p></div></div>
        {(settings ?? []).map((setting) => <form action={setSiteSetting} className="admin-inline-form" key={setting.key}>
          <input type="hidden" name="key" value={setting.key}/>
          <label>{setting.label}<input name="value" defaultValue={String(setting.value ?? '')}/><span className="muted">{setting.description}</span></label>
          <span className="catalog-card-meta">{setting.is_public ? 'Público' : 'Privado'}</span>
          <button type="submit">Guardar</button>
        </form>)}
      </article>

      <article className="admin-member-card">
        <div className="admin-member-title"><div><div className="catalog-card-meta">Trazabilidad</div><h2>Auditoría reciente</h2><p>Últimos cambios sobre configuración, módulos y privilegios superiores.</p></div></div>
        {(audit ?? []).length === 0 ? <p className="muted">Todavía no hay cambios registrados.</p> : <div className="admin-member-list">
          {(audit ?? []).map((entry) => <div className="admin-inline-form" key={entry.id}>
            <div><strong>{entry.action} · {entry.entity_type}</strong><div className="muted">{entry.entity_key || '—'}</div></div>
            <time>{new Date(entry.created_at).toLocaleString('es-ES')}</time>
          </div>)}
        </div>}
      </article>
    </section>
  </>;
}
