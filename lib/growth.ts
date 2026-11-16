import type {Platform} from './types';

export const GOALS = {
  engagement: {label: 'Engagement', outcome: 'Interactions', comparison: 'Interactions per 1,000 reached', prompt: 'Invite a specific response or give people a reason to save or share.'},
  views: {label: 'Views', outcome: 'Views', comparison: 'Median views', prompt: 'Deliver the promised payoff early and keep each scene moving the story forward.'},
  followers: {label: 'Followers', outcome: 'Follows', comparison: 'Follows per 1,000 reached', prompt: 'Give viewers a clear reason to return and show what you will cover next.'},
  leads: {label: 'Leads', outcome: 'Qualified leads', comparison: 'Leads per 1,000 reached', prompt: 'Name the next step clearly and make it easy for an interested person to act.'}
} as const;

export type GrowthGoal = keyof typeof GOALS;
export const AUDIENCE_ZONES = ['Asia/Manila', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Australia/Sydney', 'Europe/London', 'UTC'];
export const CONTENT_FORMATS = ['Feed or photo', 'Short video', 'Long video', 'Text post'] as const;
export type GrowthFormat = typeof CONTENT_FORMATS[number];
export type GrowthProfile = {audience: string; niche: string; offer: string; voice: string; goal: GrowthGoal; timezone: string};
export const DEFAULT_PROFILE: GrowthProfile = {audience: '', niche: '', offer: '', voice: 'Helpful and conversational', goal: 'engagement', timezone: 'Asia/Manila'};

export type Observation = {
  id: string; platform: Platform; goal: GrowthGoal; format: GrowthFormat; postedAt: string;
  outcome: number; reach: number | null; experiment: string; variant: 'A' | 'B' | '';
};
export type PostingSlot = {at: number; label: string; samples: number; score: number | null};

function timeParts(time: number, fmt: Intl.DateTimeFormat) {
  const parts = fmt.formatToParts(time);
  return {
    weekday: parts.find(p => p.type === 'weekday')?.value ?? '',
    hour: Number(parts.find(p => p.type === 'hour')?.value),
    minute: Number(parts.find(p => p.type === 'minute')?.value)
  };
}

const group = (weekday: string) => ['Sat', 'Sun'].includes(weekday) ? 'Weekend' : 'Weekday';

export function comparables(entries: Observation[], platform: Platform, goal: GrowthGoal, format: GrowthFormat) {
  return entries.filter(entry => entry.platform === platform && entry.goal === goal && entry.format === format);
}

export function summarize(entries: Observation[], goal: GrowthGoal) {
  const outcomes = entries.map(entry => entry.outcome).sort((a, b) => a - b);
  const size = outcomes.length;
  if (!size) return null;
  if (goal === 'views') return (outcomes[Math.floor((size - 1) / 2)] + outcomes[Math.floor(size / 2)]) / 2;
  const reach = entries.reduce((sum, entry) => sum + (entry.reach || 0), 0);
  return reach ? outcomes.reduce((sum, count) => sum + count, 0) * 1000 / reach : null;
}

const startingWindows: Record<Platform, [string, string, string]> = {
  instagram: ['Weekday 18', 'Weekday 12', 'Weekend 10'],
  facebook: ['Weekday 19', 'Weekday 12', 'Weekend 10'],
  tiktok: ['Weekday 19', 'Weekend 16', 'Weekday 12'],
  youtube: ['Weekday 17', 'Weekend 11', 'Weekday 12'],
  x: ['Weekday 08', 'Weekday 12', 'Weekend 10'],
  linkedin: ['Weekday 08', 'Weekday 12', 'Weekday 17'],
  threads: ['Weekday 18', 'Weekday 12', 'Weekend 10'],
  pinterest: ['Weekend 10', 'Weekday 19', 'Weekday 12'],
  google_business: ['Weekday 09', 'Weekday 12', 'Weekend 10']
};

export function postingSlots({
  entries, platform, goal, timezone, reserved = [], now = Date.now()
}: {entries: Observation[]; platform: Platform; goal: GrowthGoal; timezone: string; reserved?: number[]; now?: number}): PostingSlot[] {
  const fmt = new Intl.DateTimeFormat('en-US', {timeZone: timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
  const buckets = new Map<string, Observation[]>();
  const bucketKey = (weekday: string, hour: number) => group(weekday) + ' ' + String(hour).padStart(2, '0');
  for (const entry of entries) {
    const at = Date.parse(entry.postedAt);
    if (!Number.isFinite(at) || at > now) continue;
    const {weekday, hour} = timeParts(at, fmt);
    const key = bucketKey(weekday, hour);
    const current = buckets.get(key) || [];
    current.push(entry);
    buckets.set(key, current);
  }
  const ranked = [...buckets].filter(([, rows]) => rows.length >= 3)
    .map(([key, rows]) => ({key, samples: rows.length, score: summarize(rows, goal)}))
    .filter(row => row.score != null)
    .sort((a, b) => b.score! - a.score! || b.samples - a.samples);
  const choices = [...ranked, ...startingWindows[platform].filter(key => !ranked.some(row => row.key === key))
    .map(key => ({key, samples: buckets.get(key)?.length || 0, score: null}))].slice(0, 5);
  const upcoming = new Map<string, number>();
  const quarter = 15 * 60_000;
  const first = Math.ceil((now + quarter) / quarter) * quarter;
  for (let at = first; at < first + 8 * 24 * 60 * 60_000 && upcoming.size < choices.length; at += quarter) {
    const {weekday, hour, minute} = timeParts(at, fmt);
    if (minute !== 0) continue;
    const key = bucketKey(weekday, hour);
    if (upcoming.has(key) || !choices.some(row => row.key === key)) continue;
    if (reserved.some(date => Math.abs(at - date) < 60 * 60_000)) continue;
    upcoming.set(key, at);
  }
  return choices.flatMap(({key, samples, score}) => {
    const at = upcoming.get(key);
    return at == null ? [] : [{at, label: key.split(' ')[0] || '', samples, score}];
  }).slice(0, 3);
}

export function readGrowthProfile(key: string, fallbackZone: string): GrowthProfile {
  const defaults = {...DEFAULT_PROFILE, timezone: AUDIENCE_ZONES.includes(fallbackZone) ? fallbackZone : DEFAULT_PROFILE.timezone};
  try {
    const content = localStorage.getItem(key);
    const legacy = localStorage.getItem('omnipost-growth-profile');
    const source = JSON.parse(content || legacy || '{}');
    return {
      audience: typeof source.audience === 'string' ? source.audience : defaults.audience,
      niche: typeof source.niche === 'string' ? source.niche : defaults.niche,
      offer: typeof source.offer === 'string' ? source.offer : defaults.offer,
      voice: typeof source.voice === 'string' ? source.voice : defaults.voice,
      goal: Object.hasOwn(GOALS, source.goal) ? source.goal : defaults.goal,
      timezone: AUDIENCE_ZONES.includes(source.timezone) ? source.timezone : defaults.timezone
    };
  } catch { return defaults; }
}

export function readObservations(key: string): Observation[] {
  try {
    const rows: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

export function browserDateTime(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
