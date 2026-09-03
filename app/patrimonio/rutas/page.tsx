import Link from 'next/link';
import { getPublishedRoutes } from '../../../lib/catalog';

export default async function RoutesPage(){
  const routes=await getPublishedRoutes();
  return <main className="wrap catalog-page">
    <nav className="catalog-nav"><Link href="/">Mapa</Link><Link href="/patrimonio">Patrimonio</Link><Link href="/patrimonio/territorios">Territorios</Link><Link href="/patrimonio/rutas">Rutas</Link></nav>
    <header className="catalog-hero"><div className="eyebrow">Itinerarios culturales</div><h1>Rutas del románico</h1><p>Recorridos editoriales que agrupan localidades y monumentos para preparar visitas y descubrir relaciones territoriales.</p></header>
    {routes.length?<section className="catalog-grid">{routes.map(route=><Link className="catalog-card" key={route.id} href={`/patrimonio/rutas/${route.slug}`}><div className="catalog-card-meta">{[route.region,route.country].filter(Boolean).join(' · ')||'Ruta románica'}</div><h3>{route.title}</h3><p>{route.summary??route.description??'Itinerario patrimonial.'}</p><div className="catalog-card-footer">{[route.distance_km!=null?`${route.distance_km} km`:null,route.duration_text].filter(Boolean).join(' · ')}{(route.distance_km!=null||route.duration_text)?' · ':''}Ver ruta →</div></Link>)}</section>:<div className="empty-state">Todavía no hay rutas publicadas.</div>}
  </main>;
}
