/**
 * Sync Engine
 * 
 * Orchestrates data sync from Beeper → our database.
 * Handles: accounts, chats, messages, contact resolution.
 * 
 * Flow:
 *  1. Fetch accounts from Beeper → create/update Connections
 *  2. Fetch chats → create/update Conversations + resolve participants to Contacts
 *  3. Fetch messages → create Messages linked to Conversations + Contacts
 *  4. Track sync state for incremental updates
 */

import { PrismaClient } from '@prisma/client';
import { BeeperService, BeeperChat, BeeperMessage, BeeperParticipant } from './beeper';
import { ContactResolver } from './contact-resolver';

export interface SyncResult {
  accounts: number;
  conversations: number;
  messages: number;
  contacts: number;
  errors: string[];
  duration: number;
}

export class SyncEngine {
  private prisma: PrismaClient;
  private beeper: BeeperService;
  private contactResolver: ContactResolver;
  private workspaceId: string;
  private connectionId: string;

  constructor(
    prisma: PrismaClient,
    beeper: BeeperService,
    workspaceId: string,
    connectionId: string,
  ) {
    this.prisma = prisma;
    this.beeper = beeper;
    this.workspaceId = workspaceId;
    this.connectionId = connectionId;
    this.contactResolver = new ContactResolver(prisma, workspaceId);
  }

  /**
   * Full sync — pulls everything from Beeper into our DB
   */
  async fullSync(options: { chatLimit?: number; messagesPerChat?: number } = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      accounts: 0,
      conversations: 0,
      messages: 0,
      contacts: 0,
      errors: [],
      duration: 0,
    };

    try {
      // Step 1: Sync accounts
      console.log('[Sync] Fetching accounts...');
      const accounts = await this.beeper.getAccounts();
      result.accounts = accounts.length;
      console.log(`[Sync] Found ${accounts.length} accounts`);

      // Step 2: Sync chats
      console.log('[Sync] Fetching chats...');
      const chatLimit = options.chatLimit || 50;
      const { items: chats } = await this.beeper.getChats({ limit: chatLimit, includeMuted: true });
      console.log(`[Sync] Found ${chats.length} chats`);

      for (const chat of chats) {
        try {
          // Create/update conversation
          const conversationId = await this.syncConversation(chat);
          result.conversations++;

          // Resolve participants to contacts
          const nonSelfParticipants = chat.participants.items.filter(p => !p.isSelf);
          for (const participant of nonSelfParticipants) {
            await this.resolveParticipant(participant, chat);
          }

          // Sync messages for this chat
          const msgLimit = options.messagesPerChat || 20;
          try {
            const { items: messages } = await this.beeper.getMessages(chat.id, { limit: msgLimit });
            for (const msg of messages) {
              try {
                await this.syncMessage(msg, conversationId, chat);
                result.messages++;
              } catch (msgErr: any) {
                result.errors.push(`Message ${msg.id}: ${msgErr.message}`);
              }
            }
          } catch (chatMsgErr: any) {
            result.errors.push(`Chat messages ${chat.title}: ${chatMsgErr.message}`);
          }
        } catch (chatErr: any) {
          result.errors.push(`Chat ${chat.title}: ${chatErr.message}`);
        }
      }

      // Count total contacts created
      const contactCount = await this.prisma.contact.count({
        where: { workspaceId: this.workspaceId },
      });
      result.contacts = contactCount;

      // Update sync state
      await this.updateSyncState('full_sync');

    } catch (error: any) {
      result.errors.push(`Sync failed: ${error.message}`);
    }

    result.duration = Date.now() - startTime;
    console.log(`[Sync] Complete in ${result.duration}ms — ${result.conversations} convos, ${result.messages} msgs, ${result.contacts} contacts`);
    return result;
  }

  /**
   * Sync a single Beeper chat → Conversation
   */
  private async syncConversation(chat: BeeperChat): Promise<string> {
    const channel = BeeperService.mapNetwork(chat.network);
    const channelContext = BeeperService.extractChannelContext(chat);

    // Resolve primary contact for single chats
    let primaryContactId: string | undefined;
    if (chat.type === 'single') {
      const otherParticipant = chat.participants.items.find(p => !p.isSelf);
      if (otherParticipant) {
        primaryContactId = await this.resolveParticipant(otherParticipant, chat);
      }
    }

    const conversation = await this.prisma.conversation.upsert({
      where: {
        workspaceId_externalId: {
          workspaceId: this.workspaceId,
          externalId: chat.id,
        },
      },
      create: {
        workspaceId: this.workspaceId,
        externalId: chat.id,
        channel,
        type: chat.type,
        title: chat.title,
        contactId: primaryContactId,
        lastMessageAt: new Date(chat.lastActivity),
        unreadCount: chat.unreadCount,
        isArchived: chat.isArchived,
        isMuted: chat.isMuted,
        isPinned: chat.isPinned,
        channelContext: JSON.stringify(channelContext),
      },
      update: {
        title: chat.title,
        lastMessageAt: new Date(chat.lastActivity),
        unreadCount: chat.unreadCount,
        isArchived: chat.isArchived,
        isMuted: chat.isMuted,
        isPinned: chat.isPinned,
        channelContext: JSON.stringify(channelContext),
      },
    });

    // Sync participants
    for (const p of chat.participants.items) {
      const contactId = p.isSelf ? undefined : await this.resolveParticipant(p, chat);
      
      await this.prisma.conversationParticipant.upsert({
        where: {
          conversationId_externalUserId: {
            conversationId: conversation.id,
            externalUserId: p.id,
          },
        },
        create: {
          conversationId: conversation.id,
          contactId,
          externalUserId: p.id,
          displayName: p.fullName || 'Unknown',
          isSelf: p.isSelf,
        },
        update: {
          displayName: p.fullName || 'Unknown',
          contactId,
        },
      });
    }

    return conversation.id;
  }

  /**
   * Resolve a Beeper participant → Contact
   */
  private async resolveParticipant(participant: BeeperParticipant, chat: BeeperChat): Promise<string> {
    const channel = BeeperService.mapNetwork(chat.network);

    return this.contactResolver.resolve({
      externalId: participant.id,
      displayName: participant.fullName || 'Unknown',
      email: participant.email,
      phone: participant.phoneNumber,
      avatarUrl: participant.imgURL,
      platform: channel,
      beeperUserId: participant.id,
    });
  }

  /**
   * Sync a single Beeper message → Message
   */
  private async syncMessage(
    msg: BeeperMessage,
    conversationId: string,
    chat: BeeperChat,
  ): Promise<void> {
    const channel = BeeperService.mapNetwork(chat.network);

    // Resolve sender to contact (skip self messages for contact resolution)
    let senderContactId: string | undefined;
    if (!msg.isSender) {
      const senderParticipant = chat.participants.items.find(p => p.id === msg.senderID);
      if (senderParticipant) {
        senderContactId = await this.resolveParticipant(senderParticipant, chat);
      }
    }

    // Determine message type
    let messageType = 'text';
    if (msg.type === 'IMAGE') messageType = 'image';
    else if (msg.type === 'FILE') messageType = 'file';
    else if (msg.type === 'AUDIO') messageType = 'voice';
    else if (msg.type === 'VIDEO') messageType = 'video';

    const message = await this.prisma.message.upsert({
      where: {
        workspaceId_externalId: {
          workspaceId: this.workspaceId,
          externalId: msg.id,
        },
      },
      create: {
        workspaceId: this.workspaceId,
        conversationId,
        externalId: msg.id,
        channel,
        senderId: msg.senderID,
        senderName: msg.senderName,
        senderContactId,
        body: msg.text || `[${messageType}]`,
        timestamp: new Date(msg.timestamp),
        read: msg.isSender, // own messages are "read"
        messageType,
        metadata: msg.attachments ? JSON.stringify({ attachments: msg.attachments }) : undefined,
      },
      update: {
        body: msg.text || `[${messageType}]`,
        senderContactId,
      },
    });

    // Sync attachments
    if (msg.attachments && msg.attachments.length > 0) {
      for (const att of msg.attachments) {
        await this.prisma.attachment.upsert({
          where: {
            id: att.id, // use Beeper attachment ID
          },
          create: {
            id: att.id,
            messageId: message.id,
            type: att.type || messageType,
            fileName: att.fileName,
            mimeType: att.mimeType,
            fileSize: att.fileSize,
            url: att.srcURL,
          },
          update: {},
        });
      }
    }
  }

  /**
   * Update sync state tracking
   */
  private async updateSyncState(entityType: string): Promise<void> {
    await this.prisma.syncState.upsert({
      where: {
        connectionId_entityType: {
          connectionId: this.connectionId,
          entityType,
        },
      },
      create: {
        connectionId: this.connectionId,
        entityType,
        lastSyncAt: new Date(),
      },
      update: {
        lastSyncAt: new Date(),
      },
    });
  }
}
