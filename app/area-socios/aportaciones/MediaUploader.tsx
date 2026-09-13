'use client';

import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';

type MediaRow = {
  id: string;
  title: string | null;
  description: string | null;
  media_type: 'image' | 'video' | 'document';
  storage_path: string;
  status: string;
};

type PendingFile = {
  id: string;
  file: File;
  mediaType: MediaRow['media_type'];
  previewUrl: string | null;
};

type ExistingMedia = MediaRow & { previewUrl: string | null };

const MAX_FILE_SIZE = 25 * 1024 * 1024;

function detectType(file: File): MediaRow['media_type'] | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type === 'application/pdf') return 'document';
  return null;
}

function displayName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function MediaUploader({ contributionId, locked }: { contributionId: string; locked: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<ExistingMedia[]>([]);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function load() {
    const { data } = await supabase.from('contribution_media')
      .select('id,title,description,media_type,storage_path,status')
      .eq('contribution_id', contributionId)
      .order('created_at');

    const rows = (data ?? []) as MediaRow[];
    const enriched = await Promise.all(rows.map(async item => {
      if (item.media_type === 'document') return { ...item, previewUrl: null };
      const { data: signed } = await supabase.storage.from('member-files').createSignedUrl(item.storage_path, 3600);
      return { ...item, previewUrl: signed?.signedUrl ?? null };
    }));
    setItems(enriched);
  }

  useEffect(() => { void load(); }, [contributionId]);

  useEffect(() => () => {
    pending.forEach(item => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); });
  }, [pending]);

  function addFiles(files: File[]) {
    setMessage('');
    const accepted: PendingFile[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const mediaType = detectType(file);
      if (!mediaType) {
        errors.push(`${file.name}: formato no admitido`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: supera 25 MB`);
        continue;
      }
      accepted.push({
        id: crypto.randomUUID(),
        file,
        mediaType,
        previewUrl: mediaType === 'document' ? null : URL.createObjectURL(file),
      });
    }

    if (accepted.length) setPending(current => [...current, ...accepted]);
    if (errors.length) setMessage(errors.join(' · '));
  }

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  }

  function dropFiles(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files ?? []));
  }

  function removePending(id: string) {
    setPending(current => {
      const item = current.find(entry => entry.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return current.filter(entry => entry.id !== id);
    });
  }

  async function uploadAll() {
    if (!pending.length) return setMessage('Selecciona una o varias fotos o vídeos.');
    setBusy(true);
    setMessage('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return setMessage('La sesión ha caducado.');
    }

    let uploaded = 0;
    const failed: string[] = [];

    for (const item of pending) {
      const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120);
      const storagePath = `${user.id}/contributions/${contributionId}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from('member-files').upload(storagePath, item.file, {
        contentType: item.file.type,
        upsert: false,
      });

      if (uploadError) {
        failed.push(`${item.file.name}: ${uploadError.message}`);
        continue;
      }

      const { error: rowError } = await supabase.from('contribution_media').insert({
        contribution_id: contributionId,
        uploader_id: user.id,
        title: displayName(item.file.name) || item.file.name,
        description: null,
        media_type: item.mediaType,
        storage_path: storagePath,
      });

      if (rowError) {
        await supabase.storage.from('member-files').remove([storagePath]);
        failed.push(`${item.file.name}: ${rowError.message}`);
        continue;
      }
      uploaded += 1;
    }

    pending.forEach(item => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); });
    setPending([]);
    setBusy(false);
    setMessage(failed.length ? `${uploaded} archivo(s) añadidos. ${failed.join(' · ')}` : `${uploaded} archivo(s) añadidos correctamente.`);
    await load();
  }

  async function remove(item: ExistingMedia) {
    setBusy(true);
    setMessage('');
    const { error } = await supabase.from('contribution_media').delete().eq('id', item.id);
    if (error) {
      setBusy(false);
      return setMessage(error.message);
    }
    const { error: storageError } = await supabase.storage.from('member-files').remove([item.storage_path]);
    setBusy(false);
    setMessage(storageError ? `Registro eliminado, pero no se pudo borrar el archivo: ${storageError.message}` : 'Archivo eliminado.');
    await load();
  }

  return <section className="contribution-media">
    <div className="media-upload-heading">
      <div>
        <h2>Fotos y vídeos del lugar</h2>
        <p className="muted">Añade varias imágenes o vídeos de una vez. También puedes adjuntar un PDF si aporta información útil.</p>
      </div>
      <span className="contribution-state">{items.length} archivo{items.length === 1 ? '' : 's'}</span>
    </div>

    {message && <p className="notice">{message}</p>}

    {!locked && <>
      <label
        className={`media-dropzone${dragging ? ' dragging' : ''}`}
        onDragOver={event => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={dropFiles}
      >
        <input type="file" accept="image/*,video/*,application/pdf" multiple onChange={chooseFiles} disabled={busy}/>
        <strong>Seleccionar fotos o vídeos</strong>
        <span>o arrástralos aquí · selección múltiple · máximo 25 MB por archivo</span>
      </label>

      {pending.length > 0 && <div className="pending-media-panel">
        <div className="media-upload-heading"><div><strong>{pending.length} archivo{pending.length === 1 ? '' : 's'} preparado{pending.length === 1 ? '' : 's'}</strong><div className="muted">Revísalos antes de incorporarlos a la aportación.</div></div><button type="button" disabled={busy} onClick={() => void uploadAll()}>{busy ? 'Subiendo…' : `Subir ${pending.length}`}</button></div>
        <div className="media-preview-grid">
          {pending.map(item => <article className="media-preview-card" key={item.id}>
            {item.mediaType === 'image' && item.previewUrl && <img src={item.previewUrl} alt=""/>}
            {item.mediaType === 'video' && item.previewUrl && <video src={item.previewUrl} muted preload="metadata"/>}
            {item.mediaType === 'document' && <div className="media-file-placeholder">PDF</div>}
            <div className="media-preview-copy"><strong>{item.file.name}</strong><span>{item.mediaType} · {formatSize(item.file.size)}</span></div>
            <button type="button" className="secondary" disabled={busy} onClick={() => removePending(item.id)}>Quitar</button>
          </article>)}
        </div>
      </div>}
    </>}

    <div className="media-preview-grid existing-media-grid">
      {items.length === 0 ? <div className="empty-state">Aún no hay fotos ni vídeos. Añadirlos ayuda a documentar visualmente el lugar.</div> : items.map(item => <article className="media-preview-card" key={item.id}>
        {item.media_type === 'image' && item.previewUrl && <img src={item.previewUrl} alt={item.title ?? 'Fotografía de la aportación'}/>} 
        {item.media_type === 'video' && item.previewUrl && <video src={item.previewUrl} controls preload="metadata"/>}
        {item.media_type === 'document' && <div className="media-file-placeholder">PDF</div>}
        <div className="media-preview-copy"><span className="contribution-state">{item.media_type} · {item.status}</span><strong>{item.title || item.storage_path.split('/').pop()}</strong>{item.description && <span>{item.description}</span>}</div>
        {!locked && item.status === 'draft' && <button type="button" className="secondary" disabled={busy} onClick={() => void remove(item)}>Eliminar</button>}
      </article>)}
    </div>
  </section>;
}
