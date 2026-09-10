import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { getSiteControl } from '../../../lib/site-control';
import { setFeatureFlag, setSiteSetting } from './actions';

type Setting = { key:string; value:unknown; label:string; description:string|null; is_public:boolean; updated_at:string };
type Flag = { key:string; label:string; description:string|null; enabled:boolean; updated_at:string };

const groups = [
  { id:'identity', title:'Identidad y contacto', description:'Nombre, lema y datos públicos de la asociación.', keys:['site.name','site.tagline','site.notice','site.contact_email','site.contact_phone'] },
  { id:'appearance', title:'Apariencia', description:'Tema y acento visual del portal.', keys:['ui.theme','ui.accent'] },
  { id:'map', title:'Mapa', description:'Centro, zoom y comportamiento del mapa patrimonial.', keys:['map.default_lat','map.default_lng','map.default_zoom','map.cluster_max_zoom'] },
  { id:'members', title:'Socios y acceso', description:'Valores de alta, perfiles y requisitos de acceso.', keys:['members.directory_default','security.require_profile_completion','auth.password_min_length'] },
  { id:'maintenance', title:'Mantenimiento', description:'Texto mostrado cuando el portal entra en mantenimiento.', keys:['maintenance.message'] },
];

function SettingInput({setting}:{setting:Setting}) {
  const value = String(setting.value ?? '');
  if (setting.key === 'ui.theme') return <select name="value" defaultValue={value}><option value="light">Claro</option><option value="dark">Oscuro</option><option value="system">Según dispositivo</option></select>;
  if (setting.key === 'ui.accent') return <select name="value" defaultValue={value}><option value="stone">Piedra</option><option value="burgundy">Burdeos</option><option value="forest">Bosque</option><option value="blue">Azul</option></select>;
  if (setting.key === 'members.directory_default' || setting.key === 'security.require_profile_completion') return <select name="value" defaultValue={value}><option value="true">Sí</option><option value="false">No</option></select>;
  const numeric = setting.key.startsWith('map.') || setting.key === 'auth.password_min_length';
  return <input name="value" type={numeric ? 'number' : setting.key.includes('email') ? 'email' : 'text'} step={setting.key.includes('lat') || setting.key.includes('lng') ? '0.0001' : undefined} defaultValue={value}/>;
}

export default async function SystemControlPage({ searchParams }: { searchParams: Promise<{ mensaje?: string }> }) {
  const [supabase, control] = await Promise.all([createClient(), getSiteControl()]);
  const fullTestAccess = control.enabled('testing.full_access');
  const { data: { user } } = await supabase.auth.getUser();
  let isSuperadmin = false;
  if (user) {
    const { data: roles } = await supabase.from('member_roles').select('role').eq('member_id', user.id);
    isSuperadmin = (roles ?? []).some((item) => item.role === 'superadmin');
  }
  if (!fullTestAccess && !user) redirect('/login');
  if (!fullTestAccess && !isSuperadmin) redirect('/admin');

  const [{ data: flags }, { data: settings }, { data: audit }, { count: members }, { count: superadmins }, { count: admins }, { count: editors }] = await Promise.all([
    supabase.from('feature_flags').select('key,label,description,enabled,updated_at').order('key'),
    supabase.from('site_settings').select('key,value,label,description,is_public,updated_at').neq('key','testing.full_access_snapshot').order('key'),
    supabase.from('system_audit_log').select('id,action,entity_type,entity_key,created_at').order('created_at', { ascending: false }).limit(12),
    supabase.from('members').select('*', { count:'exact', head:true }),
    supabase.from('member_roles').select('*', { count:'exact', head:true }).eq('role','superadmin'),
    supabase.from('member_roles').select('*', { count:'exact', head:true }).eq('role','admin'),
    supabase.from('member_roles').select('*', { count:'exact', head:true }).eq('role','editor'),
  ]);
  const allSettings = (settings ?? []) as Setting[];
  const allFlags = (flags ?? []) as Flag[];
  const { mensaje } = await searchParams;

  return <>
    <header className="page-heading"><div><div className="muted">AAE-AAR · Centro de control</div><h1>Configuración y ajustes</h1><p>Parámetros generales, accesos, roles, permisos, apariencia, mapa, mantenimiento y administración funcional.</p></div><Link className="button-link secondary" href="/">← Página principal</Link></header>
    {fullTestAccess && <p className="notice"><strong>Modo beta total activo.</strong> Los controles están abiertos para pruebas. Antes de producción se restaurarán autenticación, roles y políticas estrictas.</p>}
    {mensaje && <p className="notice">{mensaje}</p>}

    <section className="admin-stats">
      <article><strong>{members ?? 0}</strong><span>Socios</span></article>
      <article><strong>{superadmins ?? 0}</strong><span>Superadministradores</span></article>
      <article><strong>{admins ?? 0}</strong><span>Administradores</span></article>
      <article><strong>{editors ?? 0}</strong><span>Editores</span></article>
    </section>

    <section className="system-quick-grid">
      <Link className="admin-member-card system-quick-card" href="/admin/socios"><div className="catalog-card-meta">Socios</div><h2>Fichas, altas y roles</h2><p>Alta, baja, modificación, estado, privacidad, permisos y roles de cada socio.</p><strong>Abrir gestión →</strong></Link>
      <Link className="admin-member-card system-quick-card" href="/admin/aportaciones"><div className="catalog-card-meta">Aportaciones</div><h2>Propuestas de socios</h2><p>Listado, ficha individual, revisión, archivos y publicación en el patrimonio.</p><strong>Abrir gestión →</strong></Link>
      <Link className="admin-member-card system-quick-card" href="/admin/eventos"><div className="catalog-card-meta">Eventos</div><h2>Eventos e inscripciones</h2><p>Ficha de cada evento, aforo, asistentes y estados de participación.</p><strong>Abrir gestión →</strong></Link>
      <Link className="admin-member-card system-quick-card" href="/admin/comunicaciones"><div className="catalog-card-meta">Mensajes</div><h2>Comunicaciones</h2><p>Comunicados, fichas de hilos, participantes, lecturas y contenido.</p><strong>Abrir gestión →</strong></Link>
      <Link className="admin-member-card system-quick-card" href="/admin/contenidos"><div className="catalog-card-meta">Patrimonio</div><h2>Contenidos y catálogo</h2><p>Localidades, monumentos, noticias, eventos y material editorial.</p><strong>Abrir CMS →</strong></Link>
      <Link className="admin-member-card system-quick-card" href="/admin/rutas"><div className="catalog-card-meta">Rutas</div><h2>Rutas patrimoniales</h2><p>Creación, modificación, paradas, orden y publicación de rutas.</p><strong>Abrir gestión →</strong></Link>
      <Link className="admin-member-card system-quick-card" href="/actualizar-clave"><div className="catalog-card-meta">Contraseña</div><h2>Cambiar mi contraseña</h2><p>Actualiza la contraseña de la cuenta autenticada.</p><strong>Abrir →</strong></Link>
      <Link className="admin-member-card system-quick-card" href="/recuperar-clave"><div className="catalog-card-meta">Recuperación</div><h2>Restablecer acceso</h2><p>Envía el flujo seguro de recuperación por correo.</p><strong>Abrir →</strong></Link>
      <a className="admin-member-card system-quick-card" href="https://supabase.com/dashboard/project/whyegusyggdjbiyvjwhg/auth/providers" target="_blank" rel="noreferrer"><div className="catalog-card-meta">Proveedor de identidad</div><h2>Supabase Auth</h2><p>Proveedores, acceso anónimo y opciones avanzadas de autenticación.</p><strong>Abrir Supabase →</strong></a>
    </section>

    <section className="admin-member-list">
      {groups.map(group => {
        const groupSettings = allSettings.filter(setting => group.keys.includes(setting.key));
        return <article className="admin-member-card" id={group.id} key={group.id}>
          <div className="admin-member-title"><div><div className="catalog-card-meta">Configuración</div><h2>{group.title}</h2><p>{group.description}</p></div></div>
          <div className="system-settings-grid">
            {groupSettings.map(setting => <form action={setSiteSetting} className="system-setting-form" key={setting.key}>
              <input type="hidden" name="key" value={setting.key}/>
              <label><strong>{setting.label}</strong><span className="muted">{setting.description}</span><SettingInput setting={setting}/></label>
              <div className="system-setting-footer"><span className="catalog-card-meta">{setting.is_public ? 'Público' : 'Interno'}</span><button type="submit">Guardar</button></div>
            </form>)}
          </div>
        </article>;
      })}

      <article className="admin-member-card">
        <div className="admin-member-title"><div><div className="catalog-card-meta">Permisos y disponibilidad</div><h2>Módulos y funciones</h2><p>Activa o desactiva capacidades completas del portal. Los controles de pruebas están identificados de forma explícita.</p></div></div>
        <div className="admin-member-list">
          {allFlags.map(flag => <div className="admin-inline-form" key={flag.key}>
            <div><strong>{flag.label}</strong><div className="muted">{flag.description || flag.key}</div></div>
            <span className="catalog-card-meta">{flag.enabled ? 'Activo' : 'Desactivado'}</span>
            <form action={setFeatureFlag}><input type="hidden" name="key" value={flag.key}/><input type="hidden" name="enabled" value={flag.enabled ? 'false' : 'true'}/><button className={flag.enabled ? 'secondary' : ''} type="submit">{flag.enabled ? 'Desactivar' : 'Activar'}</button></form>
          </div>)}
        </div>
      </article>

      <article className="admin-member-card">
        <div className="admin-member-title"><div><div className="catalog-card-meta">Seguridad de credenciales</div><h2>Contraseñas y secretos</h2><p>AAE-AAR nunca muestra contraseñas existentes ni guarda secretos en esta tabla de configuración. Las contraseñas se cambian o restablecen mediante Supabase Auth; claves privadas y secretos de servidor permanecen fuera de la interfaz pública.</p></div></div>
      </article>

      <article className="admin-member-card">
        <div className="admin-member-title"><div><div className="catalog-card-meta">Trazabilidad</div><h2>Auditoría reciente</h2><p>Últimos cambios registrados sobre configuración, módulos y privilegios.</p></div></div>
        {(audit ?? []).length === 0 ? <p className="muted">Todavía no hay cambios registrados.</p> : <div className="admin-member-list">{(audit ?? []).map(entry => <div className="admin-inline-form" key={entry.id}><div><strong>{entry.action} · {entry.entity_type}</strong><div className="muted">{entry.entity_key || '—'}</div></div><time>{new Date(entry.created_at).toLocaleString('es-ES')}</time></div>)}</div>}
      </article>
    </section>
  </>;
}
