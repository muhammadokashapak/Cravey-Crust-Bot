import { pipeline, cos_sim } from '@xenova/transformers';
import { logger } from '../utils/logger.js';

let extractor = null;
let isInitializing = false;
let indexedIntents = [];

const INTENT_SAMPLES = [
    {
        intent: 'GREETING',
        samples: [
            'passage: hi',
            'passage: hii',
            'passage: heyy',
            'passage: hello',
            'passage: salam',
            'passage: assalam o alaikum',
            'passage: aoa',
            'passage: slam',
            'passage: kaisay ho',
            'passage: kya haal hai'
        ]
    },
    {
        intent: 'SHOW_MENU',
        samples: [
            'passage: menu',
            'passage: menu dikhao',
            'passage: menu bhejo',
            'passage: rate list',
            'passage: food list',
            'passage: khana kya hai',
            'passage: menu vekhao',
            'passage: kya kya dishes hain'
        ]
    },
    {
        intent: 'SHOW_DEALS',
        samples: [
            'passage: deals',
            'passage: koi deal hai',
            'passage: welcome deal',
            'passage: koi discount hai',
            'passage: offers dikhao',
            'passage: special deal',
            'passage: family pizza package',
            'passage: coupons',
            'passage: promotions',
            'passage: koi deal hegi ae'
        ]
    },
    {
        intent: 'SHOW_CATEGORY',
        samples: [
            'passage: drinks',
            'passage: drinks mai kya ha',
            'passage: drinks dikhao',
            'passage: drink options',
            'passage: soft drinks',
            'passage: mineral water',
            'passage: premium pizzas',
            'passage: classic pizzas',
            'passage: burger deals',
            'passage: pizza deals',
            'passage: category items dikhao'
        ]
    },
    {
        intent: 'SHOW_CART',
        samples: [
            'passage: cart',
            'passage: mera cart',
            'passage: show cart',
            'passage: view basket',
            'passage: cart dikhao'
        ]
    },
    {
        intent: 'CHECKOUT',
        samples: [
            'passage: checkout',
            'passage: order karna hai',
            'passage: place order',
            'passage: order confirm karo',
            'passage: bill bana do'
        ]
    },
    {
        intent: 'CLEAR_CART',
        samples: [
            'passage: clear cart',
            'passage: cart khali kardo',
            'passage: empty cart'
        ]
    },
    {
        intent: 'TIMINGS_QUERY',
        samples: [
            'passage: shop kab khulti hai',
            'passage: timings kya hain',
            'passage: dukan kado khuldi ae',
            'passage: open kab hoti hai',
            'passage: band kab hoti hai',
            'passage: restaurant ke auqaat kar'
        ]
    },
    {
        intent: 'RESTAURANT_PHONE',
        samples: [
            'passage: restaurant ka phone number kya hai',
            'passage: apka number kya ha restaurant ka',
            'passage: contact number do',
            'passage: helpline number kya hai',
            'passage: call center ka number',
            'passage: rabta number'
        ]
    },
    {
        intent: 'START_ORDER',
        samples: [
            'passage: order book krwana ah',
            'passage: order book karna hai',
            'passage: order karna hai',
            'passage: khana mangwana hai',
            'passage: naya order karna hai',
            'passage: booking karwani hai'
        ]
    },
    {
        intent: 'DELIVERY_AREAS_QUERY',
        samples: [
            'passage: delivery area',
            'passage: kahan deliver karte ho',
            'passage: lahore delivery hai',
            'passage: ghauri town delivery',
            'passage: delivery charges kitne hain',
            'passage: free delivery areas',
            'passage: dhoke kala khan delivery hai',
            'passage: is ilaqe me delivery hogi',
            'passage: kya falana jagah deliver karte ho',
            'passage: delivery available hai'
        ]
    },
    {
        intent: 'PAYMENT_METHODS_QUERY',
        samples: [
            'passage: payment kaise karni hai',
            'passage: easypaisa number do',
            'passage: payment options kya hain',
            'passage: bank transfer ya cod'
        ]
    },
    {
        intent: 'ORDER_STATUS_QUERY',
        samples: [
            'passage: mera order kahan hai',
            'passage: order track karna hai',
            'passage: khana kitni dair me aayega',
            'passage: order status CC-000014'
        ]
    },
    {
        intent: 'HELP',
        samples: [
            'passage: help',
            'passage: madad',
            'passage: commands batao',
            'passage: options kya hain'
        ]
    },
    {
        intent: 'HUMAN_HANDOFF',
        samples: [
            'passage: kisi bande se baat karni hai',
            'passage: manager se baat karao',
            'passage: call center agent',
            'passage: human support'
        ]
    }
];

export async function initAiIntentClassifier() {
    if (extractor && indexedIntents.length > 0) return true;
    if (isInitializing) {
        // Wait if already initializing
        while (isInitializing) {
            await new Promise(r => setTimeout(r, 100));
        }
        return Boolean(extractor);
    }

    try {
        isInitializing = true;
        logger.info('[AI Intent] Loading multilingual-e5-small model...');
        extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
            quantized: true
        });

        indexedIntents = [];
        for (const group of INTENT_SAMPLES) {
            const vectors = [];
            for (const sample of group.samples) {
                const out = await extractor(sample, { pooling: 'mean', normalize: true });
                vectors.push(out.data);
            }
            indexedIntents.push({
                intent: group.intent,
                vectors
            });
        }
        logger.info('[AI Intent] Model initialized and embeddings indexed successfully!');
        return true;
    } catch (err) {
        logger.error({ err: err.message }, '[AI Intent] Failed to initialize multilingual model');
        return false;
    } finally {
        isInitializing = false;
    }
}

/**
 * Classify a customer text using multilingual-e5-small embeddings
 * @param {string} text
 * @param {number} threshold Default 0.78
 * @returns {Promise<{ intent: string, confidence: number } | null>}
 */
export async function classifyWithAiModel(text, threshold = 0.78) {
    if (!text || text.trim().length === 0) return null;

    const initialized = await initAiIntentClassifier();
    if (!initialized || !extractor || indexedIntents.length === 0) return null;

    try {
        const query = `query: ${text.trim()}`;
        const queryOut = await extractor(query, { pooling: 'mean', normalize: true });
        const queryVector = queryOut.data;

        let bestIntent = null;
        let highestScore = -1;

        for (const group of indexedIntents) {
            for (const sampleVec of group.vectors) {
                const similarity = cos_sim(queryVector, sampleVec);
                if (similarity > highestScore) {
                    highestScore = similarity;
                    bestIntent = group.intent;
                }
            }
        }

        if (highestScore >= threshold && bestIntent) {
            return {
                intent: bestIntent,
                confidence: Number(highestScore.toFixed(3))
            };
        }

        return null;
    } catch (err) {
        logger.error({ err: err.message }, '[AI Intent] Classification error');
        return null;
    }
}
