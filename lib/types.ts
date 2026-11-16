export type Platform='youtube'|'tiktok'|'instagram'|'facebook'|'x'|'linkedin'|'threads'|'pinterest'|'google_business';
export type SocialAccount={id:string;platform:Platform;name:string;handle:string;external_id?:string;avatar?:string};
export type PostStatus='draft'|'review'|'scheduled'|'queued'|'publishing'|'published'|'partial'|'failed';
export type ContentPost={id:string;title:string;caption:string;tags:string;cta:string;firstComment:string;altText:string;link:string;mediaUrl:string;mediaName:string;mediaType:'image'|'video'|'';platforms:Platform[];accountIds:string[];overrides:Partial<Record<Platform,string>>;channelTitles?:Partial<Record<Platform,string>>;mediaDetails?:{width:number;height:number;duration?:number};visibility:'public'|'private'|'unlisted';scheduledAt:string;status:PostStatus;createdAt:string;updatedAt:string;brand:string;aiGenerated?:boolean;madeForKids?:boolean;syntheticMedia?:boolean};
export type PublishJob={id:string;post_id:string;platform:string;account_id:string;status:string;external_url?:string;error?:string;submitted_id?:string};
export type WorkspaceState={posts:ContentPost[];accounts:SocialAccount[]};
export const PLATFORMS:Platform[]=['instagram','facebook','tiktok','youtube','x','linkedin','threads','pinterest','google_business'];
export const INITIAL_POST:ContentPost={id:'',title:'',caption:'',tags:'',cta:'',firstComment:'',altText:'',link:'',mediaUrl:'',mediaName:'',mediaType:'',platforms:[],accountIds:[],overrides:{},visibility:'public',scheduledAt:'',status:'draft',createdAt:'',updatedAt:'',brand:'Default brand',madeForKids:false,syntheticMedia:false};

export function postHasContent(post: ContentPost) {
 return !!(post.caption?.trim() || post.title?.trim() || post.mediaUrl || Object.values(post.channelTitles || {}).some(value => typeof value === 'string' && value.trim()) || Object.values(post.overrides || {}).some(value => typeof value === 'string' && value.trim()));
}
