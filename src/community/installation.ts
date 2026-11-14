export type InstallationDevice = 'ios' | 'android' | 'desktop';

export const installedDisplayModes = ['standalone', 'minimal-ui', 'fullscreen', 'window-controls-overlay'] as const;

export function installationDevice(browser: { userAgent: string; platform: string; maxTouchPoints: number }): InstallationDevice {
  if (/iPhone|iPad|iPod/i.test(browser.userAgent) || (/Mac/i.test(browser.platform) && browser.maxTouchPoints > 1)) return 'ios';
  return /Android/i.test(browser.userAgent) ? 'android' : 'desktop';
}

export function isInstalledExperience(environment: { displayModes: readonly string[]; iosStandalone?: boolean; referrer?: string }): boolean {
  return environment.iosStandalone === true || environment.displayModes.some(mode => installedDisplayModes.some(installed => installed === mode)) || environment.referrer?.startsWith('android-app://') === true;
}

export interface NativeInstallPrompt extends Event {
  prompt(): Promise<unknown>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Each browser event is usable once, including when its prompt rejects.
export function nativeInstallation(event: Pick<NativeInstallPrompt, 'prompt' | 'userChoice'>) {
  let result: Promise<{ outcome: 'accepted' | 'dismissed' }> | undefined;
  return {
    request() {
      if (!result) {
        try { result = event.prompt().then(() => event.userChoice); }
        catch (error) { result = Promise.reject(error); }
      }
      return result;
    },
  };
}

const visitKey = 'cantera-install-visited';
const sessionKey = 'cantera-install-session';
const dismissalKey = 'cantera-install-dismissed';
type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

// A page reload, route change or StrictMode remount is still the same visit.
export function installationVisit(local: PreferenceStorage, session: PreferenceStorage): boolean {
  try {
    const current = session.getItem(sessionKey);
    if (current !== null) return current === 'returning';
    const returning = local.getItem(visitKey) === 'yes';
    session.setItem(sessionKey, returning ? 'returning' : 'first');
    local.setItem(visitKey, 'yes');
    return returning;
  } catch { return false; }
}

export const installationDismissalMs = 30 * 24 * 60 * 60 * 1000;
export function installationDismissed(local: PreferenceStorage, now = Date.now()): boolean {
  try { const until = Number(local.getItem(dismissalKey)); return Number.isFinite(until) && until > now && until <= now + installationDismissalMs; } catch { return false; }
}
export function dismissInstallation(local: PreferenceStorage, now = Date.now()): void {
  try { local.setItem(dismissalKey, String(now + installationDismissalMs)); } catch { /* Browsing works with blocked storage. */ }
}
export function shouldRecommendInstallation(registered: boolean, returning: boolean, justRegistered: boolean): boolean {
  return registered && (returning || justRegistered);
}
