'use client';

import {useEffect, useRef, useState} from 'react';
import {Check, Clipboard, PenLine, Sparkles} from 'lucide-react';
import {CHANNELS, channelTitleField, postFormat, FORMAT_LABELS} from '../lib/channel-formats';
import {GOALS, type GrowthProfile} from '../lib/growth';
import type {ContentPost, Platform} from '../lib/types';

type Variant = {angle: string; title: string; caption: string; rationale: string; generated?: boolean};
type Props = {
  draft: ContentPost;
  platform: Platform;
  profile: GrowthProfile;
  brand: string;
  token: string | null;
  aiReady: boolean;
  onApply: (platform: Platform, variant: Variant) => void;
  onSettings: () => void;
};

export default function CaptionVariants({draft, platform, profile, brand, token, aiReady, onApply, onSettings}: Props) {
  const [brief, setBrief] = useState('');
  const [variants, setVariants] = useState<Variant[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const name = CHANNELS[platform].name;
  const format = FORMAT_LABELS[postFormat(platform, draft.mediaType, draft.mediaDetails)];
  const source = draft.overrides?.[platform]?.trim() || draft.caption.trim();
  const showTitle = !!channelTitleField(platform, draft.mediaType);

  function templates() {
    const topic = brief.trim() || draft.title.trim();
    if (!topic && !source) { setError('Add a topic or write a caption first.'); return; }
    const audience = profile.audience.trim() || 'your audience';
    const nextStep = draft.cta.trim() || (profile.goal === 'leads' ? 'Message us with your question and we’ll help you find the next step.' : profile.goal === 'followers' ? 'Follow for more on this topic.' : 'Which part would you like explained next?');
    const body = source || '[Add one specific detail or a concrete example here.]';
    const key = topic || '[Topic]';
    const pairs: [string, string, string][] = [
      ['Answer first', key, 'Put the answer or most helpful detail directly below the opening line.'],
      ['Practical checklist', 'A quick checklist for ' + key, 'Include two or three steps someone can save and use.'],
      ['Conversation starter', 'What’s your biggest question about ' + key + '?', 'Start a discussion you can follow up on with ' + audience + '.']
    ];
    setFeedback(''); setError('');
    setVariants(pairs.map(([angle, hook, rationale]) => ({
      angle: 'Template · ' + angle, title: showTitle ? key : '',
      caption: [hook, body, nextStep].join('\n\n'), rationale
    })));
  }

  async function generate() {
    if (!brief.trim() && !source && !draft.title.trim()) { setError('Add a topic or write a caption first.'); return; }
    if (!token || busy) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(''); setFeedback('');
    try {
      const response = await fetch('/api/ai', {
        method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + token}, signal: controller.signal,
        body: JSON.stringify({
          mode: 'caption_variants', topic: brief || draft.title, caption: source, platforms: [platform], brand,
          tone: profile.voice, audience: profile.audience, goal: GOALS[profile.goal].label, mediaType: draft.mediaType,
          interactionContext: [format, profile.niche, profile.offer, draft.cta].filter(Boolean).join('\n')
        })
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Caption suggestions could not be generated.');
      if (!Array.isArray(data.variants) || !data.variants.length) throw Error('Try a more specific brief.');
      setVariants(data.variants.map((variant: Variant) => ({...variant, generated: true})));
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Caption suggestions could not be generated.');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function copy(variant: Variant, index: number) {
    try {
      await navigator.clipboard.writeText([variant.title, variant.caption].filter(Boolean).join('\n\n'));
      setFeedback('Copied option ' + (index + 1));
    } catch { setError('Clipboard access is unavailable. Select and copy the text.'); }
  }

  return <section className="caption-variants" aria-label="Caption lab">
    <div className="growth-section-heading"><span className="growth-section-mark"><Sparkles size={17}/></span><div><h3>Caption lab</h3><p>{name} · {format} · {GOALS[profile.goal].label}</p></div></div>
    <label className="growth-field">Topic and facts to include <textarea value={brief} onChange={e => setBrief(e.target.value)} maxLength={1200} rows={3} placeholder="What should your audience take away? Add any facts the caption should use."/></label>
    <div className="growth-toolbar">
      {aiReady ? <button type="button" className="primary-btn sm" disabled={busy} onClick={generate}><Sparkles size={14}/>{busy ? 'Writing captions…' : 'Generate 3 captions'}</button>
        : <button type="button" className="outline-btn sm" onClick={onSettings}><Sparkles size={14}/> Connect Gemini</button>}
      <button type="button" className="outline-btn sm" disabled={busy} onClick={templates}>Use templates</button>
    </div>
    {error && <p className="growth-error" role="alert">{error}</p>}
    {feedback && <p className="growth-note" role="status"><Check size={13}/> {feedback}</p>}
    {variants.length > 0 && <div className="caption-options">
      {variants.map((variant, index) => <article key={index} className="caption-option">
        <div className="caption-option-heading"><strong>{variant.angle}</strong><button type="button" className="icon-btn" aria-label={'Copy option ' + (index + 1)} onClick={() => void copy(variant, index)}><Clipboard size={15}/></button></div>
        {variant.title && <b>{variant.title}</b>}
        <p className="caption-option-copy">{variant.caption}</p><small>{variant.rationale}</small>
        <button type="button" className="outline-btn sm" onClick={() => {onApply(platform, variant); setFeedback('Applied to ' + name);}}><PenLine size={14}/> Use for {name}</button>
      </article>)}
    </div>}
  </section>;
}
