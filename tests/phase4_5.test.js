import test from 'node:test';
import assert from 'node:assert/strict';
import { createFaqCategorySchema, updateFaqCategorySchema } from '../src/validators/faqCategorySchema.js';
import { createFaqSchema, updateFaqSchema } from '../src/validators/faqSchema.js';
import { requireAdminAuth, requireInternalSecret } from '../src/middleware/auth.js';
import { generateAdminToken } from '../src/services/authService.js';
import { flags } from '../src/config/flags.js';

test('─── Phase 4.5: FAQ Category Validation ───', async (t) => {
    await t.test('valid FAQ category passes schema', () => {
        const parsed = createFaqCategorySchema.safeParse({
            name: 'Delivery',
            description: 'Delivery timings, areas and policies',
            sort_order: 1,
            is_active: true,
        });
        assert.equal(parsed.success, true);
        assert.equal(parsed.data.name, 'Delivery');
        assert.equal(parsed.data.sort_order, 1);
    });

    await t.test('empty category name is rejected', () => {
        const parsed = createFaqCategorySchema.safeParse({
            name: '',
        });
        assert.equal(parsed.success, false);
    });

    await t.test('category update allows partial updates', () => {
        const parsed = updateFaqCategorySchema.safeParse({
            description: 'Updated description',
            is_active: false,
        });
        assert.equal(parsed.success, true);
        assert.equal(parsed.data.is_active, false);
    });
});

test('─── Phase 4.5: FAQ Validation & Sanitization ───', async (t) => {
    await t.test('valid FAQ passes schema with array inputs', () => {
        const parsed = createFaqSchema.safeParse({
            question: 'How long does delivery take?',
            answer: 'Delivery usually takes around 30 to 45 minutes.',
            keywords: ['delivery time', 'kitni dair', 'kab aye ga'],
            alternative_questions: ['Delivery kitni der leti hai?', 'Mera order kab aye ga?'],
            sort_order: 0,
            is_active: true,
        });
        assert.equal(parsed.success, true);
        assert.equal(parsed.data.question, 'How long does delivery take?');
        assert.equal(parsed.data.keywords.length, 3);
        assert.equal(parsed.data.alternative_questions.length, 2);
    });

    await t.test('sanitizes comma and newline-separated keywords & alternative questions', () => {
        const parsed = createFaqSchema.safeParse({
            question: 'What are your operating hours?',
            answer: 'We are open from 12:00 PM to 2:00 AM daily.',
            keywords: 'timing, open time, kab khulta hai, \n closing time , timing', // includes duplicate and whitespace
            alternative_questions: 'Kab tak open hai?\nTiming kia hai?',
        });
        assert.equal(parsed.success, true);
        assert.deepEqual(parsed.data.keywords, ['timing', 'open time', 'kab khulta hai', 'closing time']);
        assert.deepEqual(parsed.data.alternative_questions, ['Kab tak open hai?', 'Timing kia hai?']);
    });

    await t.test('rejects questions that are too short', () => {
        const parsed = createFaqSchema.safeParse({
            question: 'Hi',
            answer: 'Hello! How can we help?',
        });
        assert.equal(parsed.success, false);
    });

    await t.test('rejects answers that are too short', () => {
        const parsed = createFaqSchema.safeParse({
            question: 'Where are you located?',
            answer: 'No',
        });
        assert.equal(parsed.success, false);
    });
});

test('─── Phase 4.5: Feature Flag Verification ───', async (t) => {
    await t.test('KNOWLEDGE_BASE_ENABLED is present and boolean', () => {
        assert.equal(typeof flags.KNOWLEDGE_BASE_ENABLED, 'boolean');
        assert.equal(flags.KNOWLEDGE_BASE_ENABLED, true);
    });
});

test('─── Phase 4.5: Security & Authorization Enforcements ───', async (t) => {
    await t.test('requireInternalSecret rejects request without internal secret', () => {
        let status = null;
        let body = null;
        const req = { headers: {} };
        const res = {
            status: (s) => {
                status = s;
                return { json: (b) => { body = b; } };
            },
        };
        let nextCalled = false;
        requireInternalSecret(req, res, () => { nextCalled = true; });

        assert.equal(status, 401);
        assert.equal(body.success, false);
        assert.equal(nextCalled, false);
    });

    await t.test('requireInternalSecret passes with valid secret header', () => {
        const secret = process.env.INTERNAL_API_SECRET || 'cravey-internal-secret-phase2';
        const req = { headers: { 'x-internal-api-secret': secret } };
        let nextCalled = false;
        requireInternalSecret(req, {}, () => { nextCalled = true; });

        assert.equal(nextCalled, true);
    });

    await t.test('requireAdminAuth rejects unauthenticated access to admin FAQ endpoints', async () => {
        let status = null;
        let jsonResponse = null;
        const req = { headers: {} };
        const res = {
            status: (s) => {
                status = s;
                return { json: (data) => { jsonResponse = data; } };
            },
        };
        let nextCalled = false;
        await requireAdminAuth(req, res, () => { nextCalled = true; });

        assert.equal(status, 401);
        assert.equal(jsonResponse.success, false);
        assert.equal(nextCalled, false);
    });

    await t.test('requireAdminAuth allows authenticated admin tokens', async () => {
        const token = generateAdminToken({
            userId: 'admin-faq-tester',
            username: 'faqadmin',
            role: 'ADMIN',
            restaurantId: 'rest-faq',
        });
        const req = { headers: { authorization: `Bearer ${token}` } };
        let nextCalled = false;
        await requireAdminAuth(req, {}, () => { nextCalled = true; });

        assert.equal(nextCalled, true);
        assert.equal(req.user.username, 'faqadmin');
    });
});
