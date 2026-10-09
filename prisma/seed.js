/**
 * ╔══════════════════════════════════════════╗
 * ║   Prisma Seed — prisma/seed.js           ║
 * ║   Seeds initial development data.        ║
 * ║   Run with: npm run db:seed              ║
 * ║   SAFE: uses upsert — idempotent.        ║
 * ╚══════════════════════════════════════════╝
 *
 * WARNING: Do NOT run in production unless you explicitly want
 * to reset to sample data. This is for development/staging only.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...\n');

    // ── Restaurant ────────────────────────────────────────────
    const restaurant = await prisma.restaurant.upsert({
        where: { slug: 'cravey-crust' },
        update: {},
        create: {
            name: 'Cravey Crust',
            slug: 'cravey-crust',
            phone: '+92-300-0000000',
            address: 'Lahore, Pakistan',
            currency: 'PKR',
            timezone: 'Asia/Karachi',
            opening_time: '10:00',
            closing_time: '23:00',
            min_order: 300.00,
            default_delivery_fee: 60.00,
            cod_enabled: true,
            easypaisa_enabled: true,
            easypaisa_number: '03000000000',
            account_name: 'Cravey Crust',
            is_active: true,
        },
    });
    console.log(`✅ Restaurant: ${restaurant.name} (${restaurant.id})`);

    // ── Admin User ────────────────────────────────────────────
    // NOTE: This creates a DB admin user for Phase 2 dashboard login.
    // Phase 1 dashboard still uses .env DASHBOARD_USER/DASHBOARD_PASS (HMAC).
    const password_hash = await bcrypt.hash('cravey-admin-2024', 12);

    const adminUser = await prisma.adminUser.upsert({
        where: { email: 'admin@craveycrust.com' },
        update: {},
        create: {
            restaurant_id: restaurant.id,
            username: 'admin',
            email: 'admin@craveycrust.com',
            password_hash,
            role: 'SUPER_ADMIN',
            is_active: true,
        },
    });
    console.log(`✅ Admin user: ${adminUser.username} (${adminUser.email})`);



    // ── Restaurant Settings ───────────────────────────────────
    const settings = [
        { key: 'whatsapp_greeting', value: 'Assalam o Alaikum! Cravey Crust mein khush amdeed 🍔' },
        { key: 'order_number_prefix', value: 'CC' },
        { key: 'session_timeout_minutes', value: '15' },
        { key: 'max_items_per_order', value: '20' },
    ];

    for (const setting of settings) {
        await prisma.restaurantSetting.upsert({
            where: { restaurant_id_key: { restaurant_id: restaurant.id, key: setting.key } },
            update: {},
            create: { restaurant_id: restaurant.id, ...setting },
        });
    }
    console.log(`✅ Restaurant settings: ${settings.length} seeded`);

    console.log('\n🌱 Seed complete!\n');
    console.log('═══════════════════════════════════════════════');
    console.log(`  Restaurant: ${restaurant.name}`);
    console.log(`  Restaurant ID: ${restaurant.id}`);
    console.log(`  Admin login (Phase 2): admin@craveycrust.com`);
    console.log(`  Admin password (Phase 2): cravey-admin-2024`);
    console.log('  ⚠️  Change password before production use!');
    console.log('═══════════════════════════════════════════════\n');
}

main()
    .catch((err) => {
        console.error('Seed failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
