'use client';
import {ExternalLink,ArrowUpRight,ShieldCheck,Info,CheckCircle2} from 'lucide-react';

export default function SimpleSocialConnect(){
 return <section className="panel omni-simple-social" id="omni-simple-social">
 <div className="omni-simple-kicker"><ShieldCheck size={17}/> SIMPLE SOCIAL CONNECTION</div>
 <h3>Use your social accounts' official sign-in pages</h3>
 <p>You don't need to create five separate developer applications. Upload-Post offers a hosted connection dashboard that directs you to the official login and consent screen for each network.</p>
 <div className="omni-simple-steps">
 <div><b>1</b><span>Open Upload-Post and create a free account.</span></div>
 <div><b>2</b><span>On its <strong>Manage Users</strong> screen, choose Connect next to Facebook, Instagram, YouTube, or X and sign in on the provider's official page.</span></div>
 <div><b>3</b><span>Return to OmniPost to finish connecting the publishing API. The hosted connection alone does not activate native OmniPost publishing.</span></div>
 </div>
 <div className="omni-simple-actions"><a href="https://app.upload-post.com/" target="_blank" rel="noopener noreferrer" className="primary-btn">Open secure connection dashboard <ExternalLink size={16}/></a><a href="https://www.upload-post.com/pricing/" target="_blank" rel="noopener noreferrer" className="outline-btn">See free and paid limits <ArrowUpRight size={15}/></a></div>
 <p className="omni-simple-note"><Info size={16}/> The free plan includes up to two profiles and ten uploads per month, but not TikTok. A fully embedded white-label connection flow requires a paid plan. We won't collect your social-media passwords in OmniPost.</p>
 </section>
}
