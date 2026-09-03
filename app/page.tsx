import Link from 'next/link';
import MapLoader from '../components/MapLoader';
import { getPublishedLocations, getPublishedMedia, getPublishedMonuments, getPublishedRoutes, getPublishedRouteStopsForRoutes, publicMediaUrl } from '../lib/catalog';
import { getSiteControl } from '../lib/site-control';
import { createClient } from '../lib/supabase/server';

export default async function Home(){
  const control=await getSiteControl();
  const maintenance=control.enabled('system.maintenance');
  const catalogEnabled=control.enabled('public.catalog')&&!maintenance;
  const registrationEnabled=control.enabled('auth.registration')&&!maintenance;
  const freeMemberArea=control.enabled('testing.member_area_open')&&!maintenance;

  let locations=await (catalogEnabled?getPublishedLocations():Promise.resolve([]));
  let mapLocations:any[]=[];
  let mapRoutes:any[]=[];
  if(catalogEnabled){
    const [monuments,media,routes]=await Promise.all([getPublishedMonuments(),getPublishedMedia(),getPublishedRoutes()]);
    const stops=await getPublishedRouteStopsForRoutes(routes.map(r=>r.id));
    const monumentById=new Map(monuments.map(m=>[m.id,m]));
    const locationById=new Map(locations.map(l=>[l.id,l]));
    const countByLocation=new Map<string,number>();
    monuments.forEach(m=>countByLocation.set(m.location_id,(countByLocation.get(m.location_id)??0)+1));
    const imageByLocation=new Map<string,string>();
    media.filter(m=>m.media_type==='image').forEach(m=>{
      const locationId=m.location_id??(m.monument_id?monumentById.get(m.monument_id)?.location_id:null);
      const url=publicMediaUrl(m.storage_path)??m.external_url;
      if(locationId&&url&&(!imageByLocation.has(locationId)||m.is_featured)) imageByLocation.set(locationId,url);
    });
    mapLocations=locations.map(l=>({...l,monumentCount:countByLocation.get(l.id)??0,imageUrl:imageByLocation.get(l.id)??null}));
    mapRoutes=routes.map(route=>({
      id:route.id,title:route.title,slug:route.slug,
      points:stops.filter(s=>s.route_id===route.id).sort((a,b)=>a.sort_order-b.sort_order).map(s=>{
        const locationId=s.location_id??(s.monument_id?monumentById.get(s.monument_id)?.location_id:null);
        const loc=locationId?locationById.get(locationId):null;
        return loc?[loc.latitude,loc.longitude] as [number,number]:null;
      }).filter(Boolean),
    }));
  }

  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  let isSuperadmin=false;
  if(user){const {data:roles}=await supabase.from('member_roles').select('role').eq('member_id',user.id);isSuperadmin=(roles??[]).some(item=>item.role==='superadmin');}

  return <main className="wrap">
    <div className="top-actions">
      {catalogEnabled&&<Link className="button-link secondary" href="/patrimonio">Explorar patrimonio</Link>}
      {registrationEnabled&&<Link className="button-link secondary" href="/registro">Solicitar alta</Link>}
      <Link className="button-link" href={user||freeMemberArea?'/area-socios':'/login'}>{user?'Mi cuenta':freeMemberArea?'Área de socios · pruebas':'Área de socios'}</Link>
      {isSuperadmin&&<Link className="button-link" href="/admin/sistema">⚙ Ajustes y configuración</Link>}
    </div>
    {freeMemberArea&&!user&&<p className="notice">Acceso temporal de pruebas al área de socios activado. Los datos privados siguen protegidos.</p>}
    <section className="hero">
      <div className="muted">{control.setting('site.name','AAE-AAR')}</div>
      <h1>{maintenance?'Portal en mantenimiento':'El románico, sobre el mapa'}</h1>
      <p>{maintenance?control.setting('maintenance.message','Estamos realizando tareas de mantenimiento.'):'Explora localidades y monumentos románicos publicados por la asociación. Filtra el territorio, selecciona una ruta o abre una ficha para consultar el catálogo patrimonial.'}</p>
      {!maintenance&&control.setting('site.notice')&&<p className="notice">{control.setting('site.notice')}</p>}
    </section>
    {catalogEnabled?<>
      <MapLoader locations={mapLocations} routes={mapRoutes}/>
      <section className="cards">{locations.map(location=><Link className="card home-location-card" href={`/patrimonio/localidades/${location.id}`} key={location.id}><h2>{location.name}</h2><div className="muted">{location.region??''}{location.region?' · ':''}{location.country}</div><p>{location.description}</p><strong>Ver localidad →</strong></Link>)}</section>
    </>:!maintenance&&<section className="empty-state">El catálogo patrimonial está temporalmente desactivado.</section>}
  </main>;
}
