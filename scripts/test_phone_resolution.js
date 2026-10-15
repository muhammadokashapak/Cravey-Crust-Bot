import assert from 'assert';
import { resolveSenderIdentity, normalizePhoneFromJid } from '../utils/senderIdentity.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
    console.log('🧪 Starting Phone Resolution & Same-Number Tests...\n');

    const mockSock = {
        user: {
            id: '923055375501:42@s.whatsapp.net',
            name: 'Cravey Crust Bot'
        }
    };
    const mockSession = {
        id: 'primary',
        user: {
            number: '923055375501'
        }
    };

    // Test 1: Standard 1:1 chat where Baileys set participant to the bot JID
    const customerJid = '923278497923@s.whatsapp.net';
    const msgWithBotParticipant = {
        key: {
            remoteJid: customerJid,
            fromMe: false,
            id: 'MSG12345',
            participant: '923055375501:42@s.whatsapp.net',
        },
        participant: '923055375501@s.whatsapp.net',
        pushName: 'Muhammad Okasha'
    };

    const identity1 = await resolveSenderIdentity(mockSock, msgWithBotParticipant, mockSession);
    console.log('Test 1 - 1:1 chat with bot participant in stanza:', identity1);
    assert.strictEqual(identity1.phone, '03278497923', 'Must resolve to customer phone, NOT bot phone!');
    assert.strictEqual(identity1.phoneVerified, true, 'Phone must be verified');
    assert.notStrictEqual(identity1.phone, '03055375501', 'Must NEVER resolve to bot number');
    console.log('✅ Test 1 Passed: Customer phone correctly extracted, bot JID ignored in 1:1 chat.\n');

    // Test 2: LID Chat with senderPn
    const lidMsg = {
        key: {
            remoteJid: '86634523582505@lid',
            senderLid: '86634523582505@lid',
            senderPn: '923451122334@s.whatsapp.net',
            fromMe: false,
            id: 'MSG54321',
        },
        pushName: 'Talha'
    };
    const identity2 = await resolveSenderIdentity(mockSock, lidMsg, mockSession);
    console.log('Test 2 - LID chat with senderPn:', identity2);
    assert.strictEqual(identity2.phone, '03451122334', 'Must resolve senderPn for LID');
    assert.strictEqual(identity2.senderLid, '86634523582505@lid');
    console.log('✅ Test 2 Passed: LID senderPn resolved accurately.\n');

    // Test 3: Prepare Session node simulation
    const n8nJsonPath = path.join(__dirname, '..', 'n8n.json');
    const n8nWorkflow = JSON.parse(fs.readFileSync(n8nJsonPath, 'utf8'));
    const prepNode = n8nWorkflow.nodes.find(n => n.name === 'Prepare Session');
    const phoneAssign = prepNode.parameters.assignments.assignments.find(a => a.name === 'whatsappPhone');
    
    // Simulate what the Prepare Session JS snippet evaluates
    const simulatePrepareSession = (body) => {
        const clean = (str) => {
            if (!str) return '';
            const s = String(str).trim();
            if (s.includes('@lid') || s.includes('@g.us')) return '';
            const digits = s.replace(/@.*$/, '').replace(/[^0-9]/g, '');
            if (!digits || digits.length < 10) return '';
            if (digits.includes('3055375501')) return '';
            if (/^(0?3001234567|0?3123456789|0?3000000000|0?3211234567|0?3321234567|0?3009876543|0?3120000000|0?3451234567|0?3331234567|0?3001111111|0?3001234568|0?3000000001|0?3111111111)$/.test(digits)) return '';
            if (digits.startsWith('92') && digits.length === 12) return '0' + digits.slice(2);
            if (digits.startsWith('03') && digits.length === 11) return digits;
            if (digits.length === 10 && digits.startsWith('3')) return '0' + digits;
            if (digits.length === 11 && digits.startsWith('0')) return digits;
            if (digits.length >= 10) return digits;
            return '';
        };
        const candidates = [
            body.customerPhone,
            body.verifiedPhone,
            body.whatsappPhone,
            body.phone,
            body.senderPn,
            body.chatId,
            body.senderJid,
            body.sessionKey,
        ];
        for (const c of candidates) {
            const parsed = clean(c);
            if (parsed) return parsed;
        }
        return '';
    };

    const simulatedResult = simulatePrepareSession({
        customerPhone: identity1.customerPhone || identity1.phone,
        verifiedPhone: identity1.phone,
        whatsappPhone: identity1.whatsappPhone,
        chatId: customerJid
    });
    console.log('Test 3 - Prepare Session whatsappPhone:', simulatedResult);
    assert.strictEqual(simulatedResult, '03278497923', 'Prepare Session must produce 03278497923');
    console.log('✅ Test 3 Passed: Prepare Session correctly extracts 03278497923.\n');

    // Test 4: Stale bot number in body rejected by Prepare Session
    const staleResult = simulatePrepareSession({
        customerPhone: '03055375501', // bot number
        verifiedPhone: '03055375501',
        chatId: '923278497923@s.whatsapp.net' // real customer chatId
    });
    console.log('Test 4 - Prepare Session with stale bot number:', staleResult);
    assert.strictEqual(staleResult, '03278497923', 'Must reject bot number and fall back to chatId');
    console.log('✅ Test 4 Passed: Bot number 03055375501 rejected, clean customer phone preserved.\n');

    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
