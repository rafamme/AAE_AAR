import Link from 'next/link';
import { notFound } from 'next/navigation';
import MediaGallery from '../../../../components/MediaGallery';
import { getPublishedLocation,getPublishedMediaForMonument,getPublishedMonument,publicMediaUrl } from '../../../../lib/catalog';

type Props={params:Promise<{id:string}>};
export default async function MonumentDetailPage({params}:Props){
  const {id}=await params;const monument=await getPublishedMonument(id);if(!monument)notFound();
  const [location,media]=await Promise.all([getPublishedLocation(monument.location_id),getPublishedMediaForMonument(monument.id)]);if(!location)notFound();
  const documents=media.filter(item=>item.media_type==='document');
  return <main className="wrap catalog-page">
    <nav className="catalog-nav"><Link href="/">Mapa</Link><Link href="/patrimonio">Patrimonio</Link><Link href={`/patrimonio/localidades/${location.id}`}>{location.name}</Link><Link href="/patrimonio/rutas">Rutas</Link><Link href="/login">Área de socios</Link></nav>
    <header className="detail-hero"><div className="eyebrow">{[monument.architectural_type,monument.century,location.name].filter(Boolean).join(' · ')}</div><h1>{monument.name}</h1><p>{monument.description??'Monumento incluido en el catálogo patrimonial.'}</p></header>
    <MediaGallery media={media} subject={monument.name}/>
    <section className="detail-layout"><article className="detail-copy"><div className="eyebrow">Descripción</div><h2>Sobre el monumento</h2><p>{monument.description??'La ficha descriptiva se completará próximamente.'}</p>
      {documents.length>0&&<div className="resource-list"><h3>Documentos</h3>{documents.map(item=>{const href=publicMediaUrl(item.storage_path)??item.external_url;if(!href)return null;return <a href={href} key={item.id} target="_blank" rel="noreferrer">{item.title??'Documento'} →</a>})}</div>}
    </article><aside className="facts-card"><div className="eyebrow">Ficha</div><dl><div><dt>Localidad</dt><dd><Link href={`/patrimonio/localidades/${location.id}`}>{location.name}</Link></dd></div>{monument.century&&<div><dt>Siglo</dt><dd>{monument.century}</dd></div>}{monument.style&&<div><dt>Estilo</dt><dd>{monument.style}</dd></div>}{monument.architectural_type&&<div><dt>Tipo</dt><dd>{monument.architectural_type}</dd></div>}{monument.heritage_reference&&<div><dt>Referencia</dt><dd>{monument.heritage_reference}</dd></div>}</dl>{monument.website_url&&<a className="button-link secondary full-width" href={monument.website_url} target="_blank" rel="noreferrer">Sitio oficial</a>}</aside></section>
  </main>;
}
