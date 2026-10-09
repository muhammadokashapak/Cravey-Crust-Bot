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

    // ── Categories ────────────────────────────────────────────
    const categories = [
        { name: 'Burgers',     slug: 'burgers',     sort_order: 1, description: 'Juicy flame-grilled burgers' },
        { name: 'Pizzas',      slug: 'pizzas',       sort_order: 2, description: 'Hand-tossed stone-baked pizzas' },
        { name: 'Wraps',       slug: 'wraps',        sort_order: 3, description: 'Crispy wraps & rolls' },
        { name: 'Sides',       slug: 'sides',        sort_order: 4, description: 'Fries, nuggets & more' },
        { name: 'Drinks',      slug: 'drinks',       sort_order: 5, description: 'Cold beverages & shakes' },
        { name: 'Deals',       slug: 'deals',        sort_order: 6, description: 'Value meal deals' },
    ];

    const createdCategories = {};
    for (const cat of categories) {
        const c = await prisma.category.upsert({
            where: { restaurant_id_slug: { restaurant_id: restaurant.id, slug: cat.slug } },
            update: {},
            create: {
                restaurant_id: restaurant.id,
                name: cat.name,
                slug: cat.slug,
                description: cat.description,
                sort_order: cat.sort_order,
                is_active: true,
            },
        });
        createdCategories[cat.slug] = c;
        console.log(`  📂 Category: ${c.name}`);
    }

    // ── Menu Items ────────────────────────────────────────────
    const menuItems = [
        {
            category: 'burgers',
            name: 'Zinger Burger',
            slug: 'zinger-burger',
            description: 'Crispy spicy chicken fillet with lettuce and mayo',
            base_price: 599,
            spicy_level: 'MEDIUM',
            variants: [],
        },
        {
            category: 'burgers',
            name: 'Classic Beef Burger',
            slug: 'classic-beef-burger',
            description: 'Juicy beef patty with fresh vegetables and signature sauce',
            base_price: 649,
            spicy_level: 'MILD',
            variants: [],
        },
        {
            category: 'pizzas',
            name: 'Chicken Pizza',
            slug: 'chicken-pizza',
            description: 'Loaded with grilled chicken, onions, capsicum and mozzarella',
            base_price: 650,
            spicy_level: 'MILD',
            variants: [
                { name: 'Small',  price: 650,  sort_order: 1 },
                { name: 'Medium', price: 950,  sort_order: 2 },
                { name: 'Large',  price: 1350, sort_order: 3 },
            ],
        },
        {
            category: 'pizzas',
            name: 'Beef BBQ Pizza',
            slug: 'beef-bbq-pizza',
            description: 'Tender beef with BBQ sauce and extra cheese',
            base_price: 750,
            spicy_level: 'NONE',
            variants: [
                { name: 'Small',  price: 750,  sort_order: 1 },
                { name: 'Medium', price: 1100, sort_order: 2 },
                { name: 'Large',  price: 1500, sort_order: 3 },
            ],
        },
        {
            category: 'sides',
            name: 'Fries',
            slug: 'fries',
            description: 'Crispy golden fries with ketchup',
            base_price: 150,
            spicy_level: 'NONE',
            variants: [
                { name: 'Regular', price: 150, sort_order: 1 },
                { name: 'Large',   price: 220, sort_order: 2 },
            ],
        },
        {
            category: 'drinks',
            name: 'Cold Drink',
            slug: 'cold-drink',
            description: 'Chilled soft drink',
            base_price: 80,
            spicy_level: 'NONE',
            variants: [
                { name: '250ml', price: 80,  sort_order: 1 },
                { name: '500ml', price: 120, sort_order: 2 },
            ],
        },
    ];

    for (const item of menuItems) {
        const category = createdCategories[item.category];
        if (!category) continue;

        const mi = await prisma.menuItem.upsert({
            where: { restaurant_id_slug: { restaurant_id: restaurant.id, slug: item.slug } },
            update: {},
            create: {
                restaurant_id: restaurant.id,
                category_id: category.id,
                name: item.name,
                slug: item.slug,
                description: item.description,
                base_price: item.base_price,
                spicy_level: item.spicy_level,
                is_available: true,
                is_active: true,
            },
        });
        console.log(`  🍔 Menu item: ${mi.name} (Rs.${item.base_price})`);

        // Create variants
        for (const variant of item.variants) {
            await prisma.menuVariant.upsert({
                where: { id: `seed-${mi.id}-${variant.name.toLowerCase()}` },
                update: {},
                create: {
                    id: `seed-${mi.id}-${variant.name.toLowerCase()}`,
                    menu_item_id: mi.id,
                    name: variant.name,
                    price: variant.price,
                    is_available: true,
                    sort_order: variant.sort_order,
                },
            });
            console.log(`    ↳ Variant: ${variant.name} (Rs.${variant.price})`);
        }
    }

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
