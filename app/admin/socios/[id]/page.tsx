import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import { getSiteControl } from '../../../../lib/site-control';
import { approveMember, rejectMember, setMemberRole, updateMember } from '../../actions';

export default async function AdminMemberDetailPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{mensaje?:string}>}){
  const [{id},{mensaje},supabase,control]=await Promise.all([params,searchParams,createClient(),getSiteControl()]);
  const fullTestAccess=control.enabled('testing.full_access');
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/login');
  const {data:myRoles}=await supabase.from('member_roles').select('role').eq('member_id',user.id);
  const myRoleSet=new Set((myRoles??[]).map(item=>item.role));
  const isSuperadmin=fullTestAccess||myRoleSet.has('superadmin');
  if(!fullTestAccess&&!isSuperadmin&&!myRoleSet.has('admin')) redirect('/admin');

  const [{data:member},{data:roleRows}]=await Promise.all([
    supabase.from('members').select('id,member_number,first_name,last_name,email_public,phone,address,postal_code,city,region,country,bio,status,directory_visible,email_visible,phone_visible,joined_at,created_at,updated_at').eq('id',id).maybeSingle(),
    supabase.from('member_roles').select('role').eq('member_id',id),
  ]);
  if(!member) notFound();
  const roles=new Set((roleRows??[]).map(row=>row.role));
  const availableRoles=isSuperadmin?['superadmin','admin','editor','member'] as const:['admin','editor','member'] as const;
  const returnTo=`/admin/socios/${member.id}`;

  return <main className="admin-member-detail">
    <header className="page-heading">
      <div>
        <div className="muted">Administración · Ficha de socio</div>
        <h1>{member.first_name} {member.last_name}</h1>
        <p>{member.member_number?`Socio nº ${member.member_number}`:'Sin número de socio'} · Estado: <strong>{member.status}</strong></p>
      </div>
      <div className="form-actions"><Link className="button-link secondary" href="/admin/socios">← Volver al listado</Link><Link className="button-link secondary" href="/recuperar-clave">Restablecer contraseña</Link></div>
    </header>
    {mensaje&&<p className="notice">{mensaje}</p>}
    {fullTestAccess&&<p className="notice">Modo beta total activo: puedes revisar y modificar esta ficha durante las pruebas.</p>}

    <section className="admin-member-list">
      <article className="admin-member-card">
        <div className="admin-member-title"><div><div className="catalog-card-meta">Datos del socio</div><h2>Ficha personal y administrativa</h2><p>Alta, baja, modificación, contacto, domicilio, visibilidad y estado de la ficha.</p></div></div>
        <form action={updateMember} className="profile-form">
          <input type="hidden" name="id" value={member.id}/><input type="hidden" name="return_to" value={returnTo}/>
          <div className="form-row"><label>Nombre<input name="first_name" defaultValue={member.first_name} required/></label><label>Apellidos<input name="last_name" defaultValue={member.last_name} required/></label></div>
          <div className="form-row"><label>Nº socio<input type="number" min="1" name="member_number" defaultValue={member.member_number??''}/></label><label>Estado<select name="status" defaultValue={member.status}><option value="pending">Pendiente</option><option value="active">Activo</option><option value="suspended">Suspendido</option><option value="inactive">Baja / inactivo</option></select></label><label>Fecha de alta<input type="date" name="joined_at" defaultValue={member.joined_at??''}/></label></div>
          <div className="form-row"><label>Email público<input type="email" name="email_public" defaultValue={member.email_public??''}/></label><label>Teléfono<input name="phone" defaultValue={member.phone??''}/></label></div>
          <label>Dirección<input name="address" defaultValue={member.address??''}/></label>
          <div className="form-row"><label>Código postal<input name="postal_code" defaultValue={member.postal_code??''}/></label><label>Localidad<input name="city" defaultValue={member.city??''}/></label><label>Región / provincia<input name="region" defaultValue={member.region??''}/></label><label>País<input name="country" defaultValue={member.country??''}/></label></div>
          <label>Biografía / notas públicas<textarea name="bio" rows={5} defaultValue={member.bio??''}/></label>
          <input type="hidden" name="manage_directory_visible" value="1"/><input type="hidden" name="manage_email_visible" value="1"/><input type="hidden" name="manage_phone_visible" value="1"/>
          <div className="form-row"><label className="check"><input type="checkbox" name="directory_visible" defaultChecked={member.directory_visible}/> Visible en directorio</label><label className="check"><input type="checkbox" name="email_visible" defaultChecked={member.email_visible}/> Mostrar email</label><label className="check"><input type="checkbox" name="phone_visible" defaultChecked={member.phone_visible}/> Mostrar teléfono</label></div>
          <button type="submit">Guardar ficha completa</button>
        </form>
        {member.status==='pending'&&<div className="role-actions">
          <form action={approveMember}><input type="hidden" name="id" value={member.id}/><input type="hidden" name="return_to" value={returnTo}/><button type="submit">Aprobar alta y asignar nº</button></form>
          <form action={rejectMember}><input type="hidden" name="id" value={member.id}/><input type="hidden" name="return_to" value={returnTo}/><button className="secondary" type="submit">Rechazar / dar de baja</button></form>
        </div>}
      </article>

      <article className="admin-member-card">
        <div className="admin-member-title"><div><div className="catalog-card-meta">Permisos</div><h2>Roles del socio</h2><p>Los roles determinan las capacidades administrativas y editoriales. Un socio puede acumular varios roles.</p></div></div>
        <div className="role-actions">
          {availableRoles.map(role=>{const enabled=roles.has(role);return <form action={setMemberRole} key={role}><input type="hidden" name="member_id" value={member.id}/><input type="hidden" name="return_to" value={returnTo}/><input type="hidden" name="role" value={role}/><input type="hidden" name="enabled" value={enabled?'false':'true'}/><button className={enabled?'secondary':''} type="submit">{enabled?`Quitar ${role}`:`Dar ${role}`}</button></form>;})}
        </div>
        <p className="muted">Roles actuales: {[...roles].join(', ')||'ninguno'}.</p>
      </article>

      <article className="admin-member-card">
        <div className="admin-member-title"><div><div className="catalog-card-meta">Ciclo de vida</div><h2>Alta, suspensión y baja</h2><p>La baja administrativa se realiza poniendo el estado en «Baja / inactivo». Así se conserva el historial y puede reactivarse la ficha posteriormente.</p></div></div>
        <div className="admin-stats"><article><strong>{member.status}</strong><span>Estado actual</span></article><article><strong>{member.joined_at??'—'}</strong><span>Fecha de alta</span></article><article><strong>{new Date(member.created_at).toLocaleDateString('es-ES')}</strong><span>Ficha creada</span></article><article><strong>{new Date(member.updated_at).toLocaleDateString('es-ES')}</strong><span>Última modificación</span></article></div>
      </article>
    </section>
  </main>;
}
