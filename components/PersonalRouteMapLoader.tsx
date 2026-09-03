'use client';
import dynamic from 'next/dynamic';
const PersonalRouteMap=dynamic(()=>import('./PersonalRouteMap'),{ssr:false,loading:()=> <div className="personal-route-map"/>});
export default PersonalRouteMap;