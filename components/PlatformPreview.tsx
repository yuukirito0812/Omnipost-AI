'use client';
import {Heart,MessageCircle,Send,Bookmark,MoreHorizontal,Home,Search,Plus,Play,Volume2,Share2,Repeat2,ThumbsUp,ThumbsDown,UserRound,Music2,Clapperboard,Compass,Menu} from 'lucide-react';
import type {ContentPost,Platform,SocialAccount} from '../lib/types';
type Props={platform:Platform;draft:ContentPost;brand:string;accounts:SocialAccount[]};
function Media({draft,fit='cover'}:{draft:ContentPost;fit?:'cover'|'contain'}){return draft.mediaUrl?(draft.mediaType==='video'?<video src={draft.mediaUrl} controls playsInline className="channel-media" style={{objectFit:fit}}/>:<img src={draft.mediaUrl} alt={draft.altText||'Post visual'} className="channel-media" style={{objectFit:fit}}/>):<div className="channel-empty-media"><Clapperboard size={27}/><span>Upload an image or video to preview it here</span></div>}
function Avatar({label,src}:{label:string;src?:string}){return src?<img className="channel-avatar" src={src} alt="" />:<div className="channel-avatar channel-avatar-fallback">{(label||'B').slice(0,1).toUpperCase()}</div>}
const formatText=(s:string,max=800)=>s.length>max?s.slice(0,max).trimEnd()+'…':s;
export default function PlatformPreview({platform,draft,brand,accounts}:Props){
 const account=accounts.find(a=>draft.accountIds.includes(a.id)&&a.platform===platform);
 const label=account?.name||brand||'Your brand';
 const handle=(account?.handle||label.toLowerCase().replace(/[^a-z0-9]/g,'')).replace(/^@/,'');
 const raw=draft.overrides[platform]?.trim()||draft.caption;
 const caption=[raw,draft.cta,draft.tags].filter(Boolean).join('\n\n');
 const content=caption||'Your caption will appear here while you write.';
 const date='Preview';
 if(platform==='instagram')return <div className="channel-surface channel-instagram">
   <div className="channel-mobile-header"><b>Instagram</b><span><Heart size={19}/><MessageCircle size={19}/></span></div>
   <div className="channel-post-head"><Avatar label={label} src={account?.avatar}/><div><b>{handle}</b><small>Original audio · Preview</small></div><MoreHorizontal size={19}/></div>
   <div className="channel-insta-media"><Media draft={draft}/></div>
   <div className="channel-insta-actions"><div><Heart size={24}/><MessageCircle size={24}/><Send size={23}/></div><Bookmark size={23}/></div>
   <div className="channel-caption"><strong>{handle}</strong> {formatText(content,420)}</div>
   <div className="channel-muted">Preview only · No published engagement data</div>
   <div className="channel-bottom-nav"><Home/><Search/><Clapperboard/><UserRound/></div>
  </div>;
 if(platform==='tiktok')return <div className="channel-tiktok-shell"><div className="channel-tiktok-player">
   <div className="channel-tiktok-back"><Media draft={draft}/></div>
   <div className="channel-tiktok-top"><span>Following</span><b>For You</b><Search size={19}/></div>
   <div className="channel-tiktok-rail"><Avatar label={label} src={account?.avatar}/><Heart/><MessageCircle/><Bookmark/><Share2/><Music2/></div>
   <div className="channel-tiktok-caption"><strong>@{handle}</strong><p>{formatText(content,230)}</p><small><Music2 size={13}/> Original audio</small></div>
   <div className="channel-tiktok-bottom">Home <Plus size={22}/> Inbox <UserRound size={19}/></div>
  </div><p className="channel-disclaimer">TikTok vertical video preview · Layout is an approximation</p></div>;
 if(platform==='facebook')return <div className="channel-surface channel-facebook">
   <div className="channel-fb-app"><b>facebook</b><span><Search/><MessageCircle/></span></div>
   <div className="channel-post-head"><Avatar label={label} src={account?.avatar}/><div><b>{label}</b><small>{date} · <span aria-hidden>🌐</span></small></div><MoreHorizontal size={20}/></div>
   <div className="channel-fb-caption">{formatText(content,900)}</div><div className="channel-facebook-media"><Media draft={draft}/></div>
   <div className="channel-fb-summary">No engagement data — preview only</div><div className="channel-fb-actions"><span><ThumbsUp size={17}/> Like</span><span><MessageCircle size={17}/> Comment</span><span><Share2 size={17}/> Share</span></div>
  </div>;
 if(platform==='youtube')return <div className="channel-surface channel-youtube">
   <div className="channel-youtube-head"><b><span>▶</span> YouTube</b><span><Search size={18}/><UserRound size={19}/></span></div>
   <div className="channel-video-frame"><Media draft={draft}/></div>
   <div className="channel-youtube-body"><h4>{draft.title||'Untitled video'}</h4><p>Preview · {draft.visibility==='unlisted'?'Unlisted':'No view data'}</p><div className="channel-youtube-author"><Avatar label={label} src={account?.avatar}/><div><strong>{label}</strong><small>Subscriber count unavailable</small></div><span className="channel-follow-placeholder">Subscribe</span></div><p className="channel-youtube-description">{formatText(content,440)}</p></div>
   {draft.mediaType!=='video'&&<div className="channel-format-note">YouTube publishing in this version requires a video upload.</div>}
  </div>;
 return <div className="channel-surface channel-x">
   <div className="channel-x-head"><span>𝕏</span><b>Post</b><MoreHorizontal size={18}/></div>
   <div className="channel-post-head"><Avatar label={label} src={account?.avatar}/><div><b>{label} <span>@{handle} · now</span></b></div><MoreHorizontal size={18}/></div>
   <div className="channel-x-content">{formatText(content,280)}</div>
   {draft.mediaUrl&&<div className="channel-x-media"><Media draft={draft}/></div>}
   <div className="channel-x-footer"><MessageCircle/><Repeat2/><Heart/><Share2/></div>
   {content.length>280&&<div className="channel-format-note">Text exceeds 280 characters; edit your X caption override before publishing.</div>}
  </div>
}
