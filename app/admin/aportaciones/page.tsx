import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';

export default async function AdminContributionsPage() {
  const supabase = await createClient();
  const { data: contributions } = await supabase.from('contributions').select('id,title,description,status,submitted_at,reviewed_at,contributor_id,location_id,monument_id').order('created_at', { ascending: false });
  const contributorIds = [...new Set((contributions ?? []).map((item) => item.contributor_id).filter(Boolean))];
  const { data: members } = contributorIds.length ? await supabase.from('members').select('id,first_name,last_name').in('id', contributorIds) : { data: [] as any[] };
  const names = new Map((members ?? []).map((member) => [member.id, `${member.first_name} ${member.last_name}`]));
  const pending = (contributions ?? []).filter((item) => item.submitted_at && item.status === 'draft');
  const reviewed = (contributions ?? []).filter((item) => item.status !== 'draft');

  const render = (item: any) => <Link className="contribution-card" href={`/admin/aportaciones/${item.id}`} key={item.id}><div><div className="contribution-state">{item.submitted_at && item.status === 'draft' ? 'Pendiente de revisión' : item.status}</div><h2>{item.title}</h2><p>{item.description || 'Sin resumen'} · {names.get(item.contributor_id) || 'Socio'}</p></div><span>→</span></Link>;

  return <>
    <header className="page-heading"><div><div className="muted">Administración · Editorial</div><h1>Aportaciones</h1><p>Revisa las propuestas enviadas por los socios antes de su publicación.</p></div></header>
    <section><h2>Pendientes ({pending.length})</h2><div className="contribution-list">{pending.length ? pending.map(render) : <div className="empty-state">No hay aportaciones pendientes de revisión.</div>}</div></section>
    <section className="admin-reviewed"><h2>Revisadas ({reviewed.length})</h2><div className="contribution-list">{reviewed.length ? reviewed.map(render) : <div className="empty-state">Todavía no hay aportaciones revisadas.</div>}</div></section>
  </>;
}
