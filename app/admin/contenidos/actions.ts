'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';

const allowed = new Set(['locations','monuments','posts','events','media']);

async function editorContext(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/login');
  const {data:roles}=await supabase.from('member_roles').select('role').eq('member_id',user.id);
  if(!(roles??[]).some((r)=>r.role==='admin'||r.role==='editor')) redirect('/area-socios?mensaje=No%20tienes%20permisos%20editoriales.');
  return {supabase,user};
}

function text(fd:FormData,key:string){const v=String(fd.get(key)??'').trim();return v||null;}
function num(fd:FormData,key:string){const raw=String(fd.get(key)??'').trim();return raw===''?null:Number(raw);}
function status(fd:FormData){const v=String(fd.get('status')??'draft');return ['draft','published','archived'].includes(v)?v:'draft';}

export async function saveContent(formData:FormData){
  const type=String(formData.get('type')??'');
  if(!allowed.has(type)) redirect('/admin/contenidos?mensaje=Tipo%20no%20válido.');
  const id=text(formData,'id');
  const {supabase,user}=await editorContext();
  let payload:Record<string,unknown>={status:status(formData)};

  if(type==='locations') payload={...payload,name:text(formData,'name'),country:text(formData,'country')??'España',region:text(formData,'region'),description:text(formData,'description'),latitude:num(formData,'latitude'),longitude:num(formData,'longitude')};
  if(type==='monuments') payload={...payload,location_id:text(formData,'location_id'),name:text(formData,'name'),description:text(formData,'description'),century:text(formData,'century'),style:text(formData,'style'),architectural_type:text(formData,'architectural_type'),heritage_reference:text(formData,'heritage_reference'),website_url:text(formData,'website_url')};
  if(type==='posts') payload={...payload,title:text(formData,'title'),excerpt:text(formData,'excerpt'),body:text(formData,'body'),published_at:status(formData)==='published'?(text(formData,'published_at')??new Date().toISOString()):null};
  if(type==='events') payload={...payload,title:text(formData,'title'),description:text(formData,'description'),starts_at:text(formData,'starts_at'),ends_at:text(formData,'ends_at'),location_id:text(formData,'location_id'),capacity:num(formData,'capacity')};
  if(type==='media') payload={...payload,location_id:text(formData,'location_id'),monument_id:text(formData,'monument_id'),title:text(formData,'title'),description:text(formData,'description'),media_type:text(formData,'media_type')??'image',external_url:text(formData,'external_url'),thumbnail_path:text(formData,'thumbnail_path'),sort_order:num(formData,'sort_order')??0};

  if(!id){
    if(type==='locations'||type==='monuments'||type==='events') payload.created_by=user.id;
    if(type==='posts') payload.author_id=user.id;
    if(type==='media') payload.uploaded_by=user.id;
  }

  if(type==='media'){
    const file=formData.get('file');
    if(file instanceof File && file.size>0){
      const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'-');
      const path=`cms/${Date.now()}-${safe}`;
      const {error:uploadError}=await supabase.storage.from('site-media').upload(path,file,{upsert:false});
      if(uploadError) redirect(`/admin/contenidos/media?mensaje=${encodeURIComponent(uploadError.message)}`);
      payload.storage_path=path;
    }
  }

  const query=id?supabase.from(type).update(payload).eq('id',id):supabase.from(type).insert(payload).select('id').single();
  const {data,error}=await query;
  if(error) redirect(`/admin/contenidos/${type}?mensaje=${encodeURIComponent(error.message)}`);
  const target=id??(data as {id?:string}|null)?.id;
  revalidatePath('/admin/contenidos');revalidatePath(`/admin/contenidos/${type}`);revalidatePath('/');revalidatePath('/patrimonio');revalidatePath('/eventos');
  if(target) redirect(`/admin/contenidos/${type}/${target}?mensaje=Guardado.`);
  redirect(`/admin/contenidos/${type}?mensaje=Guardado.`);
}

export async function deleteContent(formData:FormData){
  const type=String(formData.get('type')??''); const id=String(formData.get('id')??'');
  if(!allowed.has(type)||!id) redirect('/admin/contenidos');
  const {supabase}=await editorContext();
  if(type==='media'){
    const {data:item}=await supabase.from('media').select('storage_path').eq('id',id).single();
    if(item?.storage_path) await supabase.storage.from('site-media').remove([item.storage_path]);
  }
  const {error}=await supabase.from(type).delete().eq('id',id);
  if(error) redirect(`/admin/contenidos/${type}/${id}?mensaje=${encodeURIComponent(error.message)}`);
  revalidatePath('/admin/contenidos');revalidatePath(`/admin/contenidos/${type}`);revalidatePath('/');revalidatePath('/patrimonio');revalidatePath('/eventos');
  redirect(`/admin/contenidos/${type}?mensaje=Eliminado.`);
}
