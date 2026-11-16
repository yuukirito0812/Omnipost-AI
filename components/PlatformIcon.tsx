'use client';
import type {Platform} from '../lib/types';
import {useId, type ReactNode} from 'react';
type Props={platform:Platform;size?:number;className?:string;title?:string};
export default function PlatformIcon({platform,size=24,className='',title}:Props){
 const instagramGradient=useId();
 const common={width:size,height:size,viewBox:'0 0 40 40',className:'platform-brand-icon '+className,role:'img' as const,'aria-label':title||platform};
 const icon:Record<Platform,ReactNode>={
  facebook:<><circle cx="20" cy="20" r="20" fill="#1877F2"/><path fill="#fff" d="M22.4 33V21.8h3.8l.6-4.4h-4.4v-2.8c0-1.3.4-2.2 2.2-2.2H27V8.5c-.4-.1-1.9-.2-3.5-.2-3.5 0-5.9 2.1-5.9 6v3.1h-4v4.4h4V33z"/></>,
  instagram:<><defs><linearGradient id={instagramGradient} x1="4" y1="36" x2="36" y2="4" gradientUnits="userSpaceOnUse"><stop stopColor="#FFB347"/><stop offset=".42" stopColor="#F04A83"/><stop offset="1" stopColor="#8549D9"/></linearGradient></defs><rect x="2" y="2" width="36" height="36" rx="11" fill={`url(#${instagramGradient})`}/><rect x="9" y="9" width="22" height="22" rx="7" fill="none" stroke="#fff" strokeWidth="2.5"/><circle cx="20" cy="20" r="5.2" fill="none" stroke="#fff" strokeWidth="2.5"/><circle cx="27.4" cy="12.8" r="1.7" fill="#fff"/></>,
  youtube:<><rect x="2" y="7" width="36" height="26" rx="8" fill="#FF0033"/><path d="M17 13.7v12.6L27 20z" fill="#fff"/></>,
  tiktok:<><path d="M24 5h5c.3 4 2.4 6.4 6 7v5c-2.4 0-4.5-.8-6.2-2v11.2a9.2 9.2 0 1 1-9.2-9.2c.7 0 1.4.1 2 .2v5.2a4.1 4.1 0 1 0 2.4 3.8z" fill="#25F4EE" transform="translate(-1 1)"/><path d="M24 5h5c.3 4 2.4 6.4 6 7v5c-2.4 0-4.5-.8-6.2-2v11.2a9.2 9.2 0 1 1-9.2-9.2c.7 0 1.4.1 2 .2v5.2a4.1 4.1 0 1 0 2.4 3.8z" fill="#FE2C55" transform="translate(1 -1)"/><path d="M24 5h5c.3 4 2.4 6.4 6 7v5c-2.4 0-4.5-.8-6.2-2v11.2a9.2 9.2 0 1 1-9.2-9.2c.7 0 1.4.1 2 .2v5.2a4.1 4.1 0 1 0 2.4 3.8z" fill="#111"/></>,
  x:<><path fill="currentColor" d="M5 4h8.2l8.3 11.1L31 4h4L23.3 17.8 36 36h-8.2l-9.1-12.2L8 36H4l12.5-14.6z"/><path fill="currentColor" d="M11.2 7 29.5 33h-2.7L8.5 7z"/></>,
  linkedin:<><rect x="2" y="2" width="36" height="36" rx="6" fill="#0A66C2"/><path fill="#fff" d="M11 16h4v13h-4zm2-6a2.3 2.3 0 1 1 0 4.6A2.3 2.3 0 0 1 13 10m4.5 6h3.8v1.8h.1c.5-1 1.8-2.1 3.8-2.1 4.1 0 4.8 2.7 4.8 6.1V29h-4v-6.4c0-1.5 0-3.4-2.1-3.4s-2.4 1.6-2.4 3.3V29h-4z"/></>,
  threads:<><circle cx="20" cy="20" r="18" fill="#111"/><path d="M27.8 18.1c-.3-5.5-3.1-8.5-7.8-8.5-4.2 0-7 2.6-7 6.4h3.2c0-2.1 1.4-3.4 3.8-3.4 2.6 0 4.1 1.6 4.5 4.7-1.1-.5-2.4-.8-3.9-.8-4.4 0-7.2 2.2-7.2 5.7 0 3.4 2.6 5.8 6.3 5.8 3.8 0 6.2-2.2 7.3-5.6 1.2 1 1.9 2.4 1.9 4.1 0 2.8-2.4 4.7-6.2 4.7-4.8 0-8-2.7-8-7.1h-3.1c0 6.1 4.3 10.1 11.1 10.1 5.5 0 9.3-3.1 9.3-7.7 0-3.5-1.7-6.2-4.2-7.7zm-7.9 6.9c-1.9 0-3.1-1-3.1-2.7 0-1.8 1.5-2.8 4.1-2.8 1.6 0 3 .4 4.1 1.1-.5 2.7-2.2 4.4-5.1 4.4z" fill="#fff"/></>,
  pinterest:<><circle cx="20" cy="20" r="19" fill="#BD081C"/><path fill="#fff" d="M20.4 7.5c-7 0-10.6 5-10.6 9.2 0 2.5 1 4.8 3.2 5.6.4.2.8 0 .9-.5l.3-1.2c.1-.4.1-.6-.2-1-.6-.7-1-1.6-1-2.9 0-3.8 2.9-7.2 7.6-7.2 4.1 0 6.4 2.5 6.4 5.9 0 4.5-2 8.3-5 8.3-1.6 0-2.8-1.3-2.4-2.9.5-1.9 1.4-3.9 1.4-5.2 0-1.2-.6-2.2-1.9-2.2-1.5 0-2.7 1.6-2.7 3.8 0 1.4.5 2.4.5 2.4l-2 8.4c-.6 2.5-.1 5.6 0 5.9.1.2.3.2.5.1.2-.2 2.3-2.8 3-5.3l1.1-4.2c.6 1.1 2.3 2.1 4.1 2.1 5.4 0 9.1-4.9 9.1-11.4 0-4.9-4.2-9.5-11.3-9.5z"/></>,
  google_business:<><circle cx="20" cy="20" r="18" fill="#fff" stroke="#DDE2EA" strokeWidth="1.5"/><path d="M30.5 20.4c0-.7-.1-1.4-.2-2.1H20v4h5.9a5.1 5.1 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-7.9z" fill="#4285F4"/><path d="M20 31c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.7h-3.6v2.8A11 11 0 0 0 20 31z" fill="#34A853"/><path d="M13.7 22a6.7 6.7 0 0 1 0-4v-2.8h-3.6a11 11 0 0 0 0 9.6z" fill="#FBBC05"/><path d="M20 11.7c1.7 0 3.2.6 4.4 1.7l3.1-3.1A10.5 10.5 0 0 0 20 7a11 11 0 0 0-9.9 6.2l3.6 2.8c.9-2.6 3.4-4.3 6.3-4.3z" fill="#EA4335"/></>
 };
 return <svg {...common}>{title&&<title>{title}</title>}{icon[platform]}</svg>
}
