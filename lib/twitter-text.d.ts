declare module 'twitter-text/dist/parseTweet' {
  import type {ParsedTweet, ParseTweetOptions} from 'twitter-text';
  export default function parseTweet(text: string, options?: ParseTweetOptions): ParsedTweet;
}
