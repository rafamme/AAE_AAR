import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import { getSiteControl } from './site-control';

export async function getBetaAwareActor() {
  const [supabase, control] = await Promise.all([createClient(), getSiteControl()]);
  const fullTestAccess = control.enabled('testing.full_access');
  const { data: authData } = await supabase.auth.getUser();
  const authenticatedUser = authData.user;

  if (authenticatedUser) {
    return { supabase, user: authenticatedUser, fullTestAccess, isBetaActor: false };
  }

  if (!fullTestAccess) redirect('/login');

  const { data: betaMember } = await supabase
    .from('members')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!betaMember?.id) {
    redirect('/beta?mensaje=No%20hay%20ningún%20socio%20disponible%20para%20usar%20como%20identidad%20beta.');
  }

  return {
    supabase,
    user: { id: betaMember.id },
    fullTestAccess,
    isBetaActor: true,
  };
}
