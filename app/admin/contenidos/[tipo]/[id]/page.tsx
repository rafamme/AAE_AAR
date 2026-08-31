import { notFound } from 'next/navigation';
import { createClient } from '../../../../../lib/supabase/server';
import ContentForm from '../../ContentForm';

const labels:Record<string,string>={locations:'Localidad',monuments:'Monumento',posts:'Noticia',events:'Evento',media:'Medio'};
const allowed=new Set(Object.keys(labels));

export default async function ContentEditor({params,searchParams}:{params:Promise<{tipo:string;id:string}>;searchParams:Promise<{mensaje?:string}>}){
  const {tipo,id}=await params;if(!allowed.has(tipo)) notFound();
  const {mensaje}=await searchParams;const supabase=await createClient();
  const [{data:locations},{data:monuments}]=await Promise.all([
    supabase.from('locations').select('id,name').order('name'),
    supabase.from('monuments').select('id,name').order('name'),
  ]);
  let item:Record<string,unknown>|undefined;
  if(id!=='nuevo'){
    const {data,error}=await supabase.from(tipo).select('*').eq('id',id).single();
    if(error||!data) notFound(); item=data as Record<string,unknown>;
  }
  return <>
    <header className="page-heading"><div><div className="muted">AAE-AAR · CMS</div><h1>{id==='nuevo'?`Nuevo · ${labels[tipo]}`:`Editar · ${labels[tipo]}`}</h1></div></header>
    <ContentForm type={tipo} item={item} locations={(locations??[]) as {id:string;name:string}[]} monuments={(monuments??[]) as {id:string;name:string}[]} message={mensaje}/>
  </>;
}
