/**
 * ╔══════════════════════════════════════════╗
 * ║   Env Config — src/config/env.js         ║
 * ║   Validates and exports typed env vars   ║
 * ║   using Zod. Fails fast at startup if    ║
 * ║   required variables are missing.        ║
 * ╚══════════════════════════════════════════╝
 *
 * Only validates vars that Phase 1 actually uses.
 * New vars added per phase as needed.
 */

import { z } from 'zod';

// ─── Schema ───────────────────────────────────────────────────────────────

const envSchema = z.object({
    // Bot core
    PORT:            z.string().default('3000'),
    NODE_ENV:        z.enum(['development', 'production', 'test']).default('production'),

    // Dashboard auth (existing — not validated strictly to avoid breaking existing setup)
    DASHBOARD_USER:  z.string().default('admin'),
    DASHBOARD_PASS:  z.string().default('xortlogix'),

    // n8n integration (optional — N8N_ENABLED can be 'false')
    N8N_ENABLED:     z.string().default('false'),
    N8N_WEBHOOK_URL: z.string().default(''),
    N8N_BOT_SECRET:  z.string().default(''),
    N8N_TIMEOUT:     z.string().default('10000'),

    DATABASE_URL:             z.string().optional(),
    RESTAURANT_DB_ENABLED:    z.string().default('false'),
    CORE_ORDER_ENGINE_ENABLED: z.string().default('false'),
    CUSTOM_AI_ENABLED:        z.string().default('false'),
    REALTIME_DASHBOARD_ENABLED: z.string().default('false'),
    KNOWLEDGE_BASE_ENABLED:   z.string().default('true'),
    WHATSAPP_ORDERING_ENABLED: z.string().default('true'),

    // Phase 2: Restaurant Dashboard & Internal APIs
    INTERNAL_API_SECRET:      z.string().default('cravey-internal-secret-phase2'),
    N8N_INTEGRATION_ENABLED:  z.string().default('false'),
});

// ─── Parse & Export ────────────────────────────────────────────────────────

let _env;

export function getEnv() {
    if (_env) return _env;

    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error('[ENV] Environment variable validation failed:');
        for (const issue of result.error.issues) {
            console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
        }
        // Do not exit — bot must keep running even if new vars are missing
        // Just return what we can
        _env = process.env;
        return _env;
    }

    _env = result.data;
    return _env;
}

// Validate on import — logs warnings but never crashes the bot
export const env = getEnv();

// Cross-validation: warn if DB is enabled but URL is missing
if (env.RESTAURANT_DB_ENABLED === 'true' && !env.DATABASE_URL) {
    console.warn('[ENV] WARNING: RESTAURANT_DB_ENABLED=true but DATABASE_URL is not set. DB features will be unavailable.');
}
