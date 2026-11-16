'use client';

import {useMemo} from 'react';
import {ArrowUpRight, CalendarClock, FlaskConical, TrendingUp} from 'lucide-react';
import {CHANNELS, postFormat} from '../lib/channel-formats';
import {comparables, GOALS, postingSlots, type GrowthFormat, type GrowthGoal, type Observation} from '../lib/growth';
import type {ContentPost, Platform} from '../lib/types';

export type TimingProps = {
  platform: Platform;
  goal: GrowthGoal;
  format?: GrowthFormat;
  draft?: ContentPost;
  timezone: string;
  observations: Observation[];
  reserved: number[];
  onApply: (time: number) => void;
};

export default function PostingTimes({platform, goal, format: formatChoice, draft, timezone, observations, reserved, onApply}: TimingProps) {
  const layout = postFormat(platform, draft?.mediaType || '', draft?.mediaDetails);
  const format = formatChoice || (layout === 'watch' || layout === 'facebook-video' ? 'Long video' : ['shorts', 'reel', 'tiktok-video'].includes(layout) || draft?.mediaType === 'video' ? 'Short video' : draft?.mediaType === 'image' || platform === 'instagram' || platform === 'pinterest' ? 'Feed or photo' : 'Text post');
  const slots = useMemo(() => postingSlots({
    entries: comparables(observations, platform, goal, format), platform, goal, timezone, reserved
  }), [observations, platform, goal, format, timezone, reserved]);
  const date = new Intl.DateTimeFormat(undefined, {timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric'});
  const hour = new Intl.DateTimeFormat(undefined, {timeZone: timezone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short'});
  const metric = new Intl.NumberFormat(undefined, {maximumFractionDigits: 1});
  return <div className="posting-times">
    <div className="growth-section-heading">
      <span className="growth-section-mark"><CalendarClock size={17}/></span>
      <div><h3>Posting times</h3><p>{CHANNELS[platform].name} · {format} · {timezone.replaceAll('_', ' ')}</p></div>
    </div>
    {slots.length ? <div className="posting-slots">{slots.map(slot => <button type="button" className="posting-slot" key={slot.at} onClick={() => onApply(slot.at)} title="Use this time in the composer">
      <span className={'slot-marker ' + (slot.score != null ? 'measured' : '')}>{slot.score != null ? <TrendingUp size={15}/> : <FlaskConical size={15}/>}</span>
      <span><b>{date.format(slot.at)} · {hour.format(slot.at)}</b><small>{slot.score == null ? 'Test window' + (slot.samples ? ' · ' + slot.samples + ' past posts' : '') : metric.format(slot.score) + ' · ' + GOALS[goal].comparison.toLowerCase() + ' · ' + slot.samples + ' posts'}</small></span>
      <ArrowUpRight size={15}/>
    </button>)}</div> : <p className="growth-note">The next matching windows are occupied on your content calendar.</p>}
    <p className="growth-note">Uses results measured 24 hours after posting when a window has 3 comparable posts. Test windows are starting points.</p>
  </div>;
}
