import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedLocationsForCountry } from '../../../../lib/catalog';

export default async function CountryPage({params}:{params:Promise<{country:string}>}){
  const {country:raw}=await params; const country=decodeURIComponent(raw);
  const locations=await getPublishedLocationsForCountry(country); if(!locations.length) notFound();
  const regions=[...new Set(locations.map(x=>x.region).filter(Boolean) as string[])].sort((a,b)=>a.localeCompare(b,'es'));
  return <main className="wrap catalog-page">
    <nav className="catalog-nav"><Link href="/patrimonio">Patrimonio</Link><Link href="/patrimonio/territorios">Territorios</Link><span>{country}</span></nav>
    <header className="catalog-hero"><div className="eyebrow">País</div><h1>{country}</h1><p>{locations.length} localidades publicadas en {regions.length} regiones.</p></header>
    {regions.length>0&&<section className="catalog-section"><div className="section-heading"><div><div className="eyebrow">Regiones</div><h2>Explorar por región</h2></div></div><div className="catalog-grid">{regions.map(region=><Link className="catalog-card" key={region} href={`/patrimonio/territorios/${encodeURIComponent(country)}/${encodeURIComponent(region)}`}><div className="catalog-card-meta">{country}</div><h3>{region}</h3><p>{locations.filter(x=>x.region===region).length} localidades</p><div className="catalog-card-footer">Abrir región →</div></Link>)}</div></section>}
    <section className="catalog-section"><div className="section-heading"><div><div className="eyebrow">Localidades</div><h2>Todas las localidades</h2></div></div><div className="catalog-grid">{locations.map(x=><Link className="catalog-card" key={x.id} href={`/patrimonio/localidades/${x.id}`}><div className="catalog-card-meta">{x.region??country}</div><h3>{x.name}</h3><p>{x.description??'Ficha patrimonial.'}</p><div className="catalog-card-footer">Ver localidad →</div></Link>)}</div></section>
  </main>;
}
