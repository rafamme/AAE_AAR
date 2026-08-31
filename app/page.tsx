import Link from 'next/link';
import MapLoader from '../components/MapLoader';
import { getPublishedLocations } from '../lib/catalog';

export default async function Home(){
  const locations = await getPublishedLocations();

  return <main className="wrap">
    <div className="top-actions">
      <Link className="button-link secondary" href="/patrimonio">Explorar patrimonio</Link>
      <Link className="button-link secondary" href="/registro">Solicitar alta</Link>
      <Link className="button-link" href="/login">Área de socios</Link>
    </div>

    <section className="hero">
      <div className="muted">AAE-AAR</div>
      <h1>El románico, sobre el mapa</h1>
      <p>Explora localidades y monumentos románicos publicados por la asociación. Selecciona un marcador o abre una ficha para consultar el catálogo patrimonial.</p>
    </section>

    <MapLoader locations={locations}/>

    <section className="cards">
      {locations.map(location =>
        <Link className="card home-location-card" href={`/patrimonio/localidades/${location.id}`} key={location.id}>
          <h2>{location.name}</h2>
          <div className="muted">{location.region ?? ''}{location.region ? ' · ' : ''}{location.country}</div>
          <p>{location.description}</p>
          <strong>Ver localidad →</strong>
        </Link>
      )}
    </section>
  </main>;
}
