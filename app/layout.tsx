import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'OmniPost AI | Social Content Workspace',description:'Plan once, adapt and publish across channels.'};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
