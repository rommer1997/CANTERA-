import jsQR from 'jsqr';
import { normalizeInvitationCode } from './invitations.ts';

const productionOrigin = 'https://lacantera.web.app';
const maxPayloadLength = 2048;
const maxSide = 2048;
const maxPixels = maxSide * maxSide;

function safeCurrentOrigin(value: string | undefined): string | null {
  if (typeof value !== 'string' || value.length > maxPayloadLength || !/^[\x21-\x7e]+$/.test(value) || /[%\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && url.origin === value && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash ? url.origin : null;
  } catch { return null; }
}

// Scanned URLs are untrusted input. Return only a code, never a navigation target.
// A deployment may additionally accept its exact window.location.origin.
export function parseInvitationQr(value: string, currentOrigin?: string): string | null {
  if (typeof value !== 'string' || value.length > maxPayloadLength) return null;
  const plainCode = normalizeInvitationCode(value);
  if (plainCode) return plainCode;
  // URL parsing normalizes dot segments, backslashes and some Unicode hosts.
  // Require the literal base path/hash first so those aliases cannot get through.
  if (!/^[\x21-\x7e]+$/.test(value) || /[%\\]/.test(value)) return null;
  const route = /^https?:\/\/[^/?#]+\/#\/invite\/([2-9A-HJ-NP-Za-hj-np-z]{16})$/.exec(value);
  if (!route) return null;
  try {
    const url = new URL(value);
    const localOrigin = safeCurrentOrigin(currentOrigin);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search
      || url.origin !== productionOrigin && url.origin !== localOrigin || url.hash !== `#/invite/${route[1]}`) return null;
    return normalizeInvitationCode(route[1]);
  } catch { return null; }
}

// Decode pixels entirely on-device. The returned payload is still untrusted and
// MUST pass parseInvitationQr before being used by the invitation flow.
export function decodeInvitationQrImage(data: Uint8ClampedArray, width: number, height: number): string | null {
  if (!(data instanceof Uint8ClampedArray) || !Number.isSafeInteger(width) || !Number.isSafeInteger(height)
    || width <= 0 || height <= 0 || width > maxSide || height > maxSide || width * height > maxPixels || data.length !== width * height * 4) return null;
  try {
    const found = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
    return found && typeof found.data === 'string' && found.data.length > 0 && found.data.length <= maxPayloadLength ? found.data : null;
  } catch { return null; }
}
