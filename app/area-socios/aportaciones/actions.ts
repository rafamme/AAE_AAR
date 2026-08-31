'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  return text || null;
}

function target(message: string, id?: string) {
  const base = id ? `/area-socios/aportaciones/${id}` : '/area-socios/aportaciones';
  return `${base}?mensaje=${encodeURIComponent(message)}`;
}

async function requireActiveMember() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: member } = await supabase
    .from('members')
    .select('status')
    .eq('id', user.id)
    .single();

  if (!member || member.status !== 'active') {
    redirect('/area-socios?mensaje=Las%20aportaciones%20están%20disponibles%20solo%20para%20socios%20activos.');
  }

  return { supabase, user };
}

export async function saveContribution(formData: FormData) {
  const id = clean(formData.get('id'));
  const title = clean(formData.get('title'));
  if (!title) redirect(target('El título es obligatorio.', id ?? undefined));

  const { supabase, user } = await requireActiveMember();
  const payload = {
    title,
    description: clean(formData.get('description')),
    content: clean(formData.get('content')),
    location_id: clean(formData.get('location_id')),
    monument_id: clean(formData.get('monument_id')),
  };

  if (id) {
    const { error } = await supabase
      .from('contributions')
      .update(payload)
      .eq('id', id)
      .eq('contributor_id', user.id);
    if (error) redirect(target(error.message, id));
    revalidatePath('/area-socios/aportaciones');
    revalidatePath(`/area-socios/aportaciones/${id}`);
    redirect(target('Borrador guardado.', id));
  }

  const { data, error } = await supabase
    .from('contributions')
    .insert({ ...payload, contributor_id: user.id })
    .select('id')
    .single();
  if (error || !data) redirect(target(error?.message ?? 'No se pudo crear el borrador.'));

  revalidatePath('/area-socios/aportaciones');
  redirect(target('Borrador creado.', data.id));
}

export async function submitContribution(formData: FormData) {
  const id = clean(formData.get('id'));
  if (!id) redirect(target('Aportación no válida.'));

  const { supabase, user } = await requireActiveMember();
  const { error } = await supabase
    .from('contributions')
    .update({ submitted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('contributor_id', user.id);

  if (error) redirect(target(error.message, id));
  revalidatePath('/area-socios/aportaciones');
  revalidatePath(`/area-socios/aportaciones/${id}`);
  redirect(target('Aportación enviada a revisión.', id));
}
