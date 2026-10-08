import type { MessagingConversation, MessagingErrorCode, MessagingMessage } from './messagingTypes';

export const MESSAGE_MAX_LENGTH = 2000;
export const MESSAGE_PAGE_SIZE = 40;
export const MESSAGING_POLICY = 'Sólo entre conexiones actuales, con correo verificado. Al bloquear o retirar la conexión se interrumpe el acceso al historial. Puedes retirar tus propios mensajes; la solicitud de derechos permite exportar o suprimir tus datos. Sin archivos ni notificaciones fuera de la aplicación.';

export class MessagingError extends Error {
  code: MessagingErrorCode;
  constructor(code: MessagingErrorCode) { super(code); this.code = code; }
}

export function safeMessagingError(error: unknown): string {
  if (error instanceof MessagingError) {
    if (error.code === 'invalid-text') return `Escribe un mensaje de entre 1 y ${MESSAGE_MAX_LENGTH} caracteres.`;
    if (error.code === 'offline') return 'Necesitas conexión a Internet para enviar mensajes.';
    if (error.code === 'signin-required') return 'Entra con tu cuenta para utilizar los mensajes.';
  }
  return 'Esta conversación no está disponible. Comprueba tu conexión y que ambos seguís conectados en LaCantera.';
}

// Firebase-generated UIDs use this alphabet. A colon separates both UIDs, so
// underscores in IDs cannot create collisions and rules can validate the path.
export function validMessagingUid(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

export function conversationIdFor(first: string, second: string): string {
  if (!validMessagingUid(first) || !validMessagingUid(second) || first === second) throw new MessagingError('unavailable');
  return [first, second].sort().join(':');
}

export function conversationParticipants(id: unknown): [string, string] | null {
  if (typeof id !== 'string') return null;
  const pair = id.split(':');
  if (pair.length !== 2 || !validMessagingUid(pair[0]) || !validMessagingUid(pair[1]) || pair[0] >= pair[1]) return null;
  return [pair[0], pair[1]];
}

export function messageText(value: unknown): string {
  if (typeof value !== 'string') throw new MessagingError('invalid-text');
  const result = value.replace(/\r\n?/g, '\n').trim();
  if (!result || result.length > MESSAGE_MAX_LENGTH || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(result)) throw new MessagingError('invalid-text');
  return result;
}

function timestamp(value: unknown): string | null {
  try {
    const raw = value as { toDate?: () => Date } | null;
    const result = raw && typeof raw.toDate === 'function' ? raw.toDate().toISOString() : value;
    if (typeof result !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(result) || Date.parse(result) < 0 || new Date(result).toISOString() !== result) return null;
    return result;
  } catch { return null; }
}

export function normalizeConversation(data: unknown, id: string): MessagingConversation | null {
  const pair = conversationParticipants(id);
  if (!pair || !data || typeof data !== 'object' || Array.isArray(data)) return null;
  const value = data as Record<string, unknown>;
  const createdAt = timestamp(value.createdAt);
  if (value.id !== id || !Array.isArray(value.participantIds) || value.participantIds.length !== 2 || value.participantIds[0] !== pair[0] || value.participantIds[1] !== pair[1] || !createdAt) return null;
  return { id, participantIds: pair, createdAt };
}

export function normalizeMessage(data: unknown, id: string, conversationId: string): MessagingMessage | null {
  const pair = conversationParticipants(conversationId);
  if (!pair || !/^[A-Za-z0-9]{20}$/.test(id) || !data || typeof data !== 'object' || Array.isArray(data)) return null;
  const value = data as Record<string, unknown>;
  const createdAt = timestamp(value.createdAt);
  if (value.id !== id || typeof value.senderId !== 'string' || !pair.includes(value.senderId) || !createdAt) return null;
  try {
    const text = messageText(value.text);
    if (text !== value.text) return null;
    return { id, conversationId, senderId: value.senderId, text, createdAt, deleted: false };
  } catch { return null; }
}

export function mergeMessagePages(...pages: MessagingMessage[][]): MessagingMessage[] {
  const unique = new Map<string, MessagingMessage>();
  for (const page of pages) for (const message of page) unique.set(message.id, message);
  return [...unique.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}
