/**
 * Test script for AI integration
 */
import { calculatePriorityScore, generateDraftReply, extractActionItems } from './ai';
import { Message } from '@prisma/client';

async function testAI() {
    console.log('🚀 Starting AI Integration Test...');

    const mockMsg: Message = {
        id: 'test-msg-1',
        externalId: 'test-ext-1',
        channel: 'gmail',
        from: 'urgent@client.com',
        to: 'alex@example.com',
        subject: 'URGENT: Project Deadline Issue',
        body: 'Hi Alex, we have a critical problem with the deployment scheduled for tomorrow. The API is returning 500 errors. Can you please check this ASAP?',
        timestamp: new Date(),
        read: false,
        priority: 50,
        aiDraft: null,
        threadId: null,
        contactId: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    try {
        console.log('\n1. Testing Priority Scoring...');
        const scoreResult = await calculatePriorityScore(mockMsg);
        console.log('Result:', JSON.stringify(scoreResult, null, 2));

        console.log('\n2. Testing Draft Generation...');
        const draft = await generateDraftReply(mockMsg);
        console.log('Draft:', draft);

        console.log('\n3. Testing Action Item Extraction...');
        const items = await extractActionItems(mockMsg.body);
        console.log('Action Items:', items);

        console.log('\n✅ AI Integration Test Complete!');
    } catch (error) {
        console.error('\n❌ AI Integration Test Failed:', error);
    }
}

testAI();
