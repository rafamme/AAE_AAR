import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { getSiteControl } from '../../../lib/site-control';
import { approveMember, rejectMember, setMemberRole, updateMember } from '../actions';

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<{ mensaje?: string; estado?: string }> }) {
  const [supabase, control] = await Promise.all([createClient(), getSiteControl()]);
  const fullTestAccess = control.enabled('testing.full_access');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: myRoles } = await supabase.from('member_roles').select('role').eq('member_id', user.id);
  const myRoleSet = new Set((myRoles ?? []).map((item) => item.role));
  const isSuperadmin = fullTestAccess || myRoleSet.has('superadmin');
  if (!fullTestAccess && !isSuperadmin && !myRoleSet.has('admin')) redirect('/admin');

  const params = await searchParams;
  const statusFilter = ['pending','active','suspended','inactive'].includes(params.estado || '') ? params.estado! : '';
  let membersQuery = supabase.from('members').select('id,member_number,first_name,last_name,status,email_public,joined_at,created_at').order('created_at', { ascending: true });
  if (statusFilter) membersQuery = membersQuery.eq('status', statusFilter);
  const [{ data: members }, { data: roleRows }, { data: allMembers }] = await Promise.all([
    membersQuery,
    supabase.from('member_roles').select('member_id,role'),
    supabase.from('members').select('status'),
  ]);
  const rolesByMember = new Map<string, Set<string>>();
  for (const row of roleRows ?? []) {
    if (!rolesByMember.has(row.member_id)) rolesByMember.set(row.member_id, new Set());
    rolesByMember.get(row.member_id)!.add(row.role);
  }
  const counts = (allMembers ?? []).reduce((acc: Record<string, number>, item) => { acc[item.status] = (acc[item.status] || 0) + 1; return acc; }, {});

  return <>
    <header className="page-heading"><div><div className="muted">Administración · FASE 4.1</div><h1>Socios y altas</h1><p>Revisa solicitudes, aprueba altas con numeración automática y controla estados y permisos.</p></div></header>
    {fullTestAccess && <p className="notice">Modo beta total: esta gestión está habilitada para la identidad anónima de pruebas.</p>}
    {params.mensaje && <p className="notice">{params.mensaje}</p>}
    <nav className="admin-nav">
      <a href="/admin/socios">Todos ({allMembers?.length ?? 0})</a>
      <a href="/admin/socios?estado=pending">Pendientes ({counts.pending ?? 0})</a>
      <a href="/admin/socios?estado=active">Activos ({counts.active ?? 0})</a>
      <a href="/admin/socios?estado=suspended">Suspendidos ({counts.suspended ?? 0})</a>
      <a href="/admin/socios?estado=inactive">Inactivos ({counts.inactive ?? 0})</a>
    </nav>
    {isSuperadmin && <p className="notice">El rol <strong>superadmin</strong> concede acceso al control global del portal. La base de datos impide eliminar el último superadministrador activo.</p>}
    <section className="admin-member-list">
      {(members ?? []).map((member) => {
        const roles = rolesByMember.get(member.id) ?? new Set<string>();
        const availableRoles = isSuperadmin ? ['superadmin','admin','editor','member'] as const : ['admin','editor','member'] as const;
        return <article className="admin-member-card" key={member.id}>
          <div className="admin-member-title"><div><div className="catalog-card-meta">{member.member_number ? `Socio nº ${member.member_number}` : member.status === 'pending' ? 'Solicitud pendiente' : 'Sin número'}</div><h2>{member.first_name} {member.last_name}</h2><p>{member.email_public || 'Sin email público'} · Estado: <strong>{member.status}</strong></p></div></div>
          {member.status === 'pending' && <div className="role-actions">
            <form action={approveMember}><input type="hidden" name="id" value={member.id}/><button type="submit">Aprobar alta y asignar nº</button></form>
            <form action={rejectMember}><input type="hidden" name="id" value={member.id}/><button className="secondary" type="submit">Rechazar solicitud</button></form>
          </div>}
          <form action={updateMember} className="admin-inline-form">
            <input type="hidden" name="id" value={member.id}/>
            <label>Nº socio<input type="number" min="1" name="member_number" defaultValue={member.member_number ?? ''}/></label>
            <label>Estado<select name="status" defaultValue={member.status}><option value="pending">Pendiente</option><option value="active">Activo</option><option value="suspended">Suspendido</option><option value="inactive">Inactivo</option></select></label>
            <label>Fecha de alta<input type="date" name="joined_at" defaultValue={member.joined_at ?? ''}/></label>
            <button type="submit">Guardar</button>
          </form>
          <div className="role-actions">
            {availableRoles.map((role) => {
              const enabled = roles.has(role);
              return <form action={setMemberRole} key={role}><input type="hidden" name="member_id" value={member.id}/><input type="hidden" name="role" value={role}/><input type="hidden" name="enabled" value={enabled ? 'false' : 'true'}/><button className={enabled ? 'secondary' : ''} type="submit">{enabled ? `Quitar ${role}` : `Dar ${role}`}</button></form>;
            })}
          </div>
        </article>;
      })}
      {(members ?? []).length === 0 && <div className="empty-state">No hay socios en este estado.</div>}
    </section>
  </>;
}
