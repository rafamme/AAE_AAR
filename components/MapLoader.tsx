'use client';
import dynamic from 'next/dynamic';
const RomanesqueMap=dynamic(()=>import('./RomanesqueMap'),{ssr:false,loading:()=> <div className="map"/>});
export default RomanesqueMap;
