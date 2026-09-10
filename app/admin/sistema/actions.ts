'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { getSiteControl } from '../../../lib/site-control';

const numberSettings = new Set(['map.default_lat','map.default_lng','map.default_zoom','map.cluster_max_zoom','auth.password_min_length']);
const booleanSettings = new Set(['members.directory_default','security.require_profile_completion']);
const allowedThemes = new Set(['light','dark','system']);
const allowedAccents = new Set(['stone','burgundy','forest','blue']);

async function superadminContext() {
  const [supabase, control] = await Promise.all([createClient(), getSiteControl()]);
  const { data: { user } } = await supabase.auth.getUser();
  const fullTestAccess = control.enabled('testing.full_access');
  if (fullTestAccess) return { supabase, user, fullTestAccess };
  if (!user) redirect('/login');
  const { data: roles } = await supabase.from('member_roles').select('role').eq('member_id', user.id);
  if (!(roles ?? []).some((item) => item.role === 'superadmin')) redirect('/admin');
  return { supabase, user, fullTestAccess };
}

function parseSettingValue(key: string, raw: string) {
  if (numberSettings.has(key)) {
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error('El valor debe ser numérico.');
    if (key === 'map.default_lat' && (value < -90 || value > 90)) throw new Error('La latitud debe estar entre -90 y 90.');
    if (key === 'map.default_lng' && (value < -180 || value > 180)) throw new Error('La longitud debe estar entre -180 y 180.');
    if ((key === 'map.default_zoom' || key === 'map.cluster_max_zoom') && (value < 1 || value > 18)) throw new Error('El zoom debe estar entre 1 y 18.');
    if (key === 'auth.password_min_length' && (value < 8 || value > 128)) throw new Error('La longitud mínima debe estar entre 8 y 128 caracteres.');
    return value;
  }
  if (booleanSettings.has(key)) return raw === 'true';
  if (key === 'ui.theme' && !allowedThemes.has(raw)) throw new Error('Tema no válido.');
  if (key === 'ui.accent' && !allowedAccents.has(raw)) throw new Error('Acento no válido.');
  return raw;
}

export async function setFeatureFlag(formData: FormData) {
  const { supabase, user } = await superadminContext();
  const key = String(formData.get('key') ?? '').trim();
  const enabled = String(formData.get('enabled') ?? '') === 'true';
  if (!key) redirect('/admin/sistema?mensaje=Bandera%20no%20válida.');
  const { error } = await supabase.from('feature_flags').update({ enabled, updated_by: user?.id ?? null, updated_at: new Date().toISOString() }).eq('key', key);
  revalidatePath('/admin/sistema');
  revalidatePath('/');
  revalidatePath('/patrimonio');
  revalidatePath('/eventos');
  revalidatePath('/registro');
  revalidatePath('/area-socios');
  redirect(`/admin/sistema?mensaje=${encodeURIComponent(error ? error.message : 'Módulo actualizado.')}`);
}

export async function setSiteSetting(formData: FormData) {
  const { supabase, user } = await superadminContext();
  const key = String(formData.get('key') ?? '').trim();
  const raw = String(formData.get('value') ?? '').trim();
  if (!key) redirect('/admin/sistema?mensaje=Ajuste%20no%20válido.');
  let value: string | number | boolean;
  try { value = parseSettingValue(key, raw); }
  catch (error) { redirect(`/admin/sistema?mensaje=${encodeURIComponent(error instanceof Error ? error.message : 'Valor no válido.')}`); }
  const { error } = await supabase.from('site_settings').update({ value, updated_by: user?.id ?? null, updated_at: new Date().toISOString() }).eq('key', key);
  revalidatePath('/admin/sistema');
  revalidatePath('/');
  revalidatePath('/patrimonio');
  revalidatePath('/eventos');
  revalidatePath('/registro');
  revalidatePath('/area-socios');
  redirect(`/admin/sistema?mensaje=${encodeURIComponent(error ? error.message : 'Configuración actualizada.')}`);
}
