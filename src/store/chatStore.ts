import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: string;
  isAdmin?: boolean;
  isSupport?: boolean;
}

interface ChatStore {
  messages: ChatMessage[];
  supportMessages: ChatMessage[];
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  addSupportMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  getMessages: () => ChatMessage[];
  getSupportMessages: (userId: string) => ChatMessage[];
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      messages: [],
      supportMessages: [],

      addMessage: (messageData) => {
        const message: ChatMessage = {
          ...messageData,
          id: `msg-${Date.now()}`,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          messages: [message, ...state.messages.slice(0, 99)], // Keep last 100 messages
        }));
      },

      addSupportMessage: (messageData) => {
        const message: ChatMessage = {
          ...messageData,
          id: `support-${Date.now()}`,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          supportMessages: [message, ...state.supportMessages.slice(0, 199)], // Keep last 200 support messages
        }));
      },

      getMessages: () => {
        return get().messages;
      },

      getSupportMessages: (userId: string) => {
        return get().supportMessages.filter(
          (msg) => msg.userId === userId || msg.isAdmin
        );
      },

      clearMessages: () => {
        set({ messages: [] });
      },
    }),
    {
      name: 'chat-storage',
    }
  )
);
