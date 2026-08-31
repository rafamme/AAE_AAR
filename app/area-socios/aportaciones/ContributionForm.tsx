import Link from 'next/link';
import { saveContribution, submitContribution } from './actions';

type Choice = { id: string; name: string; location_id?: string };
type Contribution = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  location_id: string | null;
  monument_id: string | null;
  submitted_at: string | null;
  status: string;
};

export default function ContributionForm({ contribution, locations, monuments, message }: {
  contribution?: Contribution;
  locations: Choice[];
  monuments: Choice[];
  message?: string;
}) {
  const locked = contribution ? Boolean(contribution.submitted_at) || contribution.status !== 'draft' : false;
  return <>
    {message && <p className="notice">{message}</p>}
    {locked && <p className="notice">Esta aportación ya fue enviada o revisada y no puede editarse.</p>}
    <form action={saveContribution} className="contribution-form">
      {contribution && <input type="hidden" name="id" value={contribution.id} />}
      <label>Título<input name="title" required defaultValue={contribution?.title ?? ''} disabled={locked} /></label>
      <label>Resumen<textarea name="description" rows={3} defaultValue={contribution?.description ?? ''} disabled={locked} /></label>
      <div className="form-row">
        <label>Localidad<select name="location_id" defaultValue={contribution?.location_id ?? ''} disabled={locked}><option value="">Sin seleccionar</option>{locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Monumento<select name="monument_id" defaultValue={contribution?.monument_id ?? ''} disabled={locked}><option value="">Sin seleccionar</option>{monuments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      <label>Contenido<textarea name="content" rows={12} defaultValue={contribution?.content ?? ''} disabled={locked} /></label>
      {!locked && <div className="form-actions"><button type="submit">Guardar borrador</button><Link className="button-link secondary" href="/area-socios/aportaciones">Volver</Link></div>}
    </form>
    {contribution && !locked && <form action={submitContribution} className="submit-contribution"><input type="hidden" name="id" value={contribution.id} /><p>Para enviar a revisión son obligatorios título, resumen, contenido y al menos una localidad o monumento.</p><button type="submit">Enviar a revisión</button></form>}
    {locked && <p><Link href="/area-socios/aportaciones">← Volver a mis aportaciones</Link></p>}
  </>;
}
