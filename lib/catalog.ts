import { supabasePublishableKey, supabaseUrl } from './supabase/config';

export type CatalogLocation = { id:string; name:string; country:string; region:string|null; description:string|null; latitude:number; longitude:number };
export type CatalogMonument = { id:string; location_id:string; name:string; description:string|null; century:string|null; style:string|null; architectural_type:string|null; heritage_reference:string|null; website_url:string|null };
export type CatalogMedia = { id:string; location_id:string|null; monument_id:string|null; title:string|null; description:string|null; media_type:'image'|'video'|'document'; storage_path:string|null; external_url:string|null; thumbnail_path:string|null; sort_order:number; is_featured:boolean };
export type HeritageRoute = { id:string; title:string; slug:string; summary:string|null; description:string|null; country:string|null; region:string|null; distance_km:number|null; duration_text:string|null };
export type HeritageRouteStop = { id:string; route_id:string; location_id:string|null; monument_id:string|null; sort_order:number; note:string|null };

const headers={apikey:supabasePublishableKey,Authorization:`Bearer ${supabasePublishableKey}`};
async function query<T>(path:string,revalidate=60):Promise<T>{const response=await fetch(`${supabaseUrl}/rest/v1/${path}`,{headers,next:{revalidate}});if(!response.ok)throw new Error(`Catalog query failed: ${response.status}`);return response.json();}
const locationFields='id,name,country,region,description,latitude,longitude';
const monumentFields='id,location_id,name,description,century,style,architectural_type,heritage_reference,website_url';
const mediaFields='id,location_id,monument_id,title,description,media_type,storage_path,external_url,thumbnail_path,sort_order,is_featured';

export async function getPublishedLocations(){return query<CatalogLocation[]>(`locations?select=${locationFields}&status=eq.published&order=name`)}
export async function getPublishedLocationsForCountry(country:string){return query<CatalogLocation[]>(`locations?select=${locationFields}&country=eq.${encodeURIComponent(country)}&status=eq.published&order=region,name`)}
export async function getPublishedLocationsForRegion(country:string,region:string){return query<CatalogLocation[]>(`locations?select=${locationFields}&country=eq.${encodeURIComponent(country)}&region=eq.${encodeURIComponent(region)}&status=eq.published&order=name`)}
export async function getPublishedMonuments(){return query<CatalogMonument[]>(`monuments?select=${monumentFields}&status=eq.published&order=name`)}
export async function getPublishedLocation(id:string){const rows=await query<CatalogLocation[]>(`locations?select=${locationFields}&id=eq.${encodeURIComponent(id)}&status=eq.published&limit=1`);return rows[0]??null}
export async function getPublishedMonument(id:string){const rows=await query<CatalogMonument[]>(`monuments?select=${monumentFields}&id=eq.${encodeURIComponent(id)}&status=eq.published&limit=1`);return rows[0]??null}
export async function getPublishedMonumentsForLocation(locationId:string){return query<CatalogMonument[]>(`monuments?select=${monumentFields}&location_id=eq.${encodeURIComponent(locationId)}&status=eq.published&order=name`)}
export async function getPublishedMedia(){return query<CatalogMedia[]>(`media?select=${mediaFields}&status=eq.published&order=is_featured.desc,sort_order,created_at`)}
export async function getPublishedMediaForLocation(locationId:string){return query<CatalogMedia[]>(`media?select=${mediaFields}&location_id=eq.${encodeURIComponent(locationId)}&status=eq.published&order=is_featured.desc,sort_order,created_at`)}
export async function getPublishedMediaForMonument(monumentId:string){return query<CatalogMedia[]>(`media?select=${mediaFields}&monument_id=eq.${encodeURIComponent(monumentId)}&status=eq.published&order=is_featured.desc,sort_order,created_at`)}
export async function getPublishedRoutes(){return query<HeritageRoute[]>('heritage_routes?select=id,title,slug,summary,description,country,region,distance_km,duration_text&status=eq.published&order=title')}
export async function getPublishedRoute(slug:string){const rows=await query<HeritageRoute[]>(`heritage_routes?select=id,title,slug,summary,description,country,region,distance_km,duration_text&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`);return rows[0]??null}
export async function getPublishedRouteStops(routeId:string){return query<HeritageRouteStop[]>(`heritage_route_stops?select=id,route_id,location_id,monument_id,sort_order,note&route_id=eq.${encodeURIComponent(routeId)}&order=sort_order`)}
export async function getPublishedRouteStopsForRoutes(routeIds:string[]){if(!routeIds.length)return [];return query<HeritageRouteStop[]>(`heritage_route_stops?select=id,route_id,location_id,monument_id,sort_order,note&route_id=in.(${routeIds.map(encodeURIComponent).join(',')})&order=route_id,sort_order`)}
export function publicMediaUrl(path:string|null){if(!path)return null;return `${supabaseUrl}/storage/v1/object/public/site-media/${path.split('/').map(encodeURIComponent).join('/')}`}
