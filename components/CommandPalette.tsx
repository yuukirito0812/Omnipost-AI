'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Search,ArrowUpRight,PenLine,CalendarDays,Files,Image as ImageIcon,Sparkles,Link2,BarChart3,Settings2,LayoutDashboard,Command,X} from 'lucide-react';
type View='overview'|'compose'|'calendar'|'posts'|'library'|'ai'|'accounts'|'analytics'|'settings';
type Props={open:boolean;onClose:()=>void;onNavigate:(view:View)=>void;onNewPost:()=>void;onSchedule:()=>void;onOpenDrafts:()=>void};
const ACTIONS=[
 {label:'Overview',hint:'Dashboard',view:'overview',icon:LayoutDashboard},
 {label:'New post',hint:'Create a post',view:'compose',icon:PenLine},
 {label:'Schedule a post',hint:'Plan content',view:'schedule',icon:CalendarDays},
 {label:'Open drafts',hint:'Edit saved posts',view:'drafts',icon:Files},
 {label:'Content calendar',hint:'Upcoming posts',view:'calendar',icon:CalendarDays},
 {label:'Content library',hint:'All content',view:'posts',icon:Files},
 {label:'Media assets',hint:'Images and videos',view:'library',icon:ImageIcon},
 {label:'AI studio',hint:'Write with Gemini',view:'ai',icon:Sparkles},
 {label:'Social accounts',hint:'Connect channels',view:'accounts',icon:Link2},
 {label:'Analytics',hint:'Content activity',view:'analytics',icon:BarChart3},
 {label:'Settings',hint:'Workspace preferences',view:'settings',icon:Settings2}
] as const;
export default function CommandPalette({open,onClose,onNavigate,onNewPost,onSchedule,onOpenDrafts}:Props){
 const [query,setQuery]=useState(''),[active,setActive]=useState(0),ref=useRef<HTMLInputElement>(null);
 const found=useMemo(()=>ACTIONS.filter(a=>[a.label,a.hint].join(' ').toLowerCase().includes(query.trim().toLowerCase())),[query]);
 useEffect(()=>{if(open){setQuery('');setActive(0);const id=requestAnimationFrame(()=>ref.current?.focus());return()=>cancelAnimationFrame(id)}},[open]);
 function choose(a:typeof ACTIONS[number]){
  onClose();if(a.view==='schedule')onSchedule();else if(a.view==='drafts')onOpenDrafts();else if(a.view==='compose')onNewPost();else onNavigate(a.view as View);
 }
 function onKey(e:React.KeyboardEvent<HTMLInputElement>){
  if(e.key==='ArrowDown'){e.preventDefault();setActive(v=>(v+1)%Math.max(1,found.length))}
  if(e.key==='ArrowUp'){e.preventDefault();setActive(v=>(v-1+Math.max(1,found.length))%Math.max(1,found.length))}
  if(e.key==='Enter'&&found.length){e.preventDefault();choose(found[Math.min(active,found.length-1)])}
  if(e.key==='Escape'){e.preventDefault();onClose()}
 }
 useEffect(()=>setActive(0),[query]);
 if(!open)return null;
 return <div className="studio-command-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}} role="presentation">
   <section className="studio-command-window" role="dialog" aria-modal="true" aria-label="Search commands">
    <div className="studio-command-search"><Search size={21}/><input ref={ref} aria-label="Search commands" placeholder="Where do you want to go?" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={onKey}/><button type="button" aria-label="Close commands" onClick={onClose}><X size={18}/></button></div>
    <div className="studio-command-results">{found.length?found.map((a,i)=><button type="button" key={a.view} className={'studio-command-item '+(active===i?'selected':'')} onMouseEnter={()=>setActive(i)} onClick={()=>choose(a)}><span className="studio-command-icon"><a.icon size={18}/></span><span><strong>{a.label}</strong><small>{a.hint}</small></span><ArrowUpRight size={16}/></button>):<div className="studio-command-empty">No matching actions</div>}</div>
    <div className="studio-command-footer"><span><Command size={13}/> K to open</span><span>↑ ↓ Navigate · Enter Select · Esc Close</span></div>
   </section>
 </div>
}
