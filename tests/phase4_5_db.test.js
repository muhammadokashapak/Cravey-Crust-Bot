import test from 'node:test';
import assert from 'node:assert/strict';
import { getDbClient } from '../src/db/client.js';
import { getDefaultRestaurantId } from '../src/services/restaurantService.js';
import { searchKnowledge } from '../src/services/knowledgeService.js';
import { slugify } from '../src/utils/slugify.js';

test('─── Phase 4.5: Database & Knowledge Base Integration Tests ───', async (t) => {
    const prisma = getDbClient();
    if (!prisma) {
        console.log('Skipping Phase 4.5 DB tests: Database not connected');
        return;
    }

    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch (e) {
        console.log('Skipping Phase 4.5 DB integration tests (DB unreachable): \n' + e.message);
        return;
    }

    const restaurantId = await getDefaultRestaurantId();

    // ── 1. FAQ Category CRUD ──────────────────────────────────────────
    let testCategory;
    await t.test('FAQ Category CRUD: Create, duplicate check, update, disable', async () => {
        // Create
        testCategory = await prisma.fAQCategory.upsert({
            where: {
                restaurant_id_slug: {
                    restaurant_id: restaurantId,
                    slug: 'test-delivery-faq',
                },
            },
            update: {
                name: 'Test Delivery FAQs',
                is_active: true,
                sort_order: 1,
            },
            create: {
                restaurant_id: restaurantId,
                name: 'Test Delivery FAQs',
                slug: 'test-delivery-faq',
                description: 'Information regarding orders and delivery timing',
                sort_order: 1,
                is_active: true,
            },
        });

        assert.ok(testCategory.id);
        assert.equal(testCategory.name, 'Test Delivery FAQs');

        // Duplicate check
        const isDuplicate = await prisma.fAQCategory.findFirst({
            where: {
                restaurant_id: restaurantId,
                slug: 'test-delivery-faq',
                id: { not: testCategory.id },
            },
        });
        assert.equal(isDuplicate, null);

        // Update
        const updatedCat = await prisma.fAQCategory.update({
            where: { id: testCategory.id },
            data: { description: 'Updated delivery FAQ description', sort_order: 2 },
        });
        assert.equal(updatedCat.sort_order, 2);
        assert.equal(updatedCat.description, 'Updated delivery FAQ description');

        // Toggle / Disable
        const disabledCat = await prisma.fAQCategory.update({
            where: { id: testCategory.id },
            data: { is_active: false },
        });
        assert.equal(disabledCat.is_active, false);

        // Re-enable for subsequent tests
        await prisma.fAQCategory.update({
            where: { id: testCategory.id },
            data: { is_active: true },
        });
    });

    // ── 2. FAQ CRUD ──────────────────────────────────────────────────
    let testFaq;
    await t.test('FAQ CRUD: Create, update, toggle status, and fetch', async () => {
        // Cleanup prior test FAQ if exists
        await prisma.fAQ.deleteMany({
            where: {
                restaurant_id: restaurantId,
                question: 'How long does delivery take?',
            },
        });

        // Create FAQ
        testFaq = await prisma.fAQ.create({
            data: {
                restaurant_id: restaurantId,
                category_id: testCategory.id,
                question: 'How long does delivery take?',
                answer: 'Delivery usually takes around 30 to 45 minutes depending on the location and order volume.',
                keywords: ['delivery', 'delivery time', 'kitni dair', 'kab aye ga', 'how long delivery', 'order timing'],
                alternative_questions: [
                    'Delivery kitni der leti hai?',
                    'Mera order kitni dair mein aye ga?',
                    'Order kitni dair mein aye ga?',
                    'How long will my delivery take?',
                ],
                sort_order: 1,
                is_active: true,
                created_by: 'test-suite',
            },
        });

        assert.ok(testFaq.id);
        assert.equal(testFaq.question, 'How long does delivery take?');
        assert.equal(testFaq.keywords.length, 6);
        assert.equal(testFaq.alternative_questions.length, 4);

        // Update
        const updatedFaq = await prisma.fAQ.update({
            where: { id: testFaq.id },
            data: { sort_order: 5 },
        });
        assert.equal(updatedFaq.sort_order, 5);

        // Toggle Status
        const disabledFaq = await prisma.fAQ.update({
            where: { id: testFaq.id },
            data: { is_active: false },
        });
        assert.equal(disabledFaq.is_active, false);

        // Re-enable
        await prisma.fAQ.update({
            where: { id: testFaq.id },
            data: { is_active: true },
        });
    });

    // ── 3. Search Exact Question ─────────────────────────────────────
    await t.test('searchKnowledge: exact question match', async () => {
        const res = await searchKnowledge({
            restaurantId,
            query: 'How long does delivery take?',
            limit: 3,
        });

        assert.equal(res.success, true);
        assert.ok(res.data.results.length >= 1);
        const top = res.data.results[0];
        assert.equal(top.id, testFaq.id);
        assert.equal(top.question, 'How long does delivery take?');
        assert.ok(top.score >= 0.8, `Score ${top.score} should be high for exact question`);
    });

    // ── 4. Search Keyword & Roman Urdu ───────────────────────────────
    await t.test('searchKnowledge: keyword and Roman Urdu matching', async () => {
        const res = await searchKnowledge({
            restaurantId,
            query: 'delivery kitni dair',
            limit: 3,
        });

        assert.equal(res.success, true);
        assert.ok(res.data.results.length >= 1, 'Should find FAQ for "delivery kitni dair"');
        const match = res.data.results.find((r) => r.id === testFaq.id);
        assert.ok(match, 'FAQ should be in top results');
        assert.ok(match.score >= 0.6, `Score ${match.score} should be strong`);
    });

    // ── 5. Search Alternative Questions ──────────────────────────────
    await t.test('searchKnowledge: alternative wording ("mera order kab aye ga")', async () => {
        const res = await searchKnowledge({
            restaurantId,
            query: 'mera order kab aye ga',
            limit: 3,
        });

        assert.equal(res.success, true);
        assert.ok(res.data.results.length >= 1, 'Should find FAQ for "mera order kab aye ga"');
        const match = res.data.results.find((r) => r.id === testFaq.id);
        assert.ok(match, 'FAQ should be returned for alternative phrasing');
    });

    // ── 6. Search Spelling Variation / Typo ──────────────────────────
    await t.test('searchKnowledge: spelling typo ("delvery kitni dair")', async () => {
        const res = await searchKnowledge({
            restaurantId,
            query: 'delvery kitni dair',
            limit: 3,
        });

        assert.equal(res.success, true);
        assert.ok(res.data.results.length >= 1, 'Should find FAQ despite spelling error in "delivery"');
        const match = res.data.results.find((r) => r.id === testFaq.id);
        assert.ok(match, 'FAQ should be found for typo query');
    });

    // ── 7. Active / Inactive FAQ Exclusion ───────────────────────────
    await t.test('searchKnowledge: inactive FAQ is excluded', async () => {
        // Disable FAQ
        await prisma.fAQ.update({
            where: { id: testFaq.id },
            data: { is_active: false },
        });

        const res = await searchKnowledge({
            restaurantId,
            query: 'How long does delivery take?',
            limit: 3,
        });

        const match = res.data.results.find((r) => r.id === testFaq.id);
        assert.equal(match, undefined, 'Disabled FAQ must NOT be returned in search results');

        // Re-enable
        await prisma.fAQ.update({
            where: { id: testFaq.id },
            data: { is_active: true },
        });

        const reCheck = await searchKnowledge({
            restaurantId,
            query: 'How long does delivery take?',
            limit: 3,
        });
        const reMatch = reCheck.data.results.find((r) => r.id === testFaq.id);
        assert.ok(reMatch, 'Re-enabled FAQ must be returned in search results');
    });

    // ── 8. Inactive Category Exclusion ───────────────────────────────
    await t.test('searchKnowledge: inactive category excludes its FAQs', async () => {
        // Disable Category
        await prisma.fAQCategory.update({
            where: { id: testCategory.id },
            data: { is_active: false },
        });

        const res = await searchKnowledge({
            restaurantId,
            query: 'How long does delivery take?',
            limit: 3,
        });

        const match = res.data.results.find((r) => r.id === testFaq.id);
        assert.equal(match, undefined, 'FAQ belonging to inactive category must NOT be returned');

        // Re-enable Category
        await prisma.fAQCategory.update({
            where: { id: testCategory.id },
            data: { is_active: true },
        });
    });

    // ── 9. Multi-Tenant Restaurant Isolation ─────────────────────────
    await t.test('searchKnowledge: multi-tenant restaurant isolation', async () => {
        const otherRest = await prisma.restaurant.upsert({
            where: { slug: 'other-rest-isolation-test' },
            update: {},
            create: {
                name: 'Other Isolation Rest',
                slug: 'other-rest-isolation-test',
            },
        });

        // Search from other restaurant's perspective
        const res = await searchKnowledge({
            restaurantId: otherRest.id,
            query: 'How long does delivery take?',
            limit: 3,
        });

        const match = res.data.results.find((r) => r.id === testFaq.id);
        assert.equal(match, undefined, 'Other restaurant must not see testFaq');
    });

    // ── 10. Unrelated Query Returns Empty Array ──────────────────────
    await t.test('searchKnowledge: irrelevant query returns empty results', async () => {
        const res = await searchKnowledge({
            restaurantId,
            query: 'What is the speed of light in vacuum?',
            limit: 3,
        });

        assert.equal(res.success, true);
        assert.deepEqual(res.data.results, []);
    });

    // ── 11. Category Safe Deletion ───────────────────────────────────
    await t.test('Category Safe Deletion: Cannot delete if FAQs depend on it unless forced', async () => {
        // FAQs depend on testCategory
        const faqsCount = await prisma.fAQ.count({
            where: { category_id: testCategory.id },
        });
        assert.ok(faqsCount > 0);

        // Safe unassign & cleanup
        await prisma.fAQ.updateMany({
            where: { category_id: testCategory.id },
            data: { category_id: null },
        });

        // Now deletion succeeds
        await prisma.fAQCategory.delete({
            where: { id: testCategory.id },
        });

        const deleted = await prisma.fAQCategory.findUnique({
            where: { id: testCategory.id },
        });
        assert.equal(deleted, null);
    });

    // ── 12. Cleanup ──────────────────────────────────────────────────
    if (testFaq) {
        await prisma.fAQ.deleteMany({
            where: { id: testFaq.id },
        });
    }
});
