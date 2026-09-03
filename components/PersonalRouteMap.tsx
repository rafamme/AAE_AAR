'use client';
import { useEffect } from 'react';
import { MapContainer,Marker,Polyline,Popup,TileLayer,useMap } from 'react-leaflet';
import L from 'leaflet';
type Point={id:string;name:string;latitude:number;longitude:number;order:number};
function icon(order:number){return L.divIcon({className:'romanesque-marker-wrap',html:`<span class="romanesque-marker">${order}</span>`,iconSize:[38,38],iconAnchor:[19,19]});}
function Fit({points}:{points:Point[]}){const map=useMap();useEffect(()=>{if(points.length===1)map.setView([points[0].latitude,points[0].longitude],10);else if(points.length>1)map.fitBounds(L.latLngBounds(points.map(p=>[p.latitude,p.longitude])),{padding:[30,30],maxZoom:10});},[map,points]);return null;}
export default function PersonalRouteMap({points}:{points:Point[]}){const positions=points.map(p=>[p.latitude,p.longitude] as [number,number]);return <MapContainer center={positions[0]??[47,8]} zoom={5} scrollWheelZoom={false} className="personal-route-map"><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><Fit points={points}/>{positions.length>1&&<Polyline positions={positions}/>} {points.map(p=><Marker key={p.id} position={[p.latitude,p.longitude]} icon={icon(p.order)}><Popup><strong>{p.order}. {p.name}</strong></Popup></Marker>)}</MapContainer>;}