import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedLocationsForRegion } from '../../../../../lib/catalog';

export default async function RegionPage({params}:{params:Promise<{country:string;region:string}>}){
  const {country:countryRaw,region:regionRaw}=await params; const country=decodeURIComponent(countryRaw); const region=decodeURIComponent(regionRaw);
  const locations=await getPublishedLocationsForRegion(country,region); if(!locations.length) notFound();
  return <main className="wrap catalog-page">
    <nav className="catalog-nav"><Link href="/patrimonio">Patrimonio</Link><Link href="/patrimonio/territorios">Territorios</Link><Link href={`/patrimonio/territorios/${encodeURIComponent(country)}`}>{country}</Link><span>{region}</span></nav>
    <header className="catalog-hero"><div className="eyebrow">Región · {country}</div><h1>{region}</h1><p>{locations.length} localidades románicas publicadas.</p></header>
    <section className="catalog-grid">{locations.map(x=><Link className="catalog-card" key={x.id} href={`/patrimonio/localidades/${x.id}`}><div className="catalog-card-meta">{region} · {country}</div><h3>{x.name}</h3><p>{x.description??'Ficha patrimonial de la localidad.'}</p><div className="catalog-card-footer">Ver localidad →</div></Link>)}</section>
  </main>;
}
