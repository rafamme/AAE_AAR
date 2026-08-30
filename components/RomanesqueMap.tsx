'use client';

import {MapContainer,Marker,Popup,TileLayer} from 'react-leaflet';
import L from 'leaflet';

type Location={id:string;name:string;country:string;region:string|null;description:string|null;latitude:number;longitude:number};

const icon=L.icon({
  iconUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:[25,41],iconAnchor:[12,41]
});

export default function RomanesqueMap({locations}:{locations:Location[]}){
  return <MapContainer center={[47,8]} zoom={4} scrollWheelZoom className="map">
    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
    {locations.map(l=><Marker key={l.id} position={[l.latitude,l.longitude]} icon={icon}><Popup><strong>{l.name}</strong><br/>{l.region ?? ''} · {l.country}<br/><small>{l.description ?? ''}</small></Popup></Marker>)}
  </MapContainer>;
}
