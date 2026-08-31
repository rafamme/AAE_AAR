import Link from 'next/link';
import { createClient } from '../../lib/supabase/server';

function fmt(value:string){return new Intl.DateTimeFormat('es-ES',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Madrid'}).format(new Date(value))}

export default async function EventsPage(){
  const supabase=await createClient();
  const {data:events}=await supabase.from('events').select('id,title,description,starts_at,ends_at,capacity,registered_count,location_id,locations(name,region,country)').eq('status','published').order('starts_at');
  return <main className="wrap catalog-page"><nav className="catalog-nav"><Link href="/">Inicio</Link><Link href="/patrimonio">Patrimonio</Link><Link href="/login">Área de socios</Link></nav><section className="catalog-hero"><div className="eyebrow">AAE-AAR · Agenda</div><h1>Actividades y visitas</h1><p>Consulta las próximas actividades públicas de la asociación y accede a la inscripción si eres socio activo.</p></section><section className="event-list">{events?.length?events.map((e:any)=>{const remaining=e.capacity==null?null:Math.max(e.capacity-e.registered_count,0);return <Link className="event-card" href={`/eventos/${e.id}`} key={e.id}><div><div className="catalog-card-meta">{fmt(e.starts_at)}</div><h2>{e.title}</h2><p>{e.description}</p><div className="muted">{e.locations?.name ?? 'Lugar por confirmar'}{e.locations?.region?` · ${e.locations.region}`:''}</div></div><div className="event-capacity">{remaining==null?'Sin límite de plazas':remaining>0?`${remaining} plazas disponibles`:'Aforo completo'}</div></Link>}):<div className="empty-state">No hay actividades publicadas.</div>}</section></main>;
}
