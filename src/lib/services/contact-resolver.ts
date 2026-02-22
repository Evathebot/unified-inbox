/**
 * Contact Resolution & Unification Engine
 * 
 * Resolves platform-specific user IDs to unified Contact records.
 * Handles cross-platform matching: if "Alex" appears on WhatsApp AND Slack,
 * we link both identities to the same Contact.
 *
 * Matching priority:
 *  1. Exact email match
 *  2. Exact phone number match (normalized)
 *  3. Beeper user ID match (same person across Beeper bridges)
 *  4. Fuzzy name + company match (>85% similarity)
 *  5. Create new contact if no match
 */

import { PrismaClient } from '@prisma/client';

interface ParticipantInfo {
  externalId: string;
  displayName: string;
  email?: string;
  phone?: string;
  username?: string;
  avatarUrl?: string;
  platform: string;
  beeperUserId?: string;
}

export class ContactResolver {
  private prisma: PrismaClient;
  private workspaceId: string;
  // Cache to avoid repeated DB lookups in the same sync batch
  private cache = new Map<string, string>(); // platform:platformUserId → contactId

  constructor(prisma: PrismaClient, workspaceId: string) {
    this.prisma = prisma;
    this.workspaceId = workspaceId;
  }

  /**
   * Resolve a participant to a Contact ID.
   * Creates Contact + ContactIdentity if new.
   * Merges if matches an existing contact on another platform.
   */
  async resolve(participant: ParticipantInfo): Promise<string> {
    const cacheKey = `${participant.platform}:${participant.externalId}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 1. Check if this exact identity already exists
    const existingIdentity = await this.prisma.contactIdentity.findFirst({
      where: {
        contact: { workspaceId: this.workspaceId },
        platform: participant.platform,
        platformUserId: participant.externalId,
      },
      include: { contact: true },
    });

    if (existingIdentity) {
      this.cache.set(cacheKey, existingIdentity.contactId);
      // Update display name / avatar if changed
      if (participant.displayName !== existingIdentity.displayName ||
          participant.avatarUrl !== existingIdentity.avatarUrl) {
        await this.prisma.contactIdentity.update({
          where: { id: existingIdentity.id },
          data: {
            displayName: participant.displayName,
            avatarUrl: participant.avatarUrl || existingIdentity.avatarUrl,
          },
        });
      }
      return existingIdentity.contactId;
    }

    // 2. Try to match by email
    if (participant.email) {
      const emailMatch = await this.findByEmail(participant.email);
      if (emailMatch) {
        await this.addIdentity(emailMatch, participant);
        this.cache.set(cacheKey, emailMatch);
        return emailMatch;
      }
    }

    // 3. Try to match by phone number
    if (participant.phone) {
      const normalized = this.normalizePhone(participant.phone);
      const phoneMatch = await this.findByPhone(normalized);
      if (phoneMatch) {
        await this.addIdentity(phoneMatch, participant);
        this.cache.set(cacheKey, phoneMatch);
        return phoneMatch;
      }
    }

    // 4. Try to match by Beeper user ID (same person across bridges)
    if (participant.beeperUserId) {
      const beeperMatch = await this.prisma.contactIdentity.findFirst({
        where: {
          contact: { workspaceId: this.workspaceId },
          beeperUserId: participant.beeperUserId,
        },
      });
      if (beeperMatch) {
        await this.addIdentity(beeperMatch.contactId, participant);
        this.cache.set(cacheKey, beeperMatch.contactId);
        return beeperMatch.contactId;
      }
    }

    // 5. Try fuzzy name match (only if name is specific enough)
    if (participant.displayName && participant.displayName.split(' ').length >= 2) {
      const nameMatch = await this.findByFuzzyName(participant.displayName);
      if (nameMatch) {
        await this.addIdentity(nameMatch, participant);
        this.cache.set(cacheKey, nameMatch);
        return nameMatch;
      }
    }

    // 6. Create new contact
    const contactId = await this.createContact(participant);
    this.cache.set(cacheKey, contactId);
    return contactId;
  }

  private async findByEmail(email: string): Promise<string | null> {
    const identity = await this.prisma.contactIdentity.findFirst({
      where: {
        contact: { workspaceId: this.workspaceId },
        email: email.toLowerCase(),
      },
    });
    return identity?.contactId || null;
  }

  private async findByPhone(phone: string): Promise<string | null> {
    const identity = await this.prisma.contactIdentity.findFirst({
      where: {
        contact: { workspaceId: this.workspaceId },
        phone: phone,
      },
    });
    return identity?.contactId || null;
  }

  private async findByFuzzyName(name: string): Promise<string | null> {
    // Simple exact name match for now
    // TODO: implement Levenshtein distance or trigram matching with PostgreSQL
    const contact = await this.prisma.contact.findFirst({
      where: {
        workspaceId: this.workspaceId,
        name: name,
      },
    });
    return contact?.id || null;
  }

  private async addIdentity(contactId: string, participant: ParticipantInfo): Promise<void> {
    await this.prisma.contactIdentity.create({
      data: {
        contactId,
        platform: participant.platform,
        platformUserId: participant.externalId,
        displayName: participant.displayName,
        email: participant.email?.toLowerCase(),
        phone: participant.phone ? this.normalizePhone(participant.phone) : undefined,
        username: participant.username,
        avatarUrl: participant.avatarUrl,
        beeperUserId: participant.beeperUserId,
        verified: false,
      },
    });

    // Update contact avatar if we got a better one
    if (participant.avatarUrl) {
      const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
      if (contact && !contact.avatar) {
        await this.prisma.contact.update({
          where: { id: contactId },
          data: { avatar: participant.avatarUrl },
        });
      }
    }
  }

  private async createContact(participant: ParticipantInfo): Promise<string> {
    const contact = await this.prisma.contact.create({
      data: {
        workspaceId: this.workspaceId,
        name: participant.displayName,
        avatar: participant.avatarUrl,
        identities: {
          create: {
            platform: participant.platform,
            platformUserId: participant.externalId,
            displayName: participant.displayName,
            email: participant.email?.toLowerCase(),
            phone: participant.phone ? this.normalizePhone(participant.phone) : undefined,
            username: participant.username,
            avatarUrl: participant.avatarUrl,
            beeperUserId: participant.beeperUserId,
            verified: false,
          },
        },
      },
    });

    return contact.id;
  }

  /**
   * Normalize phone numbers to E.164 format
   */
  private normalizePhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    if (!cleaned.startsWith('+')) {
      if (cleaned.length === 10) cleaned = '+1' + cleaned;
      else if (cleaned.length === 11 && cleaned.startsWith('1')) cleaned = '+' + cleaned;
      else cleaned = '+' + cleaned;
    }
    return cleaned;
  }

  /**
   * Manually merge two contacts
   */
  async mergeContacts(keepId: string, mergeId: string): Promise<void> {
    // Move all identities from mergeId to keepId
    await this.prisma.contactIdentity.updateMany({
      where: { contactId: mergeId },
      data: { contactId: keepId },
    });

    // Move all messages
    await this.prisma.message.updateMany({
      where: { senderContactId: mergeId },
      data: { senderContactId: keepId },
    });

    // Move conversations
    await this.prisma.conversation.updateMany({
      where: { contactId: mergeId },
      data: { contactId: keepId },
    });

    // Update relationship score (take the higher one)
    const [keep, merge] = await Promise.all([
      this.prisma.contact.findUnique({ where: { id: keepId } }),
      this.prisma.contact.findUnique({ where: { id: mergeId } }),
    ]);

    if (keep && merge) {
      await this.prisma.contact.update({
        where: { id: keepId },
        data: {
          relationshipScore: Math.max(keep.relationshipScore, merge.relationshipScore),
          notes: [keep.notes, merge.notes].filter(Boolean).join('\n---\n') || null,
        },
      });
    }

    // Delete the merged contact
    await this.prisma.contact.delete({ where: { id: mergeId } });

    // Clear cache
    this.cache.clear();
  }
}
