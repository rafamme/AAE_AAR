'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { getSiteControl } from '../../lib/site-control';

async function currentRoles() {
  const [supabase, control] = await Promise.all([createClient(), getSiteControl()]);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (control.enabled('testing.full_access')) {
    return { supabase, user, roles: new Set(['superadmin','admin','editor','member']) };
  }
  const { data: roles } = await supabase.from('member_roles').select('role').eq('member_id', user.id);
  return { supabase, user, roles: new Set((roles ?? []).map((item) => item.role)) };
}

export async function updateMember(formData: FormData) {
  const { supabase, roles } = await currentRoles();
  if (!roles.has('admin') && !roles.has('superadmin')) redirect('/admin');
  const id = String(formData.get('id') || '');
  const status = String(formData.get('status') || 'pending');
  if (!['pending','active','suspended','inactive'].includes(status)) redirect('/admin/socios?mensaje=Estado%20no%20válido.');
  const numberRaw = String(formData.get('member_number') || '').trim();
  const joinedRaw = String(formData.get('joined_at') || '').trim();
  const member_number = numberRaw ? Number(numberRaw) : null;
  if (numberRaw && (!Number.isInteger(member_number) || Number(member_number) < 1)) redirect('/admin/socios?mensaje=Número%20de%20socio%20no%20válido.');
  const joined_at = joinedRaw || null;
  const { error } = await supabase.from('members').update({ status, member_number, joined_at }).eq('id', id);
  revalidatePath('/admin'); revalidatePath('/admin/socios');
  redirect(`/admin/socios?mensaje=${encodeURIComponent(error ? error.message : 'Socio actualizado.')}`);
}

export async function approveMember(formData: FormData) {
  const { supabase, roles } = await currentRoles();
  if (!roles.has('admin') && !roles.has('superadmin')) redirect('/admin');
  const id = String(formData.get('id') || '');
  const { data: member, error: memberError } = await supabase.from('members').select('id,status,member_number').eq('id', id).single();
  if (memberError || !member) redirect(`/admin/socios?mensaje=${encodeURIComponent(memberError?.message || 'Socio no encontrado.')}`);
  let memberNumber = member.member_number;
  if (!memberNumber) {
    const { data, error } = await supabase.rpc('assign_member_number', { target_member_id: id });
    if (error) redirect(`/admin/socios?mensaje=${encodeURIComponent(error.message)}`);
    memberNumber = data;
  }
  const { error } = await supabase.from('members').update({ status: 'active', joined_at: new Date().toISOString().slice(0,10) }).eq('id', id);
  if (!error) await supabase.from('member_roles').upsert({ member_id: id, role: 'member' });
  revalidatePath('/admin'); revalidatePath('/admin/socios'); revalidatePath('/area-socios');
  redirect(`/admin/socios?mensaje=${encodeURIComponent(error ? error.message : `Alta aprobada. Socio nº ${memberNumber}.`)}`);
}

export async function rejectMember(formData: FormData) {
  const { supabase, roles } = await currentRoles();
  if (!roles.has('admin') && !roles.has('superadmin')) redirect('/admin');
  const id = String(formData.get('id') || '');
  const { error } = await supabase.from('members').update({ status: 'inactive', joined_at: null }).eq('id', id).eq('status', 'pending');
  revalidatePath('/admin'); revalidatePath('/admin/socios');
  redirect(`/admin/socios?mensaje=${encodeURIComponent(error ? error.message : 'Solicitud rechazada.')}`);
}

export async function setMemberRole(formData: FormData) {
  const { supabase, user, roles } = await currentRoles();
  const isSuperadmin = roles.has('superadmin');
  if (!roles.has('admin') && !isSuperadmin) redirect('/admin');
  const memberId = String(formData.get('member_id') || '');
  const role = String(formData.get('role') || '');
  const enabled = String(formData.get('enabled') || '') === 'true';
  if (!['superadmin', 'admin', 'editor', 'member'].includes(role)) redirect('/admin/socios?mensaje=Rol%20no%20válido.');
  if (role === 'superadmin' && !isSuperadmin) redirect('/admin/socios?mensaje=Solo%20un%20superadministrador%20puede%20gestionar%20ese%20rol.');
  if (!enabled && memberId === user.id && role === 'admin' && !isSuperadmin) redirect('/admin/socios?mensaje=No%20puedes%20retirarte%20tu%20propio%20rol%20de%20administrador.');
  const query = enabled
    ? supabase.from('member_roles').upsert({ member_id: memberId, role })
    : supabase.from('member_roles').delete().eq('member_id', memberId).eq('role', role);
  const { error } = await query;
  revalidatePath('/admin/socios'); revalidatePath('/admin/sistema');
  redirect(`/admin/socios?mensaje=${encodeURIComponent(error ? error.message : 'Roles actualizados.')}`);
}

export async function updateEventRegistrationStatus(formData: FormData) {
  const { supabase, roles } = await currentRoles();
  if (!roles.has('superadmin') && !roles.has('admin') && !roles.has('editor')) redirect('/area-socios');
  const eventId = String(formData.get('event_id') || '');
  const memberId = String(formData.get('member_id') || '');
  const status = String(formData.get('status') || 'registered');
  if (!['registered','cancelled','attended','no_show'].includes(status)) redirect('/admin/eventos?mensaje=Estado%20de%20inscripción%20no%20válido.');
  const { error } = await supabase.from('event_members').update({ status }).eq('event_id', eventId).eq('member_id', memberId);
  revalidatePath('/admin'); revalidatePath('/admin/eventos'); revalidatePath('/eventos'); revalidatePath(`/eventos/${eventId}`); revalidatePath('/area-socios/eventos');
  redirect(`/admin/eventos?mensaje=${encodeURIComponent(error ? error.message : 'Inscripción actualizada.')}`);
}

export async function sendAnnouncement(formData: FormData) {
  const { supabase, roles } = await currentRoles();
  if (!roles.has('admin') && !roles.has('superadmin')) redirect('/admin');
  const subject = String(formData.get('subject') || '').trim();
  const body = String(formData.get('body') || '').trim();
  if (!subject || !body) redirect('/admin/comunicaciones?mensaje=Asunto%20y%20mensaje%20son%20obligatorios.');
  if (subject.length > 160 || body.length > 10000) redirect('/admin/comunicaciones?mensaje=El%20comunicado%20es%20demasiado%20largo.');
  const { data, error } = await supabase.rpc('create_announcement_thread', { p_subject: subject, p_body: body });
  revalidatePath('/admin/comunicaciones'); revalidatePath('/area-socios'); revalidatePath('/area-socios/mensajes');
  redirect(`/admin/comunicaciones?mensaje=${encodeURIComponent(error ? error.message : `Comunicado enviado correctamente${data ? '.' : '.'}`)}`);
}

export async function reviewContribution(formData: FormData) {
  const { supabase, user, roles } = await currentRoles();
  if (!roles.has('superadmin') && !roles.has('admin') && !roles.has('editor')) redirect('/area-socios');
  const id = String(formData.get('id') || '');
  const decision = String(formData.get('decision') || '');
  if (!['published', 'archived'].includes(decision)) redirect(`/admin/aportaciones/${id}?mensaje=Decisión%20no%20válida.`);
  const { error } = await supabase.from('contributions').update({ status: decision, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', id).not('submitted_at', 'is', null);
  revalidatePath('/admin'); revalidatePath('/admin/aportaciones'); revalidatePath(`/admin/aportaciones/${id}`); revalidatePath('/area-socios/aportaciones');
  redirect(`/admin/aportaciones/${id}?mensaje=${encodeURIComponent(error ? error.message : decision === 'published' ? 'Aportación aprobada. Ya puede incorporarse al patrimonio.' : 'Aportación archivada.')}`);
}

export async function publishContributionToCatalog(formData: FormData) {
  const { supabase, user, roles } = await currentRoles();
  if (!roles.has('superadmin') && !roles.has('admin') && !roles.has('editor')) redirect('/area-socios');
  const id = String(formData.get('id') || '');

  const { data: before, error: beforeError } = await supabase.from('contributions')
    .select('id,status,location_id,monument_id,published_location_id,published_monument_id,catalog_published_at')
    .eq('id', id).single();
  if (beforeError || !before) redirect(`/admin/aportaciones/${id}?mensaje=${encodeURIComponent(beforeError?.message || 'Aportación no encontrada.')}`);
  if (before.status !== 'published') redirect(`/admin/aportaciones/${id}?mensaje=${encodeURIComponent('La aportación debe estar aprobada antes de publicarse.')}`);

  if (!before.catalog_published_at) {
    const { error } = await supabase.rpc('publish_contribution_to_catalog', { target_contribution_id: id });
    if (error) redirect(`/admin/aportaciones/${id}?mensaje=${encodeURIComponent(error.message)}`);
  }

  const { data: contribution, error: contributionError } = await supabase.from('contributions')
    .select('location_id,monument_id,published_location_id,published_monument_id,catalog_published_at')
    .eq('id', id).single();
  if (contributionError || !contribution) redirect(`/admin/aportaciones/${id}?mensaje=${encodeURIComponent(contributionError?.message || 'No se pudo recuperar el contenido publicado.')}`);

  const targetMonumentId = contribution.published_monument_id || contribution.monument_id || null;
  const targetLocationId = targetMonumentId ? null : (contribution.published_location_id || contribution.location_id || null);
  const { data: attachments, error: attachmentError } = await supabase.from('contribution_media')
    .select('id,title,description,media_type,storage_path,published_media_id')
    .eq('contribution_id', id)
    .is('published_media_id', null);
  if (attachmentError) redirect(`/admin/aportaciones/${id}?mensaje=${encodeURIComponent(attachmentError.message)}`);

  const failures: string[] = [];
  for (const attachment of attachments ?? []) {
    const fileName = attachment.storage_path.split('/').pop() || `${attachment.id}`;
    const sitePath = `contributions/${id}/${attachment.id}-${fileName}`;
    const { data: downloadData, error: downloadError } = await supabase.storage.from('member-files').download(attachment.storage_path);
    if (downloadError || !downloadData) { failures.push(`${fileName}: ${downloadError?.message || 'no se pudo leer'}`); continue; }

    const { error: uploadError } = await supabase.storage.from('site-media').upload(sitePath, downloadData, {
      contentType: downloadData.type || undefined,
      upsert: true,
    });
    if (uploadError) { failures.push(`${fileName}: ${uploadError.message}`); continue; }

    let mediaId: string | null = null;
    const { data: existing } = await supabase.from('media').select('id').eq('storage_path', sitePath).maybeSingle();
    if (existing?.id) mediaId = existing.id;
    else {
      const { data: created, error: mediaError } = await supabase.from('media').insert({
        location_id: targetLocationId,
        monument_id: targetMonumentId,
        title: attachment.title,
        description: attachment.description,
        media_type: attachment.media_type,
        storage_path: sitePath,
        status: 'published',
        uploaded_by: user.id,
      }).select('id').single();
      if (mediaError || !created) { failures.push(`${fileName}: ${mediaError?.message || 'no se pudo registrar'}`); continue; }
      mediaId = created.id;
    }

    const { error: markError } = await supabase.from('contribution_media').update({ status: 'published', published_media_id: mediaId }).eq('id', attachment.id);
    if (markError) failures.push(`${fileName}: ${markError.message}`);
  }

  revalidatePath('/'); revalidatePath('/patrimonio'); revalidatePath('/mapa'); revalidatePath('/admin'); revalidatePath('/admin/aportaciones'); revalidatePath(`/admin/aportaciones/${id}`); revalidatePath('/area-socios/aportaciones');
  if (targetMonumentId) revalidatePath(`/patrimonio/monumentos/${targetMonumentId}`);
  if (targetLocationId) revalidatePath(`/patrimonio/localidades/${targetLocationId}`);

  const message = failures.length
    ? `La ficha está publicada, pero ${failures.length} archivo(s) quedaron pendientes: ${failures.join(' | ')}`
    : `Aportación incorporada al patrimonio público${(attachments ?? []).length ? ' con sus archivos multimedia.' : '.'}`;
  redirect(`/admin/aportaciones/${id}?mensaje=${encodeURIComponent(message)}`);
}
