import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { cancelEventRegistration, registerForEvent } from '../actions';

function fmt(value:string){return new Intl.DateTimeFormat('es-ES',{dateStyle:'full',timeStyle:'short',timeZone:'Europe/Madrid'}).format(new Date(value))}
const statusLabel:Record<string,string>={registered:'Inscrito',cancelled:'Cancelado',attended:'Asistió',no_show:'No asistió'};

export default async function EventDetailPage({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<{mensaje?:string}>}){
  const {id}=await params; const {mensaje}=await searchParams; const supabase=await createClient();
  const {data:event}=await supabase.from('events').select('id,title,description,starts_at,ends_at,capacity,registered_count,locations(name,region,country)').eq('id',id).eq('status','published').single();
  if(!event) notFound();
  const {data:{user}}=await supabase.auth.getUser();
  let active=false, registrationStatus:string|null=null;
  if(user){
    const [{data:member},{data:registration}]=await Promise.all([
      supabase.from('members').select('status').eq('id',user.id).single(),
      supabase.from('event_members').select('status').eq('event_id',id).eq('member_id',user.id).maybeSingle()
    ]);
    active=member?.status==='active'; registrationStatus=registration?.status??null;
  }
  const remaining=event.capacity==null?null:Math.max(event.capacity-event.registered_count,0);
  const open=new Date(event.starts_at)>new Date() && (remaining==null || remaining>0);
  const registered=registrationStatus==='registered';
  return <main className="wrap catalog-page"><nav className="catalog-nav"><Link href="/eventos">← Agenda</Link><Link href="/area-socios">Área de socios</Link></nav><section className="detail-hero"><div className="eyebrow">Actividad AAE-AAR</div><h1>{event.title}</h1><p>{event.description}</p></section>{mensaje&&<p className="notice">{mensaje}</p>}<div className="detail-layout"><section className="detail-copy"><h2>Información</h2><p><strong>Inicio:</strong> {fmt(event.starts_at)}</p>{event.ends_at&&<p><strong>Fin:</strong> {fmt(event.ends_at)}</p>}<p><strong>Lugar:</strong> {(event.locations as any)?.name ?? 'Por confirmar'}{(event.locations as any)?.region?` · ${(event.locations as any).region}`:''}</p></section><aside className="facts-card"><h2>Inscripción</h2><p>{remaining==null?'Sin límite de plazas':remaining>0?`${remaining} plazas disponibles`:'Aforo completo'}</p>{registered?<form action={cancelEventRegistration}><input type="hidden" name="event_id" value={id}/><button className="secondary full-width">Cancelar inscripción</button></form>:registrationStatus?<p className="notice">Estado de tu participación: <strong>{statusLabel[registrationStatus]??registrationStatus}</strong>.</p>:!user?<Link className="button-link full-width" href={`/login?mensaje=${encodeURIComponent('Inicia sesión para inscribirte.')}`}>Iniciar sesión</Link>:!active?<p className="notice">La inscripción está disponible para socios activos.</p>:open?<form action={registerForEvent}><input type="hidden" name="event_id" value={id}/><button className="full-width">Inscribirme</button></form>:<p className="notice">Inscripción cerrada.</p>}</aside></div></main>;
}
