/**
 * Beeper Desktop API Service
 * 
 * Wraps the Beeper Desktop API for chat/message/account operations.
 * Uses PowerShell bridge on WSL since Beeper runs on Windows.
 * In production, this would use the @beeper/desktop-api SDK directly.
 */

import { execSync } from 'child_process';

export interface BeeperAccount {
  accountID: string;
  network: string;
  user: {
    id: string;
    email?: string;
    fullName?: string;
    phoneNumber?: string;
    displayText?: string;
    username?: string;
    imgURL?: string;
    isSelf: boolean;
  };
}

export interface BeeperParticipant {
  id: string;
  phoneNumber?: string;
  email?: string;
  fullName?: string;
  imgURL?: string;
  cannotMessage: boolean;
  isSelf: boolean;
}

export interface BeeperChat {
  id: string;
  localChatID: string;
  accountID: string;
  network: string;
  title: string;
  type: 'single' | 'group';
  participants: {
    items: BeeperParticipant[];
    hasMore: boolean;
    total: number;
  };
  lastActivity: string;
  unreadCount: number;
  isArchived: boolean;
  isMuted: boolean;
  isPinned: boolean;
  preview?: {
    id: string;
    senderName: string;
    timestamp: string;
    type: string;
    text: string;
    isSender: boolean;
    attachments?: any[];
  };
}

export interface BeeperMessage {
  id: string;
  chatID: string;
  accountID: string;
  senderID: string;
  senderName: string;
  timestamp: string;
  sortKey: string;
  type: string; // "TEXT", "IMAGE", "FILE", etc.
  text: string;
  isSender: boolean;
  attachments?: {
    id: string;
    type: string;
    mimeType: string;
    fileName: string;
    fileSize: number;
    isGif: boolean;
    isSticker: boolean;
    srcURL: string;
  }[];
}

export interface BeeperConfig {
  apiUrl: string;
  accessToken: string;
}

/**
 * Execute a Beeper API call via PowerShell bridge (WSL → Windows)
 */
function callBeeperApi(config: BeeperConfig, endpoint: string, method: string = 'GET', body?: any): any {
  const psPath = '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
  
  let bodyParam = '';
  if (body) {
    const jsonBody = JSON.stringify(body).replace(/'/g, "''");
    bodyParam = `-Method '${method}' -Body '${jsonBody}' -ContentType 'application/json'`;
  }

  const cmd = `${psPath} -Command "Invoke-RestMethod -Uri '${config.apiUrl}${endpoint}' -Headers @{'Authorization'='Bearer ${config.accessToken}'} ${bodyParam} | ConvertTo-Json -Depth 10"`;
  
  try {
    const result = execSync(cmd, { 
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      encoding: 'utf-8'
    });
    
    if (!result || result.trim() === '') return null;
    return JSON.parse(result);
  } catch (error: any) {
    console.error(`Beeper API error [${endpoint}]:`, error.message);
    throw new Error(`Beeper API call failed: ${endpoint}`);
  }
}

export class BeeperService {
  private config: BeeperConfig;

  constructor(config: BeeperConfig) {
    this.config = config;
  }

  /**
   * Get all connected accounts
   */
  async getAccounts(): Promise<BeeperAccount[]> {
    const result = callBeeperApi(this.config, '/v1/accounts');
    // PowerShell wraps arrays in a "value" property
    return result?.value || result?.items || result || [];
  }

  /**
   * Get chats (conversations) with pagination
   */
  async getChats(options: {
    limit?: number;
    after?: string;
    type?: 'single' | 'group';
    accountID?: string;
    includeArchived?: boolean;
    includeMuted?: boolean;
  } = {}): Promise<{ items: BeeperChat[]; hasMore: boolean; nextCursor?: string }> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.after) params.set('after', options.after);
    if (options.type) params.set('type', options.type);
    if (options.accountID) params.set('accountID', options.accountID);
    if (options.includeArchived) params.set('includeArchived', 'true');
    if (options.includeMuted) params.set('includeMuted', 'true');

    const query = params.toString() ? `?${params.toString()}` : '';
    const result = callBeeperApi(this.config, `/v1/chats${query}`);
    
    return {
      items: result?.items || [],
      hasMore: result?.hasMore || false,
      nextCursor: result?.nextCursor,
    };
  }

  /**
   * Get messages for a specific chat
   */
  async getMessages(chatId: string, options: {
    limit?: number;
    before?: string;
    after?: string;
  } = {}): Promise<{ items: BeeperMessage[]; hasMore: boolean }> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.before) params.set('before', options.before);
    if (options.after) params.set('after', options.after);

    const query = params.toString() ? `?${params.toString()}` : '';
    const encodedChatId = encodeURIComponent(chatId);
    const result = callBeeperApi(this.config, `/v1/chats/${encodedChatId}/messages${query}`);

    return {
      items: result?.items || [],
      hasMore: result?.hasMore || false,
    };
  }

  /**
   * Send a message to a chat
   */
  async sendMessage(chatId: string, text: string): Promise<BeeperMessage> {
    const encodedChatId = encodeURIComponent(chatId);
    return callBeeperApi(
      this.config,
      `/v1/chats/${encodedChatId}/messages`,
      'POST',
      { text }
    );
  }

  /**
   * Search chats
   */
  async searchChats(query: string, limit: number = 20): Promise<BeeperChat[]> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const result = callBeeperApi(this.config, `/v1/chats/search?${params.toString()}`);
    return result?.items || [];
  }

  /**
   * Map Beeper network name to our channel name
   */
  static mapNetwork(network: string): string {
    const map: Record<string, string> = {
      'WhatsApp': 'whatsapp',
      'Telegram': 'telegram',
      'Slack': 'slack',
      'Discord': 'discord',
      'Instagram': 'instagram',
      'LinkedIn': 'linkedin',
      'Signal': 'signal',
      'Twitter': 'twitter',
      'X': 'twitter',
      'Facebook Messenger': 'messenger',
      'FB Messenger': 'messenger',
      'Google Messages': 'sms',
      'Google Chat': 'googlechat',
      'iMessage': 'imessage',
      'Beeper (Matrix)': 'beeper',
    };
    return map[network] || network.toLowerCase().replace(/\s+/g, '');
  }

  /**
   * Extract channel context from a Beeper chat
   */
  static extractChannelContext(chat: BeeperChat): any {
    const channel = BeeperService.mapNetwork(chat.network);
    
    if (chat.type === 'group') {
      if (channel === 'slack') {
        // Try to extract workspace from account metadata
        return {
          workspace: chat.title, // Slack channel name is the title
          channelName: `#${chat.title}`,
          isDM: false,
          groupName: chat.title,
        };
      }
      return {
        groupName: chat.title,
        isDM: false,
      };
    }
    
    return { isDM: true };
  }
}

/**
 * Create a BeeperService from stored connection config
 */
export function createBeeperService(apiUrl: string, accessToken: string): BeeperService {
  return new BeeperService({ apiUrl, accessToken });
}
