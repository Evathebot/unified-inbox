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

  static extractChannelContext(chat: BeeperChat): any {
    const channel = BeeperService.mapNetwork(chat.network);
    
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
