import type { Metadata } from 'next';
import './globals.css';
import './premium.css';
import './studio.css';
export const metadata: Metadata = {title:'OmniPost AI | by Carl Vincent Zabala',description:'Create, preview, organize and publish social media content with AI. Designed by Carl Vincent Zabala.',applicationName:'OmniPost AI',icons:{icon:'/icon.svg',shortcut:'/omnipost-mark.svg'},openGraph:{title:'OmniPost AI',description:'A smarter social content studio by Carl Vincent Zabala',type:'website'}};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
