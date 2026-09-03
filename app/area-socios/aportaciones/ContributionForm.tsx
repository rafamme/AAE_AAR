import Link from 'next/link';
import { saveContribution, submitContribution } from './actions';

type Choice = { id: string; name: string; location_id?: string };
type Contribution = {
  id: string; title: string; description: string | null; content: string | null;
  location_id: string | null; monument_id: string | null; submitted_at: string | null; status: string;
  proposal_type: string; proposed_name: string | null; proposed_country: string | null; proposed_region: string | null;
  proposed_latitude: number | null; proposed_longitude: number | null; proposed_century: string | null; proposed_style: string | null;
  proposed_architectural_type: string | null; proposed_website_url: string | null;
};

export default function ContributionForm({ contribution, locations, monuments, message }: { contribution?: Contribution; locations: Choice[]; monuments: Choice[]; message?: string }) {
  const locked = contribution ? Boolean(contribution.submitted_at) || contribution.status !== 'draft' : false;
  const type = contribution?.proposal_type ?? 'existing';
  return <>
    {message && <p className="notice">{message}</p>}
    {locked && <p className="notice">Esta aportación ya fue enviada o revisada y no puede editarse.</p>}
    <form action={saveContribution} className="contribution-form">
      {contribution && <input type="hidden" name="id" value={contribution.id} />}
      <label>Tipo de aportación<select name="proposal_type" defaultValue={type} disabled={locked}>
        <option value="existing">Mejora de contenido existente</option>
        <option value="new_location">Nueva localidad</option>
        <option value="new_monument">Nuevo monumento</option>
      </select></label>
      <p className="muted">Puedes mejorar una ficha existente o proponer patrimonio nuevo. Los campos que no correspondan al tipo elegido se ignorarán al publicar.</p>
      <label>Título<input name="title" required defaultValue={contribution?.title ?? ''} disabled={locked} /></label>
      <label>Resumen<textarea name="description" rows={3} defaultValue={contribution?.description ?? ''} disabled={locked} /></label>
      <div className="form-row">
        <label>Localidad existente<select name="location_id" defaultValue={contribution?.location_id ?? ''} disabled={locked}><option value="">Sin seleccionar</option>{locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Monumento existente<select name="monument_id" defaultValue={contribution?.monument_id ?? ''} disabled={locked}><option value="">Sin seleccionar</option>{monuments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      <fieldset><legend>Datos para patrimonio nuevo</legend>
        <label>Nombre propuesto<input name="proposed_name" defaultValue={contribution?.proposed_name ?? ''} disabled={locked}/></label>
        <div className="form-row"><label>País<input name="proposed_country" defaultValue={contribution?.proposed_country ?? ''} disabled={locked}/></label><label>Región<input name="proposed_region" defaultValue={contribution?.proposed_region ?? ''} disabled={locked}/></label></div>
        <div className="form-row"><label>Latitud<input type="number" step="any" min="-90" max="90" name="proposed_latitude" defaultValue={contribution?.proposed_latitude ?? ''} disabled={locked}/></label><label>Longitud<input type="number" step="any" min="-180" max="180" name="proposed_longitude" defaultValue={contribution?.proposed_longitude ?? ''} disabled={locked}/></label></div>
        <div className="form-row"><label>Siglo<input name="proposed_century" defaultValue={contribution?.proposed_century ?? ''} disabled={locked}/></label><label>Estilo<input name="proposed_style" defaultValue={contribution?.proposed_style ?? ''} disabled={locked}/></label></div>
        <div className="form-row"><label>Tipo arquitectónico<input name="proposed_architectural_type" defaultValue={contribution?.proposed_architectural_type ?? ''} disabled={locked}/></label><label>Web de referencia<input type="url" name="proposed_website_url" defaultValue={contribution?.proposed_website_url ?? ''} disabled={locked}/></label></div>
      </fieldset>
      <label>Contenido<textarea name="content" rows={12} defaultValue={contribution?.content ?? ''} disabled={locked} /></label>
      {!locked && <div className="form-actions"><button type="submit">Guardar borrador</button><Link className="button-link secondary" href="/area-socios/aportaciones">Volver</Link></div>}
    </form>
    {contribution && !locked && <form action={submitContribution} className="submit-contribution"><input type="hidden" name="id" value={contribution.id} /><p>La revisión editorial comprobará los datos antes de incorporarlos al catálogo público.</p><button type="submit">Enviar a revisión</button></form>}
    {locked && <p><Link href="/area-socios/aportaciones">← Volver a mis aportaciones</Link></p>}
  </>;
}
