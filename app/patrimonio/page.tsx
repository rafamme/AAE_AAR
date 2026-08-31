import Link from 'next/link';
import { getPublishedLocations, getPublishedMonuments } from '../../lib/catalog';

export default async function HeritagePage() {
  const [locations, monuments] = await Promise.all([
    getPublishedLocations(),
    getPublishedMonuments(),
  ]);

  const monumentsByLocation = new Map<string, number>();
  monuments.forEach((monument) => {
    monumentsByLocation.set(
      monument.location_id,
      (monumentsByLocation.get(monument.location_id) ?? 0) + 1,
    );
  });

  return (
    <main className="wrap catalog-page">
      <nav className="catalog-nav">
        <Link href="/">Mapa</Link>
        <Link href="/patrimonio">Patrimonio</Link>
        <Link href="/login">Área de socios</Link>
      </nav>

      <header className="catalog-hero">
        <div className="eyebrow">Patrimonio románico</div>
        <h1>Localidades y monumentos</h1>
        <p>
          Consulta el catálogo público de la asociación. Solo aparecen contenidos
          revisados y publicados.
        </p>
      </header>

      <section className="catalog-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Localidades</div>
            <h2>{locations.length} destinos publicados</h2>
          </div>
        </div>

        <div className="catalog-grid">
          {locations.map((location) => (
            <Link
              className="catalog-card"
              href={`/patrimonio/localidades/${location.id}`}
              key={location.id}
            >
              <div className="catalog-card-meta">
                {location.region ? `${location.region} · ` : ''}
                {location.country}
              </div>
              <h3>{location.name}</h3>
              <p>{location.description ?? 'Ficha patrimonial de la localidad.'}</p>
              <div className="catalog-card-footer">
                {monumentsByLocation.get(location.id) ?? 0} monumento(s)
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="catalog-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Monumentos</div>
            <h2>{monuments.length} fichas publicadas</h2>
          </div>
        </div>

        <div className="catalog-grid">
          {monuments.map((monument) => (
            <Link
              className="catalog-card"
              href={`/patrimonio/monumentos/${monument.id}`}
              key={monument.id}
            >
              <div className="catalog-card-meta">
                {[monument.architectural_type, monument.century]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
              <h3>{monument.name}</h3>
              <p>{monument.description ?? 'Ficha patrimonial del monumento.'}</p>
              <div className="catalog-card-footer">Ver ficha completa →</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
