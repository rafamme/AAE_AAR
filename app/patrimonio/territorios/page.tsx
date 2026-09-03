import Link from 'next/link';
import { getPublishedLocations } from '../../../lib/catalog';

export default async function TerritoriesPage(){
  const locations=await getPublishedLocations();
  const grouped=new Map<string,Set<string>>();
  for(const item of locations){
    if(!grouped.has(item.country)) grouped.set(item.country,new Set());
    if(item.region) grouped.get(item.country)?.add(item.region);
  }
  const countries=[...grouped.entries()].sort(([a],[b])=>a.localeCompare(b,'es'));
  return <main className="wrap catalog-page">
    <nav className="catalog-nav"><Link href="/">Mapa</Link><Link href="/patrimonio">Patrimonio</Link><Link href="/patrimonio/territorios">Territorios</Link><Link href="/patrimonio/rutas">Rutas</Link></nav>
    <header className="catalog-hero"><div className="eyebrow">Navegación territorial</div><h1>Románico por países y regiones</h1><p>Entra por territorio y avanza desde el país hasta la región, la localidad y cada monumento.</p></header>
    <section className="catalog-grid">{countries.map(([country,regions])=><Link className="catalog-card" key={country} href={`/patrimonio/territorios/${encodeURIComponent(country)}`}><div className="catalog-card-meta">País</div><h3>{country}</h3><p>{regions.size} región(es) · {locations.filter(x=>x.country===country).length} localidades</p><div className="catalog-card-footer">Explorar territorio →</div></Link>)}</section>
  </main>;
}
