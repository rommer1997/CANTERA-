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
