'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  return text || null;
}
function numberOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}
function target(message: string, id?: string) {
  const base = id ? `/area-socios/aportaciones/${id}` : '/area-socios/aportaciones';
  return `${base}?mensaje=${encodeURIComponent(message)}`;
}
async function requireActiveMember() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: member } = await supabase.from('members').select('status').eq('id', user.id).single();
  if (!member || member.status !== 'active') redirect('/area-socios?mensaje=Las%20aportaciones%20están%20disponibles%20solo%20para%20socios%20activos.');
  return { supabase, user };
}

export async function saveContribution(formData: FormData) {
  const id = clean(formData.get('id'));
  const title = clean(formData.get('title'));
  if (!title) redirect(target('El título es obligatorio.', id ?? undefined));
  const proposalType = String(formData.get('proposal_type') || 'existing');
  if (!['existing','new_location','new_monument'].includes(proposalType)) redirect(target('Tipo de propuesta no válido.', id ?? undefined));

  const { supabase, user } = await requireActiveMember();
  const payload = {
    title,
    proposal_type: proposalType,
    description: clean(formData.get('description')),
    content: clean(formData.get('content')),
    location_id: clean(formData.get('location_id')),
    monument_id: proposalType === 'existing' ? clean(formData.get('monument_id')) : null,
    proposed_name: clean(formData.get('proposed_name')),
    proposed_country: clean(formData.get('proposed_country')),
    proposed_region: clean(formData.get('proposed_region')),
    proposed_latitude: numberOrNull(formData.get('proposed_latitude')),
    proposed_longitude: numberOrNull(formData.get('proposed_longitude')),
    proposed_century: clean(formData.get('proposed_century')),
    proposed_style: clean(formData.get('proposed_style')),
    proposed_architectural_type: clean(formData.get('proposed_architectural_type')),
    proposed_website_url: clean(formData.get('proposed_website_url')),
  };

  const query = id
    ? supabase.from('contributions').update(payload).eq('id', id).eq('contributor_id', user.id)
    : supabase.from('contributions').insert({ ...payload, contributor_id: user.id }).select('id').single();
  const { data, error } = await query as any;
  if (error) redirect(target(error.message, id ?? undefined));
  const contributionId = id ?? data?.id;
  revalidatePath('/area-socios/aportaciones');
  if (contributionId) revalidatePath(`/area-socios/aportaciones/${contributionId}`);
  redirect(target(id ? 'Borrador guardado.' : 'Borrador creado.', contributionId));
}

export async function submitContribution(formData: FormData) {
  const id = clean(formData.get('id'));
  if (!id) redirect(target('Aportación no válida.'));
  const { supabase, user } = await requireActiveMember();
  const { data: item } = await supabase.from('contributions').select('proposal_type,title,description,content,location_id,monument_id,proposed_name,proposed_country,proposed_latitude,proposed_longitude').eq('id',id).eq('contributor_id',user.id).single();
  if (!item?.title || !item.description || !item.content) redirect(target('Completa título, resumen y contenido antes de enviar.', id));
  if (item.proposal_type === 'existing' && !item.location_id && !item.monument_id) redirect(target('Selecciona una localidad o monumento existente.', id));
  if (item.proposal_type === 'new_location' && (!item.proposed_name || !item.proposed_country || item.proposed_latitude == null || item.proposed_longitude == null)) redirect(target('Para una nueva localidad indica nombre, país y coordenadas.', id));
  if (item.proposal_type === 'new_monument' && (!item.location_id || !item.proposed_name)) redirect(target('Para un nuevo monumento selecciona localidad e indica su nombre.', id));
  const { error } = await supabase.from('contributions').update({ submitted_at: new Date().toISOString() }).eq('id', id).eq('contributor_id', user.id);
  if (error) redirect(target(error.message, id));
  revalidatePath('/area-socios/aportaciones'); revalidatePath(`/area-socios/aportaciones/${id}`); revalidatePath('/admin/aportaciones');
  redirect(target('Aportación enviada a revisión.', id));
}
