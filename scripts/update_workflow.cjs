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
    phoneAssign.value = "={{ (() => { const clean = (str) => { if (!str) return ''; const s = String(str).trim(); if (s.includes('@lid') || s.includes('@g.us')) return ''; const digits = s.replace(/@.*$/, '').replace(/[^0-9]/g, ''); if (!digits || digits.length < 10) return ''; if (digits.includes('3055375501')) return ''; if (/^(0?3001234567|0?3123456789|0?3000000000|0?3211234567|0?3321234567|0?3009876543|0?3120000000|0?3451234567|0?3331234567|0?3001111111|0?3001234568|0?3000000001|0?3111111111)$/.test(digits)) return ''; if (digits.startsWith('92') && digits.length === 12) return '0' + digits.slice(2); if (digits.startsWith('03') && digits.length === 11) return digits; if (digits.length === 10 && digits.startsWith('3')) return '0' + digits; if (digits.length === 11 && digits.startsWith('0')) return digits; if (digits.length >= 10) return digits; return ''; }; const candidates = [ $json.body?.customerPhone, $json.body?.verifiedPhone, $json.body?.whatsappPhone, $json.body?.phone, $json.body?.senderPn, $json.body?.chatId, $json.body?.senderJid, $json.body?.sessionKey, $json.customerPhone, $json.verifiedPhone, $json.whatsappPhone, $json.phone, $json.senderPn, $json.chatId, $json.senderJid, $json.sessionKey ]; for (const c of candidates) { const parsed = clean(c); if (parsed) return parsed; } return ''; })() }}";
  }
  const verifiedAssign = assigns.find(a => a.name === 'phoneVerified');
  if (verifiedAssign) {
    verifiedAssign.value = "={{ Boolean($json.body?.phoneVerified === true || $json.body?.verifiedPhone || ($json.body?.customerPhone && !String($json.body.customerPhone).includes('@lid') && !String($json.body.customerPhone).includes('3055375501')) || ($json.body?.whatsappPhone && !String($json.body.whatsappPhone).includes('@lid') && !String($json.body.whatsappPhone).includes('3055375501')) || ($json.body?.phone && !String($json.body.phone).includes('@lid') && !String($json.body.phone).includes('3055375501')) || ($json.body?.senderPn && !String($json.body.senderPn).includes('@lid') && !String($json.body.senderPn).includes('3055375501')) || ($json.body?.chatId && !String($json.body.chatId).includes('@lid') && !String($json.body.chatId).includes('3055375501'))) }}";
  }
  let pushNameAssign = assigns.find(a => a.name === 'pushName');
  if (pushNameAssign) {
    pushNameAssign.value = "={{ $json.body?.pushName || $json.body?.name || '' }}";
  } else {
    assigns.push({
      id: 'f8e4b7a1-2d3c-4e5f-9a0b-1c2d3e4f5a6b',
      name: 'pushName',
      value: "={{ $json.body?.pushName || $json.body?.name || '' }}",
      type: 'string'
    });
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

      const bMeals = bDeals.filter(d => /meal/i.test(d.name || ''));
      const bCombos = bDeals.filter(d => !/meal/i.test(d.name || ''));
      const pMeals = pDeals.filter(d => /meal/i.test(d.name || ''));
      const pCombos = pDeals.filter(d => !/meal/i.test(d.name || ''));

      const agentDealSections = [];
      if (bMeals.length > 0) agentDealSections.push('=== BURGER MEALS ===\\n' + bMeals.map((d, i) => formatAgentDeal(d, i)).join('\\n'));
      if (bCombos.length > 0) agentDealSections.push('=== BURGER VALUE DEALS ===\\n' + bCombos.map((d, i) => formatAgentDeal(d, i)).join('\\n'));
      if (pMeals.length > 0) agentDealSections.push('=== PIZZA MEALS (1 Pizza + Drinks) ===\\n' + pMeals.map((d, i) => formatAgentDeal(d, i)).join('\\n'));
      if (pCombos.length > 0) agentDealSections.push('=== PIZZA VALUE DEALS (Multiple Pizzas + Drink) ===\\n' + pCombos.map((d, i) => formatAgentDeal(d, i)).join('\\n'));
      if (cDeals.length > 0) agentDealSections.push('=== SPECIAL / COMBO DEALS ===\\n' + cDeals.map((d, i) => formatAgentDeal(d, i)).join('\\n'));

      staticData.cache.agentDealsCatalog = agentDealSections.join('\\n\\n');
      staticData.cache.dealsText = staticData.cache.agentDealsCatalog;
    }

    // ── Categories (Filter out test/fake categories like aleem)
    const catsArr = catsRes && (catsRes.data && (catsRes.data.categories || catsRes.data) || catsRes.categories || catsRes.data) || [];
    const catsArrFinal = Array.isArray(catsArr) ? catsArr : [];
    if (catsArrFinal.length > 0) {
      staticData.cache.categories = catsArrFinal.filter(c => c && c.isActive !== false && c.is_active !== false && !['aleem', 'test', 'demo'].includes(String(c.name || '').toLowerCase().trim()));
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
        restData.name ? 'Restaurant Branch: ' + restData.name : '',
        addr ? 'RESTAURANT OUTLET ADDRESS (Branch / Dukan Address - Delivery Location NAHI Hai): ' + addr : '',
        (openTime || closeTime) ? 'Restaurant Timings: ' + openTime + ' - ' + closeTime : '',
        restData.phone ? 'Restaurant Phone: ' + restData.phone : '',
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

// ── Handover Detection (Fast deterministic route for humans, managers, complaints)
const rejectBot = /\\b(bot se|bot k sath|robot|bot nahi|bot se nahi|bot se bat nahi|bot se baat nahi)\\b/i.test(clean);
const wantHuman = /\\b(agent|human|banda|bande|representative|manager|owner|malik|boss|admin|staff|insan|management|team member)\\b/i.test(clean) &&
  /\\b(baat|bat|rabta|call|phone|milwao|karwao|krwao|karao|chahiye|connect|talk|speak|se)\\b/i.test(clean);
const isHandoverExact = ['agent', 'human', 'representative', 'staff', 'manager', 'owner', 'malik', 'boss', 'help', 'madad', 'insan'].includes(clean);
const isHandoverKeyword = has(/\\b(agent chahiye|human chahiye|representative chahiye|banda chahiye|insan chahiye|call agent|talk to human|talk to agent|agent se baat|human se baat|bande se baat|malik se baat|owner se baat|manager se baat|boss se baat|malik se rabta|baat krwao|baat karwao|rabta karwao|rabta krwao|call me|mujhe call|mjhe call|call karo|rabta karo|shikayat|complaint)\\b/);
const isComplaint = has(/\\b(service achi nahi|service theek nahi|service achii nh|service ghalat|bakwas service|kharab service|ghalat order|galat order|shikayat|complaint|management|team member)\\b/);

if (rejectBot || wantHuman || isHandoverExact || isHandoverKeyword || isComplaint) {
  route = 'handover';
  output = 'Ji bilkul, main aapki request hamare human team member ko forward kar raha hoon aur bot ko 2 ghante ke liye mute kar diya gaya hai. Hamara representative thodi hi der mein aap se rabta karega aur aapke sath deal karega. Shukriya!\\n\\n(Agar aapko dobara bot shuru karna ho to kisi bhi waqt "bot start" likh kar bhej dein).';
} else {
  const hasDealWord = has(/\\b(deal|deals|deala|delas|dels|deels|dlz|combo|combos|package|packages|offer|offers)\\b/) || any(['\\u0688\\u06CC\\u0644','\\u0688\\u06CC\\u0644\\u0632']);
  const hasSpecificDealNo = /\\b(deal|deala|delas|dels|package|combo|meal)\\s*\\d+\\b/.test(clean) || /\\d+/.test(clean);
  const hasOrderAction = has(/\\b(order|add|cart|pack|kar|kardo|krdo|kr|chahiye|mangwa|mangwana|banao|confirm|lagao|laga)\\b/);
  const isFoodCategoryInquiry = has(/\\b(burger|burgers|zinger|zeggy|pizza|pizzas)\\b/) && !hasSpecificDealNo && !hasOrderAction && wordCount <= 3;
  const isGeneralDealsAsk = (hasDealWord || isFoodCategoryInquiry) && !hasSpecificDealNo && !hasOrderAction && wordCount <= 6;

  // Broad menu ask detection (e.g. "menu", "menu dikhao", "kia kia ha tumhary pas", "kia kia ha khany mein", "ap ke pass kia milta ha")
  const hasMenuWord = has(/\\b(menu|menue|categories|catagories|rate list|price list|food list|items)\\b/) || any(['\\u0645\\u06CC\\u0646\\u0648','\\u0631\\u06CC\\u0679 \\u0644\\u0633\\u0679']);
  const isWhatDoYouHave = has(/\\b(kia|kya)\\b.*\\b(pas|paas|pass|khana|khany|khane|milta|milti|available|rakha|dastiyab)\\b/) ||
    has(/\\b(kya kya|kia kia|kya hai|kia hai|kya h|kia h|kya milta|kia milta|khana kya|khane me kya|khany mein kya|khany me|khane mein)\\b/) ||
    has(/\\b(menu dikhao|menu bhejo|menu batao|menu card|rate list|price list|food list|items dikhao|list dikhao|kya items|kia items)\\b/);
  const isGeneralMenuAsk = (hasMenuWord || isWhatDoYouHave) && !hasDealWord && !hasOrderAction && wordCount <= 8;

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

const confirmRe = /\\b(confirm|confim|confrim|confirmed|confirmation|haan|han|haa|ha|haji|ji|jee|yes|yeah|yep|yup|ok|okay|theek|thik|thek|sahi|bilkul|done|kardo|kar do|kr do|krdo|kardu|kar du|kr du|krdu|kar dein|kr dein|kar den|kr den|kar dain|kr dain|kar de|kr de|place|bhej do|bhejdo|bhejdein|bhej dein|proceed|pack kardo|pack krdo|book kardo|book krdo|book kar do|book kr do)\\b/i;
const negRe = /\\b(nahi|nahin|nai|no|cancel|mat|dont|don t)\\b/i;
const isCheckoutReq = /\\b(checkout|check out)\\b/i.test(clean);
const confirmIntent = wordCount > 0 && wordCount <= 8 && !/\\d/.test(clean) && confirmRe.test(clean) && !negRe.test(clean) && !isCheckoutReq;

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

// 2b. Format Live Categories node (Full accurate Cravey Crust menu with prices, no test categories, no emojis)
const catsNode = workflow.nodes.find(n => n.name === 'Format Live Categories');
if (catsNode && catsNode.parameters) {
  catsNode.parameters.jsCode = `const output = \`Cravey Crust ka Main Menu:

CLASSIC PIZZAS (Small Rs. 599 | Medium Rs. 1299 | Large Rs. 1499 | Party Rs. 2599):
- Cheese Lover
- Chicken Tikka
- Chicken Fajita
- Chicken Supreme
- Chicken Tandori

PREMIUM PIZZAS (Small Rs. 699 | Medium Rs. 1399 | Large Rs. 1799 | Party Rs. 2799):
- Behari Kebab Pizza
- Chicken Extreme
- Crown Crust
- Peri Peri Pizza
- Stuffed Crust (Medium Rs. 1499 | Large Rs. 1999 | Party Rs. 2999)

DRINKS:
- Soft Drink (Regular Rs. 120 | 1 Litre Rs. 220)
- Mineral Water (Small Rs. 60 | Large Rs. 110)

VALUE DEALS:
- Burger Deals (Rs. 599 se shuru)
- Pizza Deals (Rs. 599 se shuru)

Aap in mein se kya order karna chahenge? Kisi bhi pizza, drink ya deal ka naam bata dein!\`;

return {
  sessionId: $('Prepare Session').first().json.sessionId || 'primary',
  chatId: $('Prepare Session').first().json.chatId || $('Webhook').first().json.body?.senderJid,
  output
};`;
}

// 3. Format Live Deals node (REMOVE ALL EMOJIS, CLEAR MEAL VS VALUE DEAL HEADINGS)
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
      const bMeals = burgerDeals.filter(d => /meal/i.test(d.name || ''));
      const bCombos = burgerDeals.filter(d => !/meal/i.test(d.name || ''));
      const parts = [];
      if (bMeals.length > 0) parts.push(\`BURGER MEALS:\\n\` + bMeals.map((d, i) => formatDeal(d, i)).join('\\n'));
      if (bCombos.length > 0) parts.push(\`BURGER VALUE DEALS:\\n\` + bCombos.map((d, i) => formatDeal(d, i)).join('\\n'));
      if (parts.length === 0) parts.push(burgerDeals.map((d, i) => formatDeal(d, i)).join('\\n'));

      output = \`Cravey Crust Burger Deals:\\n\\n\` +
        parts.join('\\n\\n') +
        \`\\n\\nAap in mein se konsi burger deal order karna chahenge?\`;
    } else {
      output = 'Maazrat! Filhal burger deals dastiyab nahi hain.';
    }
  } else if (wantsPizza && !wantsBurger) {
    if (pizzaDeals.length > 0) {
      const pMeals = pizzaDeals.filter(d => /meal/i.test(d.name || ''));
      const pCombos = pizzaDeals.filter(d => !/meal/i.test(d.name || ''));
      const parts = [];
      if (pMeals.length > 0) parts.push(\`PIZZA MEALS (1 Pizza + Drinks):\\n\` + pMeals.map((d, i) => formatDeal(d, i)).join('\\n'));
      if (pCombos.length > 0) parts.push(\`PIZZA VALUE DEALS (Multiple Pizzas + Drink):\\n\` + pCombos.map((d, i) => formatDeal(d, i)).join('\\n'));
      if (parts.length === 0) parts.push(pizzaDeals.map((d, i) => formatDeal(d, i)).join('\\n'));

      output = \`Cravey Crust Pizza Deals:\\n\\n\` +
        parts.join('\\n\\n') +
        \`\\n\\nAap in mein se konsi pizza deal order karna chahenge?\`;
    } else {
      output = 'Maazrat! Filhal pizza deals dastiyab nahi hain.';
    }
  } else {
    const sections = [];
    if (burgerDeals.length > 0) {
      const bMeals = burgerDeals.filter(d => /meal/i.test(d.name || ''));
      const bCombos = burgerDeals.filter(d => !/meal/i.test(d.name || ''));
      if (bMeals.length > 0) sections.push(\`BURGER MEALS:\\n\` + bMeals.map((d, i) => formatDeal(d, i)).join('\\n'));
      if (bCombos.length > 0) sections.push(\`BURGER VALUE DEALS:\\n\` + bCombos.map((d, i) => formatDeal(d, i)).join('\\n'));
      if (bMeals.length === 0 && bCombos.length === 0) sections.push(\`BURGER DEALS:\\n\` + burgerDeals.map((d, i) => formatDeal(d, i)).join('\\n'));
    }
    if (pizzaDeals.length > 0) {
      const pMeals = pizzaDeals.filter(d => /meal/i.test(d.name || ''));
      const pCombos = pizzaDeals.filter(d => !/meal/i.test(d.name || ''));
      if (pMeals.length > 0) sections.push(\`PIZZA MEALS (1 Pizza + Drinks):\\n\` + pMeals.map((d, i) => formatDeal(d, i)).join('\\n'));
      if (pCombos.length > 0) sections.push(\`PIZZA VALUE DEALS (Multiple Pizzas + Drink):\\n\` + pCombos.map((d, i) => formatDeal(d, i)).join('\\n'));
      if (pMeals.length === 0 && pCombos.length === 0) sections.push(\`PIZZA DEALS:\\n\` + pizzaDeals.map((d, i) => formatDeal(d, i)).join('\\n'));
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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KHABARDAAR - ADDRESS, NAAM AUR NUMBER KHUD SE GUESS KARNA SAKHT MANA HAI:
1. DELIVERY ADDRESS / LOCATION MANGNA LAZMI HAI:
   - LIVE STORE INFO mein jo address ("School stop, Lehtrar Road, near Fazal e haq, Tarlai Kalan, Islamabad") likha hai, WO CRAVEY CRUST RESTAURANT BRANCH KA ADDRESS HAI! WO CUSTOMER KA DELIVERY ADDRESS HARGIZ NAHI HAI!
   - Tumhe kisi bhi surat mein customer ka delivery address khud se guess ya assume karne ki ijazat NAHI hai!
   - Agar tumne restaurant ka address ya koi farzi address (maslan "Ghauri Town", "Tarlai", "Islamabad", "Customer Address", ".") use kiya to backend system order reject kar dega!
   - JAB CUSTOMER CHECKOUT KAHE: Customer se uska mukammal ghar/gali number aur area ka Delivery Address ya WhatsApp location pin poochna 100% LAZMI hai!
   - JAB TAK CUSTOMER APNA COMPLETE ADDRESS YA LOCATION PIN NA DE, TUM NA FINAL SUMMARY BHEJ SAKTE HO AUR NA ORDER BOOK KAR SAKTE HO!

2. CUSTOMER KA ASLI NAAM:
   - Agar customer ne abhi tak chat mein apna asli naam nahi bataya, to checkout ke waqt customer se uska asli naam poocho: "Order proceed karne ke liye baraye meherbani apna Naam bata dein?"
   - Placeholder naam maslan "Customer", "User", ya "." use karna SAKHT MANA HAI!

3. PHONE NUMBER & "SAME NUMBER" STRICT RULE:
   - Customer jis WhatsApp number se message kar raha hai uska verified number yeh hai: {{ $('Prepare Session').first().json.whatsappPhone }}.
   - Jab customer se contact number poocho aur customer kahe:
     "same", "same number", "yahi", "yehi", "isi pe", "isi number pe", "wahi", "whatsapp number", "mera number", "apna number", "yahi number hai", "is number pe", ya alag se koi naya number na de:
     TO HAMESHA YAHI ASLI VERIFIED NUMBER: {{ $('Prepare Session').first().json.whatsappPhone }} USE KARO AUR ORDER SUMMARY MEIN YAHI LIKHO!
   - KISI BHI SURAT MEIN restaurant ka number, bot ka number ya koi fake/dummy number (maslan 03001234567 waghera) HARGIZ USE YA ASSUME MAT KARO!
   - Agar customer koi naya/mukhtalif 11-digit mobile number (maslan 03xxxxxxxxx) likh kar bataye to sirf tab wo naya number use karo.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STORE INFO:
Restaurant Branch Address: School stop, Lehtrar Road, near Fazal e haq, Tarlai Kalan, Islamabad (Branch Outlet - Delivery address NAHI hai).
Delivery Areas: Tarlai Kalan, Ghauri Town, Al-Huda Town, Chatha Bakhtawar, Khanna Pul, Shahzad Town, PWD, Chak Shahzad.
Timings: 12:00 PM - 02:00 AM. Cash on Delivery (COD) ya EasyPaisa.

OFFICIAL MENU & PRODUCT CATALOG (Tamam Active Products, Prices & IDs for Add to Cart):
- CLASSIC PIZZAS (Small Rs. 599, Medium Rs. 1299, Large Rs. 1499, Party Size Rs. 2599):
  1. Cheese Lover [item:cmv5k2ypv003spt5t7cvxv7xt] (Small:cmv5k2ypw003upt5th9k5ni95, Medium:cmv5k2ypx003wpt5tn3rjfsk0, Large:cmv5k2ypy003ypt5tn4mq9ilc, Party Size:cmv5k2ypz0040pt5t0g4c8i15)
  2. Chicken Tikka [item:cmv5k2yq00042pt5ttirv4uem] (Small:cmv5k2yq10044pt5tfmujdi3u, Medium:cmv5k2yq20046pt5tvb3sbb5e, Large:cmv5k2yq20048pt5t7u7k57kk, Party Size:cmv5k2yq3004apt5tl9knzk59)
  3. Chicken Fajita [item:cmv5k2yq9004mpt5tekusjgyx] (Small:cmv5k2yqa004opt5twpxz6y50, Medium:cmv5k2yqa004qpt5t4ke5wewx, Large:cmv5k2yqb004spt5t9gvimzbh, Party Size:cmv5k2yqc004upt5t8yn1flbd)
  4. Chicken Supreme [item:cmv5k2yq4004cpt5toswe0i7j] (Small:cmv5k2yq5004ept5tazzz5m9r, Medium:cmv5k2yq6004gpt5try176p8a, Large:cmv5k2yq7004ipt5tztqrw40t, Party Size:cmv5k2yq8004kpt5tgujcxjpb)
  5. Chicken Tandori [item:cmv5k2yqd004wpt5tuhc29zj8] (Small:cmv5k2yqe004ypt5tngkfwz37, Medium:cmv5k2yqf0050pt5tft7u2wos, Large:cmv5k2yqg0052pt5t7kk6vn76, Party Size:cmv5k2yqh0054pt5t6prp25lb)

- PREMIUM PIZZAS (Small Rs. 699, Medium Rs. 1399, Large Rs. 1799, Party Size Rs. 2799):
  1. Behari Kebab Pizza [item:cmv5k2yph0030pt5tewx0y2pp] (Small:cmv5k2ypj0032pt5t8v5u5ifq, Medium:cmv5k2ypk0034pt5tm50gzxbm, Large:cmv5k2ypl0036pt5t1zr1jvwl, Party Size:cmv5k2ypm0038pt5t1r8y8a8z)
  2. Chicken Extreme [item:cmv5k2yp5002gpt5t2nxp8ehv] (Small:cmv5k2yp7002ipt5t0b7l1n0c, Medium:cmv5k2yp9002kpt5tk9dr6gjg, Large:cmv5k2ypa002mpt5t75y2r9o9, Party Size:cmv5k2ypb002opt5tesqdfz3e)
  3. Crown Crust [item:cmv5k2ypn003apt5t6jvyla53] (Small:cmv5k2ypo003cpt5tf81l8116, Medium:cmv5k2ypp003ept5tdf2q4cwe, Large:cmv5k2ypq003gpt5tpmll96x2, Party Size:cmv5k2ypr003ipt5t1kxg44w4)
  4. Peri Peri Pizza [item:cmv5k2ypc002qpt5tnn1a8l1o] (Small:cmv5k2ypd002spt5tl926t5pt, Medium:cmv5k2ype002upt5tgq4i895l, Large:cmv5k2ypf002wpt5tl4drs0r2, Party Size:cmv5k2ypg002ypt5tevkhobo8)
  5. Stuffed Crust [item:cmv5k2yps003kpt5t0xr66vzf] (Medium Rs. 1499:cmv5k2ypt003mpt5tmxqillwl, Large Rs. 1999:cmv5k2ypu003opt5tywgvyoo9, Party Size Rs. 2999:cmv5k2ypv003qpt5tbxm9rgld)

- BURGER DEALS (Add to Cart mein dealId pass karo):
  1. Burger Meal For 1 (Rs. 599) [dealId:cmv5k2yre0074pt5t6df9jkev]: 1 Zinger Burger + Regular Fries + Regular Drink
  2. Burger Meal For 2 (Rs. 999) [dealId:cmv5k2yrg0076pt5t3xdtq7h1]: 2 Zinger Burgers + Regular Fries + 2 Regular Drinks
  3. Burger Meal For 3 (Rs. 1599) [dealId:cmv5k2yrh0078pt5t3o3wy66d]: 3 Zinger Burgers + 3 Chicken Pieces + 1 Litre Drink
  4. Deal 4 (Rs. 999) [dealId:cmv5k2yrl007gpt5tzi8ylxkh]: 4 Zeggy Burgers
  5. Deal 5 (Rs. 1099) [dealId:cmv5k2yrm007ipt5tdwd8wbje]: 3 Zinger Burgers + 1 Litre Drink

- PIZZA DEALS (Add to Cart mein dealId pass karo):
  1. Pizza Meal For 1 (Rs. 599) [dealId:cmv5k2yr9006wpt5tqhdeo8bd]: 1 Small Pizza + Regular Drink
  2. Pizza Meal For 2 (Rs. 1299) [dealId:cmv5k2yrb006ypt5tzw9xf28e]: 1 Regular Pizza + 2 Regular Drinks
  3. Pizza Meal For 3 (Rs. 1599) [dealId:cmv5k2yrc0070pt5tho6mqejm]: 1 Large Pizza + 1 Litre Drink
  4. Pizza Meal For 4 (Rs. 2499) [dealId:cmv5k2yrd0072pt5tses1qgkj]: 1 Party Size Pizza + 1.5 Litre Drink
  5. Deal 1 (Rs. 1099) [dealId:cmv5k2yri007apt5t0v0fu5qc]: 2 Small Pizzas + 2 Regular Drinks
  6. Deal 2 (Rs. 2099) [dealId:cmv5k2yrj007cpt5tc1p6dlwm]: 2 Medium Pizzas + 1 Litre Drink
  7. Deal 3 (Rs. 2999) [dealId:cmv5k2yrk007ept5ti388fk1o]: 2 Large Pizzas + 1 Litre Drink

- DRINKS (Add to Cart mein menuItemId aur variantId pass karo):
  1. Soft Drink [item:cmv5k2yr3006ipt5t0rupb07e] (Regular Rs. 120:cmv5k2yr4006kpt5tzi28v1kp, 1 Litre Rs. 220:cmv5k2yr5006opt5tw7xab43q)
  2. Mineral Water [item:cmv5k2yr7006spt5tu5uhl3ey] (Small Rs. 60:cmv5k2yr8006upt5txyneh0lp, Large Rs. 110:cmv5k2yr8006upt5txyneh0lp)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{ $('Check Cache & Classify Intent').first().json.confirmIntent ? 'CURRENT STATUS: Customer ne abhi confirm bola hai (haan / yes / confirm / theek hai / ok / ji / kardo). Agar aap pehle hi customer ko Final Summary Card bhej chuke the jis mein Naam aur Address maujood tha, to ab FORAN Create Confirmed Order tool call karo aur result se mila CC-... order number customer ko batao. Agar pichla message Final Summary nahi tha to pehle summary bhejo!' : 'CURRENT STATUS: Customer ne abhi order confirm NAHI kiya hai (customer ne abhi address, naam, phone ya payment method bataya hai ya koi sawal poocha hai). KHABARDAAR: IS WAQT Create Confirmed Order TOOL CALL KARNA 100% SAKHT MANA HAI! Agar chaaron details (Naam, Address, Phone, Payment) poori ho chuki hain, to Calculate Cart Totals call karo aur SIRF Final Summary Card bhej kar poocho \\"Kya aapki yeh details theek hain? Order confirm karne ke liye haan ya confirm likhein\\" aur customer ke confirmation reply ka intezar karo!' }}

HARGIZ YEH GHAIR-MOJOOD CHEEZEIN CUSTOMER KO NA BOLO (CRAVEY CRUST PAR DASTIYAB NAHI HAIN):
- NO DESSERTS (Brownies, ice creams, cakes Cravey Crust par BILKUL NAHI HAIN). Agar customer maange to polite bolo: "Maazrat! Cravey Crust par desserts dastiyab nahi hain. Hamare paas Mazedar Pizzas, Burger Deals aur Chilled Drinks hain."
- NO BEVERAGES / SHAKES / TEA / COFFEE (Sirf Soft Drink aur Mineral Water hai).
- NO PASTAS (Pasta Cravey Crust par BILKUL NAHI milta).
- NO ALAG FRIED CHICKEN (Chicken piece sirf Burger Meal 3 ke andar aata hai).
- NO SIDES / SALADS (Fries sirf Burger Meals ke andar aati hain).
- "aleem" koi item ya category nahi hai (test category hai, kabhi mat bolo).

JAB BHI CUSTOMER MENU YA ITEMS POOCHE ("menu dikhao", "kya milta hai", "apke paas kya hai"):
Hamesha Cravey Crust ke ASLI menu items (Classic Pizzas, Premium Pizzas, Burger Deals, Pizza Deals, Drinks) batao!

CRITICAL GROUNDING & ZERO HALLUCINATION (IMMUTABLE CATALOG & DEALS):
1. LIVE DEALS CACHE aur LIVE MENU CATALOG mein mojood prices, deals aur items 100% PATTHAR KI LAKEER (IMMUTABLE FACTS) HAIN.
2. Tumhe KISI BHI SURAT MEIN prices ya deal ke items ko invent, change ya hallucinate karne ki ijazat NAHI hai!
   - Agar catalog mein Deal 1 Rs. 1099 ki hai, to HARGIZ usay Rs. 1499 mat bolo!
   - Agar catalog mein Deal 2 Rs. 2099 ki hai, to HARGIZ usay kisi aur price ka mat bolo!
   - Agar catalog mein Deal 3 Rs. 2999 ki hai, to HARGIZ usay Rs. 2799 mat bolo!
   - Agar drink 1L hai, to khud se usay 1.5L mat banao!
3. AGAR CUSTOMER TUMHEN CHALLENGE KARE YA CONFUSE KARNE KI KOSHISH KARE:
   (Maslan customer kahe: "tum to keh rhy k pizza deal 2 mein 1 pizza aur 1.5 litre drink ha lekinn idhr to 2 medium pizza keh rha ha", ya "soch lo tum ghalat bol rahe ho", ya "ye to kuch aur keh raha hai"):
   - HARGIZ HARGIZ "meri ghalti thi", "sharminda hoon", ya "maazrat" ke behuda excuses mat bolo!
   - HARGIZ aisi jhooti batein na banao ke "pichli baat mein ghalti se 1 Large Pizza keh diya tha" jab ke tum ne nahi kaha!
   - Pur-etemaad (calm and confident) raho aur LIVE DEALS CACHE ke mutabiq haqeeqat wazeh karo.

MEALS VS DEALS WAZAHAT (CRITICAL RULE):
Cravey Crust ke catalog mein "Meals" aur "Deals" do mukhtalif options hain:
1. "PIZZA MEALS" (1 Pizza + Drinks - Individual / Small Group):
   - Pizza Meal For 1 (Rs. 599) = 1 Small Pizza + Regular Drink
   - Pizza Meal For 2 (Rs. 1299) = 1 Regular Pizza + 2 Regular Drinks
   - Pizza Meal For 3 (Rs. 1599) = 1 Large Pizza + 1 Litre Drink
   - Pizza Meal For 4 (Rs. 2499) = 1 Party Size Pizza + 1.5 Litre Drink
2. "NUMBERED VALUE DEALS" (Multiple Pizzas + Drink):
   - Deal 1 (Pizza) (Rs. 1099) = 2 Small Pizzas + 2 Regular Drinks
   - Deal 2 (Pizza) (Rs. 2099) = 2 Medium Pizzas + 1 Litre Drink
   - Deal 3 (Pizza) (Rs. 2999) = 2 Large Pizzas + 1 Litre Drink
   - Deal 4 (Burger) (Rs. 999) = 4 Zeggy Burgers
   - Deal 5 (Burger) (Rs. 1099) = 3 Zinger Burgers + 1 Litre Drink

JAB CUSTOMER "PIZZA DEAL 2" YA KISI AISAY NUMBER PAR CONFUSE HO:
Wazahat karo ke hamare paas do alag options hain:
- "Pizza Meal For 2" (Rs. 1299): 1 Regular Pizza aur 2 Regular Drinks
- "Deal 2" (Rs. 2099): 2 Medium Pizzas aur 1 Litre Drink
Aur customer se poocho ke "Aap in mein se konsi deal add karwana chahenge?"

BRAND AUTHORITY & CONFIDENT TONE:
- Tum Cravey Crust ke official representative "Burger Raja" ho.
- Apni baat par qaim raho aur live catalog ki information par 100% trust karo.
- FORBIDDEN PHRASES (HARGIZ MAT BOLO):
  - "sharminda hoon" (STRICTLY FORBIDDEN)
  - "meri ghalti thi" (STRICTLY FORBIDDEN)
  - "pichli baat mein ghalti se keh diya tha" (STRICTLY FORBIDDEN)
  - "confused ho gaya tha" (STRICTLY FORBIDDEN)
  - "sample ke tor par likh diya tha" (STRICTLY FORBIDDEN)
- Agar customer confirm karne ko kahe ("ab sahi kah rhy ho soch lo"):
  Confident aur polite jawab do:
  "Ji bilkul! Cravey Crust ke live menu ke mutabiq yeh details 100% accurate hain. Kya main yeh deal aapke cart mein add kar doon?"

NO DISCOUNT CODES / PROMOTIONS POLICY:
- Hamare paas alag se koi discount codes, vouchers ya promo codes dastiyab NAHI hain.
- Sirf aur sirf hamari official Meal Deals aur Value Deals dastiyab hain (jo already discounted prices par hain).
- Agar customer kisi discount, coupon, voucher ya promo code ke baare mein poochhe, to saaf aur politely Roman Urdu mein batao:
  "Hamare paas alag se koi discount ya promo code dastiyab nahi hai, lekin aap hamari shandaar discounted Meal Deals aur Pizza Deals enjoy kar sakte hain!"
- KABHI BHI koi discount code invent mat karo aur na hi customer se promo code maango.

CUSTOMER SENDER PHONE NUMBER & "SAME NUMBER" UNIVERSAL RULE:
- Customer ka ASLI verified WhatsApp sender number yeh hai: {{ $('Prepare Session').first().json.whatsappPhone }}.

JAB BHI CUSTOMER KA PHONE NUMBER POOCHO AUR CUSTOMER KUCH BHI AISA KAHE JIS KA MATLB "MERA WHATSAPP WALA NUMBER HI USE KARO" HO:
Yeh tamam phrases sab "same number" ke barabar hain:
  "same", "same number", "same whatsapp", "same rakhna",
  "yahi", "yahi number", "yahi wala", "yahi rakho",
  "yehi", "yehi number", "yehi wala",
  "yeh", "yeh number", "yeh jis se msg kr rha hoon", "yeh jis se message kar raha hoon",
  "is", "is number pe", "is number", "is wala", "is pe",
  "isi", "isi number", "isi pe", "isi se",
  "wahi", "wahi number", "wahi wala",
  "mera", "mera number", "mere number pe", "meri id",
  "apna", "apna number", "apne number pe", "apna hi number",
  "whatsapp", "whatsapp number", "whatsapp wala",
  "jis se msg kr rha hoon", "jis se message kar raha hoon",
  "messaging number", "is number se message kar raha hoon",
  "yahi rakho", "same rakhna", "default",
  ya koi bhi similar phrase jis ka matlb "usi number pe" ho.

YEH SUNNAY KE BAAD LAZMI KARO:
1. Final Summary mein Contact Number field mein customer ka actual number digits likho: {{ $('Prepare Session').first().json.whatsappPhone }}
   (Hargiz "Yahi WhatsApp number", "same number" ya koi aur text MAT LIKHO - SIRF ACTUAL NUMBER DIGITS!)
2. 'Create Confirmed Order' tool call mein 'phone' field KHALI CHHORO (blank/empty) - system khud customer ka verified WhatsApp number use kar lega.
3. KISI BHI SURAT MEIN koi fake ya dummy number USE MAT KARO!
4. Dobara phone number pooch kar customer ko tang mat karo jab customer ka WhatsApp number mojood hai!

SIRF aur SIRF tab naya number 'phone' field mein pass karo jab customer ne chat mein explicitly ek nayi mukammal 11-digit Pakistani number type ki ho.


MANDATORY ADD TO CART TOOL CALL (MENU ITEMS & DEALS):
- JAB BHI CUSTOMER KISI PIZZA, BURGER, ITEM YA DEAL KA SIZE / QUANTITY BATAYE YA ADD KARNE KA KAHE:
  (Maslan: "Medium", "Large", "Small", "Party Size", "Cheese Lover medium", "1 zinger", "add kardo", "ye chahiye"):
  1. TUMHE LAZMI 'Add to Cart' TOOL EXECUTE KARNA HAI!
  2. TOOL CALL KIYE BAGHAIR YEH JHOOT HARGIZ MAT BOLO KE "aapke cart mein add kar diya gaya hai"!
  3. LIVE MENU CATALOG se menuItemId aur variantId (maslan Cheese Lover ke liye menuItemId: cmv5k2ypv003spt5t7cvxv7xt aur Medium ke liye variantId: cmv5k2ypx003wpt5tn3rjfsk0) nikaal kar 'Add to Cart' tool call karo!
  4. Jab tool call success ho jaye, SIRF TAB customer ko confirm karo:
     "[Item Name] [Size/Variant] aapke cart mein add kar diya gaya hai. Kya aap kuch aur add karna chahenge, ya order checkout karein?"

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
2. CUSTOMER CHECKOUT TRIGGER HANDLING:
   - Jab customer kahe: "checkout", "jee check out kro", "nai sirf yehi krna ha", "nahi bas yahi", "sirf yehi", "final kardo", "order kardo", "bill kitna hua", "pack kardo", "bhej do":
     1. Iska matlab hai customer checkout shuru karna chahta hai!
     2. FORAN customer se Naam aur Delivery Address maango:
        "Theek hai! Order complete karne ke liye baraye meherbani apna Naam aur mukammal Delivery Address (Ghar/Gali number, Area) ya WhatsApp location pin share kar dein?"
     3. Aur contact number confirm karo:
        "Contact number yahi WhatsApp number ({{ $('Prepare Session').first().json.whatsappPhone }}) rahega ya koi doosra number dena chahenge?"
     4. KHABARDAAR: Pehle customer se address aur naam mile baghair 'Create Confirmed Order' tool call karna SAKHT MANA HAI!

MANDATORY 2-STEP CHECKOUT PROTOCOL (PEHLE CONFIRMATION MAANGNA LAZMI HAI):

STEP 1: DETAILS COLLECTION & FINAL SUMMARY (CUSTOMER SE CONFIRMATION MAANGO):
Jab customer order finalize / checkout / place karne ka kahe ya details de:
PEHLE Calculate Cart Totals call karo taake bill pata chale.
LEKIN FINAL SUMMARY CARD TAB TAK HARGIZ MAT BHEJO JAB TAK YEH 4 CHEEZEIN CUSTOMER EXPLICITLY NA DE CHUKA HO:

[1] CUSTOMER KA ASLI NAAM:
    - Agar customer ne abhi tak apna naam nahi bataya:
      Poocho: "Order complete karne ke liye baraye meherbani apna Naam bata dein?"
    - HARGIZ placeholder naam maslan "Customer", "User", ya "." use mat karo! Customer se asli naam maango.

[2] DELIVERY ADDRESS / LOCATION PIN (NO AUTO-GUESSING):
    - Agar customer ne apna complete address ya location pin share nahi ki:
      Poocho: "Apna mukammal Delivery Address (Ghar/Gali number, Area) ya WhatsApp location pin share kar dein?"
    - Customer ke bataye baghair KHUD SE KOI BHI ADDRESS (maslan School stop, Tarlai, Ghauri Town, Islamabad waghera) HARGIZ USE YA GUESS MAT KARO! STORE INFO ka address restaurant branch ka hai, delivery address NAHI hai!

[3] CONTACT PHONE NUMBER:
    - Customer ka verified WhatsApp number: {{ $('Prepare Session').first().json.whatsappPhone }} mojood hai.
    - Confirm karo: "Contact number yahi WhatsApp number ({{ $('Prepare Session').first().json.whatsappPhone }}) rahega ya koi doosra number dena chahenge?"
    - Agar customer "same", "same number", "yahi", "yehi", "isi pe" bole to {{ $('Prepare Session').first().json.whatsappPhone }} use karo. KABHI BHI 03001234567 waghera mat likho!

[4] PAYMENT METHOD:
    - Customer se poochho: "Payment Cash on Delivery (COD) ada karenge ya EasyPaisa?"

FINAL SUMMARY FORMAT (SIRF AUR SIRF TAB JAB 4 CHEEZEIN CUSTOMER SE MIL JAYEIN):
Aapke order ki mukammal details yeh hain:
Items: [Item List with size and quantity]
Total Bill: Rs. [Total] (Delivery Fee: Rs. [Fee])
Delivery Details:
- Naam: [Customer ka Asli Naam]
- Contact Number: {{ $('Prepare Session').first().json.whatsappPhone || '[Customer ka 11-digit mobile number]' }}
- Address: [Customer ka confirmed address ya location pin]
- Payment Method: [COD ya EasyPaisa]

Kya aapki yeh details theek hain? Order confirm karne ke liye haan ya confirm likhein.

WARNING: Final Summary mein Contact Number field mein customer ka actual 11-digit mobile number hona LAZMI hai (jaise {{ $('Prepare Session').first().json.whatsappPhone }}). Template text, fake numbers ya 'Yahi WhatsApp number' jaise words likhna mana hai!

⛔ SAKHT MANAHI (NEVER CALL Create Confirmed Order ON STEP 1):
- Jab customer apna naam, address, phone ya payment method bataye ya checkout bole:
  TUMHE SIRF AUR SIRF UPAR WALA FINAL SUMMARY CARD BHEJNA HAI AUR USER SE CONFIRMATION POOCHHNI HAI!
- Is turn par 'Create Confirmed Order' tool call karna 100% SAKHT MANA HAI!
- Pehle user se Final Summary par confirmation liye baghair order book karna jurm hai!

STEP 2: EXPLICIT CONFIRMATION KE BAAD ORDER CREATION:
- SIRF AUR SIRF TAB jab customer Final Summary Card dekhne ke baad aglay message mein explicitly kahe:
  "haan", "confirm", "theek hai", "yes", "ji", "ok", "kardo", "bhej do":
  1. Pehle check karo ke cart mein item mojood hai. Agar cart empty ho to pehle 'Add to Cart' tool call karke item add karo!
  2. SIRF AB 'Create Confirmed Order' tool call karo!
  3. TOOL RESPONSE SE MILA ASLI ORDER NUMBER:
     Tool ke response mein 'data.orderNumber' ya 'orderNumber' (maslan CC-000042) check karo aur customer ko foran real order number batao:
     "Mubarak ho! Aapka order kamyabi se confirm ho gaya hai aur aapka order number [Asli Order Number] hai. Aapka khana jald hi diye gaye address par bhej diya jayega. Cravey Crust pasand karne ka shukriya!"
  4. STRICT ZERO-HALLUCINATION RULE:
     - HARGIZ "CC-XXXXXX" jaisa placeholder mat likho!
     - AGAR TOOL CALL NAHI KI YA TOOL MEIN ERROR AYA: To order confirm hone ka jhoot HARGIZ MAT BOLO! Agar error aya to customer ko wahi masla batao.
- Agar customer details change karne ka kahe:
  Details update karo, naya Final Summary Card bhejo aur dobara confirmation maango.
- AGAR TOOL CALL MEIN KISI WAJAH SE CART_EMPTY ERROR AYE:
  Customer ko bahana mat banao, customer ke bataye item ko Add to Cart tool se add karo aur Create Confirmed Order call karo!

HUMAN HANDOVER & COMPLAINT HANDLING (MANDATORY TOOL CALL):
- Agar customer gussa ho, naraz ho, bad service ki complaint kare (maslan "service achi nahi", "address name pouchte nahi"), ya human / manager / malik / owner se baat karna chahe (maslan "apny malik se meri baat krwao", "manager se baat karni hai", "owner se baat", "human agent chahiye"):
  1. TUMHE LAZMI 'Request Human Handover' TOOL CALL KARNA HI HOGA!
  2. TOOL CALL KIYE BAGHAIR YEH JHOOT HARGIZ MAT BOLO KE "MAINE BAAT MANAGEMENT TAK POHCHA DI HAI"!
  3. Tool call mein customer ka reason saaf pass karo (maslan: "Customer wants to speak with owner/manager").
  4. Tool call ke baad customer ko politely batao:
     "Ji bilkul, main aapki request aur complaint hamare human management team ko forward kar raha hoon aur bot ko 2 ghante ke liye mute kar diya gaya hai. Hamara representative thodi hi der mein aap se rabta karega aur aapke maslay ko hal karega. Shukriya!\n\n(Agar aapko dobara bot shuru karna ho to kisi bhi waqt 'bot start' likh kar bhej dein)."`;
  agentNode.parameters.options.maxIterations = 5;
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

// 7. Execute Handover Mute node (Forward correct verified phone and pushName)
const muteNode = workflow.nodes.find(n => n.name === 'Execute Handover Mute');
if (muteNode && muteNode.parameters) {
  muteNode.parameters.jsonBody = "={{ JSON.stringify({\\n  chatId: $('Prepare Session').first().json.chatId || $('Webhook').first().json.body?.senderJid || $('Webhook').first().json.body?.chatId,\\n  sessionKey: $('Prepare Session').first().json.sessionKey,\\n  durationMinutes: 120,\\n  reason: $('Prepare Session').first().json.message || 'Customer requested human support representative',\\n  customerName: $('Prepare Session').first().json.pushName || $('Webhook').first().json.body?.pushName || $('Webhook').first().json.body?.name || undefined,\\n  customerPhone: $('Prepare Session').first().json.whatsappPhone || $('Webhook').first().json.body?.whatsappPhone || $('Webhook').first().json.body?.phone || $('Webhook').first().json.body?.senderPn || undefined\\n}) }}";
}

// 8. Format Handover Reply node (Include bot resume instructions)
const formatHandoverNode = workflow.nodes.find(n => n.name === 'Format Handover Reply');
if (formatHandoverNode && formatHandoverNode.parameters) {
  formatHandoverNode.parameters.jsCode = `return {
  sessionId: 'primary',
  chatId: $('Prepare Session').first().json.chatId || $('Webhook').first().json.body?.senderJid || '',
  output: 'Ji bilkul, main aapki request hamare human team member ko forward kar raha hoon aur bot ko 2 ghante ke liye mute kar diya gaya hai. Hamara representative thodi hi der mein aap se rabta karega aur aapke sath deal karega. Shukriya!\\n\\n(Agar aapko dobara bot shuru karna ho to kisi bhi waqt "bot start" likh kar bhej dein).'
};`;
}

// 9. Request Human Handover (AI Agent Tool) node (Forward customer phone & name)
const requestHandoverToolNode = workflow.nodes.find(n => n.name === 'Request Human Handover');
if (requestHandoverToolNode && requestHandoverToolNode.parameters) {
  requestHandoverToolNode.parameters.jsonBody = "={{ JSON.stringify({\\n  chatId: $('Prepare Session').first().json.chatId || $('Webhook').first().json.body?.senderJid || $('Webhook').first().json.body?.chatId,\\n  sessionKey: $('Prepare Session').first().json.sessionKey,\\n  durationMinutes: 120,\\n  reason: $fromAI('reason', 'Customer reason', 'string', 'Customer requested human support'),\\n  customerName: $('Prepare Session').first().json.pushName || $('Webhook').first().json.body?.pushName || $('Webhook').first().json.body?.name || undefined,\\n  customerPhone: $('Prepare Session').first().json.whatsappPhone || $('Webhook').first().json.body?.whatsappPhone || $('Webhook').first().json.body?.phone || $('Webhook').first().json.body?.senderPn || undefined\\n}) }}";
}

// 10. Create Confirmed Order (AI Agent Tool) node (Strict tool description and parameter guidelines)
const createOrderToolNode = workflow.nodes.find(n => n.name === 'Create Confirmed Order');
if (createOrderToolNode && createOrderToolNode.parameters) {
  createOrderToolNode.parameters.toolDescription = 'Asli order place karta hai. ⚠️ STRICT GATE: Customer ke address/naam/payment batane par ye tool call karna 100% SAKHT MANA HAI! Pehle customer ko Final Summary Card bhej kar confirmation poochna lazmi hai ("Kya aapki details theek hain? Order confirm karne ke liye haan ya confirm likhein"). Ye tool SIRF AUR SIRF TAB CALL KARO jab customer Final Summary dekhne ke baad ALAG SE aglay message mein "haan", "confirm", "theek hai", "yes", ya "ok" likh chuka ho. Agar customer ka current message confirmation nahi hai to ye tool call karna SAKHT MANA HAI. Result se CC-... order number milta hai.';
  createOrderToolNode.parameters.jsonBody = "={{ JSON.stringify({\\n  sessionKey: $('Prepare Session').first().json.sessionKey,\\n  chatId: $('Prepare Session').first().json.chatId || undefined,\\n  verifiedPhone: $('Prepare Session').first().json.whatsappPhone || undefined,\\n  confirmed: Boolean($('Check Cache & Classify Intent').first().json.confirmIntent),\\n  customerName: (() => { const n = String($fromAI('customerName', 'Customer ka asli naam jo usne chat mein bataya ho', 'string', '') || '').trim(); if (!n || /^(customer|user|guest|none|unknown|customer\\\\s*name|name|\\\\.)$/i.test(n) || n.length < 2) { const pn = String($('Prepare Session').first().json.pushName || '').trim(); if (pn && !/^(customer|user|guest|none|unknown|customer\\\\s*name|name|\\\\.)$/i.test(pn) && pn.length >= 2) return pn; return ''; } return n; })(),\\n  phone: (() => { const wa = String($('Prepare Session').first().json.whatsappPhone || '').trim(); const rawP = String($fromAI('phone', 'Customer ka naya phone number agar customer ne chat mein koi mukhtalif/doosra number likha ho warna khali chhoro. AGAR CUSTOMER NE SAME NUMBER KAHA HO YA WHATSAPP NUMBER MENTION KIYA HO TO KHALI CHHORO.', 'string', '') || '').trim(); if (!rawP) return wa; if (/yahi|yehi|same|wahi|isi|apna|default|whatsapp|my.?number|same.?number|apna.?number|yahi.?whatsapp|yehi.?number|isi.?number|isi.?pe/i.test(rawP) || /^(none|unknown|number|contact|phone)$/i.test(rawP)) return wa; const digits = rawP.replace(/[^0-9]/g, ''); const isDummy = /^(0?3001234567|0?3123456789|0?3000000000|0?3211234567|0?3321234567|0?3009876543|0?3120000000|0?3451234567|0?3331234567|0?3001111111|0?3001234568|0?3000000001|0?3111111111)$/.test(digits); if (isDummy || digits.length < 10) return wa; if (digits.startsWith('92') && digits.length === 12) return '0' + digits.slice(2); if (digits.length === 10 && digits.startsWith('3')) return '0' + digits; return digits; })(),\\n  contactNumberMode: 'provided',\\n  confirmationNumberMode: 'default',\\n  confirmationPhone: $fromAI('confirmationPhone', 'Sirf agar customer ne kisi aur number par confirmation maangi, warna khali', 'string', '') || undefined,\\n  delivery: {\\n    address: (() => { let addr = String($fromAI('deliveryAddress', 'Customer ka confirmed delivery address jo customer ne chat mein diya ho', 'string', '') || '').trim(); const isDummy = /^(school\\\\s*stop|tarlai|lehtrar\\\\s*road|near\\\\s*fazal|fazal\\\\s*e\\\\s*haq|islamabad|rawalpindi|customer\\\\s*address|none|unknown|n\\\\/a|address|delivery\\\\s*address|\\\\.)$/i.test(addr) || (addr.toLowerCase().includes('lehtrar') && addr.toLowerCase().includes('fazal')); if (isDummy) addr = ''; if (!addr) { if ($('Prepare Session').first().json.locationAddress) return $('Prepare Session').first().json.locationAddress; if ($('Prepare Session').first().json.locationLat) { return ($('Prepare Session').first().json.locationName ? $('Prepare Session').first().json.locationName + ', ' : '') + ($('Prepare Session').first().json.locationAddress || 'Shared Location') + ' (Location Pin: https://www.google.com/maps?q=' + $('Prepare Session').first().json.locationLat + ',' + $('Prepare Session').first().json.locationLng + ')'; } } return addr; })(),\\n    areaName: ($fromAI('deliveryAreaName', 'Delivery area ka naam', 'string', '') || $('Prepare Session').first().json.locationName || ''),\\n    areaId: $fromAI('deliveryAreaId', 'Area ID agar delivery check se mili, warna khali', 'string', '') || undefined,\\n    latitude: (Number($fromAI('latitude', 'Shared location ki latitude, warna 0', 'number', 0)) || Number($('Prepare Session').first().json.locationLat) || $('Webhook').first().json.body?.location?.latitude) || undefined,\\n    longitude: (Number($fromAI('longitude', 'Shared location ki longitude, warna 0', 'number', 0)) || Number($('Prepare Session').first().json.locationLng) || $('Webhook').first().json.body?.location?.longitude) || undefined,\\n    googleMapsUrl: $('Webhook').first().json.body?.location?.mapUrl || $('Webhook').first().json.body?.location?.originalUrl || ''\\n  },\\n  paymentMethod: String($fromAI('paymentMethod', 'COD ya EASYPAISA', 'string', 'COD') || 'COD').toUpperCase().replace(/\\\\s+/g, ''),\\n  notes: $fromAI('notes', 'Order notes, warna khali', 'string', '') || undefined,\\n  idempotencyKey: $('Prepare Session').first().json.messageId || undefined\\n}) }}";
}

// 11. Add to Cart (AI Agent Tool) node (Strict tool description)
const addToCartToolNode = workflow.nodes.find(n => n.name === 'Add to Cart');
if (addToCartToolNode && addToCartToolNode.parameters) {
  addToCartToolNode.parameters.toolDescription = 'LAZMI EXECUTE KARO jab customer kisi item ya deal ka size, quantity ya order karne ka kahe (maslan Medium, Large, Small, Cheese lover, Zinger). menuItemId aur variantId (sized items ke liye) ya dealId bhejo. Tool call kiye baghair cart mein add hone ka jhoot bolna sakht mana hai.';
  addToCartToolNode.parameters.jsonBody = "={{ JSON.stringify({\\n  menuItemId: $fromAI('menuItemId', 'Menu item ID, empty for deals', 'string', '') || undefined,\\n  variantId: $fromAI('variantId', 'Variant ID if any', 'string', '') || undefined,\\n  dealId: $fromAI('dealId', 'Deal ID, empty for menu items', 'string', '') || undefined,\\n  quantity: $fromAI('quantity', 'Quantity integer', 'number', 1),\\n  notes: $fromAI('notes', 'Item instructions', 'string', '') || undefined,\\n  chatId: $('Prepare Session').first().json.chatId || undefined,\\n  verifiedPhone: $('Prepare Session').first().json.whatsappPhone || undefined\\n}) }}";
}

// 12. Calculate Cart Totals (AI Agent Tool) node (Remove promoCode parameter)
const calcToolNode = workflow.nodes.find(n => n.name === 'Calculate Cart Totals');
if (calcToolNode && calcToolNode.parameters) {
  calcToolNode.parameters.jsonBody = "={{ JSON.stringify({\\n  deliveryAreaId: $fromAI('deliveryAreaId', 'Area ID from delivery check', 'string', '') || undefined,\\n  deliveryAreaName: $fromAI('deliveryAreaName', 'Delivery area name', 'string', '') || $('Prepare Session').first().json.locationName || undefined,\\n  address: $('Prepare Session').first().json.locationAddress || undefined,\\n  chatId: $('Prepare Session').first().json.chatId || undefined,\\n  verifiedPhone: $('Prepare Session').first().json.whatsappPhone || undefined,\\n  latitude: Number($fromAI('latitude', 'Latitude from shared location, else 0', 'number', 0) || $('Prepare Session').first().json.locationLat || $('Webhook').first().json.body?.location?.latitude || 0) || undefined,\\n  longitude: Number($fromAI('longitude', 'Longitude from shared location, else 0', 'number', 0) || $('Prepare Session').first().json.locationLng || $('Webhook').first().json.body?.location?.longitude || 0) || undefined\\n}) }}";
}

// 13. Google Gemini Chat Model (Fix model to valid official gemini-1.5-flash)
const geminiNode = workflow.nodes.find(n => n.name === 'Google Gemini Chat Model');
if (geminiNode && geminiNode.parameters) {
  geminiNode.parameters.modelName = 'models/gemini-1.5-flash';
  if (!geminiNode.parameters.options) geminiNode.parameters.options = {};
  geminiNode.parameters.options.maxOutputTokens = 2048;
  geminiNode.parameters.options.temperature = 0.2;
}

// 14. DeepSeek Chat Model (Official deepseek-chat) - Set as ONLY primary language model
const deepseekNode = workflow.nodes.find(n => n.name === 'DeepSeek Chat Model');
if (deepseekNode && deepseekNode.parameters) {
  deepseekNode.parameters.model = 'deepseek-chat';
  if (!deepseekNode.parameters.options) deepseekNode.parameters.options = {};
  deepseekNode.parameters.options.maxTokens = 2048;
  deepseekNode.parameters.options.temperature = 0.2;
}

// Ensure DeepSeek is the exclusive language model connected to AI Agent at index 0
workflow.connections['DeepSeek Chat Model'] = {
  ai_languageModel: [
    [
      {
        node: 'AI Agent',
        type: 'ai_languageModel',
        index: 0
      }
    ]
  ]
};
delete workflow.connections['Google Gemini Chat Model'];

// 15. Simple Memory (Reduce window length to 5 to save tokens and prevent memory bloat)
const memoryNode = workflow.nodes.find(n => n.name === 'Simple Memory');
if (memoryNode && memoryNode.parameters) {
  memoryNode.parameters.contextWindowLength = 5;
}

// 16. Completely remove 'Get Active Promotions' node and connections from workflow
workflow.nodes = workflow.nodes.filter(n => n.name !== 'Get Active Promotions');

if (workflow.connections['AI Agent'] && workflow.connections['AI Agent'].ai_tool) {
  workflow.connections['AI Agent'].ai_tool = workflow.connections['AI Agent'].ai_tool.map(group => 
    group.filter(conn => conn.node !== 'Get Active Promotions')
  );
}
delete workflow.connections['Get Active Promotions'];

// 17. Verify Order Reply node (Detect and intercept all fake claims, placeholders and unverified order confirmations)
const verifyNode = workflow.nodes.find(n => n.name === 'Verify Order Reply');
if (verifyNode && verifyNode.parameters) {
  verifyNode.parameters.jsCode = `const prep = $('Prepare Session').first().json;
const cls = $('Check Cache & Classify Intent').first().json;
let out = String($json.output || $json.text || '').trim();

if (!out) {
  out = 'Walaikum Assalam! Main Cravey Crust ka ordering assistant Burger Raja hoon. Hamare paas Mazedar Pizzas, Burgers aur Value Deals dastiyab hain. Hamara menu dekhne ke liye "menu" ya "deals" likhein, ya bataiye aap kya order karna chahenge!';
}

// 1. Check if Create Confirmed Order tool was ACTUALLY executed in this execution and returned success
let toolOrderNumber = null;
let orderToolError = null;
try {
  const orderRes = $('Create Confirmed Order').first()?.json;
  if (orderRes) {
    if (orderRes.success && (orderRes.data?.orderNumber || orderRes.orderNumber)) {
      toolOrderNumber = orderRes.data?.orderNumber || orderRes.orderNumber;
    } else if (orderRes.error || orderRes.code) {
      orderToolError = orderRes.error?.code || orderRes.error?.message || orderRes.code || orderRes.message || 'ORDER_ERROR';
    }
  }
} catch (e) {
  toolOrderNumber = null;
}

// Check if customer is asking about an existing order via Get Order Status
let orderStatusNumber = null;
try {
  const stRes = $('Get Order Status').first()?.json;
  if (stRes && (stRes.data?.orderNumber || stRes.orderNumber)) {
    orderStatusNumber = stRes.data?.orderNumber || stRes.orderNumber;
  }
} catch (e) {}

// 2. Detect placeholder or fake order numbers
const hasPlaceholderOrder = /\\bCC-(?:X{3,}|0{6}|123456)\\b/i.test(out);
const hasRealOrderPattern = /\\bCC-\\d{4,}\\b/i.test(out);

// If bot claimed CC-XXXXXX but the tool DID succeed with a real order number, fix the claim with real number!
if (toolOrderNumber) {
  if (hasPlaceholderOrder) {
    out = out.replace(/\\bCC-(?:X{3,}|0{6}|123456)\\b/gi, toolOrderNumber);
  } else if (!out.includes(toolOrderNumber)) {
    out = out.replace(/\\bCC-[A-Za-z0-9-]+\\b/g, toolOrderNumber);
  }
}

// 3. Catch FAKE ORDER CONFIRMATION CLAIMS (where bot claims order is placed/confirmed, but tool was NOT executed or failed)
const confirmationPhrases = /\\b(aapka order|order)\\b[^.!\\n]{0,40}\\b(kamyabi se confirm|confirm ho gaya|confirm ho gya|confirm ho chuka|confirm ho chuki|place ho gaya|place ho gya|book ho gaya|book ho gya|bhej diya jayega|tayyar ho raha hai)\\b/i;
const isClaimingConfirmed = confirmationPhrases.test(out) && !/cancel/i.test(out);

if (!toolOrderNumber && !orderStatusNumber && (isClaimingConfirmed || hasPlaceholderOrder)) {
  // The bot made a fake confirmation claim without a real order from the database
  if (orderToolError) {
    if (/CART_EMPTY/i.test(orderToolError)) {
      out = 'Aapka cart is waqt khali hai jis ki wajah se order confirm nahi ho saka. Baraye meherbani pehle apna pasandeeda item ya deal cart mein add karein, phir checkout karein.';
    } else if (/DELIVERY_ADDRESS_REQUIRED/i.test(orderToolError)) {
      out = 'Delivery address confirm nahi hua tha jis ki wajah se order process nahi ho saka. Baraye meherbani apna mukammal delivery address (ghar/gali number, area) ya WhatsApp location pin share kar dein.';
    } else if (/CUSTOMER_NAME_REQUIRED/i.test(orderToolError)) {
      out = 'Aapka naam confirm hona baaqi hai. Baraye meherbani apna asli naam bata dein taake order complete kiya ja sakay.';
    } else if (/CONTACT_NUMBER_REQUIRED/i.test(orderToolError)) {
      out = 'Contact number confirm hona baaqi hai. Baraye meherbani apna 11-digit mobile number bata dein ya "same number" likhein.';
    } else if (/CONFIRMATION_REQUIRED/i.test(orderToolError)) {
      out = 'Order confirm karne se pehle baraye meherbani details check kar lein. Kya aap yeh order confirm karna chahte hain? Confirm karne ke liye haan ya confirm likhein.';
    } else {
      out = 'Order confirm karne mein masla aa gaya (' + orderToolError + '). Baraye meherbani dobara "confirm" likhein ya "agent" likhein to hamari team madad karegi.';
    }
  } else {
    // Tool was never called at all! Bot just jumped to false confirmation
    out = 'Order confirm karne ke liye pehle details check kar lein. Kya aapki details mukammal hain aur aap order confirm karna chahte hain? Confirm karne ke liye "haan" ya "confirm" likhein.';
  }
}

// 4. Catch FAKE DELIVERY ADDRESS (Where bot claims restaurant's branch address as customer's delivery destination)
const restaurantBranchAddr = /(?:school\\s*stop|lehtrar\\s*road|fazal\\s*e\\s*haq|tarlai\\s*kalan)/i;
if (restaurantBranchAddr.test(out) && /(?:delivery\\s*address|address:)/i.test(out)) {
  out = out.replace(/(?:address|delivery\\s*address)\\s*:\\s*[^,\\n]*(?:school\\s*stop|lehtrar\\s*road|fazal\\s*e\\s*haq|tarlai\\s*kalan)[^\\n]*/gi, 'Address: [Baraye meherbani apna mukammal delivery address share karein]');
}

// 5. Catch FAKE HANDOVER CLAIM: Bot claims it muted and forwarded to human management, but tool was not called
let handoverToolSuccess = false;
try {
  const hRes = $('Request Human Handover').first()?.json;
  if (hRes && hRes.success !== false) handoverToolSuccess = true;
} catch (e) {
  handoverToolSuccess = false;
}
const claimsHandoverMute = /\\b(human management team|mute kar diya gaya hai|representative thodi hi der mein)\\b/i.test(out);
if (claimsHandoverMute && !handoverToolSuccess) {
  try {
    const targetChat = prep.chatId || $('Webhook').first().json.body?.senderJid || '';
    if (targetChat) {
      await this.helpers.httpRequest({
        method: 'POST',
        url: 'https://bot.craveycrust.com/api/internal/handover/mute',
        headers: { 'X-Internal-API-Secret': 'my-test-secret-123' },
        body: {
          chatId: targetChat,
          durationMinutes: 120,
          reason: 'Auto-mute from handover claim verification',
          customerPhone: prep.whatsappPhone || undefined,
          customerName: prep.pushName || undefined
        },
        json: true
      });
    }
  } catch (e) {}
}

// 6. Catch raw backend API error codes leaking to the customer
const isApiError = /\\b(CONTACT_NUMBER_REQUIRED|CUSTOMER_NAME_REQUIRED|DELIVERY_ADDRESS_REQUIRED|CART_EMPTY|MINIMUM_ORDER|ORDER_CREATION_FAILED|CONFIRMATION_REQUIRED)\\b/.test(out);
if (isApiError) {
  if (out.includes('CONFIRMATION_REQUIRED')) {
    out = 'Order confirm karne se pehle baraye meherbani details check kar lein. Kya aapki yeh details theek hain? Order confirm karne ke liye haan ya confirm likhein.';
  } else if (out.includes('CONTACT_NUMBER_REQUIRED')) {
    out = 'Phone number confirm karna reh gaya. Baraye meherbani apna contact number bata dein ya likhein "same number" agar yahi WhatsApp number use karna hai.';
  } else if (out.includes('CUSTOMER_NAME_REQUIRED')) {
    out = 'Apna naam confirm karna reh gaya. Baraye meherbani apna asli naam bata dein.';
  } else if (out.includes('DELIVERY_ADDRESS_REQUIRED')) {
    out = 'Delivery address confirm nahi hua. Baraye meherbani apna mukammal ghar/gali address ya WhatsApp location pin share karein.';
  } else if (out.includes('CART_EMPTY')) {
    out = 'Cart khali ho gayi. Baraye meherbani dobara items add karein aur phir checkout karein.';
  } else {
    out = 'Order mein masla aa gaya. Baraye meherbani dobara "confirm" likhein ya "agent" likhein to hamara team madad karega.';
  }
}

// 7. Strip template brackets like [Item Name], [Size/Variant] if LLM leaked prompt placeholders
out = out.replace(/\\[(?:Item List|Customer ka Asli Naam|Size\\/Variant|Total|Fee)\\]/g, '').trim();

return {
  sessionId: 'primary',
  chatId: prep.chatId || $('Webhook').first().json.body?.senderJid || '',
  output: out
};`;
}

// 5. Update Create Confirmed Order tool node
const orderNode = workflow.nodes.find(n => n.name === 'Create Confirmed Order');
if (orderNode && orderNode.parameters) {
  orderNode.parameters.jsonBody = "={{ JSON.stringify({\\n  sessionKey: $('Prepare Session').first().json.sessionKey,\\n  chatId: $('Prepare Session').first().json.chatId || undefined,\\n  verifiedPhone: $('Prepare Session').first().json.whatsappPhone || undefined,\\n  confirmed: Boolean($('Check Cache & Classify Intent').first().json.confirmIntent),\\n  customerName: (() => { const n = String($fromAI('customerName', 'Customer ka asli naam jo usne chat mein bataya ho', 'string', '') || '').trim(); if (!n || /^(customer|user|guest|none|unknown|customer\\\\s*name|name|\\\\.)$/i.test(n) || n.length < 2) { const pn = String($('Prepare Session').first().json.pushName || '').trim(); if (pn && !/^(customer|user|guest|none|unknown|customer\\\\s*name|name|\\\\.)$/i.test(pn) && pn.length >= 2) return pn; return ''; } return n; })(),\\n  phone: (() => { const wa = String($('Prepare Session').first().json.whatsappPhone || '').trim(); const rawP = String($fromAI('phone', 'Customer ka naya phone number agar customer ne chat mein koi mukhtalif/doosra number likha ho warna khali chhoro. AGAR CUSTOMER NE SAME NUMBER KAHA HO YA WHATSAPP NUMBER MENTION KIYA HO TO KHALI CHHORO.', 'string', '') || '').trim(); if (!rawP || /yahi|yehi|same|wahi|isi|apna|default|whatsapp|my.?number|same.?number|apna.?number|yahi.?whatsapp|yehi.?number|isi.?number|isi.?pe/i.test(rawP) || /^(none|unknown|number|contact|phone)$/i.test(rawP)) return wa; const digits = rawP.replace(/[^0-9]/g, ''); const isDummyOrBot = digits.includes('3055375501') || /^(0?3001234567|0?3123456789|0?3000000000|0?3211234567|0?3321234567|0?3009876543|0?3120000000|0?3451234567|0?3331234567|0?3001111111|0?3001234568|0?3000000001|0?3111111111)$/.test(digits); if (isDummyOrBot || digits.length < 10) return wa; if (digits.startsWith('92') && digits.length === 12) return '0' + digits.slice(2); if (digits.length === 10 && digits.startsWith('3')) return '0' + digits; return digits; })(),\\n  contactNumberMode: (() => { const rawP = String($fromAI('phone', 'Customer ka phone number', 'string', '') || '').trim(); if (!rawP || /yahi|yehi|same|wahi|isi|apna|default|whatsapp|my.?number|same.?number|apna.?number|yahi.?whatsapp|yehi.?number|isi.?number|isi.?pe/i.test(rawP)) return 'same_whatsapp'; return 'provided'; })(),\\n  confirmationNumberMode: 'default',\\n  confirmationPhone: $fromAI('confirmationPhone', 'Sirf agar customer ne kisi aur number par confirmation maangi, warna khali', 'string', '') || undefined,\\n  delivery: {\\n    address: (() => { let addr = String($fromAI('deliveryAddress', 'Customer ka confirmed delivery address jo customer ne chat mein diya ho', 'string', '') || '').trim(); const isDummy = /^(school\\\\s*stop|tarlai|lehtrar\\\\s*road|near\\\\s*fazal|fazal\\\\s*e\\\\s*haq|islamabad|rawalpindi|customer\\\\s*address|none|unknown|n\\\\/a|address|delivery\\\\s*address|\\\\.)$/i.test(addr) || (addr.toLowerCase().includes('lehtrar') && addr.toLowerCase().includes('fazal')); if (isDummy) addr = ''; if (!addr) { if ($('Prepare Session').first().json.locationAddress) return $('Prepare Session').first().json.locationAddress; if ($('Prepare Session').first().json.locationLat) { return ($('Prepare Session').first().json.locationName ? $('Prepare Session').first().json.locationName + ', ' : '') + ($('Prepare Session').first().json.locationAddress || 'Shared Location') + ' (Location Pin: https://www.google.com/maps?q=' + $('Prepare Session').first().json.locationLat + ',' + $('Prepare Session').first().json.locationLng + ')'; } } return addr; })(),\\n    areaName: ($fromAI('deliveryAreaName', 'Delivery area ka naam', 'string', '') || $('Prepare Session').first().json.locationName || ''),\\n    areaId: $fromAI('deliveryAreaId', 'Area ID agar delivery check se mili, warna khali', 'string', '') || undefined,\\n    latitude: (Number($fromAI('latitude', 'Shared location ki latitude, warna 0', 'number', 0)) || Number($('Prepare Session').first().json.locationLat) || $('Webhook').first().json.body?.location?.latitude) || undefined,\\n    longitude: (Number($fromAI('longitude', 'Shared location ki longitude, warna 0', 'number', 0)) || Number($('Prepare Session').first().json.locationLng) || $('Webhook').first().json.body?.location?.longitude) || undefined,\\n    googleMapsUrl: $('Webhook').first().json.body?.location?.mapUrl || $('Webhook').first().json.body?.location?.originalUrl || ''\\n  },\\n  paymentMethod: String($fromAI('paymentMethod', 'COD ya EASYPAISA', 'string', 'COD') || 'COD').toUpperCase().replace(/\\\\s+/g, ''),\\n  notes: $fromAI('notes', 'Order notes, warna khali', 'string', '') || undefined,\\n  idempotencyKey: $('Prepare Session').first().json.messageId || undefined\\n}) }}";
}

// Write exclusively to n8n.json
const workflowFiles = [
  'n8n.json'
];

for (const wf of workflowFiles) {
  const target = path.join(__dirname, '..', wf);
  fs.writeFileSync(target, JSON.stringify(workflow, null, 2), 'utf8');
  console.log('Successfully updated:', wf);
}

