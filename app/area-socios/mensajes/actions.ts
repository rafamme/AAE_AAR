'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '../../../lib/supabase/server';

async function activeUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: member } = await supabase.from('members').select('status').eq('id', user.id).single();
  if (!member || member.status !== 'active') redirect('/area-socios?mensaje=La%20mensajería%20solo%20está%20disponible%20para%20socios%20activos.');
  return { supabase, user };
}

export async function startDirectMessage(formData: FormData) {
  const targetMemberId = String(formData.get('target_member_id') || '');
  const body = String(formData.get('body') || '').trim();
  if (!targetMemberId || !body) redirect(`/area-socios/mensajes/nuevo?destinatario=${encodeURIComponent(targetMemberId)}&mensaje=${encodeURIComponent('Escribe un mensaje antes de enviarlo.')}`);
  const { supabase } = await activeUser();
  const { data, error } = await supabase.rpc('start_direct_thread', { target_member_id: targetMemberId, initial_body: body });
  if (error || !data) redirect(`/area-socios/mensajes/nuevo?destinatario=${encodeURIComponent(targetMemberId)}&mensaje=${encodeURIComponent(error?.message || 'No se pudo iniciar la conversación.')}`);
  revalidatePath('/area-socios/mensajes');
  redirect(`/area-socios/mensajes/${data}`);
}

export async function sendReply(formData: FormData) {
  const threadId = String(formData.get('thread_id') || '');
  const body = String(formData.get('body') || '').trim();
  if (!threadId || !body) redirect(`/area-socios/mensajes/${threadId}?mensaje=${encodeURIComponent('El mensaje no puede estar vacío.')}`);
  const { supabase, user } = await activeUser();
  const { error } = await supabase.from('messages').insert({ thread_id: threadId, sender_id: user.id, body });
  if (error) redirect(`/area-socios/mensajes/${threadId}?mensaje=${encodeURIComponent(error.message)}`);
  await supabase.from('message_participants').update({ last_read_at: new Date().toISOString() }).eq('thread_id', threadId).eq('member_id', user.id);
  revalidatePath('/area-socios/mensajes');
  revalidatePath(`/area-socios/mensajes/${threadId}`);
  redirect(`/area-socios/mensajes/${threadId}`);
}
