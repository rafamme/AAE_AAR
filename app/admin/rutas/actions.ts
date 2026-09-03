'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';

function text(fd:FormData,key:string){const value=String(fd.get(key)??'').trim();return value||null;}
function slugify(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}

async function editor(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/login');
  const {data:roles}=await supabase.from('member_roles').select('role').eq('member_id',user.id);
  const set=new Set((roles??[]).map(x=>x.role));
  if(!set.has('superadmin')&&!set.has('admin')&&!set.has('editor')) redirect('/area-socios');
  return {supabase,user};
}

export async function saveRoute(formData:FormData){
  const {supabase,user}=await editor(); const id=text(formData,'id'); const title=text(formData,'title');
  if(!title) redirect('/admin/rutas?mensaje=El%20título%20es%20obligatorio.');
  const status=String(formData.get('status')??'draft'); if(!['draft','published','archived'].includes(status)) redirect('/admin/rutas?mensaje=Estado%20no%20válido.');
  const distanceRaw=text(formData,'distance_km'); const distance=distanceRaw?Number(distanceRaw):null;
  if(distance!==null&&(!Number.isFinite(distance)||distance<0)) redirect('/admin/rutas?mensaje=Distancia%20no%20válida.');
  const payload={title,slug:text(formData,'slug')??slugify(title),summary:text(formData,'summary'),description:text(formData,'description'),country:text(formData,'country'),region:text(formData,'region'),distance_km:distance,duration_text:text(formData,'duration_text'),status,created_by:user.id};
  const {error}=id?await supabase.from('heritage_routes').update(payload).eq('id',id):await supabase.from('heritage_routes').insert(payload);
  revalidatePath('/admin/rutas'); revalidatePath('/patrimonio/rutas');
  redirect(`/admin/rutas?mensaje=${encodeURIComponent(error?error.message:'Ruta guardada.')}`);
}

export async function addRouteStop(formData:FormData){
  const {supabase}=await editor(); const routeId=text(formData,'route_id'); const target=String(formData.get('target')??'');
  if(!routeId||!target.includes(':')) redirect('/admin/rutas?mensaje=Parada%20no%20válida.');
  const [kind,id]=target.split(':'); const sortOrder=Number(String(formData.get('sort_order')??'0'));
  const payload={route_id:routeId,location_id:kind==='location'?id:null,monument_id:kind==='monument'?id:null,sort_order:Number.isInteger(sortOrder)?sortOrder:0,note:text(formData,'note')};
  const {error}=await supabase.from('heritage_route_stops').insert(payload);
  revalidatePath('/admin/rutas'); revalidatePath('/patrimonio/rutas');
  redirect(`/admin/rutas?mensaje=${encodeURIComponent(error?error.message:'Parada añadida.')}`);
}

export async function deleteRouteStop(formData:FormData){
  const {supabase}=await editor(); const id=text(formData,'id'); if(!id) redirect('/admin/rutas');
  const {error}=await supabase.from('heritage_route_stops').delete().eq('id',id);
  revalidatePath('/admin/rutas'); revalidatePath('/patrimonio/rutas');
  redirect(`/admin/rutas?mensaje=${encodeURIComponent(error?error.message:'Parada eliminada.')}`);
}
