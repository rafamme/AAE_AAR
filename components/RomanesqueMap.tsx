'use client';

import { useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';

type Location = {
  id: string;
  name: string;
  country: string;
  region: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
};

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function RomanesqueMap({ locations }: { locations: Location[] }) {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');

  const countries = useMemo(
    () => [...new Set(locations.map((item) => item.country))].sort((a, b) => a.localeCompare(b, 'es')),
    [locations],
  );

  const regions = useMemo(
    () => [...new Set(locations.filter((item) => !country || item.country === country).map((item) => item.region).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'es')),
    [locations, country],
  );

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return locations.filter((item) => {
      const haystack = normalize([item.name, item.region, item.country, item.description].filter(Boolean).join(' '));
      return (!needle || haystack.includes(needle)) && (!country || item.country === country) && (!region || item.region === region);
    });
  }, [locations, query, country, region]);

  function reset() {
    setQuery('');
    setCountry('');
    setRegion('');
  }

  return <section className="map-explorer">
    <div className="map-toolbar">
      <label>Buscar<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Localidad, región o país" /></label>
      <label>País<select value={country} onChange={(event) => { setCountry(event.target.value); setRegion(''); }}><option value="">Todos</option>{countries.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>Región<select value={region} onChange={(event) => setRegion(event.target.value)}><option value="">Todas</option>{regions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <button className="secondary" type="button" onClick={reset}>Limpiar</button>
    </div>
    <div className="map-result-count">{filtered.length} de {locations.length} localidades visibles</div>
    <MapContainer center={[47, 8]} zoom={4} scrollWheelZoom className="map">
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {filtered.map((item) => <Marker key={item.id} position={[item.latitude, item.longitude]} icon={icon}>
        <Popup>
          <strong>{item.name}</strong><br />
          {[item.region, item.country].filter(Boolean).join(' · ')}<br />
          {item.description && <><small>{item.description}</small><br /></>}
          <a href={`/patrimonio/localidades/${item.id}`}>Abrir ficha patrimonial →</a>
        </Popup>
      </Marker>)}
    </MapContainer>
  </section>;
}
