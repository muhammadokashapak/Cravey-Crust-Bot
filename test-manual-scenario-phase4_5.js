/**
 * Phase 4.5 Manual Scenario Test Script — test-manual-scenario-phase4_5.js
 *
 * Replicates Section 30 Manual Test Scenario:
 * 1. Creates category "Delivery"
 * 2. Creates FAQ "How long does delivery take?"
 * 3. Search "How long does delivery take?" -> FAQ returned
 * 4. Search "delivery kitni dair" -> same FAQ returned
 * 5. Search "mera order kab aye ga" -> same FAQ returned
 * 6. Disable FAQ -> search again -> FAQ must NOT be returned
 * 7. Enable FAQ -> search again -> FAQ returned again
 */

import { getDbClient } from './src/db/client.js';
import { getDefaultRestaurantId } from './src/services/restaurantService.js';
import { searchKnowledge } from './src/services/knowledgeService.js';

async function runScenario() {
    console.log('══════════════════════════════════════════════════════════════');
    console.log('   Cravey Crust — Phase 4.5 Manual Scenario Verification     ');
    console.log('══════════════════════════════════════════════════════════════\n');

    const prisma = getDbClient();
    if (!prisma) {
        console.error('❌ Database not available');
        process.exit(1);
    }

    const restaurantId = await getDefaultRestaurantId();
    console.log(`[SETUP] Using restaurant ID: ${restaurantId}`);

    // Step 1: Create or upsert Delivery category
    console.log('\n[STEP 1] Creating/Verifying Category: "Delivery"');
    const category = await prisma.fAQCategory.upsert({
        where: {
            restaurant_id_slug: {
                restaurant_id: restaurantId,
                slug: 'delivery-scenario-test',
            },
        },
        update: {
            name: 'Delivery',
            is_active: true,
        },
        create: {
            restaurant_id: restaurantId,
            name: 'Delivery',
            slug: 'delivery-scenario-test',
            description: 'Order delivery timings and policies',
            is_active: true,
        },
    });
    console.log(`✅ Category Ready: ${category.name} (ID: ${category.id})`);

    // Clean up previous scenario FAQ
    await prisma.fAQ.deleteMany({
        where: {
            restaurant_id: restaurantId,
            question: 'How long does delivery take?',
        },
    });

    // Step 2: Create FAQ
    console.log('\n[STEP 2] Creating FAQ: "How long does delivery take?"');
    const faq = await prisma.fAQ.create({
        data: {
            restaurant_id: restaurantId,
            category_id: category.id,
            question: 'How long does delivery take?',
            answer: 'Delivery usually takes around 30 to 45 minutes depending on the location and order volume.',
            keywords: ['delivery', 'delivery time', 'kitni dair', 'kab aye ga'],
            alternative_questions: [
                'Delivery kitni der leti hai?',
                'Order kitni dair mein aye ga?',
                'How long will my delivery take?',
            ],
            sort_order: 1,
            is_active: true,
        },
    });
    console.log(`✅ FAQ Created: "${faq.question}" (ID: ${faq.id})`);

    // Test Search 1
    console.log('\n[TEST 1] Searching: "How long does delivery take?"');
    const res1 = await searchKnowledge({
        restaurantId,
        query: 'How long does delivery take?',
        limit: 3,
    });
    const match1 = res1.data.results.find((r) => r.id === faq.id);
    if (match1) {
        console.log(`✅ MATCH FOUND! Score: ${match1.score} | Answer: "${match1.answer.substring(0, 50)}..."`);
    } else {
        console.error('❌ FAILED: Expected FAQ not returned');
        process.exit(1);
    }

    // Test Search 2
    console.log('\n[TEST 2] Searching: "delivery kitni dair"');
    const res2 = await searchKnowledge({
        restaurantId,
        query: 'delivery kitni dair',
        limit: 3,
    });
    const match2 = res2.data.results.find((r) => r.id === faq.id);
    if (match2) {
        console.log(`✅ MATCH FOUND! Score: ${match2.score} | Matched keyword: "kitni dair"`);
    } else {
        console.error('❌ FAILED: Expected FAQ not returned for "delivery kitni dair"');
        process.exit(1);
    }

    // Test Search 3
    console.log('\n[TEST 3] Searching: "mera order kab aye ga"');
    const res3 = await searchKnowledge({
        restaurantId,
        query: 'mera order kab aye ga',
        limit: 3,
    });
    const match3 = res3.data.results.find((r) => r.id === faq.id);
    if (match3) {
        console.log(`✅ MATCH FOUND! Score: ${match3.score} | Matched alternative question/keyword: "kab aye ga"`);
    } else {
        console.error('❌ FAILED: Expected FAQ not returned for "mera order kab aye ga"');
        process.exit(1);
    }

    // Test 4: Disable FAQ
    console.log('\n[TEST 4] Disabling FAQ and re-running search...');
    await prisma.fAQ.update({
        where: { id: faq.id },
        data: { is_active: false },
    });
    const res4 = await searchKnowledge({
        restaurantId,
        query: 'How long does delivery take?',
        limit: 3,
    });
    const match4 = res4.data.results.find((r) => r.id === faq.id);
    if (!match4) {
        console.log('✅ EXCLUDED CORRECTLY: Inactive FAQ was NOT returned (Results count: ' + res4.data.results.length + ')');
    } else {
        console.error('❌ FAILED: Inactive FAQ should NOT have been returned');
        process.exit(1);
    }

    // Test 5: Re-enable FAQ
    console.log('\n[TEST 5] Re-enabling FAQ and re-running search...');
    await prisma.fAQ.update({
        where: { id: faq.id },
        data: { is_active: true },
    });
    const res5 = await searchKnowledge({
        restaurantId,
        query: 'How long does delivery take?',
        limit: 3,
    });
    const match5 = res5.data.results.find((r) => r.id === faq.id);
    if (match5) {
        console.log(`✅ MATCH FOUND AGAIN! Score: ${match5.score} | FAQ returned after re-enabling`);
    } else {
        console.error('❌ FAILED: Re-enabled FAQ was not returned');
        process.exit(1);
    }

    // Clean up
    console.log('\n[CLEANUP] Removing test scenario records...');
    await prisma.fAQ.delete({ where: { id: faq.id } });
    await prisma.fAQCategory.delete({ where: { id: category.id } });
    console.log('✅ Cleanup complete.');

    console.log('\n🎉 ALL 5 MANUAL TEST SCENARIO STEPS PASSED PERFECTLY!\n');
}

runScenario().catch((err) => {
    console.error('Scenario failed:', err);
    process.exit(1);
});
