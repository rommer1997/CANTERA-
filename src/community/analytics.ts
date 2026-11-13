import { publicSite } from '../config/publicSite.ts';

export const analyticsEvents = ['pageview', 'JoinClick', 'GoogleLoginClick', 'RegistrationCompleted', 'MatchCreated', 'MatchShared'] as const;
export type AnalyticsEvent = typeof analyticsEvents[number];
export interface AnalyticsSettings { enabled: boolean; provider: string; domain: string; endpoint: string; websiteId?: string; }
interface AnalyticsEnvironment {
  production: boolean;
  hash(): string;
  doNotTrack(): boolean;
  send(url: string, request: RequestInit): Promise<unknown>;
}

// Never send queries, IDs, user text, invitation tokens or referrers.
export function analyticsPage(hash: string): string {
  const path = hash.replace(/^#/, '').split(/[?#]/, 1)[0].replace(/\/$/, '') || '/';
  if (['/', '/play', '/feed', '/teams', '/profile', '/people', '/connect', '/messages', '/activity', '/about', '/legal/terms', '/legal/privacy', '/legal/cookies'].includes(path)) return path;
  for (const route of ['play', 'people', 'teams', 'messages', 'invite']) if (new RegExp(`^/${route}/[^/]+$`).test(path)) return `/${route}/:id`;
  return '/other';
}
export function analyticsReady(settings: AnalyticsSettings): boolean {
  if (!settings.enabled || !['plausible', 'umami'].includes(settings.provider) || !/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(settings.domain) || settings.domain.includes('TODO')) return false;
  if (settings.provider === 'umami' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(settings.websiteId || '')) return false;
  try { const endpoint = new URL(settings.endpoint); return endpoint.protocol === 'https:' && !endpoint.username && !endpoint.password && !endpoint.search && !endpoint.hash; } catch { return false; }
}
export function createAnalytics(settings: AnalyticsSettings, environment: AnalyticsEnvironment) {
  return (name: AnalyticsEvent) => {
    if (!environment.production || environment.doNotTrack() || !analyticsReady(settings) || !analyticsEvents.includes(name)) return;
    const path = analyticsPage(environment.hash());
    const body = JSON.stringify(settings.provider === 'umami'
      ? { type: 'event', payload: { hostname: settings.domain, website: settings.websiteId, url: `/#${path}`, referrer: '', ...(name === 'pageview' ? {} : { name }) } }
      : { name, domain: settings.domain, url: `https://${settings.domain}/#${path}` });
    // No cookies, local storage, device identifier, custom properties or retry queue.
    try { void environment.send(settings.endpoint, { method: 'POST', body, headers: { 'Content-Type': settings.provider === 'umami' ? 'application/json' : 'text/plain' }, credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true }).catch(() => {}); } catch { /* Metrics never interrupt a user action. */ }
  };
}
const track = createAnalytics(publicSite.analytics, {
  production: import.meta.env?.PROD === true && typeof window !== 'undefined' && window.location.hostname === publicSite.analytics.domain,
  hash: () => window.location.hash,
  doNotTrack: () => ['1', 'yes'].includes(navigator.doNotTrack || '') || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true,
  send: (url, request) => fetch(url, request),
});
export function trackAnalytics(name: AnalyticsEvent) { track(name); }

export function startAnalytics(): () => void {
  if (!analyticsReady(publicSite.analytics)) return () => {};
  const pageview = () => trackAnalytics('pageview');
  const click = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const name = event.target.closest('[data-analytics-event]')?.getAttribute('data-analytics-event');
    if (name && analyticsEvents.includes(name as AnalyticsEvent)) trackAnalytics(name as AnalyticsEvent);
  };
  pageview(); window.addEventListener('hashchange', pageview); document.addEventListener('click', click);
  return () => { window.removeEventListener('hashchange', pageview); document.removeEventListener('click', click); };
}
