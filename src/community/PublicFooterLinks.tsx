import { Instagram, Music2 } from 'lucide-react';
import { publicSite, publicSocialUrl } from '../config/publicSite';
import { operator } from './legal';

const socialLabels = { instagram: 'Instagram', tiktok: 'TikTok', x: 'X' };
export function PublicFooterLinks() {
  return <div className="lc-public-contact">
    <div className="lc-social-links" aria-label="Redes sociales de LaCantera">{(Object.keys(socialLabels) as Array<keyof typeof socialLabels>).map(key => {
      const label = socialLabels[key], url = publicSocialUrl(publicSite.socials[key]);
      const icon = key === 'instagram' ? <Instagram size={20} aria-hidden="true" /> : key === 'tiktok' ? <Music2 size={20} aria-hidden="true" /> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 3h4l12 18h-4L4 3Zm16 0L4 21" /></svg>;
      return url ? <a key={key} href={url} aria-label={label} target="_blank" rel="noopener noreferrer">{icon}</a> : null;
    })}</div>
    {operator.email && <a className="lc-feedback-link" href={`mailto:${operator.email}?subject=Feedback%20LaCantera`}>¿Algo falla? Cuéntanoslo</a>}
  </div>;
}
