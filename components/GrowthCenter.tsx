'use client';

import {useEffect, useMemo, useRef, useState, type FormEvent} from 'react';
import {
  ArrowRight, ArrowUpRight, BarChart3, CalendarClock, Check, Clipboard, FlaskConical,
  Lightbulb, MessageCircle, PenLine, Sparkles, Target, Trash2, TrendingUp
} from 'lucide-react';
import type {ContentPost, Platform} from '../lib/types';
import {PLATFORMS} from '../lib/types';
import {CHANNELS} from '../lib/channel-formats';
import {
  AUDIENCE_ZONES, CONTENT_FORMATS, GOALS, browserDateTime, comparables, summarize,
  type GrowthFormat, type GrowthGoal, type GrowthProfile, type Observation
} from '../lib/growth';
import PlatformIcon from './PlatformIcon';
import PostingTimes from './PostingTimes';

type Props = {
  brand: string;
  token: string | null;
  aiReady: boolean;
  profile: GrowthProfile;
  observations: Observation[];
  initialPlatform: Platform;
  reserved: number[];
  onSaveProfile: (profile: GrowthProfile) => void;
  onObservations: (observations: Observation[]) => void;
  onPlan: (drafts: Partial<ContentPost>[]) => Promise<void>;
  onCompose: (platform: Platform, seed?: Partial<ContentPost>) => void;
  onApplyTime: (platform: Platform, at: number) => void;
  onNavigate: (view: 'analytics' | 'community' | 'settings' | 'ai') => void;
};

type Tab = 'strategy' | 'times' | 'experiments';
type Idea = {title: string; angle: string; format: string; goal: string; hook: string};
type CampaignResult = {ideas: Idea[]; calendarPlan: Partial<ContentPost>[]; audit: string[]};
const modes = [
  {id: 'strategy', name: 'Campaigns', icon: Target},
  {id: 'times', name: 'Posting times', icon: CalendarClock},
  {id: 'experiments', name: 'A/B tests', icon: FlaskConical}
] as const;
const goalOptions = Object.entries(GOALS) as [GrowthGoal, (typeof GOALS)[GrowthGoal]][];
const emptyResult: CampaignResult = {ideas: [], calendarPlan: [], audit: []};

function LogResults({platform, goal, format, items, experimentMode, onSave}: {
  platform: Platform; goal: GrowthGoal; format: GrowthFormat; items: Observation[]; experimentMode: boolean;
  onSave: (observations: Observation[]) => void;
}) {
  const [outcome, setOutcome] = useState('');
  const [reach, setReach] = useState('');
  const [experiment, setExperiment] = useState('');
  const [variant, setVariant] = useState<'A' | 'B'>('A');
  const [feedback, setFeedback] = useState('');
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const inputs = new FormData(event.currentTarget);
    const at = Date.parse(inputs.get('postedDate') + 'T' + inputs.get('postedTime'));
    const count = Number(outcome);
    const reached = goal === 'views' ? null : Number(reach);
    if (!Number.isFinite(at) || at > Date.now() - 24 * 60 * 60_000 || outcome === '' || !Number.isSafeInteger(count) || count < 0 || reached != null && (!Number.isSafeInteger(reached) || reached < 1)) {
      setFeedback('Enter a post at least 24 hours old and its valid 24-hour results.');
      return;
    }
    if (items.some(row => row.platform === platform && row.goal === goal && row.format === format && Date.parse(row.postedAt) === at)) {
      setFeedback('A result is already recorded for this post.');
      return;
    }
    if (experimentMode && !experiment.trim()) { setFeedback('Name the experiment.'); return; }
    onSave([{
      id: crypto.randomUUID(), platform, goal, format, postedAt: new Date(at).toISOString(),
      outcome: count, reach: reached, experiment: experimentMode ? experiment.trim() : '', variant: experimentMode ? variant : ''
    }, ...items]);
    event.currentTarget.reset(); setOutcome(''); setReach(''); setFeedback('Result logged.');
  }
  return <section className="panel growth-panel">
    <div className="growth-section-heading"><span className="growth-section-mark"><BarChart3 size={17}/></span><div><h3>{experimentMode ? 'Log a test result' : 'Log post results'}</h3><p>Record the numbers from the first 24 hours.</p></div></div>
    <form className="growth-fields" onSubmit={save}>
      <label className="growth-field">Date published <input type="date" name="postedDate" max={browserDateTime(new Date(Date.now() - 24 * 60 * 60_000)).slice(0,10)} required/></label>
      <label className="growth-field">Time published · device time <input type="time" name="postedTime" required/></label>
      {experimentMode && <><label className="growth-field">Experiment name <input value={experiment} onChange={e => setExperiment(e.target.value)} placeholder="e.g. Question vs. checklist hook" maxLength={80} required/></label><label className="growth-field">Variant <select value={variant} onChange={e => setVariant(e.target.value as 'A' | 'B')}><option>A</option><option>B</option></select></label></>}
      <label className="growth-field">{GOALS[goal].outcome} <input type="number" min={0} step={1} value={outcome} onChange={e => setOutcome(e.target.value)} required/></label>
      {goal !== 'views' && <label className="growth-field">Accounts reached <input type="number" min={1} step={1} value={reach} onChange={e => setReach(e.target.value)} required/></label>}
      {goal === 'engagement' && <p className="growth-note growth-wide">Count the same interactions across every post, such as reactions, comments, shares and saves.</p>}
      <div className="growth-toolbar growth-wide"><button type="submit" className="primary-btn sm"><Check size={15}/> Save result</button>{feedback && <span role="status">{feedback}</span>}</div>
    </form>
  </section>;
}

function Comparisons({rows, goal}: {rows: Observation[]; goal: GrowthGoal}) {
  const metric = new Intl.NumberFormat(undefined, {maximumFractionDigits: 1});
  const grouped = new Map<string, Observation[]>();
  for (const row of rows) {
    if (!row.experiment) continue;
    const key = row.experiment.toLowerCase();
    const existing = grouped.get(key) || [];
    existing.push(row);
    grouped.set(key, existing);
  }
  return <section className="panel growth-panel">
    <div className="growth-section-heading"><span className="growth-section-mark"><FlaskConical size={17}/></span><div><h3>Compare A and B</h3><p>{GOALS[goal].comparison}</p></div></div>
    <p className="growth-note">Change one thing, such as the hook or opening shot. Compare at least 3 similar posts per version.</p>
    {grouped.size === 0 && <p className="growth-empty">Log results with the same experiment name to compare your variants.</p>}
    {[...grouped].map(([key, entries]) => {
      const a = entries.filter(entry => entry.variant === 'A'), b = entries.filter(entry => entry.variant === 'B');
      const aValue = summarize(a, goal), bValue = summarize(b, goal);
      const best = a.length >= 3 && b.length >= 3 && aValue != null && bValue != null && aValue !== bValue ? aValue > bValue ? 'A' : 'B' : '';
      return <article className="growth-test" key={key}><h4>{entries[0].experiment}</h4><div className="growth-test-scores">
        {[{name: 'A', value: aValue, count: a.length}, {name: 'B', value: bValue, count: b.length}].map(({name, value, count}) =>
          <div key={name} data-leading={best === name}><small>Version {name} · {count} {count === 1 ? 'post' : 'posts'}</small><strong>{value == null ? '—' : metric.format(value)}</strong></div>)}
      </div><p className="growth-note">{best ? 'Version ' + best + ' performed better in these results.' : a.length >= 3 && b.length >= 3 ? 'These versions are tied on the selected metric.' : 'Collect more results before choosing a version.'}</p></article>;
    })}
  </section>;
}

export default function GrowthCenter({brand, token, aiReady, profile, observations, initialPlatform, reserved,
  onSaveProfile, onObservations, onPlan, onCompose, onApplyTime, onNavigate}: Props) {
  const [tab, setTab] = useState<Tab>('strategy');
  const [brief, setBrief] = useState(profile);
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState(initialPlatform);
  const [format, setFormat] = useState<GrowthFormat>(initialPlatform === 'youtube' ? 'Long video' : initialPlatform === 'tiktok' ? 'Short video' : 'Feed or photo');
  const [result, setResult] = useState(emptyResult);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const rows = useMemo(() => comparables(observations, platform, brief.goal, format), [observations, platform, brief.goal, format]);

  async function campaign(mode: 'calendar' | 'ideas' | 'growth_audit') {
    if (!token || busy) return;
    if (!topic.trim() && !brief.niche.trim()) { setError('Add a campaign topic or niche first.'); return; }
    setBusy(true); setError(''); setStatus('');
    const request = new AbortController();
    controller.current = request;
    try {
      let legacy: Record<string, unknown> = {};
      try { legacy = JSON.parse(localStorage.getItem('omnipost-growth-metrics') || '{}') || {}; } catch {}
      const summary = rows.length ? rows.length + ' posts with 24-hour results. ' + GOALS[brief.goal].comparison + ': ' + (summarize(rows, brief.goal)?.toFixed(1) ?? 'unavailable') : 'No comparable posts logged.';
      const response = await fetch('/api/ai', {
        method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + token}, signal: request.signal,
        body: JSON.stringify({
          mode, topic: topic || brief.niche, tone: brief.voice, goal: GOALS[brief.goal].label, audience: brief.audience, brand, platforms: [platform],
          interactionContext: [brief.niche, brief.offer, format, summary,
            mode === 'growth_audit' && Object.values(legacy).some(Boolean) ? 'Previously entered totals with no known date range: ' + Object.entries(legacy).map(([key, value]) => key + '=' + value).join(', ') : ''].filter(Boolean).join('\n')
        })
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Campaign generation failed.');
      setResult({...emptyResult, ideas: data.ideas || [], calendarPlan: data.calendarPlan || [], audit: data.audit || []});
    } catch (err) {
      if (!request.signal.aborted) setError(err instanceof Error ? err.message : 'Campaign generation failed.');
    } finally { if (!request.signal.aborted) setBusy(false); }
  }

  async function savePlan() {
    if (saving) return;
    setSaving(true); setError('');
    try { await onPlan(result.calendarPlan); setResult(emptyResult); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save campaign drafts.'); }
    finally { setSaving(false); }
  }

  return <div className="growth-workspace">
    <header className="growth-masthead">
      <div><p><TrendingUp size={18}/> {brand}</p><h1>Growth Lab</h1><span>Plan campaigns, test posting times and learn which content earns a response.</span></div>
      <div className="growth-masthead-actions"><button type="button" className="outline-btn sm" onClick={() => onNavigate('analytics')}><BarChart3 size={16}/> Analytics</button><button type="button" className="outline-btn sm" onClick={() => onNavigate('community')}><MessageCircle size={16}/> Community inbox</button></div>
    </header>
    <div className="growth-navigation" aria-label="Growth Lab tools">
      {modes.map(({id, name, icon: Icon}) => <button type="button" key={id} aria-pressed={tab === id} onClick={() => setTab(id)}><Icon size={16}/>{name}</button>)}
    </div>
    <div className="panel growth-filters">
      <label className="growth-field">Channel <select value={platform} onChange={e => {const next = e.target.value as Platform; setPlatform(next); setFormat(next === 'youtube' ? 'Long video' : next === 'tiktok' ? 'Short video' : 'Feed or photo'); setResult(emptyResult);}}>{PLATFORMS.map(channel => <option value={channel} key={channel}>{CHANNELS[channel].name}</option>)}</select></label>
      <label className="growth-field">Objective <select value={brief.goal} onChange={e => setBrief({...brief, goal: e.target.value as GrowthGoal})}>{goalOptions.map(([value, option]) => <option value={value} key={value}>{option.label}</option>)}</select></label>
      <label className="growth-field">Format <select value={format} onChange={e => setFormat(e.target.value as GrowthFormat)}>{CONTENT_FORMATS.map(value => <option key={value}>{value}</option>)}</select></label>
      {tab === 'times' && <label className="growth-field">Audience time zone <select value={brief.timezone} onChange={e => {const updated = {...brief, timezone: e.target.value}; setBrief(updated); onSaveProfile({...profile, timezone: updated.timezone});}}>{AUDIENCE_ZONES.map(zone => <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>)}</select></label>}
    </div>
    {tab === 'strategy' ? <div className="growth-columns">
      <section className="panel growth-panel">
        <div className="growth-section-heading"><span className="growth-section-mark"><Target size={17}/></span><div><h3>Audience brief</h3><p>Use this profile in campaigns and caption suggestions.</p></div></div>
        <div className="growth-fields">
          <label className="growth-field">Niche <input value={brief.niche} onChange={e => setBrief({...brief, niche: e.target.value})} maxLength={160} placeholder="e.g. Residential real estate"/></label>
          <label className="growth-field">Audience <input value={brief.audience} onChange={e => setBrief({...brief, audience: e.target.value})} maxLength={240} placeholder="e.g. First-time buyers in Quezon City"/></label>
          <label className="growth-field">Brand voice <input value={brief.voice} onChange={e => setBrief({...brief, voice: e.target.value})} maxLength={100}/></label>
          <label className="growth-field">Offer or content promise <input value={brief.offer} onChange={e => setBrief({...brief, offer: e.target.value})} maxLength={240} placeholder="e.g. Practical guidance before a viewing"/></label>
          <label className="growth-field growth-wide">Campaign topic <textarea rows={3} maxLength={1000} value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. What to check before paying a reservation fee"/></label>
        </div>
        <div className="growth-toolbar"><button type="button" className="outline-btn sm" onClick={() => {onSaveProfile(brief); setStatus('Audience brief saved on this device.');}}><Check size={15}/> Save brief</button><button type="button" className="primary-btn sm" onClick={() => {onSaveProfile(brief); onCompose(platform, {title: topic.trim().slice(0, 120)});}}><PenLine size={15}/> Open caption lab</button></div>
        {status && <p role="status" className="growth-note">{status}</p>}
      </section>
      <section className="panel growth-panel">
        <div className="growth-section-heading"><span className="growth-section-mark"><PlatformIcon platform={platform} size={20}/></span><div><h3>{CHANNELS[platform].name} playbook</h3><p>Focus on {GOALS[brief.goal].comparison.toLowerCase()}.</p></div></div>
        <p className="growth-guidance">{CHANNELS[platform].guidance}</p><p className="growth-guidance">{GOALS[brief.goal].prompt}</p>
        <a className="native-preview-source" href={CHANNELS[platform].source} target="_blank" rel="noreferrer">Platform guidance <ArrowUpRight size={14}/></a>
        <div className="growth-toolbar">
          {aiReady ? <><button type="button" className="primary-btn sm" disabled={busy} onClick={() => void campaign('calendar')}><Sparkles size={15}/> 7-day plan</button><button type="button" className="outline-btn sm" disabled={busy} onClick={() => void campaign('ideas')}><Lightbulb size={15}/> Content ideas</button><button type="button" className="outline-btn sm" disabled={busy} onClick={() => void campaign('growth_audit')}>Growth audit</button></> : <button type="button" className="outline-btn sm" onClick={() => onNavigate('settings')}><Sparkles size={15}/> Connect Gemini for campaign ideas</button>}
        </div>
        {busy && <p className="growth-note" role="status">Building recommendations…</p>}
        {error && <p className="growth-error" role="alert">{error}</p>}
      </section>
      {result.calendarPlan.length > 0 && <section className="panel growth-panel growth-wide">
        <div className="growth-section-heading"><span className="growth-section-mark"><CalendarClock size={17}/></span><div><h3>7-day campaign</h3><p>Review each idea before saving.</p></div></div>
        <div className="growth-plan">{result.calendarPlan.map((post, i) => <article key={i}><small>Day {i + 1}</small><h4>{post.title || 'Post idea'}</h4><p>{post.overrides?.[platform] || post.caption}</p><button type="button" className="outline-btn sm" onClick={() => onCompose(platform, post)}>Edit in composer <ArrowRight size={14}/></button></article>)}</div>
        <button type="button" className="primary-btn sm" disabled={saving} onClick={() => void savePlan()}>{saving ? 'Saving drafts…' : 'Save plan as drafts'}</button>
      </section>}
      {result.ideas.length > 0 && <section className="panel growth-panel growth-wide"><div className="growth-section-heading"><span className="growth-section-mark"><Lightbulb size={17}/></span><div><h3>Content ideas</h3></div></div>
        <div className="growth-plan">{result.ideas.map((idea, i) => <article key={i}><small>{idea.format} · {idea.goal}</small><h4>{idea.title}</h4><p>{idea.angle}</p><button type="button" className="outline-btn sm" onClick={() => onCompose(platform, {title: idea.title, caption: idea.hook, aiGenerated: true})}>Draft this idea <ArrowRight size={14}/></button></article>)}</div>
      </section>}
      {result.audit.length > 0 && <section className="panel growth-panel growth-wide"><div className="growth-section-heading"><span className="growth-section-mark"><Clipboard size={17}/></span><div><h3>Growth audit</h3></div></div><ul className="growth-audit">{result.audit.map((item, i) => <li key={i}>{item}</li>)}</ul></section>}
    </div> : <div className="growth-columns">
      {tab === 'times' ? <section className="panel growth-panel"><PostingTimes platform={platform} goal={brief.goal} format={format} timezone={brief.timezone} observations={observations} reserved={reserved} onApply={time => onApplyTime(platform, time)}/></section> : <Comparisons rows={rows} goal={brief.goal}/>}
      <LogResults key={tab + platform + brief.goal + format} platform={platform} goal={brief.goal} format={format} items={observations} experimentMode={tab === 'experiments'} onSave={onObservations}/>
      <section className="panel growth-panel growth-wide">
        <div className="growth-section-heading"><span className="growth-section-mark"><BarChart3 size={17}/></span><div><h3>Recorded posts</h3><p>{rows.length} for this channel, objective and format · saved on this device</p></div></div>
        {!rows.length && <p className="growth-empty">Post results will appear here after you log them.</p>}
        <div className="growth-observations">{rows.map(row => <div key={row.id}><PlatformIcon platform={row.platform} size={22}/><span><b>{new Date(row.postedAt).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'})}</b><small>{row.experiment ? row.experiment + ' · ' + row.variant : GOALS[row.goal].outcome + ' · 24 hours'}</small></span><strong>{row.outcome.toLocaleString()}{row.reach ? ' / ' + row.reach.toLocaleString() + ' reached' : ''}</strong><button type="button" className="icon-btn" aria-label="Remove recorded result" onClick={() => onObservations(observations.filter(item => item.id !== row.id))}><Trash2 size={15}/></button></div>)}</div>
      </section>
    </div>}
  </div>;
}
