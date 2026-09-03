import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedLocation, getPublishedMonument, getPublishedRoute, getPublishedRouteStops } from '../../../../lib/catalog';

export default async function RouteDetailPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params; const route=await getPublishedRoute(slug); if(!route) notFound();
  const stops=await getPublishedRouteStops(route.id);
  const resolved=await Promise.all(stops.map(async stop=>{
    if(stop.monument_id){const monument=await getPublishedMonument(stop.monument_id); if(!monument)return null; const location=await getPublishedLocation(monument.location_id); return {stop,kind:'monument' as const,title:monument.name,subtitle:location?.name??'',href:`/patrimonio/monumentos/${monument.id}`,description:monument.description};}
    if(stop.location_id){const location=await getPublishedLocation(stop.location_id); if(!location)return null; return {stop,kind:'location' as const,title:location.name,subtitle:[location.region,location.country].filter(Boolean).join(' · '),href:`/patrimonio/localidades/${location.id}`,description:location.description};}
    return null;
  }));
  const items=resolved.filter(Boolean) as NonNullable<(typeof resolved)[number]>[];
  return <main className="wrap catalog-page">
    <nav className="catalog-nav"><Link href="/patrimonio">Patrimonio</Link><Link href="/patrimonio/rutas">Rutas</Link><span>{route.title}</span></nav>
    <header className="detail-hero"><div className="eyebrow">{[route.region,route.country].filter(Boolean).join(' · ')||'Ruta románica'}</div><h1>{route.title}</h1><p>{route.description??route.summary??'Itinerario patrimonial de AAE-AAR.'}</p><div className="catalog-stat-strip">{route.distance_km!=null&&<span><strong>{route.distance_km}</strong> km</span>}{route.duration_text&&<span><strong>{route.duration_text}</strong></span>}<span><strong>{items.length}</strong> paradas</span></div></header>
    <section className="catalog-section"><div className="section-heading"><div><div className="eyebrow">Itinerario</div><h2>Paradas de la ruta</h2></div></div>{items.length?<div className="stack-list">{items.map((item,index)=><Link className="stack-card" key={item.stop.id} href={item.href}><div><div className="catalog-card-meta">Parada {index+1} · {item.kind==='monument'?'Monumento':'Localidad'}{item.subtitle?` · ${item.subtitle}`:''}</div><h3>{item.title}</h3><p>{item.stop.note??item.description??'Consulta la ficha patrimonial.'}</p></div><span>→</span></Link>)}</div>:<div className="empty-state">La ruta todavía no tiene paradas publicadas.</div>}</section>
  </main>;
}
