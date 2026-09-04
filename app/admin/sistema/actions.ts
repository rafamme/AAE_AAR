'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { getSiteControl } from '../../../lib/site-control';

async function superadminContext() {
  const [supabase, control] = await Promise.all([createClient(), getSiteControl()]);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (control.enabled('testing.full_access')) return { supabase, user };
  const { data: roles } = await supabase.from('member_roles').select('role').eq('member_id', user.id);
  if (!(roles ?? []).some((item) => item.role === 'superadmin')) redirect('/admin');
  return { supabase, user };
}

export async function setFeatureFlag(formData: FormData) {
  const { supabase, user } = await superadminContext();
  const key = String(formData.get('key') ?? '').trim();
  const enabled = String(formData.get('enabled') ?? '') === 'true';
  if (!key) redirect('/admin/sistema?mensaje=Bandera%20no%20válida.');
  const { error } = await supabase.from('feature_flags').update({ enabled, updated_by: user.id, updated_at: new Date().toISOString() }).eq('key', key);
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
  const value = String(formData.get('value') ?? '').trim();
  if (!key) redirect('/admin/sistema?mensaje=Ajuste%20no%20válido.');
  const { error } = await supabase.from('site_settings').update({ value, updated_by: user.id, updated_at: new Date().toISOString() }).eq('key', key);
  revalidatePath('/admin/sistema');
  revalidatePath('/');
  redirect(`/admin/sistema?mensaje=${encodeURIComponent(error ? error.message : 'Configuración actualizada.')}`);
}
