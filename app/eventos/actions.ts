'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '../../lib/supabase/server';

function target(eventId:string, message:string){return `/eventos/${eventId}?mensaje=${encodeURIComponent(message)}`}

export async function registerForEvent(formData:FormData){
  const eventId=String(formData.get('event_id')||'');
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/login');
  const {error}=await supabase.from('event_members').insert({event_id:eventId,member_id:user.id});
  if(error) redirect(target(eventId,error.code==='23505'?'Ya estás inscrito en este evento.':error.message));
  revalidatePath('/eventos'); revalidatePath(`/eventos/${eventId}`); revalidatePath('/area-socios/eventos');
  redirect(target(eventId,'Inscripción realizada.'));
}

export async function cancelEventRegistration(formData:FormData){
  const eventId=String(formData.get('event_id')||'');
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/login');
  const {error}=await supabase.from('event_members').delete().eq('event_id',eventId).eq('member_id',user.id);
  if(error) redirect(target(eventId,error.message));
  revalidatePath('/eventos'); revalidatePath(`/eventos/${eventId}`); revalidatePath('/area-socios/eventos');
  redirect(target(eventId,'Inscripción cancelada.'));
}
