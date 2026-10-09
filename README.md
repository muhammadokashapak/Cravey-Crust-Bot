<div align="center">

# 🍕 Cravey Crust Bot & Enterprise Ordering Platform
### Autonomous WhatsApp Ordering Engine • Multilingual AI • Offline-First Sync • Multi-Account Gateway

[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Baileys](https://img.shields.io/badge/Baileys-v6.7+-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-v5.22-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![HuggingFace Transformers](https://img.shields.io/badge/%F0%9F%A4%97_Transformers-Local_AI-FFD21E?style=for-the-badge)](https://huggingface.co/docs/transformers.js)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![n8n](https://img.shields.io/badge/n8n-Bi--directional-EA4B71?style=for-the-badge&logo=n8n&logoColor=white)](https://n8n.io/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<br/>

<p align="center">
  <b>Cravey Crust Bot</b> is an enterprise-grade, conversational food ordering microservice and multi-session WhatsApp automation platform. Engineered for real-world restaurant operations with zero Cloud API per-message costs, offline-first sync, deterministic state machine ordering, and local multilingual semantic AI.
</p>

[Key Features](#-signature-features) • [System Architecture](#-system-architecture) • [Quick Start](#-quick-start) • [Configuration](#-configuration--feature-flags) • [API Reference](#-api-endpoints) • [Testing](#-testing-suite)

---

</div>

## 📑 Table of Contents

1. [🌟 Signature Features](#-signature-features)
2. [🏗️ System Architecture](#-system-architecture)
3. [🧠 Multilingual AI & Conversational State Machine](#-multilingual-ai--conversational-state-machine)
4. [⚡ Enterprise Offline-First Sync Engine](#-enterprise-offline-first-sync-engine)
5. [🖥️ Glassmorphism Web Dashboard](#-glassmorphism-web-dashboard)
6. [📂 Project Directory Structure](#-project-directory-structure)
7. [🛠️ Technology Stack](#-technology-stack)
8. [🚀 Quick Start & Installation](#-quick-start--installation)
   - [Method 1: Docker & Docker Compose (Recommended)](#method-1-docker-compose-production)
   - [Method 2: Local Node.js Development](#method-2-local-nodejs-development)
   - [Method 3: Production VPS with PM2 & Nginx](#method-3-production-vps-with-pm2--nginx)
9. [⚙️ Configuration & Feature Flags](#-configuration--feature-flags)
10. [🗄️ Database Management (Prisma)](#-database-management-prisma)
11. [📡 API Endpoints](#-api-endpoints)
12. [🧪 Testing Suite](#-testing-suite)
13. [🛡️ Security & Privacy Guardrails](#-security--privacy-guardrails)
14. [📄 License & Authors](#-license--authors)

---

## 🌟 Signature Features

### 🍕 Conversational WhatsApp Pizza Ordering
- **Automated End-to-End Checkout:** Full conversational ordering flow from menu discovery, dynamic cart management, crust/size variant selection, deals, customer delivery address intake, to order confirmation.
- **Deterministic State Machine:** Robust multi-turn session tracking (`START` ➔ `BROWSING_MENU` ➔ `BUILDING_CART` ➔ `WAITING_NAME` ➔ `WAITING_CONTACT` ➔ `WAITING_LOCATION` ➔ `WAITING_PAYMENT` ➔ `WAITING_ORDER_CONFIRMATION` ➔ `ORDER_CONFIRMED`).
- **Sequential Human-Friendly Order IDs:** Generates formatted, trackable order numbers (e.g., `#CC-000101`).
- **Live Order Tracking & Self-Cancellation:** Customers can query order progress in real-time or request order cancellation before preparation starts.
- **Privacy & Data Rights:** Built-in customer data deletion flow (`delete my data`, `forget me`) complying with modern consumer privacy standards.

### 🧠 Multilingual Natural Language & Local AI
- **Dual NLP Engine:**
  1. **Deterministic Fast Regex Classifier:** High-speed, zero-latency detection for standard commands, greetings, numbers, and stage-specific intents.
  2. **Local Neural Semantic Embeddings:** Runs `@xenova/transformers` locally inside Node.js for zero cloud cost and low latency. Semantic cosine similarity understands customer intents in **English, Roman Urdu, and Urdu idioms** (*"menu dikhao"*, *"koi deal hegi ae"*, *"rate list bhejo"*, *"order kahan hai"*).
- **OpenAI Fallback:** Configurable OpenAI model fallback for open-ended conversational inquiries.
- **4-Tier Business Knowledge Resolver:**
  1. *Live Restaurant Settings* (opening/closing hours, branch address, helpline).
  2. *Live Structured Database* (menu items, variants, dynamic deals, delivery zones, order statuses).
  3. *FAQ Knowledge Base* (keyword & semantic search for policies, halal certification, delivery radius).
  4. *Safe Graceful Fallback* with human agent escalation handoff.

### 📍 Intelligent Location & Address Resolution
- **GPS Location Pins:** Instant detection and parsing of native WhatsApp location pins and live location coordinates.
- **Google Maps Link Parser:** Extracts coordinates and addresses from dropped Google Maps URLs in text messages.
- **Geofenced Delivery Validation:** Automatically verifies delivery eligibility and calculates tiered delivery fees based on restaurant delivery zones.

### 🏢 Enterprise Multi-Module Sync Engine
- **Offline-First Dashboard (0ms Render):** Frontend loads immediately from client-side **IndexedDB** (`CraveyCrustLocalDB` v2) cache.
- **Incremental Delta Synchronization:** Synchronizes only records modified since `last_sync_time`, cutting bandwidth and database load by 95%+.
- **Module Separation Matrix:**
  - *Master Lookups (Cache-First):* Menu, Categories, Deals, Settings, FAQs, Customers.
  - *Operational (Incremental Delta):* Orders, Order Items, Status History.
  - *Offline Drafts (Client Push):* Pending orders and updates queued locally when offline.
  - *Live-Only Protected Entities:* Direct live network calls only for Payments, Balances, and Authentication (strictly non-cached).

### 🖥️ Modern Glassmorphism Web Dashboard & Multi-Account Manager
- **No QR Required:** Connect WhatsApp accounts effortlessly with an **8-Digit Pairing Code** directly to the phone.
- **Multi-Account WhatsApp Engine:** Run and switch between multiple active WhatsApp numbers simultaneously on a single instance.
- **Integrated POS & Management Suite:**
  - Live interactive web terminal streaming real-time logs and socket events.
  - Comprehensive Order Management (kitchen status changes, live feeds).
  - Menu, Variant, Category, and Deal builder.
  - Dynamic FAQ Knowledge Base editor.
  - One-click `⚡ Sync All` header controller.

### 🔗 n8n Bi-Directional Automation Gateway
- **Inbound Webhook:** Forwards customer messages, locations, and media payloads to external n8n workflows (`N8N_WEBHOOK_URL`).
- **Outbound Dispatcher (`/api/n8n/send-message`):** Allows n8n to send AI-generated responses, receipts, and order updates back to WhatsApp.
- **Loop Protection & Secret Auth:** Cryptographic `X-Bot-Secret` validation and stealth isolation prevents infinite bot message loops.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph WhatsAppClient["WhatsApp Network"]
        WAUser["Customer / Staff (WhatsApp App)"]
    end

    subgraph BaileysGateway["Baileys Multi-Session Gateway (bot.js)"]
        SocketEngine["Baileys WebSocket Engine"]
        SessionMgr["Multi-Account Session Manager"]
        Pairing["Pairing Code & QR Auth Engine"]
    end

    subgraph OrchestrationLayer["Orchestrator & Intelligence"]
        Orchestrator["WhatsApp Order Orchestrator"]
        StateEngine["Session State Machine (START to CONFIRMED)"]
        IntentParser["Deterministic Fast NLP"]
        AiClassifier["Local @xenova Neural Classifier"]
        KnowledgeResolver["4-Tier Business Knowledge Resolver"]
    end

    subgraph BackendServices["Core Application Services"]
        MenuSvc["Menu & Deals Service"]
        CartSvc["Cart & Pricing Service"]
        OrderSvc["Order Service & Sequencer"]
        DeliverySvc["Delivery Geofence Service"]
        SyncSvc["Enterprise Delta Sync Service"]
    end

    subgraph Persistence["Storage & Database"]
        PG[("PostgreSQL 16 (Prisma ORM)")]
        Redis[("Redis (Optional Cache)")]
        LocalAuth[("auth/sessions/ (Keys & Ratchets)")]
    end

    subgraph WebDashboard["Frontend Web POS Dashboard"]
        UI["Glassmorphism UI (HTML5 / Vanilla CSS)"]
        IDB[("IndexedDB Local Cache (0ms Render)")]
    end

    subgraph ExternalGateway["External Integrations"]
        N8N["n8n Workflows (Bi-Directional)"]
        OpenAI["OpenAI API (Optional)"]
    end

    WAUser <-->|Encrypted Signal Protocol| SocketEngine
    SocketEngine --> SessionMgr
    SessionMgr --> LocalAuth
    SessionMgr --> Orchestrator

    Orchestrator --> StateEngine
    Orchestrator --> IntentParser
    Orchestrator --> AiClassifier
    Orchestrator --> KnowledgeResolver

    IntentParser & AiClassifier -.-> OpenAI
    KnowledgeResolver --> BackendServices

    BackendServices --> PG
    BackendServices --> Redis

    UI <--> IDB
    UI <-->|REST API + Delta Sync| SyncSvc
    SocketEngine <-->|Webhook / REST| N8N
```

---

## 🧠 Multilingual AI & Conversational State Machine

### 1. Conversational Lifecycle (Session Stages)

```mermaid
stateDiagram-v2
    [*] --> START
    START --> BROWSING_MENU: "menu" / "deals"
    START --> BUILDING_CART: Select items / pizzas
    BROWSING_MENU --> BUILDING_CART: Add item with size/crust
    BUILDING_CART --> WAITING_NAME: "checkout" / "order now"
    WAITING_NAME --> WAITING_CONTACT: Enter customer name
    WAITING_CONTACT --> WAITING_LOCATION: Enter or choose phone number
    WAITING_LOCATION --> WAITING_PAYMENT: Drop location pin / address
    WAITING_PAYMENT --> WAITING_ORDER_CONFIRMATION: Choose COD or EasyPaisa
    WAITING_ORDER_CONFIRMATION --> ORDER_CONFIRMED: "yes" / "confirm"
    ORDER_CONFIRMED --> [*]
    
    START --> WAITING_CANCEL_ORDER_ID: "cancel order"
    WAITING_CANCEL_ORDER_ID --> WAITING_CANCEL_CONFIRMATION: Provide #CC-XXXXXX
    WAITING_CANCEL_CONFIRMATION --> CANCELLED: "confirm cancellation"
    CANCELLED --> [*]
```

### 2. Supported Language Examples

| Intent | English Input | Roman Urdu / Local Dialects | Bot Response Action |
| :--- | :--- | :--- | :--- |
| **GREETING** | `"Hi"`, `"Hello"`, `"Hey"` | `"Assalam o Alaikum"`, `"AOA"`, `"Salam"`, `"Kese ho"` | Greets with personalized greeting & interactive action menu |
| **SHOW_MENU** | `"Show menu"`, `"View food list"` | `"Menu dikhao"`, `"Menu bhejo"`, `"Rate list"`, `"Khana kya hai"` | Renders formatted categorized menu with prices & item IDs |
| **SHOW_DEALS** | `"Show deals"`, `"Any discount?"` | `"Koi deal hai"`, `"Special offers"`, `"Family pizza deal"`, `"Offers dikhao"` | Returns active combos, savings, and deal item specs |
| **ADD_TO_CART**| `"1 Large Fajita"`, `"Add deal 2"` | `"1 chicken tikka large kar do"`, `"Deal 1 add karo"` | Updates cart, validates availability, and recalculates totals |
| **VIEW_CART**  | `"My cart"`, `"View basket"` | `"Mera cart"`, `"Cart dikhao"`, `"Cart batao"` | Displays itemized subtotal, discount, delivery fee & total |
| **LOCATION**   | `[WhatsApp Location Pin]` | `"Gulberg III, near Liberty Market, Lahore"`, `[Google Maps URL]` | Reverse matches delivery zone and quotes delivery fee |
| **ORDER_STATUS**| `"Track order"`, `"Status"` | `"Mera order kahan hai"`, `"Status CC-000101"` | Queries live kitchen/rider status from database |
| **CANCEL_ORDER**| `"Cancel my order"` | `"Order cancel karna hai"`, `"Cancel order"` | Runs cancellation safety rules and records reason |
| **DATA_PRIVACY**| `"Delete my data"`, `"Forget me"` | `"Mera data delete kar do"`, `"Mera record hata do"` | Anonymizes and purges customer profile and session data |

---

## ⚡ Enterprise Offline-First Sync Engine

The Cravey Crust platform utilizes a **Cache-First + Incremental Delta Synchronization** engine designed for continuous operations during unreliable connectivity:

```text
┌────────────────────────────────────────────────────────┐
│                   Web POS Dashboard                    │
│   (IndexedDB CraveyCrustLocalDB: 10 Object Stores)    │
└───────────────────────▲────────────────────────────────┘
                        │ 0ms Instant Local Render
                        │ Incremental Delta Poll (GET /api/admin/sync)
┌───────────────────────▼────────────────────────────────┐
│             Sync Service (src/services/syncService.js) │
│       WHERE updated_at > last_sync_time                │
└───────────────────────▲────────────────────────────────┘
                        │
┌───────────────────────▼────────────────────────────────┐
│               PostgreSQL Enterprise Database           │
└────────────────────────────────────────────────────────┘
```

### Sync Strategy by Module Category

- **Lookup Master Data (Cache-First):** `menu`, `categories`, `deals`, `customers`, `settings`, `faqs`. Rendered in **0ms** from IndexedDB upon opening.
- **Operational Data (Delta Timestamp):** `orders`. Only records modified after `last_sync_time` are sent down the wire.
- **Offline Drafts (Client Push):** `drafts`. Form modifications and local drafts are saved with `is_synced: false` and pushed upstream automatically when network connectivity is detected.
- **Strictly Live Modules (Zero-Cache Guardrail):** Real-time payments, EasyPaisa reconciliations, session credentials, and password authentication strictly bypass local storage for security.

---

## 🖥️ Glassmorphism Web Dashboard

The built-in web management portal located at `public/` is fully responsive across mobile, tablet, and desktop:

- **🔐 Secure Authentication:** Protected by session tokens and role-based permissions (`SUPER_ADMIN`, `ADMIN`, `STAFF`).
- **📱 WhatsApp Account Switcher:** Toggle between multiple connected Baileys WhatsApp sessions seamlessly.
- **🔑 Instant Pairing Code:** Connect new phone numbers directly in your browser without requiring a camera/QR scan.
- **📊 Real-Time Operations:** Live order monitor, status stepper (Pending ➔ Confirmed ➔ Preparing ➔ Ready ➔ Out for Delivery ➔ Delivered), customer history, and delivery zone geofencing.
- **⚡ One-Click Sync All:** Top-bar sync controller with connection status indicator and auto-reconnect logic.

---

## 📂 Project Directory Structure

```text
Cravey-Crust-Bot/
├── bot.js                                # Main Express server & Baileys session coordinator
├── Dockerfile                            # Production-ready multi-stage container build
├── docker-compose.yml                    # Multi-container stack (App + PostgreSQL + Redis)
├── package.json                          # Scripts & dependencies
├── .env.example                          # Environment variables template
│
├── prisma/
│   ├── schema.prisma                     # Complete PostgreSQL Prisma schema (20+ models)
│   ├── seed.js                           # Idempotent development & initial database seed
│   └── migrations/                       # Database migration histories
│
├── src/
│   ├── config/
│   │   ├── flags.js                      # Phased rollout feature flags
│   │   └── database.js                   # Database connection parameters
│   ├── db/
│   │   └── client.js                     # Prisma client singleton
│   ├── middleware/
│   │   └── auth.js                       # JWT, session & internal secret auth guards
│   ├── services/
│   │   ├── aiIntentClassifier.js         # Multilingual @xenova/transformers local model
│   │   ├── authService.js                # Admin user authentication & password hashing
│   │   ├── businessKnowledgeResolver.js  # 4-tier business data resolution engine
│   │   ├── cartService.js                # Active cart operations, items & modifications
│   │   ├── customerService.js            # Customer profiles, history & GDPR deletion
│   │   ├── deliveryService.js            # Geofencing, zones & delivery fees
│   │   ├── intentParser.js               # Deterministic regex & multilingual intent engine
│   │   ├── knowledgeService.js           # FAQ database search & indexing
│   │   ├── menuService.js                # Menu categories, items, variants & deals
│   │   ├── orderNumberService.js         # Sequential human-friendly order numbering (#CC-XXXXXX)
│   │   ├── orderService.js               # Order placement, status tracking & cancellation
│   │   ├── pricingService.js             # Real-time subtotal, discounts & tax calculation
│   │   ├── realtimeService.js            # Real-time events & dashboard feeds
│   │   ├── restaurantService.js          # Restaurant configuration & business hours
│   │   ├── sessionService.js             # Conversational state machine & session TTL
│   │   ├── syncService.js                # Enterprise delta sync & audit timestamp engine
│   │   ├── whatsappNotificationService.js# Customer & admin WhatsApp status dispatches
│   │   └── whatsappOrderOrchestrator.js  # Main conversational ordering orchestrator
│   ├── utils/
│   │   └── logger.js                     # Structured JSON/Pino logging
│   └── validators/                       # Input validation schemas (Zod)
│
├── routes/
│   ├── admin/                            # Web POS Admin API
│   │   ├── categories.js
│   │   ├── customers.js
│   │   ├── dashboard.js
│   │   ├── deals.js
│   │   ├── dealItems.js
│   │   ├── deliveryAreas.js
│   │   ├── faqCategories.js
│   │   ├── faqs.js
│   │   ├── menu.js
│   │   ├── orders.js
│   │   ├── promotions.js
│   │   ├── settings.js
│   │   ├── sync.js                       # Enterprise delta sync endpoint
│   │   ├── upload.js                     # Media & asset uploads
│   │   └── variants.js
│   ├── internal/                         # Microservice internal endpoints
│   │   ├── cart.js
│   │   ├── deals.js
│   │   ├── delivery.js
│   │   ├── faqs.js
│   │   ├── menu.js
│   │   ├── orders.js
│   │   ├── pricing.js
│   │   └── promotions.js
│   ├── health.js                         # System & database health probe
│   └── n8n.js                            # n8n bi-directional webhook router
│
├── public/                               # Modern Glassmorphism POS Dashboard
│   ├── index.html                        # POS UI layout & views
│   ├── style.css                         # Sleek dark-mode aesthetic styling
│   └── app.js                            # Client-side IndexedDB & sync engine
│
├── utils/
│   ├── location.js                       # GPS pin parser & Google Maps URL extractor
│   ├── media.js                          # Sharp & FFmpeg media handling
│   ├── messageStore.js                   # Ephemeral message caching
│   ├── n8nBridge.js                      # n8n webhook dispatcher
│   └── senderIdentity.js                 # WhatsApp JID normalization & phone extraction
│
├── commands/                             # Modular owner commands (.menu, .ping, etc.)
│   └── menu.js
├── tests/                                # Native Node.js test suite (19 test suites)
└── auth/                                 # Persistent Baileys cryptographic sessions
    └── sessions/
```

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Runtime** | Node.js (v20+ LTS) | Modern ECMAScript Modules (`type: "module"`) |
| **WhatsApp Engine** | `@whiskeysockets/baileys` (v6.7+) | Direct WebSocket connection to WhatsApp Web |
| **Web Server** | Express.js (v5) | High-performance REST API & static dashboard host |
| **Database & ORM** | PostgreSQL 16 + Prisma ORM (v5.22) | Strongly-typed schemas, migrations, relations |
| **Local AI Embeddings** | `@xenova/transformers` (v2.17) | Neural multilingual intent classifier running in-process |
| **Client Storage** | IndexedDB (`CraveyCrustLocalDB`) | Offline-first, zero-latency local database |
| **Image & Media** | Sharp + Fluent-FFmpeg | Dynamic sticker generation and media compression |
| **Containerization** | Docker & Docker Compose | Isolated multi-container deployment |
| **External Automation**| n8n | Bi-directional low-code workflow integration |

---

## 🚀 Quick Start & Installation

### Method 1: Docker Compose (Production - Recommended)

The easiest and most reliable way to launch the entire stack (Bot + PostgreSQL + Redis):

```bash
# 1. Clone the repository
git clone https://github.com/muhammadokashapak/Cravey-Crust-Bot.git
cd Cravey-Crust-Bot

# 2. Copy and configure your environment variables
cp .env.example .env
nano .env

# 3. Start all services in detached mode
docker compose up -d --build

# 4. Run database migrations inside the container
docker compose exec cravey-bot npx prisma migrate deploy

# 5. (Optional) Seed initial restaurant menu and FAQs
docker compose exec cravey-bot npm run db:seed
```

Open your browser at **`http://localhost:3000`** to access the Web POS Dashboard!

---

### Method 2: Local Node.js Development

#### Prerequisites:
- **Node.js** >= 20.0.0
- **PostgreSQL** running locally
- **FFmpeg** installed on your system path (optional, for stickers/audio)

```bash
# 1. Install dependencies
npm install

# 2. Setup your .env file
cp .env.example .env

# Update DATABASE_URL in .env to point to your local PostgreSQL instance:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/cravey_crust"

# 3. Enable database & ordering feature flags in .env:
# RESTAURANT_DB_ENABLED=true
# CORE_ORDER_ENGINE_ENABLED=true
# WHATSAPP_ORDERING_ENABLED=true
# KNOWLEDGE_BASE_ENABLED=true

# 4. Generate Prisma Client & apply migrations
npm run db:generate
npm run db:migrate

# 5. Seed sample restaurant data
npm run db:seed

# 6. Start the development server
npm run dev
```

---

### Method 3: Production VPS with PM2 & Nginx

```bash
# Install PM2 globally
npm install -g pm2

# Build / Generate Prisma client
npx prisma generate
npx prisma migrate deploy

# Start bot process under PM2
pm2 start bot.js --name "cravey-crust-bot" --time

# Save PM2 process list to run on system restart
pm2 save
pm2 startup
```

#### Sample Nginx Reverse Proxy Configuration:
```nginx
server {
    listen 80;
    server_name bot.yourrestaurant.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## ⚙️ Configuration & Feature Flags

Cravey Crust utilizes safety feature flags (`src/config/flags.js`) that allow gradual feature rollouts:

```ini
# ─── Bot Core ─────────────────────────────────────────────────────────────
PORT=3000
PREFIX=.
OWNER_NUMBER=923001234567

# ─── Dashboard Authentication ─────────────────────────────────────────────
DASHBOARD_USER=admin
DASHBOARD_PASS=your-secure-password
AUTH_SECRET=your-random-32-byte-hex-string

# ─── Database ─────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://cravey:yourpassword@localhost:5432/cravey_crust

# ─── Enterprise Feature Flags ─────────────────────────────────────────────
# Connects Prisma client to PostgreSQL
RESTAURANT_DB_ENABLED=true

# Routes WhatsApp orders into PostgreSQL
CORE_ORDER_ENGINE_ENABLED=true

# Activates conversational ordering in private WhatsApp chats
WHATSAPP_ORDERING_ENABLED=true

# Enables FAQ knowledge base queries & AI resolution
KNOWLEDGE_BASE_ENABLED=true

# Enables real-time order push events to the dashboard
REALTIME_DASHBOARD_ENABLED=true

# ─── Internal Microservice API Secret ─────────────────────────────────────
INTERNAL_API_SECRET=your-internal-api-secret

# ─── n8n Automation Bridge ────────────────────────────────────────────────
N8N_ENABLED=false
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/whatsapp-incoming
N8N_BOT_SECRET=your-n8n-bot-secret
```

---

## 🗄️ Database Management (Prisma)

The project includes pre-configured npm scripts for managing the PostgreSQL database:

```bash
# Generate the Prisma client
npm run db:generate

# Run migrations in development (creates new migration files)
npm run db:migrate

# Apply migrations in production
npm run db:deploy

# Open interactive Prisma Studio in your browser
npm run db:studio

# Run database seeder (upserts default restaurant, admin & menu)
npm run db:seed

# Reset database (WARNING: drops all tables and re-seeds)
npm run db:reset
```

---

## 📡 API Endpoints

### 1. Health & Status
- `GET /health` — Returns system uptime, feature flags, memory usage, and connected WhatsApp sessions.

### 2. Admin Management (`/api/admin/*`)
*Requires Admin Bearer Token*
- `GET /api/admin/dashboard/stats` — Real-time revenue, order counts, active customers.
- `GET /api/admin/orders` — Filter orders by status, date, or customer.
- `PATCH /api/admin/orders/:id/status` — Kitchen status progression.
- `GET /api/admin/menu` — Full menu catalog with categories and variants.
- `POST /api/admin/menu` — Create menu item.
- `GET /api/admin/deals` — List deals and combo packages.
- `GET /api/admin/customers` — Customer directory with order metrics.
- `DELETE /api/admin/customers/:id` — Privacy-compliant customer deletion.
- `GET /api/admin/delivery-areas` — Geofenced zones and fee tiers.
- `GET /api/admin/faqs` — Knowledge base question/answer entries.
- `GET /api/admin/sync` — **Enterprise Delta Sync** (`?last_sync_time=...&entities=all`).

### 3. Internal Microservices (`/api/internal/*`)
*Protected by `X-Internal-Secret` header*
- `GET /api/internal/menu` — Optimized menu payload for bot lookup.
- `GET /api/internal/cart/:sessionId` — Retrieve current active cart.
- `POST /api/internal/cart/item` — Add item to cart.
- `POST /api/internal/orders` — Create new confirmed order.
- `POST /api/internal/pricing/calculate` — Server-side authoritative pricing verification.

### 4. n8n Integration Gateway
- `POST /api/n8n/send-message` — Dispatch messages, receipts, or interactive prompts to any WhatsApp JID from n8n.

---

## 🧪 Testing Suite

Cravey Crust includes a comprehensive test suite built on Node.js's native test runner (`node:test`):

```bash
# Run all test suites
npm test

# Run feature flag verification tests
npm run test:flags

# Run environment validation tests
npm run test:env

# Run Prisma schema integrity tests
npm run test:schema

# Run database integration tests
npm run test:db

# Run FAQ and Knowledge Base tests
npm run test:faq

# Run conversational orchestrator & intent tests
node --test tests/phase5_orchestrator.test.js
node --test tests/phase5_intent.test.js
node --test tests/sync_enterprise.test.js
```

---

## 🛡️ Security & Privacy Guardrails

- **Zero Cloud Leakage:** WhatsApp cryptographic session keys remain stored on your host machine inside `auth/sessions/` with strict file permissions.
- **Stealth Owner Mode:** Operational command responses (`.menu`, `.ping`, errors) are routed exclusively to the verified owner's private chat.
- **Idempotency Guard:** `ProcessedMessage` database tracking prevents double-charging and duplicate order placement during WhatsApp connection retries.
- **Financial Data Isolation:** Payment transactions and authentication tokens are strictly barred from offline client caching.
- **Customer Privacy Rights:** Fully functional customer deletion triggers purge customer records, addresses, and chat sessions upon request.

---

## 📄 License & Authors

Distributed under the **MIT License**.

Developed with ❤️ for **Cravey Crust**. Designed for high-performance hospitality automation, flawless customer experiences, and continuous reliability.
