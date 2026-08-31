import { supabasePublishableKey, supabaseUrl } from './supabase/config';

export type CatalogLocation = {
  id: string;
  name: string;
  country: string;
  region: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
};

export type CatalogMonument = {
  id: string;
  location_id: string;
  name: string;
  description: string | null;
  century: string | null;
  style: string | null;
  architectural_type: string | null;
  heritage_reference: string | null;
  website_url: string | null;
};

export type CatalogMedia = {
  id: string;
  location_id: string | null;
  monument_id: string | null;
  title: string | null;
  description: string | null;
  media_type: 'image' | 'video' | 'document';
  storage_path: string | null;
  external_url: string | null;
  thumbnail_path: string | null;
  sort_order: number;
};

const headers = {
  apikey: supabasePublishableKey,
  Authorization: `Bearer ${supabasePublishableKey}`,
};

async function query<T>(path: string, revalidate = 60): Promise<T> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers,
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`Catalog query failed: ${response.status}`);
  }

  return response.json();
}

export async function getPublishedLocations() {
  return query<CatalogLocation[]>(
    'locations?select=id,name,country,region,description,latitude,longitude&status=eq.published&order=name',
  );
}

export async function getPublishedMonuments() {
  return query<CatalogMonument[]>(
    'monuments?select=id,location_id,name,description,century,style,architectural_type,heritage_reference,website_url&status=eq.published&order=name',
  );
}

export async function getPublishedLocation(id: string) {
  const rows = await query<CatalogLocation[]>(
    `locations?select=id,name,country,region,description,latitude,longitude&id=eq.${encodeURIComponent(id)}&status=eq.published&limit=1`,
  );
  return rows[0] ?? null;
}

export async function getPublishedMonument(id: string) {
  const rows = await query<CatalogMonument[]>(
    `monuments?select=id,location_id,name,description,century,style,architectural_type,heritage_reference,website_url&id=eq.${encodeURIComponent(id)}&status=eq.published&limit=1`,
  );
  return rows[0] ?? null;
}

export async function getPublishedMonumentsForLocation(locationId: string) {
  return query<CatalogMonument[]>(
    `monuments?select=id,location_id,name,description,century,style,architectural_type,heritage_reference,website_url&location_id=eq.${encodeURIComponent(locationId)}&status=eq.published&order=name`,
  );
}

export async function getPublishedMediaForLocation(locationId: string) {
  return query<CatalogMedia[]>(
    `media?select=id,location_id,monument_id,title,description,media_type,storage_path,external_url,thumbnail_path,sort_order&location_id=eq.${encodeURIComponent(locationId)}&status=eq.published&order=sort_order,created_at`,
  );
}

export async function getPublishedMediaForMonument(monumentId: string) {
  return query<CatalogMedia[]>(
    `media?select=id,location_id,monument_id,title,description,media_type,storage_path,external_url,thumbnail_path,sort_order&monument_id=eq.${encodeURIComponent(monumentId)}&status=eq.published&order=sort_order,created_at`,
  );
}

export function publicMediaUrl(path: string | null) {
  if (!path) return null;
  return `${supabaseUrl}/storage/v1/object/public/site-media/${path.split('/').map(encodeURIComponent).join('/')}`;
}
