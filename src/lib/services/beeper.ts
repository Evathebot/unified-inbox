/**
 * Beeper Desktop API Service
 * 
 * Wraps the Beeper Desktop API for chat/message/account operations.
 * Connects via the beeper-relay proxy (Node.js on Windows → Beeper localhost).
 * 
 * In production, this would use the @beeper/desktop-api SDK directly
 * on a machine where Beeper Desktop is running.
 */

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
  type: string;
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
 * Execute a Beeper API call via HTTP (through relay or direct)
 */
async function callBeeperApi(config: BeeperConfig, endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  const url = `${config.apiUrl}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${config.accessToken}`,
    'Accept': 'application/json',
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(30000),
  };

  if (body) {
    headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const text = await response.text();
    if (!text || text.trim() === '') return null;
    return JSON.parse(text);
  } catch (error: any) {
    if (error.name === 'TimeoutError') {
      throw new Error(`Beeper API timeout: ${endpoint}`);
    }
    throw error;
  }
}

/**
 * Fallback: PowerShell bridge for WSL → Windows when relay isn't running
 */
function callBeeperApiPowerShell(config: BeeperConfig, endpoint: string): any {
  const { execSync } = require('child_process');
  const psPath = '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
  const cmd = `${psPath} -Command "Invoke-RestMethod -Uri '${config.apiUrl}${endpoint}' -Headers @{'Authorization'='Bearer ${config.accessToken}'} | ConvertTo-Json -Depth 10"`;
  
  try {
    const result = execSync(cmd, { timeout: 30000, maxBuffer: 10 * 1024 * 1024, encoding: 'utf-8' });
    if (!result || result.trim() === '') return null;
    return JSON.parse(result);
  } catch (error: any) {
    console.error(`Beeper PS bridge error [${endpoint}]:`, error.message);
    throw new Error(`Beeper API call failed: ${endpoint}`);
  }
}

export class BeeperService {
  private config: BeeperConfig;
  private useRelay: boolean = true;

  constructor(config: BeeperConfig) {
    this.config = config;
  }

  private async call(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    if (this.useRelay) {
      try {
        return await callBeeperApi(this.config, endpoint, method, body);
      } catch (error: any) {
        // If relay fails, fall back to PowerShell bridge
        if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
          console.warn('[Beeper] Relay unavailable, falling back to PowerShell bridge');
          this.useRelay = false;
          return callBeeperApiPowerShell(this.config, endpoint);
        }
        throw error;
      }
    }
    return callBeeperApiPowerShell(this.config, endpoint);
  }

  async getAccounts(): Promise<BeeperAccount[]> {
    const result = await this.call('/v1/accounts');
    return result?.value || result?.items || result || [];
  }

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
    const result = await this.call(`/v1/chats${query}`);
    
    return {
      items: result?.items || [],
      hasMore: result?.hasMore || false,
      nextCursor: result?.nextCursor,
    };
  }

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
    const result = await this.call(`/v1/chats/${encodedChatId}/messages${query}`);

    return {
      items: result?.items || [],
      hasMore: result?.hasMore || false,
    };
  }

  async sendMessage(chatId: string, text: string): Promise<BeeperMessage> {
    const encodedChatId = encodeURIComponent(chatId);
    return await this.call(`/v1/chats/${encodedChatId}/messages`, 'POST', { text });
  }

  async searchChats(query: string, limit: number = 20): Promise<BeeperChat[]> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const result = await this.call(`/v1/chats/search?${params.toString()}`);
    return result?.items || [];
  }

  static mapNetwork(network: string | null | undefined): string {
    if (!network) return 'unknown';

    const map: Record<string, string> = {
      // WhatsApp
      'WhatsApp': 'whatsapp',
      // Telegram
      'Telegram': 'telegram',
      // Slack
      'Slack': 'slack',
      // Discord
      'Discord': 'discord',
      // Instagram
      'Instagram': 'instagram',
      // LinkedIn
      'LinkedIn': 'linkedin',
      // Signal
      'Signal': 'signal',
      // Twitter / X
      'Twitter': 'twitter',
      'X': 'twitter',
      // Facebook Messenger
      'Facebook Messenger': 'messenger',
      'FB Messenger': 'messenger',
      'Messenger': 'messenger',
      // SMS / Google Messages
      'Google Messages': 'sms',
      'SMS': 'sms',
      // Google Chat
      'Google Chat': 'googlechat',
      // iMessage — Beeper may return any of these
      'iMessage': 'imessage',
      'iMessage (SMS)': 'imessage',
      'Apple Messages': 'imessage',
      'Apple iMessage': 'imessage',
      'Messages': 'imessage',
      // Beeper Matrix
      'Beeper (Matrix)': 'beeper',
      'Matrix': 'beeper',
    };
    const mapped = map[network];
    if (mapped) return mapped;

    // Fuzzy fallback: handle casing variants (e.g. "IMESSAGE", "imessage")
    const lower = network.toLowerCase().replace(/\s+/g, '');
    if (lower.includes('imessage') || lower === 'applemessages') return 'imessage';
    if (lower.includes('whatsapp')) return 'whatsapp';
    if (lower.includes('telegram')) return 'telegram';
    if (lower.includes('messenger') || lower.includes('facebook')) return 'messenger';
    if (lower.includes('instagram')) return 'instagram';
    if (lower.includes('signal')) return 'signal';
    if (lower.includes('discord')) return 'discord';
    if (lower.includes('slack')) return 'slack';

    return lower;
  }

  /**
   * Infer the network from a BeeperChat.
   * Beeper often leaves the `network` field null; we fall back to parsing
   * the accountID (e.g. "local-whatsapp_xxx", "slackgo.xxx", "imessage_xxx")
   * and then the chat ID (e.g. "imsg##..." for iMessage).
   */
  static inferNetwork(chat: BeeperChat): string {
    // 1. Use the network field if present
    if (chat.network) return BeeperService.mapNetwork(chat.network);

    // 2. Parse accountID — patterns observed from Beeper Desktop:
    //    "local-whatsapp_<id>"  → whatsapp
    //    "slackgo.<workspace>-<user>" → slack
    //    "imessage_<id>"        → imessage
    //    "telegramgo_<id>"      → telegram
    //    "signalgo_<id>"        → signal
    //    "discordgo_<id>"       → discord
    //    "instagramgo_<id>"     → instagram
    //    "linkedingo_<id>"      → linkedin
    //    "facebookgo_<id>"      → messenger
    const acc = (chat.accountID || '').toLowerCase();
    if (acc.startsWith('local-whatsapp') || acc.includes('whatsapp')) return 'whatsapp';
    if (acc.startsWith('imessage'))  return 'imessage';
    if (acc.startsWith('slackgo') || acc.includes('slack'))     return 'slack';
    if (acc.startsWith('telegramgo') || acc.includes('telegram')) return 'telegram';
    if (acc.startsWith('signalgo') || acc.includes('signal'))   return 'signal';
    if (acc.startsWith('discordgo') || acc.includes('discord')) return 'discord';
    if (acc.startsWith('instagramgo') || acc.includes('instagram')) return 'instagram';
    if (acc.startsWith('linkedingo') || acc.includes('linkedin')) return 'linkedin';
    if (acc.startsWith('facebookgo') || acc.includes('facebook') || acc.includes('messenger')) return 'messenger';

    // 3. Parse chat ID — "imsg##..." is iMessage
    const chatId = (chat.id || '').toLowerCase();
    if (chatId.startsWith('imsg#')) return 'imessage';

    return 'unknown';
  }

  static extractChannelContext(chat: BeeperChat): any {
    const channel = BeeperService.inferNetwork(chat);
    
    if (chat.type === 'group') {
      if (channel === 'slack') {
        return {
          workspace: chat.title,
          channelName: `#${chat.title}`,
          isDM: false,
          groupName: chat.title,
        };
      }
      return { groupName: chat.title, isDM: false };
    }
    
    return { isDM: true };
  }
}

export function createBeeperService(apiUrl: string, accessToken: string): BeeperService {
  return new BeeperService({ apiUrl, accessToken });
}
