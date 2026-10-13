import { readFileSync, writeFileSync } from 'fs';

const wf = JSON.parse(readFileSync('updated_n8n_workflow.json', 'utf8'));

// ===== 1. COMPRESSED SYSTEM PROMPT (~55% shorter) =====
const newSysMsg = `=Tum Cravey Crust ke WhatsApp agent "Burger Raja" ho. Roman Urdu, 2-4 line, polite. Asterisk (*) mat use karo. Ek waqt ek sawal.

PHONE: {{ $('Prepare Session').first().json.whatsappPhone ? 'Verified: ' + $('Prepare Session').first().json.whatsappPhone + ' (dobara mat maango)' : 'Number verify nahi, order se pehle contact number zaroor maango.' }}
{{ $('Check Cache & Classify Intent').first().json.confirmIntent ? 'CONFIRM INTENT: Agar pichla msg order summary tha to FORAN Create Confirmed Order call karo. Cancellation tha to Confirm Order Cancellation(true) karo.' : '' }}

DATA: Sab kuch tools se lo, apni taraf se kabhi nahi. Item/price->Search Menu Item, categories->Get Menu Categories, deals->Get Current Deals, promo->Get Active Promotions, FAQ/timing/address->Search FAQs, delivery->Check Delivery Availability. Tool error ya khali response: "Abhi system se data nahi mil raha." Promotions khali: "Filhal koi discount code nahi, lekin deals enjoy karein!"

TOOLS: Sirf zaroori call karo. Jo data mil chuka dobara mat mangwao. Kai items ek saath search karo. Tool error aaye to customer ko seedha batao.

CART:
1. Add: menuItemId+variantId YA dealId (dono nahi). Update: Update Cart Item. Remove: Remove Cart Item. Clear: Clear Cart. Bill: Calculate Cart Totals.
2. Item add ke baad HAMESHA poochho: "Kuch aur add karna chahenge ya checkout karein?"
3. Item add hote hi delivery/payment mat maango.
4. Checkout details tab maango jab customer "nahi"/"checkout"/"location" bheje.

LOCATION: Location mile to FORAN Check Delivery Availability call karo (lat/lng ya areaName).
- available:true: "Aapki location [Area] mein hai. Fee: Rs.[X]." Cart ho to Calculate Cart Totals + summary + "haan likhen." Cart khali ho to kya order karna poochho.
- available:false: "Maazrat, yeh area delivery range se bahar hai." Areas tool se batao.

ORDER CONFIRM: Haan/ji/yes/ok/done milte hi FORAN Create Confirmed Order call karo, dobara mat poochho. CC-... number aaye tab hi "order confirm hua" kaho. Error ho to reason se solve karo.

STATUS/CANCEL: Get Order Status. Cancel: Request Order Cancellation phir Confirm Order Cancellation(true/false).

HANDOVER: "agent"/"bande se"/"manager" sunte hi FORAN Request Human Handover(durationMinutes:120). Phir: "Main request forward kar raha hoon, bot 2 ghante mute. Representative rabta karega."`;

const agent = wf.nodes.find(n => n.name === 'AI Agent');
const oldSysLen = (agent.parameters.options.systemMessage || '').length;
agent.parameters.options.systemMessage = newSysMsg;
console.log(`System prompt: ${oldSysLen} -> ${newSysMsg.length} chars | Tokens saved: ~${Math.round((oldSysLen - newSysMsg.length) / 4)}`);

// ===== 2. MEMORY WINDOW: 10 -> 4 =====
const mem = wf.nodes.find(n => n.name === 'Simple Memory');
const oldWindow = mem.parameters.contextWindowLength;
mem.parameters.contextWindowLength = 4;
console.log(`Memory window: ${oldWindow} -> 4 | Tokens saved: ~${(oldWindow - 4) * 175}`);

// ===== 3. SHORTEN $fromAI DESCRIPTIONS =====
const replacements = [
  // Add to Cart
  ['Add to Cart', 'jsonBody', 'Menu item ID, empty for deals', 'Menu item ID'],
  ['Add to Cart', 'jsonBody', 'Variant ID if any', 'Variant ID'],
  ['Add to Cart', 'jsonBody', 'Deal ID, empty for menu items', 'Deal ID'],
  ['Add to Cart', 'jsonBody', 'Quantity integer', 'Qty'],
  ['Add to Cart', 'jsonBody', 'Item instructions', 'Notes'],
  // Update Cart Item
  ['Update Cart Item', 'jsonBody', 'New quantity or 0', 'New qty'],
  ['Update Cart Item', 'jsonBody', 'Updated notes or empty', 'Notes'],
  // Calculate Cart Totals
  ['Calculate Cart Totals', 'jsonBody', 'Only if customer gave a code', 'Promo code'],
  ['Calculate Cart Totals', 'jsonBody', 'Area ID from delivery check', 'Area ID'],
  ['Calculate Cart Totals', 'jsonBody', 'Delivery area name', 'Area name'],
  ['Calculate Cart Totals', 'jsonBody', 'Latitude from shared location, else 0', 'Latitude'],
  ['Calculate Cart Totals', 'jsonBody', 'Longitude from shared location, else 0', 'Longitude'],
  // Check Delivery Availability
  ['Check Delivery Availability', 'jsonBody', 'Area name, empty if only location pin/coordinates', 'Area name'],
  ['Check Delivery Availability', 'jsonBody', 'Latitude from shared location or coordinates, else 0', 'Latitude'],
  ['Check Delivery Availability', 'jsonBody', 'Longitude from shared location or coordinates, else 0', 'Longitude'],
  // Create Confirmed Order
  ['Create Confirmed Order', 'jsonBody', 'Customer ka naam (pichli chat se)', 'Customer name'],
  ['Create Confirmed Order', 'jsonBody', 'Sirf agar customer ne alag contact number diya ho, warna khali chhodo', 'Contact number if different'],
  ['Create Confirmed Order', 'jsonBody', 'Sirf agar customer ne kisi aur number par confirmation maangi, warna khali', 'Alt confirmation number'],
  ['Create Confirmed Order', 'jsonBody', 'Customer ka confirmed delivery address', 'Delivery address'],
  ['Create Confirmed Order', 'jsonBody', 'Delivery area ka naam', 'Area name'],
  ['Create Confirmed Order', 'jsonBody', 'Area ID agar delivery check se mili, warna khali', 'Area ID'],
  ['Create Confirmed Order', 'jsonBody', 'Shared location ki latitude, warna 0', 'Latitude'],
  ['Create Confirmed Order', 'jsonBody', 'Shared location ki longitude, warna 0', 'Longitude'],
  ['Create Confirmed Order', 'jsonBody', 'COD ya EASYPAISA', 'COD or EASYPAISA'],
  ['Create Confirmed Order', 'jsonBody', 'Promo code agar diya ho, warna khali', 'Promo code'],
  ['Create Confirmed Order', 'jsonBody', 'Order notes, warna khali', 'Order notes'],
  ['Create Confirmed Order', 'jsonBody', 'Sirf agar customer ne alag contact number diya ho, warna khali chhodo', 'Contact number if different'],
  // Order Cancellation
  ['Request Order Cancellation', 'jsonBody', 'Order number', 'CC order number'],
  ['Confirm Order Cancellation', 'jsonBody', 'true for yes/haan, false for no/nahi', 'true=yes false=no'],
  ['Confirm Order Cancellation', 'jsonBody', 'Order number', 'CC order number'],
  // Send Alternate Confirmation
  ['Send Alternate Confirmation', 'jsonBody', 'Alternate WhatsApp number', 'Alt WhatsApp number'],
  ['Send Alternate Confirmation', 'jsonBody', 'Plain text order summary without asterisks', 'Order summary text'],
  // Handover
  ['Request Human Handover', 'jsonBody', 'Customer reason', 'Reason'],
  // Get Order Status - URL param
  ['Get Order Status', 'url', 'Order number e.g. CC-20261012-0001', 'CC order number'],
  // Search FAQs - query param
  ['Search FAQs', null, 'FAQ keyword', 'Keyword'],
  // Search Menu Item - query param
  ['Search Menu Item', null, 'Item or category name', 'Item name'],
];

let totalCharsSaved = 0;
for (const [toolName, paramKey, oldText, newText] of replacements) {
  const t = wf.nodes.find(n => n.name === toolName);
  if (!t) { console.warn(`Tool not found: ${toolName}`); continue; }

  let replaced = false;
  // Try jsonBody
  if ((paramKey === 'jsonBody' || paramKey === null) && t.parameters.jsonBody && t.parameters.jsonBody.includes(oldText)) {
    t.parameters.jsonBody = t.parameters.jsonBody.replaceAll(oldText, newText);
    totalCharsSaved += (oldText.length - newText.length);
    replaced = true;
  }
  // Try url
  if ((paramKey === 'url' || paramKey === null) && t.parameters.url && t.parameters.url.includes(oldText)) {
    t.parameters.url = t.parameters.url.replaceAll(oldText, newText);
    totalCharsSaved += (oldText.length - newText.length);
    replaced = true;
  }
  // Try queryParameters
  if (!replaced && t.parameters.queryParameters) {
    const qpStr = JSON.stringify(t.parameters.queryParameters);
    if (qpStr.includes(oldText)) {
      t.parameters.queryParameters = JSON.parse(qpStr.replaceAll(oldText, newText));
      totalCharsSaved += (oldText.length - newText.length);
    }
  }
}
console.log(`fromAI descriptions shortened: saved ~${Math.round(totalCharsSaved / 4)} tokens`);

// ===== SAVE =====
writeFileSync('updated_n8n_workflow.json', JSON.stringify(wf, null, 2));

const memSave = (oldWindow - 4) * 175;
const toolSave = Math.round(totalCharsSaved / 4);
const sysSave = Math.round((oldSysLen - newSysMsg.length) / 4);
const totalSave = memSave + toolSave + sysSave;
console.log('\n=== SUMMARY ===');
console.log(`System prompt savings: ~${sysSave} tokens`);
console.log(`Memory window savings: ~${memSave} tokens`);
console.log(`Tool description savings: ~${toolSave} tokens`);
console.log(`TOTAL SAVED: ~${totalSave} tokens per LLM call`);
console.log(`7791 - ${totalSave} = ~${7791 - totalSave} tokens (${Math.round((1 - (7791-totalSave)/7791)*100)}% reduction)`);
console.log('Done! File saved to updated_n8n_workflow.json');
