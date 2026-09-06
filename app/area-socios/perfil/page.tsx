import Link from 'next/link';
import { redirect } from 'next/navigation';
import { updateProfile } from '../../auth/actions';
import { createClient } from '../../../lib/supabase/server';

export default async function ProfilePage({searchParams}:{searchParams:Promise<{mensaje?:string}>}) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) redirect('/login');

  const { data: member } = await supabase
    .from('members')
    .select('member_number,first_name,last_name,email_public,phone,address,postal_code,city,region,country,bio,status,directory_visible,email_visible,phone_visible,joined_at')
    .eq('id', user.id)
    .single();
  if (!member) redirect('/area-socios');

  const { mensaje } = await searchParams;
  return <main className="wrap profile-page"><div className="page-heading"><div><div className="muted">AAE-AAR · Área privada</div><h1>Mi perfil</h1><p>Los campos administrativos se muestran solo como información.</p></div><Link href="/area-socios">← Área de socios</Link></div>{mensaje&&<p className="notice">{mensaje}</p>}<form action={updateProfile} className="profile-form"><section className="form-section"><h2>Identidad</h2><div className="form-row"><label>N.º de socio<input value={member.member_number ?? 'Pendiente'} readOnly disabled/></label><label>Estado<input value={member.status} readOnly disabled/></label><label>Fecha de alta<input value={member.joined_at ?? 'Pendiente'} readOnly disabled/></label></div><div className="form-row"><label>Nombre<input name="first_name" defaultValue={member.first_name} required/></label><label>Apellidos<input name="last_name" defaultValue={member.last_name} required/></label></div></section><section className="form-section"><h2>Contacto</h2><div className="form-row"><label>Email público<input name="email_public" type="email" defaultValue={member.email_public ?? ''}/></label><label>Teléfono<input name="phone" defaultValue={member.phone ?? ''}/></label></div><label>Dirección<input name="address" defaultValue={member.address ?? ''}/></label><div className="form-row"><label>Código postal<input name="postal_code" defaultValue={member.postal_code ?? ''}/></label><label>Ciudad<input name="city" defaultValue={member.city ?? ''}/></label><label>Región<input name="region" defaultValue={member.region ?? ''}/></label><label>País<input name="country" defaultValue={member.country ?? 'España'}/></label></div></section><section className="form-section"><h2>Perfil</h2><label>Biografía<textarea name="bio" rows={6} defaultValue={member.bio ?? ''}/></label></section><section className="form-section"><h2>Privacidad</h2><label className="check"><input name="directory_visible" type="checkbox" defaultChecked={member.directory_visible}/> Aparecer en el directorio de socios</label><label className="check"><input name="email_visible" type="checkbox" defaultChecked={member.email_visible}/> Mostrar mi email a otros socios</label><label className="check"><input name="phone_visible" type="checkbox" defaultChecked={member.phone_visible}/> Mostrar mi teléfono a otros socios</label></section><button type="submit">Guardar cambios</button></form></main>;
}
