import { getDbClient } from '../src/db/client.js';

async function sanitizeFaqs() {
    const prisma = getDbClient();
    if (!prisma) {
        console.error('No prisma client');
        process.exit(1);
    }

    const updates = [
        {
            question: 'Menu & Catalog Inquiries',
            answer: 'Hamara menu dekhne ke liye WhatsApp par "Menu" ya "Deals" likhein. Aap direct items bhi order kar sakte hain (e.g. 2 Zinger Burger ya 1 Cheese Lover Pizza).'
        },
        {
            question: 'Delivery Location Check & Handoff Rules',
            answer: 'Cravey Crust Islamabad mein Ghauri Town aur aas paas ke 32 ilaqon mein delivery provide karta hai. Tamam coverage areas mein delivery bilkul FREE hai!'
        },
        {
            question: 'Order Taking Process (Steps 1-4)',
            answer: 'Cravey Crust par order karne ke liye item ka naam aur quantity likhein (e.g. 2 Zinger Burger ya 1 Pizza). Phir apna naam, contact number aur delivery location confirm karein.'
        },
        {
            question: 'Order Confirmation, Order ID & Kitchen Alert (Step 5)',
            answer: 'Order confirm hone ke baad aapko Order ID di jati hai (e.g. #CC-000123) aur khana 30-45 minutes mein deliver kiya jata hai.'
        },
        {
            question: 'Bot Language, Tone & Mood Judgement Rules',
            answer: 'Main Cravey Crust ka AI assistant Burger Raja hoon! Main Roman Urdu aur English dono mein aapki madad kar sakta hoon.'
        },
        {
            question: 'Human Handoff Triggers & Escalation Protocol',
            answer: 'Agar aapko kisi maslay par restaurant team se baat karni hai toh "Agent" ya "Human" likhein, hamara representative foran rabta karega.'
        },
        {
            question: 'Offers & Deals Policy',
            answer: 'Hamari special discount deals dekhne ke liye "Deals" reply karein. Hamare paas Pizza Deals, Burger Deals aur Cravey 2.0 Deals dastiyab hain!'
        },
    ];

    for (const u of updates) {
        const res = await prisma.fAQ.updateMany({
            where: { question: u.question },
            data: { answer: u.answer },
        });
        console.log(`Updated "${u.question}": ${res.count} records`);
    }

    console.log('Sanitization complete');
    process.exit(0);
}

sanitizeFaqs().catch(err => {
    console.error(err);
    process.exit(1);
});
