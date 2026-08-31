import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import { reviewContribution } from '../../actions';

export default async function ReviewContributionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mensaje?: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: item } = await supabase.from('contributions').select('id,title,description,content,status,submitted_at,reviewed_at,contributor_id,location_id,monument_id').eq('id', id).single();
  if (!item) notFound();

  const [{ data: member }, { data: location }, { data: monument }] = await Promise.all([
    supabase.from('members').select('first_name,last_name,member_number').eq('id', item.contributor_id).maybeSingle(),
    item.location_id ? supabase.from('locations').select('name').eq('id', item.location_id).maybeSingle() : Promise.resolve({ data: null }),
    item.monument_id ? supabase.from('monuments').select('name').eq('id', item.monument_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const { mensaje } = await searchParams;
  const pending = Boolean(item.submitted_at) && item.status === 'draft';

  return <>
    <p><Link href="/admin/aportaciones">← Volver a aportaciones</Link></p>
    <header className="page-heading"><div><div className="contribution-state">{pending ? 'Pendiente de revisión' : item.status}</div><h1>{item.title}</h1><p>{member ? `${member.first_name} ${member.last_name}${member.member_number ? ` · Socio nº ${member.member_number}` : ''}` : 'Socio'} </p></div></header>
    {mensaje && <p className="notice">{mensaje}</p>}
    <div className="admin-review-layout">
      <article className="detail-copy"><h2>Resumen</h2><p>{item.description || 'Sin resumen.'}</p><h2>Contenido</h2><p className="prewrap">{item.content || 'Sin contenido.'}</p></article>
      <aside className="facts-card"><h2>Referencia</h2><dl><div><dt>Localidad</dt><dd>{location?.name || '—'}</dd></div><div><dt>Monumento</dt><dd>{monument?.name || '—'}</dd></div><div><dt>Enviado</dt><dd>{item.submitted_at ? new Date(item.submitted_at).toLocaleString('es-ES') : 'No enviado'}</dd></div><div><dt>Revisado</dt><dd>{item.reviewed_at ? new Date(item.reviewed_at).toLocaleString('es-ES') : '—'}</dd></div></dl>{pending && <div className="review-actions"><form action={reviewContribution}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="decision" value="published"/><button type="submit">Publicar</button></form><form action={reviewContribution}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="decision" value="archived"/><button className="secondary" type="submit">Archivar</button></form></div>}</aside>
    </div>
  </>;
}
