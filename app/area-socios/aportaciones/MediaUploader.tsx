'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';

type MediaRow = {
  id: string;
  title: string | null;
  description: string | null;
  media_type: 'image' | 'video' | 'document';
  storage_path: string;
  status: string;
};

function detectType(file: File): MediaRow['media_type'] | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type === 'application/pdf') return 'document';
  return null;
}

export default function MediaUploader({ contributionId, locked }: { contributionId: string; locked: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<MediaRow[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from('contribution_media')
      .select('id,title,description,media_type,storage_path,status')
      .eq('contribution_id', contributionId)
      .order('created_at');
    setItems((data ?? []) as MediaRow[]);
  }

  useEffect(() => { void load(); }, [contributionId]);

  async function upload(formData: FormData) {
    setMessage('');
    const file = formData.get('file');
    const title = String(formData.get('title') || '').trim() || null;
    const description = String(formData.get('description') || '').trim() || null;
    if (!(file instanceof File) || file.size === 0) return setMessage('Selecciona un archivo.');
    const mediaType = detectType(file);
    if (!mediaType) return setMessage('Formato no admitido. Usa imagen, vídeo o PDF.');
    if (file.size > 25 * 1024 * 1024) return setMessage('El archivo supera el límite de 25 MB.');

    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return setMessage('La sesión ha caducado.'); }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120);
    const storagePath = `${user.id}/contributions/${contributionId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('member-files').upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) { setBusy(false); return setMessage(uploadError.message); }

    const { error: rowError } = await supabase.from('contribution_media').insert({
      contribution_id: contributionId,
      uploader_id: user.id,
      title,
      description,
      media_type: mediaType,
      storage_path: storagePath,
    });
    if (rowError) {
      await supabase.storage.from('member-files').remove([storagePath]);
      setBusy(false);
      return setMessage(rowError.message);
    }

    setBusy(false);
    setMessage('Archivo añadido a la aportación.');
    await load();
  }

  async function remove(item: MediaRow) {
    setBusy(true); setMessage('');
    const { error: storageError } = await supabase.storage.from('member-files').remove([item.storage_path]);
    if (storageError) { setBusy(false); return setMessage(storageError.message); }
    const { error } = await supabase.from('contribution_media').delete().eq('id', item.id);
    setBusy(false);
    setMessage(error ? error.message : 'Archivo eliminado.');
    if (!error) await load();
  }

  return <section className="contribution-media">
    <h2>Fotografías, vídeos y documentos</h2>
    <p className="muted">Los archivos se guardan de forma privada hasta que la aportación sea aprobada e incorporada al catálogo.</p>
    {message && <p className="notice">{message}</p>}
    {!locked && <form action={upload} className="contribution-form">
      <div className="form-row"><label>Título<input name="title" maxLength={160}/></label><label>Archivo<input name="file" type="file" accept="image/*,video/*,application/pdf" required/></label></div>
      <label>Descripción<textarea name="description" rows={2}/></label>
      <button type="submit" disabled={busy}>{busy ? 'Procesando…' : 'Añadir archivo'}</button>
    </form>}
    <div className="contribution-list">
      {items.length === 0 ? <div className="empty-state">No hay archivos adjuntos.</div> : items.map(item => <article className="contribution-card" key={item.id}>
        <div><span className="contribution-state">{item.media_type} · {item.status}</span><h3>{item.title || item.storage_path.split('/').pop()}</h3><p>{item.description || 'Sin descripción.'}</p></div>
        {!locked && item.status === 'draft' && <button type="button" className="secondary" disabled={busy} onClick={() => void remove(item)}>Eliminar</button>}
      </article>)}
    </div>
  </section>;
}
