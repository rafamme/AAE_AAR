'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

type Target = { locationId?: string; monumentId?: string };

async function activeMemberContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: member } = await supabase.from('members').select('status').eq('id', user.id).single();
  if (!member || member.status !== 'active') redirect('/area-socios?mensaje=Esta%20función%20requiere%20una%20cuenta%20de%20socio%20activa.');
  return { supabase, user };
}

function targetFromForm(formData: FormData): Target {
  const locationId = String(formData.get('location_id') ?? '').trim() || undefined;
  const monumentId = String(formData.get('monument_id') ?? '').trim() || undefined;
  if ((locationId ? 1 : 0) + (monumentId ? 1 : 0) !== 1) throw new Error('Objetivo patrimonial no válido');
  return { locationId, monumentId };
}

function targetQuery(query: any, target: Target) {
  return target.locationId ? query.eq('location_id', target.locationId) : query.eq('monument_id', target.monumentId!);
}

async function setSavedState(formData: FormData, field: 'is_favorite' | 'wants_to_visit') {
  const { supabase, user } = await activeMemberContext();
  const target = targetFromForm(formData);
  const next = String(formData.get('next') ?? '') === 'true';
  let query = supabase.from('member_saved_places').select('id,is_favorite,wants_to_visit').eq('member_id', user.id);
  query = targetQuery(query, target);
  const { data: current } = await query.maybeSingle();

  if (current) {
    const nextFavorite = field === 'is_favorite' ? next : current.is_favorite;
    const nextVisit = field === 'wants_to_visit' ? next : current.wants_to_visit;
    if (!nextFavorite && !nextVisit) {
      await supabase.from('member_saved_places').delete().eq('id', current.id);
    } else {
      await supabase.from('member_saved_places').update({ [field]: next }).eq('id', current.id);
    }
  } else if (next) {
    await supabase.from('member_saved_places').insert({
      member_id: user.id,
      location_id: target.locationId ?? null,
      monument_id: target.monumentId ?? null,
      is_favorite: field === 'is_favorite',
      wants_to_visit: field === 'wants_to_visit',
    });
  }

  revalidatePath('/area-socios/visitas');
  if (target.locationId) revalidatePath(`/patrimonio/localidades/${target.locationId}`);
  if (target.monumentId) revalidatePath(`/patrimonio/monumentos/${target.monumentId}`);
}

export async function toggleFavorite(formData: FormData) { await setSavedState(formData, 'is_favorite'); }
export async function toggleWantToVisit(formData: FormData) { await setSavedState(formData, 'wants_to_visit'); }

export async function createPersonalRoute(formData: FormData) {
  const { supabase, user } = await activeMemberContext();
  const title = String(formData.get('title') ?? '').trim();
  if (!title) redirect('/area-socios/visitas?mensaje=El%20nombre%20de%20la%20ruta%20es%20obligatorio.');
  const notes = String(formData.get('notes') ?? '').trim() || null;
  const { error } = await supabase.from('member_visit_routes').insert({ member_id: user.id, title, notes });
  if (error) redirect(`/area-socios/visitas?mensaje=${encodeURIComponent(error.message)}`);
  revalidatePath('/area-socios/visitas');
  redirect('/area-socios/visitas?mensaje=Ruta%20personal%20creada.');
}

export async function addSavedPlaceToRoute(formData: FormData) {
  const { supabase } = await activeMemberContext();
  const routeId = String(formData.get('route_id') ?? '').trim();
  const target = targetFromForm(formData);
  if (!routeId) redirect('/area-socios/visitas?mensaje=Selecciona%20una%20ruta.');
  const { data: last } = await supabase.from('member_visit_route_stops').select('sort_order').eq('route_id', routeId).order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from('member_visit_route_stops').insert({ route_id: routeId, location_id: target.locationId ?? null, monument_id: target.monumentId ?? null, sort_order: Number(last?.sort_order ?? -1) + 1 });
  if (error) redirect(`/area-socios/visitas?mensaje=${encodeURIComponent(error.message)}`);
  revalidatePath('/area-socios/visitas');
  redirect('/area-socios/visitas?mensaje=Añadido%20a%20la%20ruta.');
}
