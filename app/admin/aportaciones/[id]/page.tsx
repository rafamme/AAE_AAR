import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import { publishContributionToCatalog, reviewContribution } from '../../actions';

export default async function ReviewContributionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mensaje?: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: item } = await supabase.from('contributions').select('id,title,description,content,status,submitted_at,reviewed_at,contributor_id,location_id,monument_id,proposal_type,proposed_name,proposed_country,proposed_region,proposed_latitude,proposed_longitude,proposed_century,proposed_style,proposed_architectural_type,proposed_website_url,published_location_id,published_monument_id,catalog_published_at').eq('id', id).single();
  if (!item) notFound();

  const [{ data: member }, { data: location }, { data: monument }] = await Promise.all([
    supabase.from('members').select('first_name,last_name,member_number').eq('id', item.contributor_id).maybeSingle(),
    item.location_id ? supabase.from('locations').select('name').eq('id', item.location_id).maybeSingle() : Promise.resolve({ data: null }),
    item.monument_id ? supabase.from('monuments').select('name').eq('id', item.monument_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const { mensaje } = await searchParams;
  const pending = Boolean(item.submitted_at) && item.status === 'draft';
  const approved = item.status === 'published';
  const proposalLabel = item.proposal_type === 'new_location' ? 'Nueva localidad' : item.proposal_type === 'new_monument' ? 'Nuevo monumento' : 'Mejora de contenido existente';

  return <>
    <p><Link href="/admin/aportaciones">← Volver a aportaciones</Link></p>
    <header className="page-heading"><div><div className="contribution-state">{pending ? 'Pendiente de revisión' : item.catalog_published_at ? 'Incorporada al patrimonio' : item.status}</div><h1>{item.title}</h1><p>{member ? `${member.first_name} ${member.last_name}${member.member_number ? ` · Socio nº ${member.member_number}` : ''}` : 'Socio'}</p></div></header>
    {mensaje && <p className="notice">{mensaje}</p>}
    <div className="admin-review-layout">
      <article className="detail-copy"><h2>Resumen</h2><p>{item.description || 'Sin resumen.'}</p><h2>Contenido propuesto</h2><p className="prewrap">{item.content || 'Sin contenido.'}</p>{item.proposed_name && <><h2>Datos patrimoniales propuestos</h2><dl><div><dt>Nombre</dt><dd>{item.proposed_name}</dd></div>{item.proposed_country&&<div><dt>País</dt><dd>{item.proposed_country}</dd></div>}{item.proposed_region&&<div><dt>Región</dt><dd>{item.proposed_region}</dd></div>}{item.proposed_latitude!=null&&<div><dt>Coordenadas</dt><dd>{item.proposed_latitude}, {item.proposed_longitude}</dd></div>}{item.proposed_century&&<div><dt>Siglo</dt><dd>{item.proposed_century}</dd></div>}{item.proposed_style&&<div><dt>Estilo</dt><dd>{item.proposed_style}</dd></div>}{item.proposed_architectural_type&&<div><dt>Tipo</dt><dd>{item.proposed_architectural_type}</dd></div>}</dl></>}</article>
      <aside className="facts-card"><h2>Referencia</h2><dl><div><dt>Tipo</dt><dd>{proposalLabel}</dd></div><div><dt>Localidad existente</dt><dd>{location?.name || '—'}</dd></div><div><dt>Monumento existente</dt><dd>{monument?.name || '—'}</dd></div><div><dt>Enviado</dt><dd>{item.submitted_at ? new Date(item.submitted_at).toLocaleString('es-ES') : 'No enviado'}</dd></div><div><dt>Revisado</dt><dd>{item.reviewed_at ? new Date(item.reviewed_at).toLocaleString('es-ES') : '—'}</dd></div><div><dt>Catálogo</dt><dd>{item.catalog_published_at ? new Date(item.catalog_published_at).toLocaleString('es-ES') : 'Pendiente'}</dd></div></dl>
      {pending && <div className="review-actions"><form action={reviewContribution}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="decision" value="published"/><button type="submit">Aprobar aportación</button></form><form action={reviewContribution}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="decision" value="archived"/><button className="secondary" type="submit">Archivar</button></form></div>}
      {approved && !item.catalog_published_at && <form action={publishContributionToCatalog}><input type="hidden" name="id" value={item.id}/><button type="submit" className="full-width">Incorporar al patrimonio</button><p className="muted">Esta acción crea la nueva ficha o aplica el texto aprobado a la ficha existente y la hace visible en el catálogo.</p></form>}
      {item.catalog_published_at && <p className="notice">Contenido incorporado correctamente al patrimonio público.</p>}
      </aside>
    </div>
  </>;
}
