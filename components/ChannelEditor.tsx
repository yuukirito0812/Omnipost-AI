'use client';

import {useEffect,useRef} from 'react';
import dynamic from 'next/dynamic';
import {Layers, Sparkles} from 'lucide-react';
import type {ContentPost, Platform} from '../lib/types';
import {PLATFORMS} from '../lib/types';
import type {GrowthProfile} from '../lib/growth';
import {CHANNELS, channelCopy} from '../lib/channel-formats';
import PlatformIcon from './PlatformIcon';

const CaptionVariants = dynamic(() => import('./CaptionVariants'), {ssr: false});

type Props = {
  platform: Platform;
  draft: ContentPost;
  profile: GrowthProfile;
  brand: string;
  token: string | null;
  aiReady: boolean;
  labOpen: boolean;
  onPlatform: (platform: Platform) => void;
  onText: (platform: Platform, text: string) => void;
  onTitle: (platform: Platform, title: string) => void;
  onLab: () => void;
  onApply: (platform: Platform, variant: {title: string; caption: string; generated?: boolean}) => void;
  onSettings: () => void;
};

export default function ChannelEditor({platform, draft, profile, brand, token, aiReady, labOpen,
  onPlatform, onText, onTitle, onLab, onApply, onSettings}: Props) {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (labOpen) section.current?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }, [labOpen]);
  const current = channelCopy(draft, platform);
  const name = CHANNELS[platform].name;
  const title = current.titleField;
  return <section className="panel editor-panel channel-editor" id="channel-copy" ref={section}>
    <div className="panel-head"><div><h3>Channel copy</h3><p>Adjust the text each audience will see.</p></div><Layers size={19} className="muted"/></div>
    <div className="channel-editor-tabs" role="group" aria-label="Customize a channel">
      {PLATFORMS.map(network => <button key={network} type="button" aria-pressed={platform === network} onClick={() => onPlatform(network)}>
        <PlatformIcon platform={network} size={18}/> {CHANNELS[network].name}
      </button>)}
    </div>
    {title && <div className="field"><label htmlFor="channel-title">{name} {title.label.toLowerCase()} <span>{current.titleCount}/{title.limit}</span></label>
      <input id="channel-title" value={draft.channelTitles?.[platform] || ''} placeholder={draft.title || title.label} onChange={e => onTitle(platform, e.target.value)}/>
    </div>}
    <div className="field"><label htmlFor="channel-caption">{name} {current.textLabel.toLowerCase()} <span className={current.textCount > current.limit ? 'count-over' : ''}>{current.textCount.toLocaleString()}/{current.limit.toLocaleString()} {current.unit}</span></label>
      <textarea id="channel-caption" rows={5} placeholder={current.text || 'Uses the master caption when this field is empty.'} value={draft.overrides?.[platform] || ''} onChange={e => onText(platform, e.target.value)}/>
      <span className="field-tip">Custom copy replaces the master caption, call to action and hashtags for this channel.</span>
    </div>
    <button type="button" className="outline-btn sm" onClick={onLab} aria-expanded={labOpen}><Sparkles size={15}/> {labOpen ? 'Close caption lab' : 'Open caption lab'}</button>
    {labOpen && <CaptionVariants key={platform} draft={draft} platform={platform} profile={profile} brand={brand} token={token}
      aiReady={aiReady} onApply={onApply} onSettings={onSettings}/>}
  </section>;
}
