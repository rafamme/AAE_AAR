import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { addSavedPlaceToRoute, createPersonalRoute } from '../../patrimonio/actions';

type SavedPlace={id:string;location_id:string|null;monument_id:string|null;is_favorite:boolean;wants_to_visit:boolean;locations:{name:string;country:string;region:string|null}|null;monuments:{name:string;location_id:string}|null};
type Route={id:string;title:string;notes:string|null;created_at:string};

type Stop={id:string;route_id:string;location_id:string|null;monument_id:string|null;sort_order:number;note:string|null;locations:{name:string}|null;monuments:{name:string}|null};

export default async function VisitPlanningPage({searchParams}:{searchParams:Promise<{mensaje?:string}>}){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/login');
  const {data:member}=await supabase.from('members').select('status').eq('id',user.id).single();
  if(member?.status!=='active')redirect('/area-socios?mensaje=La%20planificación%20de%20visitas%20requiere%20una%20cuenta%20activa.');
  const [{data:saved},{data:routes},{data:stops},{mensaje}]=await Promise.all([
    supabase.from('member_saved_places').select('id,location_id,monument_id,is_favorite,wants_to_visit,locations(name,country,region),monuments(name,location_id)').eq('member_id',user.id).order('created_at',{ascending:false}),
    supabase.from('member_visit_routes').select('id,title,notes,created_at').eq('member_id',user.id).order('created_at',{ascending:false}),
    supabase.from('member_visit_route_stops').select('id,route_id,location_id,monument_id,sort_order,note,locations(name),monuments(name)').order('sort_order'),
    searchParams,
  ]);
  const savedPlaces=(saved??[]) as unknown as SavedPlace[];const personalRoutes=(routes??[]) as Route[];const routeStops=(stops??[]) as unknown as Stop[];
  const favorites=savedPlaces.filter(x=>x.is_favorite);const wishList=savedPlaces.filter(x=>x.wants_to_visit);
  const nameOf=(item:SavedPlace)=>item.monuments?.name??item.locations?.name??'Elemento patrimonial';
  const hrefOf=(item:SavedPlace)=>item.monument_id?`/patrimonio/monumentos/${item.monument_id}`:`/patrimonio/localidades/${item.location_id}`;
  return <main className="wrap contribution-page">
    <nav className="catalog-nav"><Link href="/area-socios">Mi cuenta</Link><Link href="/patrimonio">Patrimonio</Link><Link href="/">Mapa</Link></nav>
    <header className="page-heading"><div><div className="muted">AAE-AAR · Mi cuenta</div><h1>Mi planificación</h1><p>Guarda lugares y monumentos, marca lo que quieres visitar y organiza itinerarios personales.</p></div></header>
    {mensaje&&<p className="notice">{mensaje}</p>}
    <section className="catalog-stat-strip"><span><strong>{favorites.length}</strong> favoritos</span><span><strong>{wishList.length}</strong> por visitar</span><span><strong>{personalRoutes.length}</strong> rutas personales</span></section>

    <section className="catalog-section"><div className="section-heading"><div><div className="eyebrow">Guardados</div><h2>Quiero visitar</h2></div></div>
      {wishList.length===0?<div className="empty-state">Todavía no has marcado ningún lugar o monumento para visitar.</div>:<div className="stack-list">{wishList.map(item=><div className="stack-card planning-card" key={item.id}><div><div className="catalog-card-meta">{item.is_favorite?'★ Favorito · ':''}{item.location_id?'Localidad':'Monumento'}</div><h3><Link href={hrefOf(item)}>{nameOf(item)}</Link></h3>{item.locations&&<p>{[item.locations.region,item.locations.country].filter(Boolean).join(' · ')}</p>}</div>{personalRoutes.length>0&&<form action={addSavedPlaceToRoute} className="route-add-form">{item.location_id&&<input type="hidden" name="location_id" value={item.location_id}/>} {item.monument_id&&<input type="hidden" name="monument_id" value={item.monument_id}/>}<select name="route_id" required defaultValue=""><option value="" disabled>Añadir a ruta…</option>{personalRoutes.map(route=><option key={route.id} value={route.id}>{route.title}</option>)}</select><button type="submit">Añadir</button></form>}</div>)}</div>}
    </section>

    <section className="catalog-section"><div className="section-heading"><div><div className="eyebrow">Colección</div><h2>Favoritos</h2></div></div>
      {favorites.length===0?<div className="empty-state">No tienes favoritos todavía.</div>:<div className="catalog-grid">{favorites.map(item=><Link className="catalog-card" href={hrefOf(item)} key={item.id}><div className="catalog-card-meta">{item.location_id?'Localidad':'Monumento'}</div><h3>{nameOf(item)}</h3><div className="catalog-card-footer">Abrir ficha →</div></Link>)}</div>}
    </section>

    <section className="catalog-section"><div className="section-heading"><div><div className="eyebrow">Itinerarios personales</div><h2>Mis rutas</h2></div></div>
      <form action={createPersonalRoute} className="contribution-form planning-route-form"><div className="form-row"><label>Nombre de la ruta<input name="title" required placeholder="Ej. Fin de semana románico"/></label><label>Notas<input name="notes" placeholder="Objetivo, fechas, acompañantes…"/></label></div><div><button type="submit">Crear ruta personal</button></div></form>
      {personalRoutes.length===0?<div className="empty-state">Crea tu primera ruta para agrupar los lugares que quieres visitar.</div>:<div className="route-personal-list">{personalRoutes.map(route=>{const ownStops=routeStops.filter(stop=>stop.route_id===route.id);return <article className="detail-copy" key={route.id}><div className="eyebrow">{ownStops.length} paradas</div><h2>{route.title}</h2>{route.notes&&<p>{route.notes}</p>}{ownStops.length>0&&<ol className="personal-stop-list">{ownStops.map(stop=><li key={stop.id}>{stop.monuments?.name??stop.locations?.name??'Parada'}</li>)}</ol>}</article>})}</div>}
    </section>
  </main>;
}
