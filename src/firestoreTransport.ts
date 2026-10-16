import type { FirestoreSettings } from 'firebase/firestore';

type BrowserPlatform = Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'>;

// Use polling on iOS to avoid relying on buffered streaming responses.
// This addresses a possible transport cause; the device flow still needs testing.
// https://firebase.google.com/docs/reference/js/firestore.firestoresettings
export function firestoreTransport(browser: BrowserPlatform): FirestoreSettings {
  const ios = /iPhone|iPad|iPod/.test(browser.userAgent)
    || browser.platform === 'MacIntel' && browser.maxTouchPoints > 1;
  return ios && /AppleWebKit/.test(browser.userAgent)
    ? { experimentalForceLongPolling: true, experimentalAutoDetectLongPolling: false }
    : {};
}
