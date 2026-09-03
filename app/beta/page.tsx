import Link from 'next/link';
import { createClient } from '../../lib/supabase/server';

const tables = [
  'members','member_roles','contributions','contribution_media','events','event_members',
  'message_threads','message_participants','messages','member_saved_places','member_visit_routes',
  'member_visit_route_stops','locations','monuments','media','posts','heritage_routes',
  'heritage_route_stops','feature_flags','site_settings','system_audit_log',
] as const;

export default async function BetaPage() {
  const supabase = await createClient();
  const [{ data: members }, ...tableResults] = await Promise.all([
    supabase.from('members').select('*').order('created_at', { ascending: true }),
    ...tables.map((table) => supabase.from(table).select('*').limit(100)),
  ]);

  return <main className="wrap admin-page">
    <header className="page-heading">
      <div>
        <div className="muted">AAE-AAR · BETA ABIERTA</div>
        <h1>Panel de prueba sin restricciones</h1>
        <p>Acceso temporal directo a los datos de la aplicación para pruebas funcionales. No requiere iniciar sesión.</p>
      </div>
    </header>

    <p className="notice">Modo beta sin restricciones activo. Las tablas públicas y los archivos de socios están abiertos temporalmente para lectura y escritura.</p>

    <nav className="admin-nav">
      <Link href="/">Inicio</Link>
      <Link href="/area-socios">Área de socios</Link>
      <Link href="/admin">Administración</Link>
      <Link href="/patrimonio">Patrimonio</Link>
      <Link href="/eventos">Eventos</Link>
    </nav>

    <section className="catalog-section">
      <div className="section-heading"><div><div className="eyebrow">Socios</div><h2>Perfiles completos</h2></div></div>
      <div className="stack-list">
        {(members ?? []).map((member: any) => <article className="stack-card" key={member.id}>
          <div>
            <div className="catalog-card-meta">{member.member_number ? `Socio nº ${member.member_number}` : 'Sin número'} · {member.status}</div>
            <h3>{member.first_name} {member.last_name}</h3>
            <p>{member.email_public || 'Sin email'}{member.phone ? ` · ${member.phone}` : ''}</p>
            <p>{[member.address, member.postal_code, member.city, member.region, member.country].filter(Boolean).join(' · ') || 'Sin dirección'}</p>
            {member.bio && <p>{member.bio}</p>}
            <div className="muted">ID: {member.id} · Directorio: {String(member.directory_visible)} · Email visible: {String(member.email_visible)} · Teléfono visible: {String(member.phone_visible)}</div>
          </div>
        </article>)}
        {(members ?? []).length === 0 && <div className="empty-state">No hay socios cargados.</div>}
      </div>
    </section>

    <section className="catalog-section">
      <div className="section-heading"><div><div className="eyebrow">Datos</div><h2>Explorador de tablas</h2></div></div>
      <div className="stack-list">
        {tables.map((table, index) => {
          const result = tableResults[index] as any;
          return <details className="stack-card" key={table}>
            <summary><strong>{table}</strong> · {(result?.data ?? []).length} filas mostradas</summary>
            {result?.error ? <p className="notice">{result.error.message}</p> : <pre style={{overflow:'auto',whiteSpace:'pre-wrap'}}>{JSON.stringify(result?.data ?? [], null, 2)}</pre>}
          </details>;
        })}
      </div>
    </section>
  </main>;
}
