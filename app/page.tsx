import MapLoader from '../components/MapLoader';

type Location={id:string;name:string;country:string;region:string|null;description:string|null;latitude:number;longitude:number};

const SUPABASE_URL='https://whyegusyggdjbiyvjwhg.supabase.co';
const SUPABASE_KEY='sb_publishable_Rfw8iZiM4BGBBeMUO4eIZg_wQmKiIqm';

async function getLocations():Promise<Location[]>{
  const res=await fetch(`${SUPABASE_URL}/rest/v1/locations?select=id,name,country,region,description,latitude,longitude&status=eq.published&order=name`,{
    headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`},
    next:{revalidate:60}
  });
  if(!res.ok) return [];
  return res.json();
}

export default async function Home(){
  const locations=await getLocations();
  return <main className="wrap">
    <section className="hero"><div className="muted">AAE-AAR</div><h1>El románico, sobre el mapa</h1><p>Demo inicial del catálogo europeo de la asociación. Selecciona un marcador para conocer cada localidad incorporada a Supabase.</p></section>
    <MapLoader locations={locations}/>
    <section className="cards">{locations.map(l=><article className="card" key={l.id}><h2>{l.name}</h2><div className="muted">{l.region ?? ''} · {l.country}</div><p>{l.description}</p></article>)}</section>
  </main>;
}
