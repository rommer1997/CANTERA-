export interface MessagingConversation {
  id: string;
  participantIds: [string, string];
  createdAt: string;
}

export interface MessagingMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  deleted: false;
}

export interface MessageRead {
  conversationId: string;
  lastReadAt: string;
  lastReadMessageId: string;
}

export interface ConversationPreview {
  latest: MessagingMessage | null;
  loading: boolean;
  error: boolean;
}

export type MessagingErrorCode = 'unavailable' | 'invalid-text' | 'offline' | 'signin-required';

export interface ConversationState {
  conversation: MessagingConversation | null;
  messages: MessagingMessage[];
  loading: boolean;
  loadingOlder: boolean;
  hasMore: boolean;
  error: string;
  canSend: boolean;
  loadOlder(): Promise<void>;
  sendMessage(text: string): Promise<void>;
  deleteMessage(messageId: string): Promise<void>;
}
