import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPublishedLocation,
  getPublishedMediaForLocation,
  getPublishedMonumentsForLocation,
  publicMediaUrl,
} from '../../../../lib/catalog';

type Props = { params: Promise<{ id: string }> };

export default async function LocationDetailPage({ params }: Props) {
  const { id } = await params;
  const location = await getPublishedLocation(id);
  if (!location) notFound();

  const [monuments, media] = await Promise.all([
    getPublishedMonumentsForLocation(location.id),
    getPublishedMediaForLocation(location.id),
  ]);

  const images = media.filter((item) => item.media_type === 'image');

  return (
    <main className="wrap catalog-page">
      <nav className="catalog-nav">
        <Link href="/">Mapa</Link>
        <Link href="/patrimonio">Patrimonio</Link>
        <Link href="/login">Área de socios</Link>
      </nav>

      <header className="detail-hero">
        <div className="eyebrow">
          {location.region ? `${location.region} · ` : ''}{location.country}
        </div>
        <h1>{location.name}</h1>
        <p>{location.description ?? 'Localidad incluida en el catálogo patrimonial.'}</p>
      </header>

      {images.length > 0 && (
        <section className="media-grid" aria-label="Galería de imágenes">
          {images.map((item) => {
            const src = publicMediaUrl(item.storage_path) ?? item.external_url;
            if (!src) return null;
            return (
              <figure className="media-card" key={item.id}>
                <img src={src} alt={item.title ?? location.name} />
                {(item.title || item.description) && (
                  <figcaption>
                    {item.title && <strong>{item.title}</strong>}
                    {item.description && <span>{item.description}</span>}
                  </figcaption>
                )}
              </figure>
            );
          })}
        </section>
      )}

      <section className="detail-layout">
        <div>
          <div className="section-heading">
            <div>
              <div className="eyebrow">Patrimonio</div>
              <h2>Monumentos publicados</h2>
            </div>
          </div>

          {monuments.length === 0 ? (
            <div className="empty-state">Todavía no hay monumentos publicados para esta localidad.</div>
          ) : (
            <div className="stack-list">
              {monuments.map((monument) => (
                <Link
                  className="stack-card"
                  href={`/patrimonio/monumentos/${monument.id}`}
                  key={monument.id}
                >
                  <div>
                    <div className="catalog-card-meta">
                      {[monument.architectural_type, monument.century]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                    <h3>{monument.name}</h3>
                    <p>{monument.description}</p>
                  </div>
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="facts-card">
          <div className="eyebrow">Ubicación</div>
          <dl>
            <div><dt>País</dt><dd>{location.country}</dd></div>
            {location.region && <div><dt>Región</dt><dd>{location.region}</dd></div>}
            <div><dt>Latitud</dt><dd>{location.latitude.toFixed(5)}</dd></div>
            <div><dt>Longitud</dt><dd>{location.longitude.toFixed(5)}</dd></div>
          </dl>
          <a
            className="button-link secondary full-width"
            href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=15/${location.latitude}/${location.longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            Abrir mapa
          </a>
        </aside>
      </section>
    </main>
  );
}
