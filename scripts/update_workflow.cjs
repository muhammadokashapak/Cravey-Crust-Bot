const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'n8n.json');
const workflow = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// 1. Prepare Session node
const prepNode = workflow.nodes.find(n => n.name === 'Prepare Session');
if (prepNode && prepNode.parameters && prepNode.parameters.assignments) {
  const assigns = prepNode.parameters.assignments.assignments;
  const phoneAssign = assigns.find(a => a.name === 'whatsappPhone');
  if (phoneAssign) {
    phoneAssign.value = "={{ (() => { const p = $json.body?.whatsappPhone || $json.body?.phone || ''; if (p && String(p).trim().length >= 10) return String(p).trim(); const raw = String($json.body?.senderJid || $json.body?.chatId || '').replace(/@.*$/, '').replace(/[^0-9]/g, ''); if (raw.startsWith('92') && raw.length === 12) return '0' + raw.slice(2); if (raw.length >= 10) return raw; return ''; })() }}";
  }
  const verifiedAssign = assigns.find(a => a.name === 'phoneVerified');
  if (verifiedAssign) {
    verifiedAssign.value = "={{ Boolean($json.body?.phoneVerified === true || $json.body?.whatsappPhone || $json.body?.phone || $json.body?.senderJid || $json.body?.chatId) }}";
  }
}

// 2. Check Cache & Classify Intent
const cacheNode = workflow.nodes.find(n => n.name === 'Check Cache & Classify Intent');
if (cacheNode && cacheNode.parameters) {
  cacheNode.parameters.jsCode = `const staticData = $getWorkflowStaticData('global');
if (!staticData.cache) {
  staticData.cache = {
    deals: null, categories: null, menuItems: null,
    faqsText: '', storeInfoText: '',
    dealsText: '', categoriesText: '', menuCatalogText: '',
    catalogHash: '', syncEpoch: 1, updatedAt: 0,
    chitchatReply: "Alhamdulillah main bilkul theek hoon! Main Cravey Crust ka ordering assistant Burger Raja hoon. Aaj aap kya khana pasand karenge? Hamara menu dekhne ke liye 'menu' ya 'deals' likhein!",
    nonOrderReply: "Maazrat! Main Cravey Crust ka food ordering Burger Raja hoon aur sirf khane ke orders, menu aur deals mein aapki madad kar sakta hoon. Aaj aap kya order karna chahenge? 'Menu' ya 'Deals' likh kar hamari list check karein!"
  };
}
if (!staticData.sessions) staticData.sessions = {};

const secret = 'my-test-secret-123';
const baseUrl = 'https://bot.craveycrust.com/api/internal';

const body = $json.body || {};
const isSyncWebhook = Boolean($json.isSyncEvent || body.type === 'sync' || body.event === 'sync' || body.action === 'sync' || body.sync === true);
const raw = String($json.message || '').trim().toLowerCase();
const clean = raw.replace(/[^\\w\\s\\u0600-\\u06FF]/g, ' ').replace(/\\s+/g, ' ').trim();
const wordCount = clean ? clean.split(' ').length : 0;
const has = (re) => re.test(clean);
const any = (arr) => arr.some(k => clean.includes(k));

const fetchJson = async (url) => {
  try {
    return await this.helpers.httpRequest({ method: 'GET', url, headers: { 'X-Internal-API-Secret': secret }, json: true });
  } catch (err) { return null; }
};

// Refresh cache every 5 seconds OR on explicit sync event so any admin panel change propagates immediately
const cacheAge = Date.now() - (staticData.cache.updatedAt || 0);
if (isSyncWebhook || cacheAge > 5000 || !staticData.cache.menuCatalogText || !staticData.cache.dealsText) {
  try {
    const [dealsRes, catsRes, menuRes, restRes, faqsRes] = await Promise.all([
      fetchJson(baseUrl + '/deals?limit=100'),
      fetchJson(baseUrl + '/menu/categories?limit=100'),
      fetchJson(baseUrl + '/menu/search?q=&limit=200'),
      fetchJson(baseUrl + '/restaurant'),
      fetchJson(baseUrl + '/faqs/search?q=a&limit=50')
    ]);

    // ── Deals with strict separate categorization (Burger vs Pizza vs Combos, NO EMOJIS)
    const dealsArr = dealsRes && (dealsRes.data && (dealsRes.data.deals || dealsRes.data.items) || dealsRes.deals || dealsRes.data) || [];
    const dealsArrFinal = Array.isArray(dealsArr) ? dealsArr : [];
    if (dealsArrFinal.length > 0) {
      const activeDeals = dealsArrFinal.filter(d => d && d.isActive !== false && d.active !== false && d.is_active !== false);
      staticData.cache.deals = activeDeals;

      const classifyDeal = (d) => {
        if (d.category === 'Burger Deals') return 'BURGER';
        if (d.category === 'Pizza Deals') return 'PIZZA';
        const itemsText = Array.isArray(d.items) ? d.items.map(it => (it.quantity || 1) + 'x ' + (it.itemName || it.name || '')).join(' ') : '';
        const text = (String(d.name || '') + ' ' + String(d.description || '') + ' ' + itemsText).toLowerCase();
        const isBurger = /\\b(burger|zinger|zeggy)\\b/i.test(text);
        const isPizza = /\\b(pizza)\\b/i.test(text);
        if (isBurger && !isPizza) return 'BURGER';
        if (isPizza && !isBurger) return 'PIZZA';
        return 'COMBO';
      };

      const formatAgentDeal = (d, i) => {
        const items = Array.isArray(d.items) && d.items.length > 0 ? d.items.map(it => (it.quantity || 1) + 'x ' + (it.itemName || it.name || 'Item')).join(', ') : '';
        const desc = d.description ? ' (' + d.description + ')' : (items ? ' (' + items + ')' : '');
        return (i + 1) + '. ' + d.name + ' - Rs. ' + (d.dealPrice || d.price || '') + desc + ' [dealId:' + (d.id || '') + ']';
      };

      const bDeals = activeDeals.filter(d => classifyDeal(d) === 'BURGER');
      const pDeals = activeDeals.filter(d => classifyDeal(d) === 'PIZZA');
      const cDeals = activeDeals.filter(d => classifyDeal(d) === 'COMBO');

      staticData.cache.agentDealsCatalog = [
        '=== BURGER DEALS ===',
        bDeals.length > 0 ? bDeals.map((d, i) => formatAgentDeal(d, i)).join('\\n') : 'None',
        '',
        '=== PIZZA DEALS ===',
        pDeals.length > 0 ? pDeals.map((d, i) => formatAgentDeal(d, i)).join('\\n') : 'None',
        '',
        '=== SPECIAL / COMBO DEALS ===',
        cDeals.length > 0 ? cDeals.map((d, i) => formatAgentDeal(d, i)).join('\\n') : 'None'
      ].join('\\n');

      staticData.cache.dealsText = staticData.cache.agentDealsCatalog;
    }

    // ── Categories
    const catsArr = catsRes && (catsRes.data && (catsRes.data.categories || catsRes.data) || catsRes.categories || catsRes.data) || [];
    const catsArrFinal = Array.isArray(catsArr) ? catsArr : [];
    if (catsArrFinal.length > 0) {
      staticData.cache.categories = catsArrFinal.filter(c => c && c.isActive !== false && c.is_active !== false);
      staticData.cache.categoriesText = staticData.cache.categories.map((c, i) => (i + 1) + '. ' + c.name).join('\\n');
    }

    // ── Menu Catalog (Full items list with descriptions & variants)
    const menuArr = menuRes && (menuRes.data && (menuRes.data.items || menuRes.data.menu || menuRes.data) || menuRes.items || menuRes.data) || [];
    const menuArrFinal = Array.isArray(menuArr) ? menuArr : [];
    if (menuArrFinal.length > 0) {
      const activeItems = menuArrFinal.filter(m => m && m.isAvailable !== false && m.isActive !== false && m.is_available !== false);
      staticData.cache.menuItems = activeItems;
      staticData.cache.menuCatalogText = activeItems.map(m => {
        const cat = m.category && (m.category.name || m.category) ? (m.category.name || m.category) : (m.categoryName || 'General');
        const basePrice = m.price != null ? m.price : (m.basePrice != null ? m.basePrice : (m.base_price != null ? m.base_price : ''));
        const desc = m.description ? ' (' + String(m.description).trim() + ')' : '';
        const activeVariants = Array.isArray(m.variants) ? m.variants.filter(v => v && v.isAvailable !== false && v.isActive !== false && v.is_available !== false) : [];
        const variants = activeVariants.length > 0
          ? ' | Variants: ' + activeVariants.map(v => v.name + ': Rs.' + v.price + ' [variantId:' + (v.id || '') + ']').join(', ')
          : '';
        return '- ' + m.name + desc + ' [Category: ' + cat + '] - Base Price: Rs.' + basePrice + variants + ' [menuItemId:' + (m.id || '') + ']';
      }).join('\\n');
    }

    // ── Store Info & FAQs
    const restData = restRes && ((restRes.data && (restRes.data.restaurant || restRes.data)) || restRes) || {};
    if (restData && (restData.name || restData.address || restData.openingTime || restData.opening_time)) {
      const openTime = restData.openingTime || restData.opening_time || '';
      const closeTime = restData.closingTime || restData.closing_time || '';
      const addr = restData.address || restData.addressLine1 || '';
      staticData.cache.storeInfoText = [
        restData.name ? 'Restaurant: ' + restData.name : '',
        addr ? 'Address: ' + addr : '',
        (openTime || closeTime) ? 'Timings: ' + openTime + ' - ' + closeTime : '',
        restData.phone ? 'Phone: ' + restData.phone : '',
        restData.minOrder ? 'Min Order: Rs.' + restData.minOrder : '',
      ].filter(Boolean).join('\\n');
    }
    const faqsArr2 = faqsRes && (faqsRes.data && (faqsRes.data.faqs || faqsRes.data.items || faqsRes.data) || faqsRes.faqs || (Array.isArray(faqsRes) ? faqsRes : [])) || [];
    if (Array.isArray(faqsArr2) && faqsArr2.length > 0) {
      staticData.cache.faqsText = faqsArr2
        .filter(f => f && f.is_active !== false && f.isActive !== false)
        .map(f => 'Q: ' + f.question + '\\nA: ' + f.answer).join('\\n---\\n');
    }

    // ── Bump syncEpoch when catalog or categories change or on explicit Sync All
    const catHashStr = (staticData.cache.categories || []).map(c => c.id + ':' + c.name).join('|');
    const newHash = catHashStr + '::' + String((staticData.cache.menuCatalogText || '').length) + '::' + String((staticData.cache.dealsText || '').length);
    if (isSyncWebhook || (staticData.cache.catalogHash && staticData.cache.catalogHash !== newHash)) {
      staticData.cache.syncEpoch = (staticData.cache.syncEpoch || 1) + 1;
    }
    staticData.cache.catalogHash = newHash;
    staticData.cache.updatedAt = Date.now();
  } catch (e) { /* non-critical */ }
}

if (isSyncWebhook) {
  return Object.assign({}, $json, { route: 'sync_done', output: 'Cache synced and memory refreshed', confirmIntent: false });
}

const sessionKey = String($json.sessionKey || $json.chatId || 'default');
const sessionState = staticData.sessions[sessionKey] || {};

let route = 'agent';
let output = '';

// ── Handover Detection
const rejectBot = /\\b(bot se|bot k sath|robot|bot nahi|bot se nahi|bot se bat nahi|bot se baat nahi)\\b/i.test(clean);
const wantHuman = /\\b(agent se|human se|bande se|representative se|manager se)\\b/i.test(clean);
const isHandoverExact = ['agent', 'human', 'representative', 'staff', 'manager', 'help', 'madad'].includes(clean);
const isHandoverKeyword = has(/\\b(agent chahiye|human chahiye|representative chahiye|banda chahiye|insan chahiye|call agent|talk to human|talk to agent|agent se baat|human se baat|bande se baat|call me|rabta karo|rabta karwao|shikayat|complaint)\\b/);

if (rejectBot || wantHuman || isHandoverExact || isHandoverKeyword) {
  route = 'handover';
  output = 'Ji bilkul, main aapki request hamare human team member ko forward kar raha hoon aur 2 ghante ke liye automatic replies mute kar diye gaye hain. Hamara representative thodi hi der mein aap se rabta karega. Shukriya!';
} else {
  const hasDealWord = has(/\\b(deal|deals|deala|delas|dels|deels|dlz|combo|combos|package|packages|offer|offers)\\b/) || any(['\\u0688\\u06CC\\u0644','\\u0688\\u06CC\\u0644\\u0632']);
  const hasSpecificDealNo = /\\b(deal|deala|delas|dels|package|combo|meal)\\s*\\d+\\b/.test(clean) || /\\d+/.test(clean);
  const hasOrderAction = has(/\\b(order|add|cart|pack|kar|kardo|krdo|kr|chahiye|mangwa|mangwana|banao|confirm|lagao|laga)\\b/);
  const isGeneralDealsAsk = hasDealWord && !hasSpecificDealNo && !hasOrderAction && wordCount <= 6;

  const exactMenuPhrases = ['menu', 'menue', 'list', 'categories', 'catagories', 'rate list', 'price list', 'food list', 'menu dikhao', 'menu bhejo', 'menu batao', 'menu kya hai', 'menu mai kya hai', 'menu mein kya hai', 'menu mai kya kya hai', 'menu mein kya kya hai', 'kya hai', 'kya kya hai', '\\u0645\\u06CC\\u0646\\u0648', '\\u0631\\u06CC\\u0679 \\u0644\\u0633\\u0679'];
  const isGeneralMenuAsk = exactMenuPhrases.includes(clean);

  const isChitchat = has(/\\b(kese ho|kaise ho|kase ho|kesy ho|kaisy ho|kia hal|kya hal|kya haal|kia haal|how are you|how r u|kya ho raha|kya kr rahe|aur sunao|or sunao|sab theek|tabiyat)\\b/) && !hasDealWord && !hasOrderAction;

  // Only block genuinely off-topic messages (not food/restaurant related)
  const isExplicitOffTopic = has(/\\b(capital|president|prime minister|wazir|imran|nawaz|bhutto|army|cricket|match|score|babar|shaheen|ipl|psl|football|mausam|barish|garmi|sardi|joke|latifa|story|kahani|poem|shayari|shairi|song|gana|movie|film|drama|actor|politics|siyasat|math|science|history|geography|coding|python|javascript|homework|college|university|exam|result|nokri|vacancy|shadi|marriage|gf|bf|girlfriend|boyfriend)\\b/) && !has(/\\b(pizza|burger|deal|order|delivery|cravey|crust|menu|branch|tarlai|ghauri|aq khan|school stop|food|khana|peena|drink|pani|water)\\b/);

  if (isGeneralDealsAsk) {
    route = 'live_deals';
  } else if (isGeneralMenuAsk) {
    route = 'live_categories';
  } else if (isChitchat) {
    route = 'quick_reply';
    output = staticData.cache.chitchatReply;
  } else if (isExplicitOffTopic) {
    route = 'quick_reply';
    output = staticData.cache.nonOrderReply;
  } else {
    const isGreeting = /^(hi+|hello+|hellow+|helo+|hlo+|hey+|salam|assalam\\s*o?\\s*alaikum|aoa|slam|slaam|wsalam|walekum\\s*salam|listen|suno|sunno|bhai|excuse\\s*me|\\u0633\\u0644\\u0627\\u0645|\\u0627\\u0644\\u0633\\u0644\\u0627\\u0645 \\u0639\\u0644\\u06CC\\u06A9\\u0645)$/i.test(clean);
    if (isGreeting) {
      route = 'quick_reply';
      output = 'Walaikum Assalam! Cravey Crust mein khushamdeed! Main hoon Burger Raja. Aaj aap kya order karna chahenge? Hamare paas Mazedar Pizzas, Burgers aur Value Deals dastiyab hain!';
    } else if (has(/\\b(thanks|thank you|thankyou|shukriya|shukria|jazakallah|jazak allah)\\b/)) {
      route = 'quick_reply';
      output = 'Aapka bohat shukriya! Koi aur madad chahiye to bata dein, hum hazir hain.';
    }
  }
}

const confirmRe = /\\b(confirm|confim|confrim|confirmed|confirmation|haan|han|haa|ha|haji|ji|jee|yes|yeah|yep|ok|okay|theek|thik|done|kardo|kar do|kr do|krdo|kardu|kar du|kr du|krdu|place|bhej do|bhejdo|proceed|checkout|check out)\\b/i;
const negRe = /\\b(nahi|nahin|nai|no|cancel|mat|dont|don t)\\b/i;
const confirmIntent = wordCount > 0 && wordCount <= 8 && !/\\d/.test(clean) && confirmRe.test(clean) && !negRe.test(clean);

return Object.assign({}, $json, {
  route,
  output,
  confirmIntent,
  syncEpoch: staticData.cache.syncEpoch || 1,
  cachedDealsSummary: (staticData.cache && staticData.cache.agentDealsCatalog) || (staticData.cache && staticData.cache.dealsText) || '',
  cachedCategoriesSummary: (staticData.cache && staticData.cache.categories || []).map((c, i) => (i + 1) + '. ' + c.name).join('\\n'),
  cachedMenuCatalog: (staticData.cache && staticData.cache.menuCatalogText) || '',
  cachedFaqs: (staticData.cache && staticData.cache.faqsText) || '',
  cachedStoreInfo: (staticData.cache && staticData.cache.storeInfoText) || '',
  nonOrderReply: staticData.cache && staticData.cache.nonOrderReply
});`;
}

// 3. Format Live Deals node (REMOVE ALL EMOJIS)
const dealsNode = workflow.nodes.find(n => n.name === 'Format Live Deals');
if (dealsNode && dealsNode.parameters) {
  dealsNode.parameters.jsCode = `let userMsg = '';
try {
  userMsg = String($('Check Cache & Classify Intent').first()?.json?.message || $('Prepare Session').first()?.json?.message || $('Webhook').first()?.json?.body?.message || '').toLowerCase();
} catch (e) {
  userMsg = '';
}

const rawItems = $json.data || $json || [];
const items = Array.isArray(rawItems) ? rawItems : (Array.isArray(rawItems.deals) ? rawItems.deals : []);
let output = '';

if (items.length > 0) {
  const activeDeals = items.filter(d => d && d.isActive !== false && d.active !== false && d.is_active !== false);

  const classify = (d) => {
    if (d.category === 'Burger Deals') return 'BURGER';
    if (d.category === 'Pizza Deals') return 'PIZZA';
    const itemsText = Array.isArray(d.items) ? d.items.map(it => (it.quantity || 1) + 'x ' + (it.itemName || it.name || '')).join(' ') : '';
    const text = (String(d.name || '') + ' ' + String(d.description || '') + ' ' + itemsText).toLowerCase();
    const isBurger = /\\b(burger|zinger|zeggy)\\b/i.test(text);
    const isPizza = /\\b(pizza)\\b/i.test(text);
    if (isBurger && !isPizza) return 'BURGER';
    if (isPizza && !isBurger) return 'PIZZA';
    if (isBurger && isPizza) return 'COMBO';
    return 'OTHER';
  };

  const formatDeal = (d, idx) => {
    const price = d.dealPrice ?? d.price ?? d.deal_price ?? '';
    const itemsSummary = Array.isArray(d.items) && d.items.length > 0
      ? ' (' + d.items.map(it => (it.quantity || 1) + 'x ' + (it.itemName || it.name || '')).join(', ') + ')'
      : (d.description ? ' (' + d.description + ')' : '');
    return \`\${idx + 1}. \${d.name} - Rs. \${price}\${itemsSummary}\`;
  };

  const burgerDeals = activeDeals.filter(d => classify(d) === 'BURGER');
  const pizzaDeals = activeDeals.filter(d => classify(d) === 'PIZZA');
  const otherDeals = activeDeals.filter(d => classify(d) !== 'BURGER' && classify(d) !== 'PIZZA');

  const wantsBurger = /\\b(burger|zinger|zeggy)\\b/i.test(userMsg);
  const wantsPizza = /\\b(pizza)\\b/i.test(userMsg);

  if (wantsBurger && !wantsPizza) {
    if (burgerDeals.length > 0) {
      output = \`Cravey Crust Burger Deals:\\n\\n\` +
        burgerDeals.map((d, i) => formatDeal(d, i)).join('\\n\\n') +
        \`\\n\\nAap in mein se konsi burger deal order karna chahenge?\`;
    } else {
      output = 'Maazrat! Filhal burger deals dastiyab nahi hain.';
    }
  } else if (wantsPizza && !wantsBurger) {
    if (pizzaDeals.length > 0) {
      output = \`Cravey Crust Pizza Deals:\\n\\n\` +
        pizzaDeals.map((d, i) => formatDeal(d, i)).join('\\n\\n') +
        \`\\n\\nAap in mein se konsi pizza deal order karna chahenge?\`;
    } else {
      output = 'Maazrat! Filhal pizza deals dastiyab nahi hain.';
    }
  } else {
    const sections = [];
    if (burgerDeals.length > 0) {
      sections.push(\`BURGER DEALS:\\n\` + burgerDeals.map((d, i) => formatDeal(d, i)).join('\\n'));
    }
    if (pizzaDeals.length > 0) {
      sections.push(\`PIZZA DEALS:\\n\` + pizzaDeals.map((d, i) => formatDeal(d, i)).join('\\n'));
    }
    if (otherDeals.length > 0) {
      sections.push(\`SPECIAL COMBOS:\\n\` + otherDeals.map((d, i) => formatDeal(d, i)).join('\\n'));
    }

    output = \`Cravey Crust ki active deals yeh hain:\\n\\n\` +
      sections.join('\\n\\n') +
      \`\\n\\nAap in mein se konsi deal order karna chahenge?\`;
  }
} else {
  output = 'Cravey Crust par value deals Rs. 599 se shuru hoti hain. Aap Burger Deals ya Pizza Deals check kar sakte hain!';
}

return {
  sessionId: $('Prepare Session').first().json.sessionId || 'primary',
  chatId: $('Prepare Session').first().json.chatId || $('Webhook').first().json.body?.senderJid,
  output
};`;
}

// 4. AI Agent prompt
const agentNode = workflow.nodes.find(n => n.name === 'AI Agent');
if (agentNode && agentNode.parameters && agentNode.parameters.options) {
  agentNode.parameters.options.systemMessage = `Tum Cravey Crust ke WhatsApp ordering assistant "Burger Raja" ho. Roman Urdu ya simple English mein polite jawab do. Asterisk (*) ya lafz "bot" kabhi mat use karo. Ek waqt mein sirf ek sawal poochho.

STRICT LANGUAGE RESTRICTION:
- SIRF aur SIRF Roman Urdu ya simple English mein baat karo.
- Agar customer Arabic (عربی), Urdu script (اردو رسم الخط), Hindi, ya koi bhi doosri language mein baat kare ya demand kare: TAB BHI HARGIZ kisi doosri language mein jawab mat do! Polite Roman Urdu ya English mein jawab do:
"Maazrat! Main sirf Roman Urdu aur English samajhta hoon. Main aapke food order mein kaise madad kar sakta hoon?"
- HARGIZ Arabic script ya koi ghair-mulki zaban mat bolo.

ABSOLUTE NO EMOJI / NO ICON RULE:
- Kisi bhi surat mein koi bhi emoji, icon ya symbol (maslan burger, pizza, party, thumbs up, dil, smileys waghera) HARGIZ USE MAT KARO!
- Sirf saaf plain text Roman Urdu ya English likho.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LIVE CATEGORIES (Admin Panel se Live):
{{ $('Check Cache & Classify Intent').first().json.cachedCategoriesSummary || 'Search Menu Item tool use karein.' }}

LIVE MENU CATALOG (Tamam Active Products, Categories, Variants & IDs):
{{ $('Check Cache & Classify Intent').first().json.cachedMenuCatalog || 'Search Menu Item tool use karein.' }}

LIVE DEALS CACHE (Tamam Active Deals & IDs - Alag Alag Categories):
{{ $('Check Cache & Classify Intent').first().json.cachedDealsSummary || 'Get Current Deals tool use karein.' }}

LIVE STORE INFO & FAQs (Timings, Address, Delivery Policies - Admin Panel se Live):
{{ $('Check Cache & Classify Intent').first().json.cachedStoreInfo }}
{{ $('Check Cache & Classify Intent').first().json.cachedFaqs }}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{ $('Check Cache & Classify Intent').first().json.confirmIntent ? 'ABHI KA MESSAGE: Customer ne confirm bola hai (haan, ji, yes, confirm, ok, checkout, kardo). Agar pichla message FINAL SUMMARY tha, to FORAN Create Confirmed Order tool call karo aur asli order number customer ko batao.' : '' }}

CUSTOMER PHONE HANDLING:
- Customer ka WhatsApp number: {{ $('Prepare Session').first().json.whatsappPhone }}.
- Agar customer kahe "same number", "yahi number", "is number pe", ya customer apna phone number na bataye: TO HAMESHA customer ka WhatsApp number ({{ $('Prepare Session').first().json.whatsappPhone }}) use karo!
- Dobara phone number pooch kar customer ko tang mat karo agar WhatsApp number mojood hai!
- "Aapka WhatsApp number privacy ki wajah se show nahi ho raha" WALA JHOOT HARGIZ MAT BOLO kyunki WhatsApp number system mein mojood hai!

DEAL CONFIRMATION RULE:
- Jab customer kisi deal ka naam ya number bole (maslan "deal 2", "deal 3", "burger meal 3"):
  1. Agar ambiguity ho (maslan "Meal 3" dono Burger Deals aur Pizza Deals mein hota hai), to pehle clarify karo.
  2. Deal confirm karne se pehle customer se poocho:
     "Aap [Deal Name] - Rs. [Price] ([Included Items]) add karna chahte hain? Kya main yeh aapke cart mein add kar doon?"
  3. Jab customer kahe "haan / add kardo / ok / yes", SIRF TAB Add to Cart tool call karo aur cart mein add karo!

CONFIRMATION BEFORE REMOVING / CHANGING CART:
- Jab customer order change karne ya items remove karne ka kahe (maslan "I want to change the order", "remove items", "cart khali kardo", "ye item nikaal do"):
  - FORAN Clear Cart ya Remove Cart Item call MAT KARO!
  - Pehle customer se confirmation maango:
    "Kya aap waqai apna cart khali / yeh item remove karna chahte hain? Haan ya Nahi confirm kar dein."
  - Jab customer explicitly kahe "haan / yes / ji", SIRF TAB Clear Cart ya Remove Cart Item tool call karo aur cart update karo!

CRITICAL DEAL SEPARATION & DISPLAY RULES:
1. JAB CUSTOMER BURGER KI DEALS MAANGE (maslan "burger ki deals dikhao", "burger deals", "zinger deals"):
   - SIRF aur SIRF "=== BURGER DEALS ===" section ki deals dikhao!
   - Pizza deals ko burger deals ke sath HARGIZ MERGE MAT KARO!
   - Tamam burger deals unki price aur included items ke sath dikhao.
2. JAB CUSTOMER PIZZA KI DEALS MAANGE (maslan "pizza ki deals dikhao", "pizza deals"):
   - SIRF aur SIRF "=== PIZZA DEALS ===" section ki deals dikhao!
   - Burger deals ko pizza deals ke sath HARGIZ MERGE MAT KARO!
   - Tamam pizza deals unki price aur included items ke sath dikhao.
3. JAB CUSTOMER AAM "DEALS" MAANGE (maslan "deals dikhao", "deals"):
   - Dono categories ko ALAG ALAG headings mein saaf saaf dikhao:
     Burger Deals:
     (Tamam burger deals prices aur items ke sath)
     Pizza Deals:
     (Tamam pizza deals prices aur items ke sath)

DEAL DETAILS & INGREDIENTS INQUIRY:
Jab customer kisi deal ya meal ke baare mein poochhe ke "isme kya kya hai" (maslan "burger meal for 1 mai kya h"):
- Catalog mein diye gaye tamam items (maslan "Zinger Burger, Regular Fries, aur Regular Drink") saaf saaf batao!
- "Maazrat, mazeed tafseel darj nahi hai" HARGIZ MAT BOLO kyunki har deal ki tafseel catalog mein mojood hai!

CRITICAL RULES:
1. LIVE MENU CATALOG aur LIVE FAQs ko HAMESHA sab se pehle parho. Memory mein koi purani price/list ho to ignore karo aur live catalog se jawab do.
2. Jab customer kisi Category ke items maange (maslan Drinks, Pizzas), to us [Category: ...] ke SARE items price aur variants ke sath batao. Koi bhi item skip mat karo!
3. Spelling mein thoda farq ho to phir bhi match karo.
4. Agar item menu mein nahi hai to polite batao aur milte julte items suggest karo.
5. Timings, address, delivery charges ke liye LIVE FAQs / Get Store Info / Check Delivery Availability tool use karo. Hardcoded jawab mat do!
6. OFF-TOPIC (cricket, politics, jokes etc.) par: "Maazrat! Main Cravey Crust ka food ordering Burger Raja hoon aur sirf khane ke orders, menu aur deals mein aapki madad kar sakta hoon."

CART & CHECKOUT RULES:
1. Item/deal add karne ke baad: "Kya aap kuch aur add karna chahenge, ya order checkout karein?"
2. Jab tak customer checkout na kahe, naam ya address mat maango.

STRICT CHECKOUT GATE (4 LAZMI):
[1] Customer Name  [2] Contact Phone (WhatsApp number automatically if same number)  [3] Delivery Address (Check Delivery Availability verified)  [4] Payment Method
Jo missing ho sirf wahi poochho. Sab mil jayein to Calculate Cart Totals call karo aur Final Summary card bhejo.

FINAL SUMMARY FORMAT:
Aapke order ki mukammal details yeh hain:
Items: [Item List]
Total Bill: Rs. [Total] (Delivery Fee: Rs. [Fee])
Delivery Details:
- Naam: [Customer Name]
- Contact Number: [Customer Phone]
- Address: [Confirmed Address]
- Payment Method: [COD ya EasyPaisa]
Kya aapki yeh details theek hain? Order confirm karne ke liye haan likhein.

ORDER CONFIRMATION:
Customer 'haan/jee/ok/confirm/kardo/proceed/checkout' kahe to FORAN Create Confirmed Order tool call karo!
Asli order number (CC-XXXXXX) jo tool ke response se mile, foran customer ko batao:
"Mubarak ho! Aapka order kamyabi se confirm ho gaya hai aur aapka order number CC-XXXXXX hai. Aapka khana jald hi diye gaye address par bhej diya jayega. Cravey Crust pasand karne ka shukriya!"`;
}

// 5. Verify Order Reply node (FIX REGEX TO MATCH CC-000020, CC-000021)
const verifyNode = workflow.nodes.find(n => n.name === 'Verify Order Reply');
if (verifyNode && verifyNode.parameters) {
  verifyNode.parameters.jsCode = `const prep = $('Prepare Session').first().json;
const cls = $('Check Cache & Classify Intent').first().json;
let out = String($json.output || $json.text || '').trim();
const agentFailed = !!$json.error || !out;

const hasOrderNo = /\\bCC-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*\\b/i.test(out);
// customer ne confirm kaha, agent ne "order ho gaya" bola, lekin tool ka asli order number nahi -> jhoot rokna
const claims = /\\b(order|aapka order)\\b[^.!\\n]{0,40}\\b(confirm|place|book|receive)\\w*\\b[^.!\\n]{0,25}\\b(ho gaya|ho gya|ho chuka|ho gayi|kar diya|kar di)\\b/i.test(out) && !/cancel/i.test(out);

if (agentFailed) {
  out = 'Maazrat, abhi kuch technical masla aa gaya. Meherbani karke apna message dobara bhej dein, ya "agent" likhein to hamara team member rabta karega.';
} else if (cls.confirmIntent && claims && !hasOrderNo) {
  out = 'Maazrat, system mein masla aane ki wajah se aapka order abhi confirm nahi ho saka. Meherbani karke dobara "confirm" likhein, ya "agent" likhein to hamara team member madad karega.';
}

return {
  sessionId: 'primary',
  chatId: prep.chatId || $('Webhook').first().json.body?.senderJid || '',
  output: out
};`;
}

// 6. Send WhatsApp Reply node (STRIP ALL EMOJIS & ASTERISKS)
const sendNode = workflow.nodes.find(n => n.name === 'Send WhatsApp Reply');
if (sendNode && sendNode.parameters && sendNode.parameters.bodyParameters) {
  const params = sendNode.parameters.bodyParameters.parameters;
  const msgParam = params.find(p => p.name === 'message');
  if (msgParam) {
    msgParam.value = "={{ ($json.output || $json.text || '').replace(/\\*/g, '').replace(/[\\u{1F600}-\\u{1F64F}\\u{1F300}-\\u{1F5FF}\\u{1F680}-\\u{1F6FF}\\u{1F1E0}-\\u{1F1FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\u{1F900}-\\u{1F9FF}\\u{1F018}-\\u{1F270}\\u{2388}-\\u{2B55}\\u{200D}\\u{FE0F}]/gu, '').replace(/[ ]{2,}/g, ' ').trim() }}";
  }
}

// Write to all 4 workflow files
const workflowFiles = [
  'n8n.json',
  'updated_n8n_workflow.json',
  'cravey-crust-optimized-workflow.json',
  'cravey-crust-whatsapp-agent-workflow.json'
];

for (const wf of workflowFiles) {
  const target = path.join(__dirname, '..', wf);
  fs.writeFileSync(target, JSON.stringify(workflow, null, 2), 'utf8');
  console.log('Successfully updated:', wf);
}
