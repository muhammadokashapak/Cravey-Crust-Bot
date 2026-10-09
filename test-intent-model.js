import { pipeline, cos_sim } from '@xenova/transformers';

console.log('🚀 Loading multilingual-e5-small model (first time may take a moment to download)...');

// Initialize feature-extraction pipeline
const extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
    quantized: true // quantized is fast and small (~115MB)
});

console.log('✅ Model loaded successfully!\n');

// Define intents with sample phrases in Roman Urdu, English, Punjabi
const intentExamples = [
    {
        intent: 'SHOW_MENU',
        label: '📋 Menu Mangna',
        samples: [
            'passage: menu dikha do',
            'passage: menu send karo',
            'passage: kya kya dishes hain aap ke paas',
            'passage: food list aur prices bhej dein',
            'passage: menu vekhao ji',
            'passage: show me the menu please'
        ]
    },
    {
        intent: 'SHOW_DEALS',
        label: '🏷️ Deals / Offers Pochna',
        samples: [
            'passage: koi sasti deal chal rahi hai',
            'passage: koi discount offer hai aaj',
            'passage: special deals dikhao',
            'passage: family pizza package ya offer',
            'passage: koi deal hegi ae',
            'passage: any deals or discounts available'
        ]
    },
    {
        intent: 'CHECK_TIMINGS',
        label: '⏰ Restaurant Timings',
        samples: [
            'passage: shop kab khulti hai',
            'passage: timing kya hai aapki',
            'passage: abhi open hai ya band hai',
            'passage: rat ko kitne baje tak open hota hai',
            'passage: dukan kado khuldi ae',
            'passage: what are your opening hours'
        ]
    },
    {
        intent: 'ORDER_STATUS',
        label: '🛵 Order Status / Tracking',
        samples: [
            'passage: mera order kahan pohncha',
            'passage: order kitni dair me deliver hoga',
            'passage: rider aya nahi abhi tak',
            'passage: track my order status',
            'passage: mera khana kado aave ga',
            'passage: where is my delivery'
        ]
    },
    {
        intent: 'HUMAN_AGENT',
        label: '👤 Human Support / Help',
        samples: [
            'passage: kisi insan ya agent se baat karni hai',
            'passage: call center agent ka number dein',
            'passage: manager se baat karwao',
            'passage: connect me to a human representative',
            'passage: kisi bande naal gall karni ae'
        ]
    }
];

// Helper: Mean pooling to get a 1D vector from token embeddings
function meanPooling(output) {
    // output.data has shape [1, seq_len, hidden_dim]
    const dims = output.dims; // [batch, seq, hidden]
    const hiddenDim = dims[2];
    const seqLen = dims[1];
    const pooled = new Float32Array(hiddenDim);

    for (let i = 0; i < seqLen; i++) {
        for (let j = 0; j < hiddenDim; j++) {
            pooled[j] += output.data[i * hiddenDim + j];
        }
    }
    for (let j = 0; j < hiddenDim; j++) {
        pooled[j] /= seqLen;
    }
    return pooled;
}

// Compute embeddings for all reference samples upfront
console.log('🧠 Indexing sample intent embeddings...');
const indexedIntents = [];

for (const group of intentExamples) {
    const vectors = [];
    for (const sample of group.samples) {
        const out = await extractor(sample, { pooling: 'mean', normalize: true });
        vectors.push(out.data);
    }
    indexedIntents.push({
        intent: group.intent,
        label: group.label,
        vectors
    });
}
console.log('✅ Intent embeddings ready!\n');

// Function to classify any user message
async function classifyMessage(userMessage) {
    const startTime = performance.now();
    
    // e5 models require 'query: ' prefix for search/classification
    const query = `query: ${userMessage}`;
    const queryOut = await extractor(query, { pooling: 'mean', normalize: true });
    const queryVector = queryOut.data;

    let bestIntent = null;
    let highestScore = -1;
    const scores = [];

    for (const group of indexedIntents) {
        let maxGroupScore = -1;
        for (const sampleVec of group.vectors) {
            const similarity = cos_sim(queryVector, sampleVec);
            if (similarity > maxGroupScore) {
                maxGroupScore = similarity;
            }
        }
        scores.push({
            intent: group.intent,
            label: group.label,
            score: Number((maxGroupScore * 100).toFixed(1))
        });

        if (maxGroupScore > highestScore) {
            highestScore = maxGroupScore;
            bestIntent = group;
        }
    }

    const duration = (performance.now() - startTime).toFixed(1);

    // Sort scores descending
    scores.sort((a, b) => b.score - a.score);

    return {
        input: userMessage,
        detectedIntent: bestIntent.intent,
        label: bestIntent.label,
        confidence: (highestScore * 100).toFixed(1) + '%',
        timeTakenMs: duration + ' ms',
        rankings: scores
    };
}

// Test cases: Mix of Roman Urdu, Punjabi, Slang, Typos, English
const testMessages = [
    'bhai menu send kr do zara',
    'kuch khan nu hega menu vekhao',
    'koi achi deal hai aj pizza pe?',
    'dukan kab khulti hy subha?',
    'bhai khana kitni dair me phonche ga late ho rha h',
    'kisi bande se baat kra do bot se nahi krni',
    'pizza rates kya hain'
];

console.log('========================================================');
console.log('🧪 TESTING REAL USER INPUTS WITH MULTILINGUAL-E5-SMALL:');
console.log('========================================================\n');

for (const msg of testMessages) {
    const result = await classifyMessage(msg);
    console.log(`💬 User Input: "${result.input}"`);
    console.log(`🎯 Detected Intent: ${result.detectedIntent} (${result.label})`);
    console.log(`⚡ Confidence: ${result.confidence} | Latency: ${result.timeTakenMs}`);
    console.log(`📊 Top 2 Scores: ${result.rankings.slice(0, 2).map(r => `${r.intent} (${r.score}%)`).join(', ')}`);
    console.log('--------------------------------------------------------');
}
