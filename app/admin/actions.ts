'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

async function currentRoles() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
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

export async function reviewContribution(formData: FormData) {
  const { supabase, user, roles } = await currentRoles();
  if (!roles.has('superadmin') && !roles.has('admin') && !roles.has('editor')) redirect('/area-socios');
  const id = String(formData.get('id') || '');
  const decision = String(formData.get('decision') || '');
  if (!['published', 'archived'].includes(decision)) redirect(`/admin/aportaciones/${id}?mensaje=Decisión%20no%20válida.`);
  const { error } = await supabase.from('contributions').update({ status: decision, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', id).not('submitted_at', 'is', null);
  revalidatePath('/admin'); revalidatePath('/admin/aportaciones'); revalidatePath(`/admin/aportaciones/${id}`); revalidatePath('/area-socios/aportaciones');
  redirect(`/admin/aportaciones/${id}?mensaje=${encodeURIComponent(error ? error.message : decision === 'published' ? 'Aportación publicada.' : 'Aportación archivada.')}`);
}
