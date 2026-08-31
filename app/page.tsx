import Link from 'next/link';
import MapLoader from '../components/MapLoader';
import { getPublishedLocations } from '../lib/catalog';
import { getSiteControl } from '../lib/site-control';

export default async function Home(){
  const control = await getSiteControl();
  const maintenance = control.enabled('system.maintenance');
  const catalogEnabled = control.enabled('public.catalog') && !maintenance;
  const registrationEnabled = control.enabled('auth.registration') && !maintenance;
  const locations = catalogEnabled ? await getPublishedLocations() : [];

  return <main className="wrap">
    <div className="top-actions">
      {catalogEnabled && <Link className="button-link secondary" href="/patrimonio">Explorar patrimonio</Link>}
      {registrationEnabled && <Link className="button-link secondary" href="/registro">Solicitar alta</Link>}
      <Link className="button-link" href="/login">Área de socios</Link>
    </div>

    <section className="hero">
      <div className="muted">{control.setting('site.name','AAE-AAR')}</div>
      <h1>{maintenance ? 'Portal en mantenimiento' : 'El románico, sobre el mapa'}</h1>
      <p>{maintenance ? control.setting('maintenance.message','Estamos realizando tareas de mantenimiento.') : 'Explora localidades y monumentos románicos publicados por la asociación. Selecciona un marcador o abre una ficha para consultar el catálogo patrimonial.'}</p>
      {!maintenance && control.setting('site.notice') && <p className="notice">{control.setting('site.notice')}</p>}
    </section>

    {catalogEnabled ? <>
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
    </> : !maintenance && <section className="empty-state">El catálogo patrimonial está temporalmente desactivado.</section>}
  </main>;
}
