# Cravey Crust — Enterprise Multi-Module Sync Architecture
> **Project:** `CC Bot with Sync`  
> **Target Scope:** Standardized Multi-Module Synchronization & Offline-First Caching Engine

---

## 1. Modules Categorization & Architecture Matrix

| Category | Modules / Entities | Local Storage Strategy | Sync Mechanism | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **1. Essential (Master / Lookups)** | • Products (Menu & Variants)<br>• Categories<br>• Deals & Combos<br>• Customer Directory<br>• Restaurant Settings<br>• FAQs / Knowledge Base | **IndexedDB Object Stores:**<br>`menu`, `categories`, `deals`, `customers`, `settings`, `faqs` | **Cache-First (0ms Render):**<br>Screen open hote hi local DB se instant load. Background delta poll on demand. | Yeh data bar bar change nahi hota. Har screen open hone par API calls se bachata hai. |
| **1. Essential (User Dashboard)** | • Sales Aggregate<br>• Orders & Customers Count<br>• Top items summary | **IndexedDB Object Store:**<br>`dashboard` (`key: 'stats'`) | **Periodic / Snapshot Sync:**<br>Stores latest server snapshot; updates on background sync. | Instant dashboard display without waiting for heavy SQL aggregates. |
| **1. Essential (Drafts / Offline)** | • Offline Order Drafts<br>• Customer Form Entries<br>• Pending notes | **IndexedDB Object Store:**<br>`drafts` (`is_synced: false`) | **Client Push Synchronization:**<br>`POST /api/admin/sync`<br>Pushes mutations to server, marks `is_synced: true`. | User offline ho tab bhi kaam na rukay. Network restore par auto-sync. |
| **2. Operational (Incremental)** | • Orders & Order Items<br>• Transaction & Invoice History | **IndexedDB Object Store:**<br>`orders` (`is_synced: true`) | **Delta / Timestamp Sync:**<br>`WHERE updated_at > last_sync_time`<br>Sirf modified/new orders sync hotay hain. | Past orders bar bar reload nahi hotay; 95%+ bandwidth and CPU save hota hai. |
| **2. Operational (Inventory/Stock)** | • Item Availability (`is_available`)<br>• Deal Status (`is_active`) | Synced along with `menu` and `deals` delta | **On-demand Delta Poll:**<br>Updated on toggle or manual sync. | Out-of-stock items sync dynamically. |
| **3. Prohibited (Live Data Only)** | • **Payment Gateways** (EasyPaisa status, Cash reconciliation)<br>• **Wallet / Balance** | **NO CACHE** (Bypass Local Storage) | **Direct Live Network Call Only:**<br>`fetch('/api/...', { cache: 'no-store' })` | Paison aur transactions ka stale data dangerous ho sakta hai. |
| **3. Prohibited (Security Actions)** | • **Authentication** (Login / Logout)<br>• **OTP Verification**<br>• **Password Changes** | **NO CACHE** (Bypass Local Storage) | **Strictly Direct Live Network Call:**<br>Server blocks sync on these entities. | Security credentials cached hone se attack vector banta hai. |

---

## 2. Server Implementation (`src/services/syncService.js`)

Server endpoints and incremental query handler explicitly cover every entity:

```javascript
// GET /api/admin/sync?last_sync_time=2026-10-09T...&entities=all
// Or selective: entities=menu,categories,deals,orders,customers,settings,faqs,dashboard
```

### Security Guardrail:
Agar koi client kisi security ya payment entity ko sync karne ki koshish kare, to API request foran reject ho jati hai:
```javascript
export const LIVE_ONLY_MODULES = ['auth', 'passwords', 'tokens', 'payments', 'wallet', 'otp'];
```

---

## 3. Client Storage Engine (`public/app.js`)

IndexedDB (`CraveyCrustLocalDB`) version 2 initialized with dedicated transactional object stores:
- `customers`
- `orders`
- `menu`
- `categories`
- `deals`
- `settings`
- `faqs`
- `dashboard`
- `drafts`
- `metadata`

### Global Synchronizer Function:
```javascript
window.syncAllModules(forceSync = false);
```
Top header bar mein **`⚡ Sync All`** button shamil hai jo tamam modules ko single lightweight delta call se update karta hai.

---

## 4. Verification & Automated Test Status

Tests verify kiye gaye hain:
- `tests/sync_enterprise.test.js`: **6/6 tests passing** (Master lookups, dashboard snapshot, delta orders, offline mutations push, live-only security guardrails).
- `tests/sync.test.js`: **5/5 tests passing**.
- `tests/customer_deletion.test.js`: **8/8 tests passing**.
