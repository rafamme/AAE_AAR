'use client';

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import * as tus from 'tus-js-client';
import { createClient } from '../../../lib/supabase/client';
import { supabasePublishableKey, supabaseUrl } from '../../../lib/supabase/config';

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
  progress: number;
  uploadState: 'ready' | 'uploading' | 'error';
  error?: string;
};

type ExistingMedia = MediaRow & { previewUrl: string | null };

const RESUMABLE_THRESHOLD = 6 * 1024 * 1024;
const MAX_IMAGE_OR_PDF_SIZE = 25 * 1024 * 1024;
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;
const TUS_CHUNK_SIZE = 6 * 1024 * 1024;

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

function maxSizeFor(mediaType: MediaRow['media_type']) {
  return mediaType === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_OR_PDF_SIZE;
}

function maxSizeLabel(mediaType: MediaRow['media_type']) {
  return mediaType === 'video' ? '500 MB' : '25 MB';
}

export default function MediaUploader({ contributionId, locked }: { contributionId: string; locked: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<ExistingMedia[]>([]);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const pendingRef = useRef<PendingFile[]>([]);
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

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => () => {
    pendingRef.current.forEach(item => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); });
  }, []);

  function updatePending(id: string, patch: Partial<PendingFile>) {
    setPending(current => current.map(item => item.id === id ? { ...item, ...patch } : item));
  }

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
      if (file.size > maxSizeFor(mediaType)) {
        errors.push(`${file.name}: supera ${maxSizeLabel(mediaType)}`);
        continue;
      }
      accepted.push({
        id: crypto.randomUUID(),
        file,
        mediaType,
        previewUrl: mediaType === 'document' ? null : URL.createObjectURL(file),
        progress: 0,
        uploadState: 'ready',
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

  async function resumableUpload(item: PendingFile, storagePath: string, accessToken: string) {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
    const endpoint = `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;

    return new Promise<void>((resolve, reject) => {
      const upload = new tus.Upload(item.file, {
        endpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${accessToken}`,
          apikey: supabasePublishableKey,
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        chunkSize: TUS_CHUNK_SIZE,
        metadata: {
          bucketName: 'member-files',
          objectName: storagePath,
          contentType: item.file.type || 'application/octet-stream',
          cacheControl: '3600',
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const progress = bytesTotal ? Math.round((bytesUploaded / bytesTotal) * 100) : 0;
          updatePending(item.id, { progress, uploadState: 'uploading', error: undefined });
        },
        onError: error => reject(error),
        onSuccess: () => {
          updatePending(item.id, { progress: 100, uploadState: 'uploading', error: undefined });
          resolve();
        },
      });

      void upload.findPreviousUploads().then(previousUploads => {
        if (previousUploads.length) upload.resumeFromPreviousUpload(previousUploads[0]);
        upload.start();
      }).catch(reject);
    });
  }

  async function uploadStorageFile(item: PendingFile, storagePath: string, accessToken: string) {
    updatePending(item.id, { uploadState: 'uploading', progress: 0, error: undefined });

    if (item.file.size > RESUMABLE_THRESHOLD) {
      await resumableUpload(item, storagePath, accessToken);
      return;
    }

    const { error } = await supabase.storage.from('member-files').upload(storagePath, item.file, {
      contentType: item.file.type,
      upsert: false,
    });
    if (error) throw error;
    updatePending(item.id, { progress: 100, uploadState: 'uploading', error: undefined });
  }

  async function uploadAll() {
    if (!pending.length) return setMessage('Selecciona una o varias fotos o vídeos.');
    setBusy(true);
    setMessage('');

    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();
    if (!user || !session?.access_token) {
      setBusy(false);
      return setMessage('La sesión ha caducado.');
    }

    let uploaded = 0;
    const failed: string[] = [];
    const completedIds = new Set<string>();
    const currentPending = [...pending];

    for (const item of currentPending) {
      const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120);
      const storagePath = `${user.id}/contributions/${contributionId}/${crypto.randomUUID()}-${safeName}`;

      try {
        await uploadStorageFile(item, storagePath, session.access_token);

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
          throw rowError;
        }

        uploaded += 1;
        completedIds.add(item.id);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Error de subida';
        updatePending(item.id, { uploadState: 'error', error: reason });
        failed.push(`${item.file.name}: ${reason}`);
      }
    }

    setPending(current => {
      current.filter(item => completedIds.has(item.id)).forEach(item => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return current.filter(item => !completedIds.has(item.id));
    });
    setBusy(false);
    setMessage(failed.length
      ? `${uploaded} archivo(s) añadidos. Los que fallaron permanecen preparados para reintentar.`
      : `${uploaded} archivo(s) añadidos correctamente.`);
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

  return <>
    <section className="contribution-media">
      <div className="media-upload-heading">
        <div>
          <h2>Fotos y vídeos del lugar</h2>
          <p className="muted">Añade varias imágenes o vídeos de una vez. Los archivos grandes se suben por partes y pueden continuar tras una interrupción.</p>
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
          <span>o arrástralos aquí · hasta 25 MB por foto/PDF y 500 MB por vídeo</span>
        </label>

        {pending.length > 0 && <div className="pending-media-panel">
          <div className="media-upload-heading"><div><strong>{pending.length} archivo{pending.length === 1 ? '' : 's'} preparado{pending.length === 1 ? '' : 's'}</strong><div className="muted">Los archivos de más de 6 MB usan carga reanudable.</div></div><button type="button" disabled={busy} onClick={() => void uploadAll()}>{busy ? 'Subiendo…' : `Subir ${pending.length}`}</button></div>
          <div className="media-preview-grid">
            {pending.map(item => <article className="media-preview-card" key={item.id}>
              {item.mediaType === 'image' && item.previewUrl && <img src={item.previewUrl} alt=""/>}
              {item.mediaType === 'video' && item.previewUrl && <video src={item.previewUrl} muted preload="metadata"/>}
              {item.mediaType === 'document' && <div className="media-file-placeholder">PDF</div>}
              <div className="media-preview-copy">
                <strong>{item.file.name}</strong>
                <span>{item.mediaType} · {formatSize(item.file.size)}</span>
                {item.uploadState === 'uploading' && <><progress max={100} value={item.progress}/><span>{item.progress}%</span></>}
                {item.uploadState === 'error' && <span>Falló: {item.error}</span>}
              </div>
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
    </section>
    <style jsx>{`
      .contribution-media{margin-top:22px;display:grid;gap:16px}
      .media-upload-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
      .media-upload-heading h2{margin:0 0 6px}
      .media-upload-heading p{margin:0}
      .media-dropzone{display:grid;place-items:center;gap:8px;min-height:170px;padding:24px;border:2px dashed #bdb4a7;border-radius:16px;background:#fff;text-align:center;cursor:pointer;transition:border-color .15s ease,background .15s ease,transform .15s ease}
      .media-dropzone:hover,.media-dropzone.dragging{border-color:#655f57;background:#eeeae3;transform:translateY(-1px)}
      .media-dropzone input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
      .media-dropzone strong{font-size:20px}
      .media-dropzone span{color:#746d64;font-size:14px}
      .pending-media-panel{display:grid;gap:14px;padding:18px;border:1px solid #ddd6cc;border-radius:16px;background:#eeeae3}
      .media-preview-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}
      .existing-media-grid{margin-top:4px}
      .media-preview-card{display:grid;grid-template-rows:auto 1fr auto;overflow:hidden;border:1px solid #ddd6cc;border-radius:14px;background:#fff}
      .media-preview-card img,.media-preview-card video,.media-file-placeholder{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background:#24211d}
      .media-file-placeholder{display:grid;place-items:center;color:#fff;font-size:28px;font-weight:800;letter-spacing:.08em}
      .media-preview-copy{display:grid;align-content:start;gap:7px;padding:13px;min-width:0}
      .media-preview-copy strong{overflow-wrap:anywhere}
      .media-preview-copy>span:not(.contribution-state){color:#746d64;font-size:13px}
      .media-preview-copy progress{width:100%;height:10px}
      .media-preview-card>button{margin:0 13px 13px;justify-self:start}
      @media (max-width:620px){.media-preview-grid{grid-template-columns:1fr 1fr}.media-preview-card>button{justify-self:stretch}.media-preview-copy strong{font-size:14px}}
      @media (max-width:440px){.media-preview-grid{grid-template-columns:1fr}}
    `}</style>
  </>;
}
