import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { getSiteControl } from '../../../lib/site-control';

type DirectoryMember = {
  id: string;
  member_number: number | null;
  display_name: string;
  city: string | null;
  region: string | null;
  country: string | null;
  bio: string | null;
  avatar_path: string | null;
  email: string | null;
  phone: string | null;
};

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [supabase, control] = await Promise.all([createClient(), getSiteControl()]);
  const fullTestAccess = control.enabled('testing.full_access');
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('members')
    .select('status')
    .eq('id', user.id)
    .single();

  if (!fullTestAccess && (!me || me.status !== 'active')) {
    redirect('/area-socios?mensaje=El%20directorio%20solo%20está%20disponible%20para%20socios%20activos.');
  }

  const { data, error } = await supabase.rpc('member_directory');
  if (error) {
    return <main className="wrap member-area"><p><Link href="/area-socios">← Área de socios</Link></p><section className="status-card"><h1>Directorio de socios</h1><p>No ha sido posible cargar el directorio.</p></section></main>;
  }

  const { q = '' } = await searchParams;
  const query = q.trim().toLocaleLowerCase('es');
  const members = ((data ?? []) as DirectoryMember[]).filter((member) => {
    if (!query) return true;
    return [member.display_name, member.city, member.region, member.country, member.member_number?.toString()]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase('es').includes(query));
  });

  return <main className="wrap member-area directory-page">
    <header className="page-heading">
      <div>
        <div className="muted">AAE-AAR · Área privada</div>
        <h1>Directorio de socios</h1>
        <p className="directory-intro">Solo aparecen socios activos que han elegido participar en el directorio. Email y teléfono se muestran únicamente cuando cada socio los ha autorizado.</p>
      </div>
      <Link className="button-link secondary" href="/area-socios">Área de socios</Link>
    </header>
    {fullTestAccess && <p className="notice">Modo de prueba total activo: no se bloquea el acceso por estado del socio.</p>}

    <form className="directory-search" action="/area-socios/directorio" method="get">
      <label htmlFor="q">Buscar por nombre, localidad, región, país o número de socio</label>
      <div className="search-row"><input id="q" name="q" defaultValue={q} placeholder="Ej. Ripoll, María, 125…"/><button type="submit">Buscar</button>{q && <Link className="button-link secondary" href="/area-socios/directorio">Limpiar</Link>}</div>
    </form>

    <div className="directory-count">{members.length} {members.length === 1 ? 'socio' : 'socios'}{query ? ' encontrados' : ' en el directorio'}</div>

    {members.length === 0 ? <section className="empty-state">No hay resultados para esa búsqueda.</section> : <section className="member-directory-grid">
      {members.map((member) => {
        const initials = member.display_name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
        const place = [member.city, member.region, member.country].filter(Boolean).join(' · ');
        return <article className="member-directory-card" key={member.id}>
          <div className="member-avatar" aria-hidden="true">{initials || 'AA'}</div>
          <div className="member-directory-body">
            <div className="catalog-card-meta">{member.member_number ? `Socio nº ${member.member_number}` : 'Socio AAE-AAR'}</div>
            <h2>{member.display_name}</h2>
            {place && <p className="member-place">{place}</p>}
            {member.bio && <p className="member-bio">{member.bio}</p>}
            {(member.email || member.phone) && <div className="member-contact">
              {member.email && <a href={`mailto:${member.email}`}>{member.email}</a>}
              {member.phone && <a href={`tel:${member.phone}`}>{member.phone}</a>}
            </div>}
            {member.id !== user.id && <p className="member-message-action"><Link className="button-link secondary" href={`/area-socios/mensajes/nuevo?destinatario=${member.id}`}>Enviar mensaje</Link></p>}
          </div>
        </article>;
      })}
    </section>}
  </main>;
}
