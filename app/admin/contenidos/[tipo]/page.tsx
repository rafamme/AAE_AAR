import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';

const labels:Record<string,string>={locations:'Localidades',monuments:'Monumentos',posts:'Noticias',events:'Eventos',media:'Medios'};
const allowed=new Set(Object.keys(labels));

export default async function ContentList({params,searchParams}:{params:Promise<{tipo:string}>;searchParams:Promise<{mensaje?:string}>}){
  const {tipo}=await params;if(!allowed.has(tipo)) notFound();
  const {mensaje}=await searchParams;const supabase=await createClient();
  const {data,error}=await supabase.from(tipo).select('*').order('created_at',{ascending:false}).limit(100);
  return <>
    <header className="page-heading"><div><div className="muted">AAE-AAR · CMS</div><h1>{labels[tipo]}</h1></div><Link className="button-link" href={`/admin/contenidos/${tipo}/nuevo`}>Nuevo</Link></header>
    {mensaje&&<p className="notice">{mensaje}</p>}{error&&<p className="notice">{error.message}</p>}
    <section className="stack-list">{(data??[]).map((item:any)=>{const title=item.name??item.title??item.external_url??item.storage_path??'Sin título';return <Link className="stack-card" href={`/admin/contenidos/${tipo}/${item.id}`} key={item.id}><div><div className="catalog-card-meta">{item.status}</div><h3>{title}</h3><p>{item.region??item.excerpt??item.media_type??(item.starts_at?new Date(item.starts_at).toLocaleString('es-ES'):'')}</p></div><span>→</span></Link>})}</section>
    {(data??[]).length===0&&<p className="empty-state">Todavía no hay registros.</p>}
    <p><Link href="/admin/contenidos">← Volver a contenidos</Link></p>
  </>;
}
