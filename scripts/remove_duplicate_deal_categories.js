/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   Remove Duplicate Deal Categories & MenuItems               ║
 * ║   scripts/remove_duplicate_deal_categories.js                ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Ensures deals have ONE authoritative representation:
 *   - Normal Menu: Premium Pizzas, Classic Pizzas, Drinks (MenuItems/Variants)
 *   - Deals: Deal records only (Deals table)
 */

import { getDbClient } from '../src/db/client.js';
import { getDefaultRestaurantId } from '../src/services/restaurantService.js';

async function cleanup() {
    console.log('🔍 Checking and removing duplicate deal categories from normal menu...');
    const prisma = getDbClient();
    if (!prisma) throw new Error('Database client unavailable');

    const restId = await getDefaultRestaurantId();

    const targetCategories = ['Pizza Deals', 'Burger Deals', 'Cravey 2.0 Deals'];

    const categories = await prisma.category.findMany({
        where: {
            restaurant_id: restId,
            name: { in: targetCategories },
        },
        include: { menu_items: true },
    });

    if (categories.length === 0) {
        console.log('ℹ️ No duplicate deal categories found.');
        return;
    }

    console.log(`Found ${categories.length} duplicate categories to remove:`, categories.map(c => c.name));

    for (const cat of categories) {
        const itemIds = cat.menu_items.map(i => i.id);
        
        // Delete menu variants for these items
        if (itemIds.length > 0) {
            const delVariants = await prisma.menuVariant.deleteMany({
                where: { menu_item_id: { in: itemIds } },
            });
            console.log(`Deleted ${delVariants.count} variants for category '${cat.name}'.`);

            // Delete menu items
            const delItems = await prisma.menuItem.deleteMany({
                where: { id: { in: itemIds } },
            });
            console.log(`Deleted ${delItems.count} menu items for category '${cat.name}'.`);
        }

        // Delete category
        await prisma.category.delete({
            where: { id: cat.id },
        });
        console.log(`Deleted category '${cat.name}'.`);
    }

    console.log('✅ Duplicate deal categories and items successfully removed!');
}

cleanup()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('❌ Error during cleanup:', err);
        process.exit(1);
    });
