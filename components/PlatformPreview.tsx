'use client';

import {memo, useDeferredValue, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {
  Bookmark, Clapperboard, ExternalLink, Globe2, Heart, Maximize2, MessageCircle,
  MoreHorizontal, Repeat2, Search, Send, Share2, Smartphone, ThumbsDown, ThumbsUp, X
} from 'lucide-react';
import type {ContentPost, Platform, SocialAccount} from '../lib/types';
import {PLATFORMS} from '../lib/types';
import {
  CHANNELS, FORMAT_LABELS, PREVIEW_RATIOS, VERTICAL_FORMATS, channelCopy, channelIssues, postFormat,
  previewRatio, safePostLink, type MediaDetails, type PostFormat
} from '../lib/channel-formats';
import PlatformIcon from './PlatformIcon';

type ManagedAccount = Pick<SocialAccount, 'platform' | 'name' | 'handle' | 'avatar'>;
type Props = {
  platform: Platform;
  draft: ContentPost;
  brand: string;
  accounts: SocialAccount[];
  managedAccounts: ManagedAccount[];
  onPlatform: (platform: Platform) => void;
  onMediaDetails: (url: string, details: MediaDetails) => void;
};
const alternateFormats: Partial<Record<Platform, PostFormat[]>> = {
  instagram: ['feed', 'reel'], facebook: ['feed', 'reel', 'facebook-video'],
  tiktok: ['tiktok-video', 'tiktok-photo'], youtube: ['watch', 'shorts']
};

function Avatar({label, src}: {label: string; src?: string}) {
  return src
    ? <img className="channel-avatar" src={src} alt="" loading="lazy" decoding="async"/>
    : <span className="channel-avatar channel-avatar-fallback" aria-hidden="true">{Array.from(label)[0]?.toUpperCase() || 'B'}</span>;
}

function Caption({text, prefix, fold = 0}: {text: string; prefix?: string; fold?: number}) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  const isLong = fold > 0 && text.length > fold;
  const shown = isLong && !expanded ? Array.from(text).slice(0, fold).join('').trimEnd() + '…' : text;
  return <>{prefix && <strong>{prefix} </strong>}{shown}{isLong && <button type="button" className="native-more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Show less' : 'More'}</button>}</>;
}

const PreviewMedia = memo(function PreviewMedia({url, type, alt, onDetails}: {
  url: string; type: ContentPost['mediaType']; alt: string; onDetails: Props['onMediaDetails'];
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="native-media-empty" role="status"><Clapperboard size={25}/><span>Could not load this media preview.</span></div>;
  if (url && type === 'video') {
    return <video className="channel-media" src={url} controls playsInline preload="metadata" onError={() => setFailed(true)}
      onLoadedMetadata={event => {
        const {videoWidth: width, videoHeight: height, duration} = event.currentTarget;
        if (width && height) onDetails(url, {width, height, duration: Number.isFinite(duration) ? duration : undefined});
      }}/>;
  }
  if (url) return <img className="channel-media" src={url} alt={alt || 'Post media'} loading="lazy" decoding="async" onError={() => setFailed(true)}
    onLoad={event => {
      const {naturalWidth: width, naturalHeight: height} = event.currentTarget;
      if (width && height) onDetails(url, {width, height});
    }}/>;
  return <div className="native-media-empty"><Clapperboard size={25}/><span>Attach media to preview</span></div>;
});

function PostHeader({label, detail, avatar}: {label: string; detail?: ReactNode; avatar?: string}) {
  return <div className="channel-post-head">
    <Avatar label={label} src={avatar}/>
    <div><b>{label}</b>{detail && <small>{detail}</small>}</div>
    <MoreHorizontal size={19} aria-hidden="true"/>
  </div>;
}

function NativePost({platform, format, label, handle, avatar, title, text, media, video, safeZone, link, visibility}: {
  platform: Platform; format: PostFormat; label: string; handle: string; avatar?: string; title: string;
  text: string; media?: ReactNode; video: boolean; safeZone: boolean; link: string; visibility: string;
}) {
  const name = CHANNELS[platform].name;
  if (VERTICAL_FORMATS.includes(format)) {
    const youtube = platform === 'youtube';
    const facebook = platform === 'facebook';
    return <article className={'native-vertical native-' + platform}>
      {media}
      <div className="native-vertical-top">
        {platform === 'tiktok' ? <><span>Following</span><b>For You</b></> : <b>{youtube ? 'Shorts' : 'Reels'}</b>}
        <Search size={17} aria-hidden="true"/>
      </div>
      <div className="native-vertical-actions" aria-hidden="true">
        <Avatar label={label} src={avatar}/>
        {youtube || facebook ? <ThumbsUp/> : <Heart/>}
        {youtube && <ThumbsDown/>}
        <MessageCircle/>{!youtube && <Bookmark/>}<Share2/>
      </div>
      <div className={'native-vertical-text' + (video ? ' with-controls' : '')}>
        <b>{facebook ? label : '@' + handle}</b>
        {title && <strong>{title}</strong>}
        {!youtube && text && <p><Caption text={text} fold={125}/></p>}
      </div>
      {safeZone && <div className="native-safe-zone" aria-label="Approximate clear area for on-screen text"/>}
    </article>;
  }
  if (platform === 'instagram') return <article className="channel-surface channel-instagram">
    <div className="channel-mobile-header"><b><PlatformIcon platform="instagram" size={23}/> Instagram</b><span aria-hidden="true"><Heart size={19}/><Send size={19}/></span></div>
    <PostHeader label={handle} avatar={avatar}/>
    {media}
    <div className="channel-insta-actions" aria-hidden="true"><div><Heart size={22}/><MessageCircle size={22}/><Send size={21}/></div><Bookmark size={21}/></div>
    <div className="channel-caption"><Caption text={text} prefix={handle} fold={145}/></div>
  </article>;
  if (platform === 'facebook') return <article className="channel-surface channel-facebook">
    <div className="channel-fb-app"><b><PlatformIcon platform="facebook" size={23}/> facebook</b><Search size={18} aria-hidden="true"/></div>
    <PostHeader label={label} avatar={avatar} detail={<span className="native-detail">Just now · <Globe2 size={11}/></span>}/>
    <div className="channel-fb-caption"><Caption text={text} fold={235}/></div>
    {media}
    <div className="channel-fb-actions" aria-hidden="true"><span><ThumbsUp/> Like</span><span><MessageCircle/> Comment</span><span><Share2/> Share</span></div>
  </article>;
  if (platform === 'youtube') return <article className="channel-surface channel-youtube">
    <div className="channel-youtube-head"><b><PlatformIcon platform="youtube" size={25}/> YouTube</b><Search size={18} aria-hidden="true"/></div>
    {media}
    <div className="channel-youtube-body">
      <h4>{title || 'Video title'}</h4>
      <div className="channel-youtube-author"><Avatar label={label} src={avatar}/><div><strong>{label}</strong><small>{visibility[0]?.toUpperCase() + visibility.slice(1)} video</small></div><span className="channel-follow-placeholder" aria-hidden="true">Subscribe</span></div>
      {text && <div className="channel-youtube-description"><Caption text={text} fold={195}/></div>}
    </div>
  </article>;
  if (platform === 'pinterest') return <article className="channel-surface channel-pinterest">
    <div className="native-network-header"><PlatformIcon platform="pinterest" size={24}/><b>Pinterest</b></div>
    {media}
    <div className="channel-pin-body"><h4>{title || 'Pin title'}</h4><p><Caption text={text} fold={155}/></p>{link && <a href={link} target="_blank" rel="noreferrer">Visit site <ExternalLink size={12}/></a>}</div>
    <PostHeader label={label} avatar={avatar}/>
  </article>;
  if (platform === 'google_business') return <article className="channel-surface channel-google-business">
    <div className="native-network-header"><PlatformIcon platform="google_business" size={24}/><b>{name}</b></div>
    {media}<PostHeader label={label} avatar={avatar} detail="Business update"/>
    <div className="channel-gbp-body"><p><Caption text={text} fold={180}/></p></div>
  </article>;
  const linkedin = platform === 'linkedin';
  return <article className={'channel-surface channel-' + platform}>
    <div className="native-network-header"><PlatformIcon platform={platform} size={22}/><b>{linkedin ? 'LinkedIn' : platform === 'x' ? 'Post' : 'Threads'}</b></div>
    <PostHeader label={platform === 'threads' ? handle : label} avatar={avatar}
      detail={platform === 'x' ? '@' + handle : platform === 'linkedin' ? 'Now' : undefined}/>
    <div className="native-text"><Caption text={text} fold={linkedin ? 175 : 0}/></div>
    {media}
    <div className="native-actions" aria-hidden="true">
      {linkedin ? <><span><ThumbsUp/> Like</span><span><MessageCircle/> Comment</span><span><Repeat2/> Repost</span><span><Send/> Send</span></>
      : <><MessageCircle/><Repeat2/><Heart/><Bookmark/><Share2/></>}
    </div>
  </article>;
}

function PlatformPreview({platform, draft, brand, accounts, managedAccounts, onPlatform, onMediaDetails}: Props) {
  const snapshot = useDeferredValue(draft);
  const [layoutChoice, setLayoutChoice] = useState<{platform: Platform; value: PostFormat | 'auto'}>({platform, value: 'auto'});
  const layout = layoutChoice.platform === platform ? layoutChoice.value : 'auto';
  const [ratio, setRatio] = useState('auto');
  const [fit, setFit] = useState<'contain' | 'cover'>('contain');
  const [position, setPosition] = useState(50);
  const [safeZone, setSafeZone] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const account = accounts.find(entry => draft.accountIds.includes(entry.id) && entry.platform === platform) || managedAccounts.find(entry => entry.platform === platform);
  const label = account?.name || brand || 'Your brand';
  const handle = (account?.handle || label.toLowerCase().replace(/[^a-z0-9._]/g, '') || 'yourbrand').replace(/^@/, '');
  const current = channelCopy(snapshot, platform);
  const autoFormat = postFormat(platform, draft.mediaType, draft.mediaDetails);
  const format = layout !== 'auto' && alternateFormats[platform]?.includes(layout) ? layout : autoFormat;
  const vertical = VERTICAL_FORMATS.includes(format);
  const frame = ratio === 'auto' ? previewRatio(platform, format, draft.mediaDetails) : ratio;
  const mediaStyle = {'--preview-ratio': frame.replace(':', ' / '), '--preview-fit': fit, '--preview-position': position + '%'} as CSSProperties;
  const issues = channelIssues(snapshot, platform);
  const video = draft.mediaType === 'video' && !!draft.mediaUrl;
  const needsMedia = !!draft.mediaUrl || vertical || ['instagram', 'youtube', 'pinterest'].includes(platform);
  const media = needsMedia ? <div className="native-media-frame" style={mediaStyle}>
    <PreviewMedia key={draft.mediaUrl} url={draft.mediaUrl} type={draft.mediaType} alt={draft.altText} onDetails={onMediaDetails}/>
  </div> : undefined;
  const post = <NativePost key={platform + format} platform={platform} format={format} label={label} handle={handle} avatar={account?.avatar}
    title={current.title} text={current.text} media={media} video={video} safeZone={safeZone} link={safePostLink(draft.link)} visibility={draft.visibility}/>;
  function changePlatform(next: Platform) {
    setLayoutChoice({platform: next, value: 'auto'});
    setRatio('auto');
    onPlatform(next);
  }
  function expand() { dialog.current?.showModal(); setExpanded(true); }

  return <section className="panel preview-panel native-preview-panel" aria-label="Platform preview">
    <div className="native-preview-heading">
      <div><h2>Platform preview</h2><p>{CHANNELS[platform].name} · {FORMAT_LABELS[format]}</p></div>
      <button type="button" className="outline-btn sm preview-expand" title="Expand preview" aria-label="Expand preview" aria-haspopup="dialog" onClick={expand}><Maximize2 size={16}/></button>
    </div>
    <div className="preview-network-grid" role="group" aria-label="Preview network">
      {PLATFORMS.map(network => <button type="button" key={network} className={network === platform ? 'active' : ''} aria-pressed={network === platform}
        aria-label={'Preview ' + CHANNELS[network].name} title={CHANNELS[network].name} onClick={() => changePlatform(network)}><PlatformIcon platform={network} size={22}/></button>)}
    </div>
    <div className="native-preview-tools">
      {alternateFormats[platform] && <label>Layout <select value={layout==='auto'||alternateFormats[platform]?.includes(layout)?layout:'auto'} onChange={e => {setLayoutChoice({platform, value: e.target.value as PostFormat | 'auto'}); setRatio('auto');}}>
        <option value="auto">Auto · {FORMAT_LABELS[autoFormat]}</option>
        {alternateFormats[platform]!.map(option => <option key={option} value={option}>{FORMAT_LABELS[option]}</option>)}
      </select></label>}
      {needsMedia && <details className="native-framing">
        <summary><Smartphone size={14}/> Framing</summary>
        <div className="native-framing-grid">
          <label>Aspect ratio <select value={ratio} onChange={e => setRatio(e.target.value)}><option value="auto">Auto</option>{PREVIEW_RATIOS.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Media fit <select value={fit} onChange={e => setFit(e.target.value as 'cover' | 'contain')}><option value="contain">Fit</option><option value="cover">Fill</option></select></label>
        </div>
        {fit === 'cover' && <label>Crop focus <input type="range" min={0} max={100} step={5} value={position} onChange={e => setPosition(Number(e.target.value))}/></label>}
        {vertical && <label className="native-check"><input type="checkbox" checked={safeZone} onChange={e => setSafeZone(e.target.checked)}/> Show text safe area</label>}
        <p>Framing controls affect this preview.</p>
      </details>}
    </div>
    {!expanded && <div className="native-preview-stage">{post}</div>}
    <div className="native-preview-status">
      <span>{current.textCount.toLocaleString()} / {current.limit.toLocaleString()} {current.unit}</span>
      {current.titleField && <span>{current.titleField.label} {current.titleCount}/{current.titleField.limit}</span>}
      {draft.mediaDetails && <span>{draft.mediaDetails.width} × {draft.mediaDetails.height} px{draft.mediaDetails.duration != null ? ' · ' + Math.ceil(draft.mediaDetails.duration) + 's' : ''}</span>}
    </div>
    {issues.length > 0 && <ul className="native-preview-issues">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}
    <p className="native-preview-status">No engagement data · Layout preview</p>
    <a className="native-preview-source" href={CHANNELS[platform].source} target="_blank" rel="noreferrer">Format and guidance <ExternalLink size={12}/></a>
    <dialog ref={dialog} className="native-preview-dialog" onClose={() => setExpanded(false)}>
      {expanded && <><div className="native-preview-heading"><h2>{CHANNELS[platform].name} {FORMAT_LABELS[format].toLowerCase()} preview</h2><button type="button" className="icon-btn" aria-label="Close preview" onClick={() => dialog.current?.close()}><X size={19}/></button></div><div className="native-preview-stage">{post}</div></>}
    </dialog>
  </section>;
}

export default memo(PlatformPreview);
