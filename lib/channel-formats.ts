import parseTweet from 'twitter-text/dist/parseTweet';
import type {ContentPost, Platform} from './types';

export type MediaDetails = {width: number; height: number; duration?: number};
export type PostFormat = 'feed' | 'reel' | 'tiktok-video' | 'tiktok-photo' | 'facebook-video' | 'watch' | 'shorts' | 'pin' | 'update';
type Channel = {name: string; limit: number; guidance: string; source: string; ratio: string};
export const CHANNELS: Record<Platform, Channel> = {
  instagram: {name: 'Instagram', limit: 2200, guidance: 'Lead with the benefit. Use a saveable checklist for feed posts or demonstrate the payoff on camera for Reels.', source: 'https://knowledge.hubspot.com/social/image-size-requirements-for-social-posts', ratio: '4:5'},
  facebook: {name: 'Facebook', limit: 63206, guidance: 'Start with local context or a concrete update. Give readers a practical question to discuss, or demonstrate the result in an original video.', source: 'https://about.fb.com/news/2026/03/rewarding-original-creators-on-facebook/', ratio: '4:5'},
  tiktok: {name: 'TikTok', limit: 2200, guidance: 'Show the payoff early, say the search phrase naturally and use captions viewers can follow with sound off. Compare watch time and search traffic.', source: 'https://support.tiktok.com/en/using-tiktok/exploring-videos/how-tiktok-recommends-content', ratio: '9:16'},
  youtube: {name: 'YouTube', limit: 5000, guidance: 'Make one clear promise in the title. Deliver it early. Review audience retention for videos and engaged views for Shorts.', source: 'https://support.google.com/youtube/answer/15424877', ratio: '16:9'},
  x: {name: 'X', limit: 280, guidance: 'Put the takeaway in the first sentence. Add one specific example or a focused question if space permits.', source: 'https://docs.x.com/fundamentals/counting-characters', ratio: '16:9'},
  linkedin: {name: 'LinkedIn', limit: 3000, guidance: 'Explain what changed, what you observed and what someone can do with that information. Ask a question peers can answer from experience.', source: 'https://docs.upload-post.com/api/upload-text', ratio: '4:5'},
  threads: {name: 'Threads', limit: 500, guidance: 'Start with a specific observation your audience can react to, then reply with useful context or an example.', source: 'https://about.fb.com/news/2023/07/introducing-threads-new-app-text-sharing/', ratio: '4:5'},
  pinterest: {name: 'Pinterest', limit: 800, guidance: 'Use a specific search phrase in the title, show the outcome in the graphic, and link to a page that delivers what the Pin promises.', source: 'https://help.pinterest.com/en/business/article/pinterest-product-specs', ratio: '2:3'},
  google_business: {name: 'Google Business', limit: 1500, guidance: 'Say what is available, where and when. Use dates or offers only when you can verify them.', source: 'https://support.google.com/business/answer/7342169', ratio: '4:3'}
};

const titles: Partial<Record<Platform, {label: string; limit: number}>> = {
  youtube: {label: 'Video title', limit: 100},
  tiktok: {label: 'Photo title', limit: 80},
  pinterest: {label: 'Pin title', limit: 100}
};

export function channelTitleField(platform: Platform, mediaType: ContentPost['mediaType']) {
  return platform !== 'tiktok' || mediaType === 'image' ? titles[platform] : undefined;
}

export function masterCopy(post: ContentPost) {
  return [post.caption, post.cta, post.tags].map(value => value?.trim()).filter(Boolean).join('\n\n') || post.title?.trim() || '';
}

export function channelCopy(post: ContentPost, platform: Platform) {
  const titleField = channelTitleField(platform, post.mediaType);
  const text = post.overrides?.[platform]?.trim() || masterCopy(post);
  const captionOnly = platform === 'tiktok' && post.mediaType === 'image';
  const limit = captionOnly ? 4000 : CHANNELS[platform].limit;
  const title = titleField ? post.channelTitles?.[platform]?.trim() || post.title?.trim() || '' : '';
  const textCount = platform === 'x' ? parseTweet(text).weightedLength
    : platform === 'youtube' ? new TextEncoder().encode(text).length
    : platform === 'tiktok' && !captionOnly ? text.length : Array.from(text).length;
  return {
    text, title, titleField, limit, textCount, titleCount: Array.from(title).length,
    textLabel: titleField ? 'Description' : platform === 'instagram' || platform === 'tiktok' ? 'Caption' : 'Post text',
    unit: platform === 'youtube' ? 'bytes' : platform === 'x' ? 'weighted characters' : 'characters'
  };
}

export function postFormat(platform: Platform, mediaType: ContentPost['mediaType'], media?: MediaDetails): PostFormat {
  if (platform === 'youtube') {
    return mediaType === 'video' && media && media.width <= media.height && media.duration != null && media.duration > 0 && media.duration <= 180 ? 'shorts' : 'watch';
  }
  if (platform === 'facebook' && mediaType === 'video' && media && media.width / media.height > .65) return 'facebook-video';
  if (platform === 'instagram' || platform === 'facebook') return mediaType === 'video' ? 'reel' : 'feed';
  if (platform === 'tiktok') return mediaType === 'image' ? 'tiktok-photo' : 'tiktok-video';
  if (platform === 'pinterest') return 'pin';
  return platform === 'google_business' ? 'update' : 'feed';
}

export const FORMAT_LABELS: Record<PostFormat, string> = {
  feed: 'Feed post', reel: 'Reel', 'tiktok-video': 'Video', 'tiktok-photo': 'Photo post',
  'facebook-video': 'Page video', watch: 'Watch page', shorts: 'Short', pin: 'Pin', update: 'Business update'
};

export const VERTICAL_FORMATS: PostFormat[] = ['reel', 'tiktok-video', 'tiktok-photo', 'shorts'];
export const PREVIEW_RATIOS = ['9:16', '2:3', '3:4', '4:5', '1:1', '4:3', '1.91:1', '16:9'];

export function previewRatio(platform: Platform, format: PostFormat, media?: MediaDetails) {
  if (VERTICAL_FORMATS.includes(format)) return '9:16';
  if (format === 'watch' || format === 'pin') return CHANNELS[platform].ratio;
  if (media?.width && media?.height) return media.width + ':' + media.height;
  return CHANNELS[platform].ratio;
}

export function channelIssues(post: ContentPost, platform: Platform) {
  const copy = channelCopy(post, platform);
  const errors: string[] = [];
  if (platform === 'youtube' && (!post.mediaUrl || post.mediaType !== 'video')) errors.push('Attach a video.');
  else if (['instagram', 'tiktok', 'pinterest'].includes(platform) && !post.mediaUrl) errors.push('Attach an image or video.');
  if (copy.titleField && (!copy.title || copy.titleCount > copy.titleField.limit)) {
    errors.push(copy.title ? `${copy.titleField.label} is over ${copy.titleField.limit} characters.` : 'Add a ' + copy.titleField.label.toLowerCase() + '.');
  }
  if (post.visibility && post.visibility !== 'public' && platform !== 'youtube' && !(platform === 'tiktok' && post.visibility === 'private')) {
    errors.push('Choose supported visibility for this channel.');
  }
  if (platform === 'youtube' && /[<>]/.test(copy.title + copy.text)) errors.push('Remove angle brackets from the title and description.');
  if (copy.textCount > copy.limit) errors.push(`${copy.textLabel} is over ${copy.limit.toLocaleString('en-US')} ${copy.unit}.`);
  if (!copy.text && !copy.title && !post.mediaUrl) errors.push('Add post text or media.');
  return errors;
}

export function safePostLink(value?: string) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? url.href : '';
  } catch { return ''; }
}

export function managedChannelFields(post: ContentPost, platforms: Platform[]) {
  const fields: Record<string, string> = {title: masterCopy(post)};
  for (const platform of platforms) {
    const copy = channelCopy(post, platform);
    if (copy.title || copy.text) fields[platform + '_title'] = copy.titleField ? copy.title || copy.text : copy.text;
    if (copy.titleField || (post.mediaType && ['facebook', 'linkedin'].includes(platform))) {
      if (copy.text) fields[platform + '_description'] = copy.text;
    }
    if (post.mediaType === 'image' && post.altText?.trim() && ['instagram', 'facebook', 'x', 'linkedin', 'threads', 'pinterest'].includes(platform)) {
      fields[platform + '_alt_text'] = post.altText.trim();
    }
    if (platform === 'pinterest' && safePostLink(post.link)) fields.pinterest_link = safePostLink(post.link);
    if (platform === 'facebook' && postFormat(platform, post.mediaType, post.mediaDetails) === 'facebook-video') fields.facebook_media_type = 'VIDEO';
    if (platform === 'tiktok') fields.privacy_level = post.visibility === 'private' ? 'SELF_ONLY' : 'PUBLIC_TO_EVERYONE';
  }
  if (!fields.title) fields.title = fields[platforms[0] + '_title'] || '';
  return fields;
}
