import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';

const types=[
  ['locations','Localidades','Patrimonio geográfico y coordenadas.'],
  ['monuments','Monumentos','Fichas patrimoniales vinculadas a localidades.'],
  ['posts','Noticias','Actualidad y publicaciones editoriales.'],
  ['events','Eventos','Agenda, fechas, aforo y ubicación.'],
  ['media','Medios','Imágenes, vídeos y documentos del catálogo.'],
] as const;

export default async function ContentDashboard(){
  const supabase=await createClient();
  const counts=await Promise.all(types.map(async([table])=>{
    const [{count:all},{count:published}]=await Promise.all([
      supabase.from(table).select('*',{count:'exact',head:true}),
      supabase.from(table).select('*',{count:'exact',head:true}).eq('status','published'),
    ]);
    return {table,all:all??0,published:published??0};
  }));
  const byType=new Map(counts.map(x=>[x.table,x]));
  return <>
    <header className="page-heading"><div><div className="muted">AAE-AAR · CMS</div><h1>Contenidos</h1><p>Creación, edición y publicación del catálogo, actualidad, agenda y recursos multimedia.</p></div></header>
    <section className="dashboard-grid">{types.map(([type,label,description])=>{const c=byType.get(type);return <Link key={type} className="dashboard-card" href={`/admin/contenidos/${type}`}><h2>{label}</h2><p>{description}</p><p className="muted">{c?.all??0} registros · {c?.published??0} publicados</p></Link>})}</section>
  </>;
}
