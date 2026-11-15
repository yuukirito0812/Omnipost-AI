'use client';
import {memo} from 'react';
import {Heart,MessageCircle,Send,Bookmark,MoreHorizontal,Home,Search,Plus,Play,Volume2,Share2,Repeat2,ThumbsUp,ThumbsDown,UserRound,Music2,Clapperboard,Compass,Menu} from 'lucide-react';
import type {ContentPost,Platform,SocialAccount} from '../lib/types';
import PlatformIcon from './PlatformIcon';
type Props={platform:Platform;draft:ContentPost;brand:string;accounts:SocialAccount[]};
function Media({draft,fit='cover'}:{draft:ContentPost;fit?:'cover'|'contain'}){return draft.mediaUrl?(draft.mediaType==='video'?<video src={draft.mediaUrl} controls playsInline preload="metadata" className="channel-media" style={{objectFit:fit}}/>:<img src={draft.mediaUrl} loading="lazy" decoding="async" alt={draft.altText||'Post visual'} className="channel-media" style={{objectFit:fit}}/>):<div className="channel-empty-media"><Clapperboard size={27}/><span>Upload an image or video to preview it here</span></div>}
function Avatar({label,src}:{label:string;src?:string}){return src?<img className="channel-avatar" src={src} alt="" loading="lazy" decoding="async"/>:<div className="channel-avatar channel-avatar-fallback">{(label||'B').slice(0,1).toUpperCase()}</div>}
const formatText=(s:string,max=800)=>s.length>max?s.slice(0,max).trimEnd()+'…':s;
function PlatformPreview({platform,draft,brand,accounts}:Props){
 const account=accounts.find(a=>draft.accountIds.includes(a.id)&&a.platform===platform);
 const label=account?.name||brand||'Your brand';
 const handle=(account?.handle||label.toLowerCase().replace(/[^a-z0-9]/g,'')).replace(/^@/,'');
 const raw=draft.overrides[platform]?.trim()||draft.caption;
 const caption=[raw,draft.cta,draft.tags].filter(Boolean).join('\n\n');
 const content=caption||'Your caption will appear here while you write.';
 const date='Preview';
 if(platform==='instagram')return <div className="channel-surface channel-instagram">
   <div className="channel-mobile-header"><b><PlatformIcon platform="instagram" size={23}/> Instagram</b><span><Heart size={19}/><MessageCircle size={19}/></span></div>
   <div className="channel-post-head"><Avatar label={label} src={account?.avatar}/><div><b>{handle}</b><small>Original audio · Preview</small></div><MoreHorizontal size={19}/></div>
   <div className="channel-insta-media"><Media draft={draft}/></div>
   <div className="channel-insta-actions"><div><Heart size={24}/><MessageCircle size={24}/><Send size={23}/></div><Bookmark size={23}/></div>
   <div className="channel-caption"><strong>{handle}</strong> {formatText(content,420)}</div>
   <div className="channel-muted">Preview only · No published engagement data</div>
   <div className="channel-bottom-nav"><Home/><Search/><Clapperboard/><UserRound/></div>
  </div>;
 if(platform==='tiktok')return <div className="channel-tiktok-shell"><div className="channel-tiktok-player">
   <div className="channel-tiktok-back"><Media draft={draft}/></div>
   <div className="channel-tiktok-top"><PlatformIcon platform="tiktok" size={22}/><span>Following</span><b>For You</b><Search size={19}/></div>
   <div className="channel-tiktok-rail"><Avatar label={label} src={account?.avatar}/><Heart/><MessageCircle/><Bookmark/><Share2/><Music2/></div>
   <div className="channel-tiktok-caption"><strong>@{handle}</strong><p>{formatText(content,230)}</p><small><Music2 size={13}/> Original audio</small></div>
   <div className="channel-tiktok-bottom">Home <Plus size={22}/> Inbox <UserRound size={19}/></div>
  </div><p className="channel-disclaimer">TikTok vertical video preview · Layout is an approximation</p></div>;
 if(platform==='facebook')return <div className="channel-surface channel-facebook">
   <div className="channel-fb-app"><b><PlatformIcon platform="facebook" size={24}/> facebook</b><span><Search/><MessageCircle/></span></div>
   <div className="channel-post-head"><Avatar label={label} src={account?.avatar}/><div><b>{label}</b><small>{date} · <span aria-hidden>🌐</span></small></div><MoreHorizontal size={20}/></div>
   <div className="channel-fb-caption">{formatText(content,900)}</div><div className="channel-facebook-media"><Media draft={draft}/></div>
   <div className="channel-fb-summary">No engagement data — preview only</div><div className="channel-fb-actions"><span><ThumbsUp size={17}/> Like</span><span><MessageCircle size={17}/> Comment</span><span><Share2 size={17}/> Share</span></div>
  </div>;
 if(platform==='youtube')return <div className="channel-surface channel-youtube">
   <div className="channel-youtube-head"><b><PlatformIcon platform="youtube" size={26}/> YouTube</b><span><Search size={18}/><UserRound size={19}/></span></div>
   <div className="channel-video-frame"><Media draft={draft}/></div>
   <div className="channel-youtube-body"><h4>{draft.title||'Untitled video'}</h4><p>Preview · {draft.visibility==='unlisted'?'Unlisted':'No view data'}</p><div className="channel-youtube-author"><Avatar label={label} src={account?.avatar}/><div><strong>{label}</strong><small>Subscriber count unavailable</small></div><span className="channel-follow-placeholder">Subscribe</span></div><p className="channel-youtube-description">{formatText(content,440)}</p></div>
   {draft.mediaType!=='video'&&<div className="channel-format-note">YouTube publishing in this version requires a video upload.</div>}
  </div>;
 if(platform==='linkedin')return <div className="channel-surface channel-linkedin">
   <div className="channel-linkedin-head"><PlatformIcon platform="linkedin" size={27}/><b>LinkedIn</b><span>Search</span></div>
   <div className="channel-post-head"><Avatar label={label} src={account?.avatar}/><div><b>{label}</b><small>{handle} · Preview</small></div><MoreHorizontal size={19}/></div>
   <div className="channel-li-copy">{formatText(content,1200)}</div><div className="channel-li-media"><Media draft={draft}/></div>
   <div className="channel-li-actions"><span>Like</span><span>Comment</span><span>Repost</span><span>Send</span></div><div className="channel-muted">LinkedIn feed preview · Layout may vary by profile or organization</div>
  </div>;
 if(platform==='threads')return <div className="channel-surface channel-threads">
   <div className="channel-threads-head"><PlatformIcon platform="threads" size={25}/><b>Threads</b><span>⌕</span></div>
   <div className="channel-post-head"><Avatar label={label} src={account?.avatar}/><div><b>{handle}</b><small>Preview · now</small></div><MoreHorizontal size={19}/></div>
   <div className="channel-threads-copy">{formatText(content,500)}</div>{draft.mediaUrl&&<div className="channel-threads-media"><Media draft={draft}/></div>}
   <div className="channel-threads-actions"><Heart/><MessageCircle/><Repeat2/><Send/></div><div className="channel-muted">Threads post preview · No engagement data</div>
  </div>;
 if(platform==='pinterest')return <div className="channel-surface channel-pinterest">
   <div className="channel-pin-head"><PlatformIcon platform="pinterest" size={25}/><b>Pinterest</b><span>Explore</span></div>
   <div className="channel-pin-card"><div className="channel-pin-image"><Media draft={draft} fit="cover"/></div><div className="channel-pin-body"><h4>{draft.title||'Your Pin title'}</h4><p>{formatText(content,420)}</p><small>{handle} · Preview</small></div></div>
   <div className="channel-muted">Pin preview · Choose a board in your connected account flow</div>
  </div>;
 if(platform==='google_business')return <div className="channel-surface channel-google-business">
   <div className="channel-gbp-head"><PlatformIcon platform="google_business" size={27}/><div><b>Google Business Profile</b><small>Business update · Preview</small></div><MoreHorizontal size={18}/></div>
   <div className="channel-gbp-body"><div className="channel-gbp-brand"><Avatar label={label} src={account?.avatar}/><div><strong>{label}</strong><small>Business Profile</small></div></div><p>{formatText(content,1200)}</p>{draft.mediaUrl&&<div className="channel-gbp-media"><Media draft={draft}/></div>}{draft.link&&<span className="channel-gbp-link">{draft.cta||'Learn more'} ↗</span>}</div>
   <div className="channel-muted">Google Business update preview · Verify location and CTA before publishing</div>
  </div>;
 return <div className="channel-surface channel-x">
   <div className="channel-x-head"><PlatformIcon platform="x" size={22}/><b>Post</b><MoreHorizontal size={18}/></div>
   <div className="channel-post-head"><Avatar label={label} src={account?.avatar}/><div><b>{label} <span>@{handle} · now</span></b></div><MoreHorizontal size={18}/></div>
   <div className="channel-x-content">{formatText(content,280)}</div>
   {draft.mediaUrl&&<div className="channel-x-media"><Media draft={draft}/></div>}
   <div className="channel-x-footer"><MessageCircle/><Repeat2/><Heart/><Share2/></div>
   {content.length>280&&<div className="channel-format-note">Text exceeds 280 characters; edit your X caption override before publishing.</div>}
  </div>
}
export default memo(PlatformPreview);
