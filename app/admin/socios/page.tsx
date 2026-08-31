import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { setMemberRole, updateMember } from '../actions';

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<{ mensaje?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: myRoles } = await supabase.from('member_roles').select('role').eq('member_id', user.id);
  if (!(myRoles ?? []).some((item) => item.role === 'admin')) redirect('/admin');

  const [{ data: members }, { data: roleRows }] = await Promise.all([
    supabase.from('members').select('id,member_number,first_name,last_name,status,email_public,joined_at,created_at').order('created_at', { ascending: true }),
    supabase.from('member_roles').select('member_id,role'),
  ]);
  const rolesByMember = new Map<string, Set<string>>();
  for (const row of roleRows ?? []) {
    if (!rolesByMember.has(row.member_id)) rolesByMember.set(row.member_id, new Set());
    rolesByMember.get(row.member_id)!.add(row.role);
  }
  const { mensaje } = await searchParams;

  return <>
    <header className="page-heading"><div><div className="muted">Administración</div><h1>Socios y permisos</h1><p>Valida altas, asigna número de socio y controla roles internos.</p></div></header>
    {mensaje && <p className="notice">{mensaje}</p>}
    <section className="admin-member-list">
      {(members ?? []).map((member) => {
        const roles = rolesByMember.get(member.id) ?? new Set<string>();
        return <article className="admin-member-card" key={member.id}>
          <div className="admin-member-title"><div><div className="catalog-card-meta">{member.member_number ? `Socio nº ${member.member_number}` : 'Sin número'}</div><h2>{member.first_name} {member.last_name}</h2><p>{member.email_public || 'Sin email público'} · Estado: <strong>{member.status}</strong></p></div></div>
          <form action={updateMember} className="admin-inline-form">
            <input type="hidden" name="id" value={member.id}/>
            <label>Nº socio<input type="number" min="1" name="member_number" defaultValue={member.member_number ?? ''}/></label>
            <label>Estado<select name="status" defaultValue={member.status}><option value="pending">pending</option><option value="active">active</option><option value="suspended">suspended</option><option value="inactive">inactive</option></select></label>
            <label>Fecha de alta<input type="date" name="joined_at" defaultValue={member.joined_at ?? ''}/></label>
            <button type="submit">Guardar</button>
          </form>
          <div className="role-actions">
            {(['admin','editor','member'] as const).map((role) => {
              const enabled = roles.has(role);
              return <form action={setMemberRole} key={role}><input type="hidden" name="member_id" value={member.id}/><input type="hidden" name="role" value={role}/><input type="hidden" name="enabled" value={enabled ? 'false' : 'true'}/><button className={enabled ? 'secondary' : ''} type="submit">{enabled ? `Quitar ${role}` : `Dar ${role}`}</button></form>;
            })}
          </div>
        </article>;
      })}
    </section>
  </>;
}
