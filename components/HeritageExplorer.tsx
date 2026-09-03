'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { CatalogLocation, CatalogMonument } from '../lib/catalog';

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function HeritageExplorer({ locations, monuments }: { locations: CatalogLocation[]; monuments: CatalogMonument[] }) {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [kind, setKind] = useState<'all' | 'locations' | 'monuments'>('all');

  const locationById = useMemo(() => new Map(locations.map((item) => [item.id, item])), [locations]);
  const countries = useMemo(() => [...new Set(locations.map((item) => item.country))].sort((a, b) => a.localeCompare(b, 'es')), [locations]);
  const regions = useMemo(() => [...new Set(locations.filter((item) => !country || item.country === country).map((item) => item.region).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'es')), [locations, country]);
  const monumentsByLocation = useMemo(() => {
    const map = new Map<string, number>();
    monuments.forEach((item) => map.set(item.location_id, (map.get(item.location_id) ?? 0) + 1));
    return map;
  }, [monuments]);

  const needle = normalize(query.trim());
  const filteredLocations = locations.filter((item) => {
    const haystack = normalize([item.name, item.region, item.country, item.description].filter(Boolean).join(' '));
    return (!needle || haystack.includes(needle)) && (!country || item.country === country) && (!region || item.region === region);
  });
  const filteredMonuments = monuments.filter((item) => {
    const location = locationById.get(item.location_id);
    const haystack = normalize([item.name, item.century, item.style, item.architectural_type, item.description, location?.name, location?.region, location?.country].filter(Boolean).join(' '));
    return (!needle || haystack.includes(needle)) && (!country || location?.country === country) && (!region || location?.region === region);
  });

  const visibleCount = (kind === 'monuments' ? 0 : filteredLocations.length) + (kind === 'locations' ? 0 : filteredMonuments.length);

  return <>
    <section className="catalog-filter-panel">
      <div className="catalog-filter-row">
        <label>Buscar<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, estilo, siglo, región…" /></label>
        <label>País<select value={country} onChange={(event) => { setCountry(event.target.value); setRegion(''); }}><option value="">Todos</option>{countries.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Región<select value={region} onChange={(event) => setRegion(event.target.value)}><option value="">Todas</option>{regions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Mostrar<select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="all">Todo</option><option value="locations">Localidades</option><option value="monuments">Monumentos</option></select></label>
      </div>
      <div className="catalog-filter-summary"><strong>{visibleCount}</strong> resultados · {filteredLocations.length} localidades · {filteredMonuments.length} monumentos</div>
    </section>

    {kind !== 'monuments' && <section className="catalog-section">
      <div className="section-heading"><div><div className="eyebrow">Localidades</div><h2>{filteredLocations.length} destinos</h2></div></div>
      {filteredLocations.length ? <div className="catalog-grid">{filteredLocations.map((location) => <Link className="catalog-card" href={`/patrimonio/localidades/${location.id}`} key={location.id}>
        <div className="catalog-card-meta">{location.region ? `${location.region} · ` : ''}{location.country}</div>
        <h3>{location.name}</h3>
        <p>{location.description ?? 'Ficha patrimonial de la localidad.'}</p>
        <div className="catalog-card-footer">{monumentsByLocation.get(location.id) ?? 0} monumento(s) · Ver localidad →</div>
      </Link>)}</div> : <div className="empty-state">No hay localidades que coincidan con estos filtros.</div>}
    </section>}

    {kind !== 'locations' && <section className="catalog-section">
      <div className="section-heading"><div><div className="eyebrow">Monumentos</div><h2>{filteredMonuments.length} fichas</h2></div></div>
      {filteredMonuments.length ? <div className="catalog-grid">{filteredMonuments.map((monument) => {
        const location = locationById.get(monument.location_id);
        return <Link className="catalog-card" href={`/patrimonio/monumentos/${monument.id}`} key={monument.id}>
          <div className="catalog-card-meta">{[monument.architectural_type, monument.century, location?.name].filter(Boolean).join(' · ')}</div>
          <h3>{monument.name}</h3>
          <p>{monument.description ?? 'Ficha patrimonial del monumento.'}</p>
          <div className="catalog-card-footer">{location ? `${location.region ? `${location.region} · ` : ''}${location.country} · ` : ''}Ver ficha →</div>
        </Link>;
      })}</div> : <div className="empty-state">No hay monumentos que coincidan con estos filtros.</div>}
    </section>}
  </>;
}
