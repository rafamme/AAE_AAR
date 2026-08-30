'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function withMessage(path: string, message: string) {
  return `${path}?mensaje=${encodeURIComponent(message)}`;
}

export async function login(formData: FormData) {
  const email = value(formData, 'email');
  const password = value(formData, 'password');
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect(withMessage('/login', 'No se pudo iniciar sesión. Revisa el correo y la contraseña.'));
  redirect('/area-socios');
}

export async function register(formData: FormData) {
  const firstName = value(formData, 'first_name');
  const lastName = value(formData, 'last_name');
  const email = value(formData, 'email');
  const password = value(formData, 'password');
  const confirmPassword = value(formData, 'confirm_password');

  if (!firstName || !lastName || !email || password.length < 8) {
    redirect(withMessage('/registro', 'Completa todos los campos y usa una contraseña de al menos 8 caracteres.'));
  }
  if (password !== confirmPassword) redirect(withMessage('/registro', 'Las contraseñas no coinciden.'));

  const origin = (await headers()).get('origin') ?? '';
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
      emailRedirectTo: `${origin}/auth/callback?next=/area-socios`,
    },
  });

  if (error) redirect(withMessage('/registro', error.message));
  redirect(withMessage('/login', 'Solicitud creada. Revisa tu correo para confirmar la cuenta.'));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

export async function requestPasswordReset(formData: FormData) {
  const email = value(formData, 'email');
  const origin = (await headers()).get('origin') ?? '';
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/actualizar-clave`,
  });
  redirect(withMessage('/login', 'Si el correo existe, recibirás instrucciones para recuperar la contraseña.'));
}

export async function updatePassword(formData: FormData) {
  const password = value(formData, 'password');
  const confirmPassword = value(formData, 'confirm_password');
  if (password.length < 8 || password !== confirmPassword) {
    redirect(withMessage('/actualizar-clave', 'Las contraseñas deben coincidir y tener al menos 8 caracteres.'));
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(withMessage('/actualizar-clave', error.message));
  redirect(withMessage('/area-socios', 'Contraseña actualizada.'));
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) redirect('/login');

  const payload = {
    first_name: value(formData, 'first_name'),
    last_name: value(formData, 'last_name'),
    email_public: value(formData, 'email_public') || null,
    phone: value(formData, 'phone') || null,
    address: value(formData, 'address') || null,
    postal_code: value(formData, 'postal_code') || null,
    city: value(formData, 'city') || null,
    region: value(formData, 'region') || null,
    country: value(formData, 'country') || 'España',
    bio: value(formData, 'bio') || null,
    directory_visible: formData.get('directory_visible') === 'on',
    email_visible: formData.get('email_visible') === 'on',
    phone_visible: formData.get('phone_visible') === 'on',
  };

  const { error } = await supabase.from('members').update(payload).eq('id', user.id);
  if (error) redirect(withMessage('/area-socios/perfil', error.message));
  redirect(withMessage('/area-socios/perfil', 'Perfil actualizado correctamente.'));
}
