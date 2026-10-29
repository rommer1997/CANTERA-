import type { ReactNode } from 'react';

/** Shared hierarchy; native HTML controls and page-specific actions stay with the screen. */
export function ScreenHeading({ eyebrow, title, description, children, className = '', id }: {
  eyebrow: string; title: string; description?: string; children?: ReactNode; className?: string; id?: string;
}) {
  return <header className={`lc-screen-heading ${className}`}>
    <div><span className="lc-kicker">{eyebrow}</span><h1 id={id} tabIndex={id ? -1 : undefined}>{title}</h1>{description && <p>{description}</p>}</div>
    {children}
  </header>;
}
