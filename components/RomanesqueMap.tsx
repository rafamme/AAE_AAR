'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

type Location = {
  id:string; name:string; country:string; region:string|null; description:string|null;
  latitude:number; longitude:number; monumentCount:number; imageUrl:string|null;
};
type Route = { id:string; title:string; slug:string; points:[number,number][] };
type Cluster = { items:Location[]; latitude:number; longitude:number; monumentCount:number };

function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function markerIcon(count:number){return L.divIcon({className:'romanesque-marker-wrap',html:`<span class="romanesque-marker" title="${count} monumentos">${count||'•'}</span>`,iconSize:[38,38],iconAnchor:[19,19],popupAnchor:[0,-18]});}
function clusterIcon(locationCount:number,monumentCount:number){return L.divIcon({className:'romanesque-marker-wrap',html:`<span class="romanesque-marker" title="${locationCount} localidades · ${monumentCount} monumentos" style="width:52px;height:52px;background:#655f57;border-width:4px;font-size:16px">${locationCount}</span>`,iconSize:[52,52],iconAnchor:[26,26]});}
function MapFitter({points}:{points:[number,number][]}){const map=useMap();useEffect(()=>{if(points.length===1)map.setView(points[0],9);else if(points.length>1)map.fitBounds(L.latLngBounds(points),{padding:[36,36],maxZoom:9});else map.setView([47,8],4);},[map,points]);return null;}

function buildClusters(locations:Location[],map:L.Map,zoom:number):Cluster[]{
  if(zoom>=10)return locations.map(item=>({items:[item],latitude:item.latitude,longitude:item.longitude,monumentCount:item.monumentCount}));
  const radius=zoom<=4?90:zoom<=6?72:56;
  const clusters:Cluster[]=[];
  for(const item of locations){
    const point=map.project([item.latitude,item.longitude],zoom);
    let target:Cluster|undefined;
    let bestDistance=Infinity;
    for(const cluster of clusters){
      const clusterPoint=map.project([cluster.latitude,cluster.longitude],zoom);
      const distance=point.distanceTo(clusterPoint);
      if(distance<=radius&&distance<bestDistance){target=cluster;bestDistance=distance;}
    }
    if(!target){clusters.push({items:[item],latitude:item.latitude,longitude:item.longitude,monumentCount:item.monumentCount});continue;}
    target.items.push(item);
    const count=target.items.length;
    target.latitude=((target.latitude*(count-1))+item.latitude)/count;
    target.longitude=((target.longitude*(count-1))+item.longitude)/count;
    target.monumentCount+=item.monumentCount;
  }
  return clusters;
}

function LocationPopup({item}:{item:Location}){
  return <Popup minWidth={245}>
    {item.imageUrl&&<img className="map-popup-image" src={item.imageUrl} alt=""/>}
    <strong>{item.name}</strong><br/>
    <span>{[item.region,item.country].filter(Boolean).join(' · ')}</span><br/>
    <small>{item.monumentCount} monumento(s) publicado(s)</small><br/>
    {item.description&&<><small>{item.description}</small><br/></>}
    <a href={`/patrimonio/localidades/${item.id}`}>Abrir ficha patrimonial →</a>
  </Popup>;
}

function ClusteredMarkers({locations}:{locations:Location[]}){
  const map=useMap();
  const [zoom,setZoom]=useState(map.getZoom());
  useMapEvents({zoomend(){setZoom(map.getZoom());}});
  const clusters=useMemo(()=>buildClusters(locations,map,zoom),[locations,map,zoom]);
  return <>{clusters.map(cluster=>{
    if(cluster.items.length===1){const item=cluster.items[0];return <Marker key={item.id} position={[item.latitude,item.longitude]} icon={markerIcon(item.monumentCount)}><LocationPopup item={item}/></Marker>;}
    const key=cluster.items.map(item=>item.id).sort().join('-');
    return <Marker key={key} position={[cluster.latitude,cluster.longitude]} icon={clusterIcon(cluster.items.length,cluster.monumentCount)} eventHandlers={{click:()=>{
      const bounds=L.latLngBounds(cluster.items.map(item=>[item.latitude,item.longitude] as [number,number]));
      map.fitBounds(bounds,{padding:[54,54],maxZoom:Math.min(12,zoom+3)});
    }}}/>;
  })}</>;
}

export default function RomanesqueMap({locations,routes=[]}:{locations:Location[];routes?:Route[]}){
  const [query,setQuery]=useState('');
  const [country,setCountry]=useState('');
  const [region,setRegion]=useState('');
  const [routeId,setRouteId]=useState('');
  const countries=useMemo(()=>[...new Set(locations.map(x=>x.country))].sort((a,b)=>a.localeCompare(b,'es')),[locations]);
  const regions=useMemo(()=>[...new Set(locations.filter(x=>!country||x.country===country).map(x=>x.region).filter(Boolean) as string[])].sort((a,b)=>a.localeCompare(b,'es')),[locations,country]);
  const filtered=useMemo(()=>{const needle=normalize(query.trim());return locations.filter(x=>{const haystack=normalize([x.name,x.region,x.country,x.description].filter(Boolean).join(' '));return (!needle||haystack.includes(needle))&&(!country||x.country===country)&&(!region||x.region===region);});},[locations,query,country,region]);
  const selectedRoute=routes.find(x=>x.id===routeId)??null;
  const routeLocations=useMemo(()=>{
    if(!selectedRoute?.points.length)return filtered;
    return filtered.filter(location=>selectedRoute.points.some(([lat,lng])=>Math.abs(lat-location.latitude)<0.000001&&Math.abs(lng-location.longitude)<0.000001));
  },[filtered,selectedRoute]);
  const visibleLocations=selectedRoute?routeLocations:filtered;
  const visiblePoints=selectedRoute?.points.length?selectedRoute.points:visibleLocations.map(x=>[x.latitude,x.longitude] as [number,number]);
  function reset(){setQuery('');setCountry('');setRegion('');setRouteId('');}

  return <section className="map-explorer">
    <div className="map-toolbar">
      <label>Buscar<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Localidad, región o país"/></label>
      <label>País<select value={country} onChange={e=>{setCountry(e.target.value);setRegion('');setRouteId('');}}><option value="">Todos</option>{countries.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
      <label>Región<select value={region} onChange={e=>{setRegion(e.target.value);setRouteId('');}}><option value="">Todas</option>{regions.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
      <label>Ruta<select value={routeId} onChange={e=>setRouteId(e.target.value)}><option value="">Sin ruta</option>{routes.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
      <button className="secondary" type="button" onClick={reset}>Limpiar</button>
    </div>
    <div className="map-result-count">{selectedRoute?`Ruta: ${selectedRoute.title} · ${visibleLocations.length} localidades`:`${filtered.length} de ${locations.length} localidades visibles · los grupos se separan al acercar el mapa`}</div>
    <MapContainer center={[47,8]} zoom={4} scrollWheelZoom className="map">
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      <MapFitter points={visiblePoints}/>
      {selectedRoute&&selectedRoute.points.length>1&&<Polyline positions={selectedRoute.points}/>} 
      <ClusteredMarkers locations={visibleLocations}/>
    </MapContainer>
    {selectedRoute&&<div className="map-route-link"><a className="button-link secondary" href={`/patrimonio/rutas/${selectedRoute.slug}`}>Abrir ficha de la ruta →</a></div>}
  </section>;
}
