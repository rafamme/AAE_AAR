import Link from 'next/link';
import { createClient } from '../lib/supabase/server';
import { toggleFavorite, toggleWantToVisit } from '../app/patrimonio/actions';

export default async function SavePlaceControls({ locationId, monumentId }: { locationId?: string; monumentId?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div className="save-place-panel"><Link className="button-link secondary" href="/login">Inicia sesión para guardar</Link></div>;

  const { data: member } = await supabase.from('members').select('status').eq('id', user.id).single();
  if (member?.status !== 'active') return null;

  let query = supabase.from('member_saved_places').select('is_favorite,wants_to_visit').eq('member_id', user.id);
  query = locationId ? query.eq('location_id', locationId) : query.eq('monument_id', monumentId!);
  const { data: state } = await query.maybeSingle();
  const favorite = Boolean(state?.is_favorite);
  const wants = Boolean(state?.wants_to_visit);

  return <div className="save-place-panel">
    <form action={toggleFavorite}>
      {locationId && <input type="hidden" name="location_id" value={locationId}/>} {monumentId && <input type="hidden" name="monument_id" value={monumentId}/>}<input type="hidden" name="next" value={String(!favorite)}/>
      <button className={favorite ? '' : 'secondary'} type="submit">{favorite ? '★ Favorito' : '☆ Añadir a favoritos'}</button>
    </form>
    <form action={toggleWantToVisit}>
      {locationId && <input type="hidden" name="location_id" value={locationId}/>} {monumentId && <input type="hidden" name="monument_id" value={monumentId}/>}<input type="hidden" name="next" value={String(!wants)}/>
      <button className={wants ? '' : 'secondary'} type="submit">{wants ? '✓ Quiero visitar' : '＋ Quiero visitar'}</button>
    </form>
    <Link href="/area-socios/visitas">Mi planificación →</Link>
  </div>;
}
