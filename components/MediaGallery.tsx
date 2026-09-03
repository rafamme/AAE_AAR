'use client';

import { useState } from 'react';
import type { CatalogMedia } from '../lib/catalog';
import { publicMediaUrl } from '../lib/catalog';

function embedUrl(url:string){
  try{
    const u=new URL(url);
    if(u.hostname.includes('youtube.com')){const id=u.searchParams.get('v');return id?`https://www.youtube.com/embed/${id}`:null;}
    if(u.hostname==='youtu.be'){const id=u.pathname.split('/').filter(Boolean)[0];return id?`https://www.youtube.com/embed/${id}`:null;}
    if(u.hostname.includes('vimeo.com')){const id=u.pathname.split('/').filter(Boolean).pop();return id?`https://player.vimeo.com/video/${id}`:null;}
  }catch{}
  return null;
}

export default function MediaGallery({media,subject}:{media:CatalogMedia[];subject:string}){
  const images=media.filter(item=>item.media_type==='image').map(item=>({...item,src:publicMediaUrl(item.storage_path)??item.external_url})).filter(item=>Boolean(item.src));
  const videos=media.filter(item=>item.media_type==='video');
  const featured=images.find(item=>item.is_featured)??images[0];
  const [active,setActive]=useState<(typeof images)[number]|null>(null);

  return <>
    {featured&&<button type="button" className="featured-media" onClick={()=>setActive(featured)} aria-label="Ampliar imagen destacada">
      <img src={featured.src!} alt={featured.title??subject}/>
      <span><strong>{featured.title??subject}</strong>{featured.description&&<small>{featured.description}</small>}</span>
    </button>}

    {images.length>1&&<section className="media-grid" aria-label="Galería de imágenes">{images.filter(item=>item.id!==featured?.id).map(item=><button type="button" className="media-card media-button" key={item.id} onClick={()=>setActive(item)}>
      <img src={item.src!} alt={item.title??subject}/>
      {(item.title||item.description)&&<span className="media-caption">{item.title&&<strong>{item.title}</strong>}{item.description&&<small>{item.description}</small>}</span>}
    </button>)}</section>}

    {videos.length>0&&<section className="video-section"><div className="section-heading"><div><div className="eyebrow">Audiovisual</div><h2>Vídeos</h2></div></div><div className="video-grid">{videos.map(item=>{
      const direct=publicMediaUrl(item.storage_path);const embed=item.external_url?embedUrl(item.external_url):null;
      return <article className="video-card" key={item.id}>{direct?<video controls preload="metadata" src={direct}/>:embed?<iframe src={embed} title={item.title??subject} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>:item.external_url?<a className="button-link secondary" href={item.external_url} target="_blank" rel="noreferrer">Abrir vídeo</a>:null}{(item.title||item.description)&&<div className="video-copy">{item.title&&<strong>{item.title}</strong>}{item.description&&<p>{item.description}</p>}</div>}</article>;
    })}</div></section>}

    {active&&<div className="lightbox" role="dialog" aria-modal="true" aria-label="Imagen ampliada" onClick={()=>setActive(null)}><button type="button" className="lightbox-close" onClick={()=>setActive(null)} aria-label="Cerrar">×</button><figure onClick={event=>event.stopPropagation()}><img src={active.src!} alt={active.title??subject}/>{(active.title||active.description)&&<figcaption>{active.title&&<strong>{active.title}</strong>}{active.description&&<span>{active.description}</span>}</figcaption>}</figure></div>}
  </>;
}
