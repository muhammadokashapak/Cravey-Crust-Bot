/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   Business Knowledge Resolver & Authority Priority Tests    ║
 * ║   tests/business_knowledge_resolver.test.js                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Tests the standardized authority priority:
 *   1. Restaurant / Bot Settings
 *   2. Structured live business database/services (Menu, Deals, Delivery, Orders)
 *   3. FAQ / Knowledge Base
 *   4. Safe fallback
 */

import assert from 'assert';
import { describe, it, before, after } from 'node:test';
import { getDbClient } from '../src/db/client.js';
import { getDefaultRestaurantId } from '../src/services/restaurantService.js';
import {
    resolveBusinessAnswer,
    formatTimeString,
    isTimingQuery,
    isAddressQuery,
    isPhoneQuery,
    isDeliveryInfoQuery,
} from '../src/services/businessKnowledgeResolver.js';
import { handleIncomingOrderMessage } from '../src/services/whatsappOrderOrchestrator.js';

describe('Information-Source Priority & Business Knowledge Resolver', () => {
    let prisma;
    let restaurantId;
    let originalRestaurantData;

    before(async () => {
        prisma = getDbClient();
        assert.ok(prisma, 'Prisma client must be available');
        restaurantId = await getDefaultRestaurantId();

        // Backup current restaurant record to restore afterward
        const current = await prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });
        originalRestaurantData = {
            name: current.name,
            opening_time: current.opening_time,
            closing_time: current.closing_time,
            phone: current.phone,
            address: current.address,
            cod_enabled: current.cod_enabled,
            easypaisa_enabled: current.easypaisa_enabled,
            easypaisa_number: current.easypaisa_number,
            account_name: current.account_name,
        };
    });

    after(async () => {
        // Restore original restaurant data safely
        if (originalRestaurantData && restaurantId) {
            await prisma.restaurant.update({
                where: { id: restaurantId },
                data: originalRestaurantData,
            });
        }
    });

    // ─── 1. Format Time Helper Tests ──────────────────────────────────────────
    describe('formatTimeString Helper', () => {
        it('correctly converts 24h format to 12h AM/PM', () => {
            assert.strictEqual(formatTimeString('18:00'), '6:00 PM');
            assert.strictEqual(formatTimeString('20:00'), '8:00 PM');
            assert.strictEqual(formatTimeString('02:00'), '2:00 AM');
            assert.strictEqual(formatTimeString('12:00'), '12:00 PM');
            assert.strictEqual(formatTimeString('00:00'), '12:00 AM');
        });

        it('preserves already formatted AM/PM time strings', () => {
            assert.strictEqual(formatTimeString('6:00 PM'), '6:00 PM');
            assert.strictEqual(formatTimeString('2:00 AM'), '2:00 AM');
        });

        it('handles null and empty input gracefully', () => {
            assert.strictEqual(formatTimeString(null), '');
            assert.strictEqual(formatTimeString(''), '');
        });
    });

    // ─── 2. Query Pattern Recognizers ─────────────────────────────────────────
    describe('Query Pattern Recognizers', () => {
        it('recognizes various restaurant timing questions', () => {
            assert.ok(isTimingQuery('restaurant timing kya hai'));
            assert.ok(isTimingQuery('opening time'));
            assert.ok(isTimingQuery('closing time'));
            assert.ok(isTimingQuery('kab open hotay ho'));
            assert.ok(isTimingQuery('kitne baje khultay ho'));
            assert.ok(isTimingQuery('aaj timing kya hai'));
            assert.ok(isTimingQuery('timing'));
            assert.ok(isTimingQuery('timings'));
        });

        it('recognizes address questions', () => {
            assert.ok(isAddressQuery('address kya hai'));
            assert.ok(isAddressQuery('restaurant kahan hai'));
            assert.ok(isAddressQuery('location kya hai'));
            assert.ok(isAddressQuery('branch kahan hai'));
        });

        it('recognizes phone/contact questions', () => {
            assert.ok(isPhoneQuery('restaurant phone number'));
            assert.ok(isPhoneQuery('contact number'));
            assert.ok(isPhoneQuery('rabta number'));
        });

        it('recognizes delivery area questions', () => {
            assert.ok(isDeliveryInfoQuery('delivery areas'));
            assert.ok(isDeliveryInfoQuery('kahan deliver karte ho'));
            assert.ok(isDeliveryInfoQuery('free delivery kahan hai'));
        });
    });

    // ─── 3. TEST A: Restaurant Timings & Dynamic Update (No restart/redeploy) ─
    describe('TEST A: Restaurant Timings Dynamic Update Priority', () => {
        it('resolves timing from Settings (6:00 PM to 2:00 AM)', async () => {
            await prisma.restaurant.update({
                where: { id: restaurantId },
                data: {
                    opening_time: '18:00',
                    closing_time: '02:00',
                },
            });

            const res = await resolveBusinessAnswer({
                restaurantId,
                query: 'restaurant timing kya hai',
            });

            assert.strictEqual(res.source, 'SETTINGS');
            assert.strictEqual(res.type, 'RESTAURANT_TIMINGS');
            assert.ok(res.text.includes('6:00 PM'), `Expected 6:00 PM in text: ${res.text}`);
            assert.ok(res.text.includes('2:00 AM'), `Expected 2:00 AM in text: ${res.text}`);
        });

        it('dynamically reflects updated Settings (7:00 PM to 1:00 AM) immediately without restart', async () => {
            await prisma.restaurant.update({
                where: { id: restaurantId },
                data: {
                    opening_time: '19:00',
                    closing_time: '01:00',
                },
            });

            const res = await resolveBusinessAnswer({
                restaurantId,
                query: 'kab open hotay ho',
            });

            assert.strictEqual(res.source, 'SETTINGS');
            assert.strictEqual(res.type, 'RESTAURANT_TIMINGS');
            assert.ok(res.text.includes('7:00 PM'), `Expected 7:00 PM in text: ${res.text}`);
            assert.ok(res.text.includes('1:00 AM'), `Expected 1:00 AM in text: ${res.text}`);
        });
    });

    // ─── 4. TEST B: Controlled Conflict Test (Settings vs FAQ) ───────────────
    describe('TEST B: Controlled Conflict Resolution (Settings wins over FAQ)', () => {
        it('Settings (6:00 PM) beats FAQ (4:00 PM)', async () => {
            // Set Settings to 6:00 PM (18:00)
            await prisma.restaurant.update({
                where: { id: restaurantId },
                data: {
                    opening_time: '18:00',
                    closing_time: '02:00',
                },
            });

            // Customer asks question that would match both Settings and FAQ (cmuznwmyq008biwegkkc1d9lp which mentions 4:00 PM)
            const res = await resolveBusinessAnswer({
                restaurantId,
                query: 'restaurant timing kya hai',
            });

            assert.strictEqual(res.source, 'SETTINGS', 'Settings MUST win over FAQ');
            assert.ok(res.text.includes('6:00 PM'), 'Should return 6:00 PM from Settings');
            assert.ok(!res.text.includes('4:00 PM'), 'Must NOT return 4:00 PM from stale FAQ');
        });
    });

    // ─── 5. TEST C: FAQ Fallback Test (Settings empty -> FAQ used) ───────────
    describe('TEST C: FAQ Fallback Test (Settings empty -> FAQ used)', () => {
        it('falls back to FAQ when Settings timings are null', async () => {
            await prisma.restaurant.update({
                where: { id: restaurantId },
                data: {
                    opening_time: null,
                    closing_time: null,
                },
            });

            const res = await resolveBusinessAnswer({
                restaurantId,
                query: 'restaurant timing kya hai',
            });

            assert.strictEqual(res.source, 'FAQ', 'Must fall back to FAQ when Settings is empty');
            assert.strictEqual(res.type, 'FAQ_MATCH');
            assert.ok(res.text.length > 0, 'FAQ answer must be returned');
        });
    });

    // ─── 6. Payment Settings Priority over FAQ ───────────────────────────────
    describe('Payment Settings Priority over FAQ', () => {
        it('returns dynamic live payment details from Settings, not static FAQ text', async () => {
            const testEpNum = '03129876543';
            const testTitle = 'Cravey Test Account';

            await prisma.restaurant.update({
                where: { id: restaurantId },
                data: {
                    cod_enabled: true,
                    easypaisa_enabled: true,
                    easypaisa_number: testEpNum,
                    account_name: testTitle,
                },
            });

            const res = await resolveBusinessAnswer({
                restaurantId,
                query: 'payment methods kya hain',
            });

            assert.strictEqual(res.source, 'SETTINGS');
            assert.strictEqual(res.type, 'PAYMENT_METHODS');
            assert.ok(res.text.includes('Cash on Delivery'));
            assert.ok(res.text.includes('EasyPaisa'));
            assert.ok(res.text.includes(testEpNum));
            assert.ok(res.text.includes(testTitle));
        });
    });

    // ─── 7. Address & Phone Settings Priority over FAQ ───────────────────────
    describe('Address & Phone Settings Priority over FAQ', () => {
        it('returns Address from Settings when present', async () => {
            const testAddress = 'Shop #5, Commercial Plaza, Phase 4B, Ghauri Town';
            await prisma.restaurant.update({
                where: { id: restaurantId },
                data: { address: testAddress },
            });

            const res = await resolveBusinessAnswer({
                restaurantId,
                query: 'restaurant address kya hai',
            });

            assert.strictEqual(res.source, 'SETTINGS');
            assert.strictEqual(res.type, 'RESTAURANT_ADDRESS');
            assert.ok(res.text.includes(testAddress));
        });

        it('returns Phone from Settings when present', async () => {
            const testPhone = '051-1234567';
            await prisma.restaurant.update({
                where: { id: restaurantId },
                data: { phone: testPhone },
            });

            const res = await resolveBusinessAnswer({
                restaurantId,
                query: 'restaurant phone number',
            });

            assert.strictEqual(res.source, 'SETTINGS');
            assert.strictEqual(res.type, 'RESTAURANT_PHONE');
            assert.ok(res.text.includes(testPhone));
        });
    });

    // ─── 8. Delivery Service Priority ────────────────────────────────────────
    describe('Structured Delivery Service Priority', () => {
        it('returns live DeliveryArea database records, not static text', async () => {
            const res = await resolveBusinessAnswer({
                restaurantId,
                query: 'delivery areas kaunse hain',
            });

            assert.strictEqual(res.source, 'DELIVERY');
            assert.strictEqual(res.type, 'DELIVERY_AREAS');
            assert.ok(res.data.count > 0);
            assert.ok(res.text.includes('areas mein deliver karte hain'));
        });
    });

    // ─── 9. FAQ Used When No Higher Source Exists ────────────────────────────
    describe('FAQ Priority When No Higher Source Exists', () => {
        it('uses FAQ for bot persona questions (Who is Burger Raja?)', async () => {
            const res = await resolveBusinessAnswer({
                restaurantId,
                query: 'Who is Burger Raja?',
            });

            assert.strictEqual(res.source, 'FAQ');
            assert.strictEqual(res.type, 'FAQ_MATCH');
            assert.ok(res.text.includes('Burger Raja'));
        });

        it('uses FAQ for Google Reviews link inquiry', async () => {
            const res = await resolveBusinessAnswer({
                restaurantId,
                query: 'google review link',
            });

            assert.strictEqual(res.source, 'FAQ');
            assert.strictEqual(res.type, 'FAQ_MATCH');
            assert.ok(res.text.includes('maps.app.goo.gl'));
        });
    });

    // ─── 10. Fallback Used When Nothing Exists ───────────────────────────────
    describe('Safe Fallback Priority', () => {
        it('returns safe fallback for unknown gibberish queries', async () => {
            const res = await resolveBusinessAnswer({
                restaurantId,
                query: 'xyzqwerty nonsense unknown query 12345',
            });

            assert.strictEqual(res.source, 'FALLBACK');
            assert.strictEqual(res.type, 'SAFE_FALLBACK');
            assert.ok(res.text.includes('confirmed answer available nahi hai'));
        });
    });

    // ─── 11. WhatsApp Orchestrator Integration Test ──────────────────────────
    describe('WhatsApp Orchestrator Integration with Business Knowledge Resolver', () => {
        it('orchestrator uses Settings timings when customer asks in WhatsApp chat', async () => {
            await prisma.restaurant.update({
                where: { id: restaurantId },
                data: {
                    opening_time: '18:00',
                    closing_time: '02:00',
                },
            });

            const reply = await handleIncomingOrderMessage({
                normalizedMessage: {
                    chatId: 'test_timing_user@s.whatsapp.net',
                    messageId: `timing_test_${Date.now()}`,
                    text: 'restaurant timing kya hai',
                },
            });

            assert.ok(reply);
            assert.strictEqual(reply.intent, 'RESTAURANT_TIMINGS');
            assert.ok(reply.text.includes('6:00 PM'));
            assert.ok(reply.text.includes('2:00 AM'));
            assert.ok(!reply.text.includes('Settings says'), 'Must not leak internal names');
        });

        it('orchestrator immediately reflects changed timings in next message', async () => {
            await prisma.restaurant.update({
                where: { id: restaurantId },
                data: {
                    opening_time: '19:00',
                    closing_time: '01:00',
                },
            });

            const reply = await handleIncomingOrderMessage({
                normalizedMessage: {
                    chatId: 'test_timing_user_2@s.whatsapp.net',
                    messageId: `timing_test_2_${Date.now()}`,
                    text: 'kab open hotay ho',
                },
            });

            assert.ok(reply);
            assert.strictEqual(reply.intent, 'RESTAURANT_TIMINGS');
            assert.ok(reply.text.includes('7:00 PM'));
            assert.ok(reply.text.includes('1:00 AM'));
        });
    });
});
