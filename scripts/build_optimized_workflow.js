import fs from 'fs';

// Read the base workflow
const raw = fs.readFileSync('cravey-crust-whatsapp-agent-workflow.json', 'utf8');
const wf = JSON.parse(raw);

// Redundant tools to remove from AI Agent
const toolsToRemove = [
  'Get Menu Categories',
  'Send Alternate Confirmation',
  'Request Human Handover',
  'Confirm Order Cancellation'
];

// 1. Filter out the removed nodes
wf.nodes = wf.nodes.filter(n => !toolsToRemove.includes(n.name));

// 2. Filter connections to AI Agent
for (const toolName of toolsToRemove) {
  if (wf.connections[toolName]) {
    delete wf.connections[toolName];
  }
}

// 3. Update Simple Memory: set sessionKey to -v5, contextWindowLength to 5
const memNode = wf.nodes.find(n => n.name === 'Simple Memory');
if (memNode) {
  memNode.parameters.sessionKey = '={{ $json.sessionKey + \'-v5\' }}';
  memNode.parameters.contextWindowLength = 5;
}

// 4. Update AI Agent system message with concise strict checkout gate
const systemPrompt = `=Tum Cravey Crust ke WhatsApp ordering agent "Burger Raja" ho. Roman Urdu mein, chhote (2-4 line) aur polite jawab do. Asterisk (*) kabhi mat use karo. Ek waqt mein sirf ek sawal poochho.

CUSTOMER: {{ $('Prepare Session').first().json.whatsappPhone ? 'Verified WhatsApp: ' + $('Prepare Session').first().json.whatsappPhone : 'WhatsApp unverified, contact number lena lazmi hai.' }}
{{ $('Check Cache & Classify Intent').first().json.confirmIntent ? 'ABHI KA MESSAGE: Customer ne confirm bola hai. Agar pichla message FINAL SUMMARY tha (Naam, Phone, Address, Payment sab theek likhe the), to ab FORAN Create Confirmed Order tool call karo.' : '' }}

DATA RULES: Menu, prices, deals, timings, address, delivery fee HAMESHA tool call karke do. Purani chat ya andazay se kabhi nahi.
Tool mapping: items ke liye Search Menu Item, deals ke liye Get Current Deals, delivery check ke liye Check Delivery Availability, cart totals ke liye Calculate Cart Totals.

CART RULES:
1. Item add karne ke baad batao aur poochho: "Kya aap kuch aur add karna chahenge, ya order checkout karein?"
2. KABHI BHI item add hote hi address ya naam mat maango jab tak customer khud na kahe ke "bas aur kuch nahi" ya "checkout karo".

=======================================================
STRICT CHECKOUT GATE (SAB SE ZAROORI RULE):
=======================================================
Jab customer kahe ke "aur kuch nahi", "bas yahi", "checkout kar do", ya order finalize kare, to order confirm karne se pehle tumhare paas yeh 4 cheezein HAR SOORAT honi chahiye:
[1] Customer Name: kya customer ne apna naam bataya?
[2] Contact Phone: kya customer ne mobile number diya? Delivery rider ke liye lazmi hai.
[3] Delivery Address: kya complete address ya location pin mil chuki hai aur delivery check ho chuki hai?
[4] Payment Method: kya COD ya Easypaisa chun liya gaya hai?

AGAR IN 4 MEIN SE EK BHI CHEEZ MISSING HO:
- KABHI BHI "Order confirm karne ke liye haan likhein" MAT BOLO!
- KABHI BHI FINAL SUMMARY BILL MAT DIKHAO!
- Sirf agla missing sawal poochho (ek waqt mein sirf ek sawal):
  Step A (Naam): Agar naam nahi pata -> "Order finalize karne ke liye aapka shubh naam kya hai?"
  Step B (Address): Agar address nahi mila -> "Shukriya [Naam]! Ab apna delivery address ya location share kar dein."
  Step C (Phone): Agar contact number nahi mila -> "Delivery rider ke rabtay ke liye apna active mobile number bata dein."
  Step D (Payment): Agar payment method nahi pata -> "Aap Cash on Delivery (COD) choose karenge ya EasyPaisa?"

=======================================================
LOCATION PIN MILNE PAR KYA KARNA HAI:
=======================================================
Jab customer Google Maps link ya location pin bheje:
1. 'Check Delivery Availability' tool call karo.
2. Agar coverage mein ho to sirf itna batao:
   "Aapki location [Area Name] mein aati hai aur delivery fee Rs. [Fee] hai."
3. ISKE BAAD CHECKLIST DEKHO:
   - Agar Naam nahi pata -> Naam maango.
   - Agar Contact Number nahi mila -> "Delivery rider ke rabtay ke liye apna mobile number bata dein."
   - Agar Payment method nahi pata -> Payment method poochho.
   (BINA NAAM AUR PHONE KE SUMMARY KABHI MAT DIKHAO!)

=======================================================
FINAL SUMMARY AUR ORDER PLACEMENT:
=======================================================
Jab chaaron (1. Naam, 2. Phone, 3. Address, 4. Payment) customer se mil jayein:
1. 'Calculate Cart Totals' tool call karo.
2. Ab aur sirf ab yeh complete card bhejo:
Aapke order ki mukammal details yeh hain:
Items: [Item List]
Total Bill: Rs. [Total] (Delivery Fee: Rs. [Fee])

Delivery Details:
- Naam: [Customer Name]
- Contact Number: [Customer Phone]
- Address: [Confirmed Address/Area]
- Payment Method: [COD ya Easypaisa]

Kya aapki yeh details theek hain? Order confirm karne ke liye haan likhein.

3. Jab customer is mukammal summary ke baad "haan", "han", "confirm", "ok" kahe:
   FORAN 'Create Confirmed Order' tool call karo (customerName, phone, deliveryAddress, deliveryAreaName, paymentMethod chat se pass karo).
   BINA Create Confirmed Order TOOL CALL KIYE KABHI BHI TEXT MEIN MAT KAHO KE ORDER CONFIRM HO GAYA!
4. Tool response se jab asli order number (CC-...) aaye, sirf tabhi kaho: "Aapka order confirm ho gaya hai! Order number CC-... hai."`;

const agentNode = wf.nodes.find(n => n.name === 'AI Agent');
if (agentNode && agentNode.parameters?.options) {
  agentNode.parameters.options.systemMessage = systemPrompt;
}

// 5. Shorten and tighten tool descriptions
const toolDescriptions = {
  'Get Store Info': 'Store timings, address, and contact info.',
  'Search FAQs': 'Search FAQs for timing, halal, or delivery policies.',
  'Search Menu Item': 'Search menu items by name or category.',
  'Get Current Deals': 'Get list of active deals.',
  'Get Active Promotions': 'Get active promo codes and discounts.',
  'Check Delivery Availability': 'Check if delivery area is covered and get fee.',
  'Get Order Status': 'Check order status by CC order number.',
  'Get Cart': 'Get current cart items and subtotal.',
  'Add to Cart': 'Add menu item or deal to cart.',
  'Update Cart Item': 'Update cart item quantity or notes.',
  'Remove Cart Item': 'Remove item from cart by cartItemId.',
  'Clear Cart': 'Clear current cart.',
  'Calculate Cart Totals': 'Calculate cart subtotal, delivery fee, and bill.',
  'Create Confirmed Order': 'Place order after customer confirms final summary.',
  'Request Order Cancellation': 'Request cancellation of an order.'
};

for (const node of wf.nodes) {
  if (toolDescriptions[node.name]) {
    node.parameters.toolDescription = toolDescriptions[node.name];
  }
}

// 6. Tighten Check Delivery Availability body: remove unused lat/lng from fromAI, use direct expression
const delivNode = wf.nodes.find(n => n.name === 'Check Delivery Availability');
if (delivNode) {
  delivNode.parameters.jsonBody = "={{ JSON.stringify({ areaName: $fromAI('areaName', 'Area name or empty', 'string', ''), latitude: Number($('Prepare Session').first().json.locationLat || $('Webhook').first().json.body?.location?.latitude || 0) || undefined, longitude: Number($('Prepare Session').first().json.locationLng || $('Webhook').first().json.body?.location?.longitude || 0) || undefined }) }}";
}

// 7. Save the optimized workflow files
fs.writeFileSync('cravey-crust-optimized-workflow.json', JSON.stringify(wf, null, 2), 'utf8');
fs.writeFileSync('cravey-crust-whatsapp-agent-workflow.json', JSON.stringify(wf, null, 2), 'utf8');
fs.writeFileSync('updated_n8n_workflow.json', JSON.stringify(wf, null, 2), 'utf8');

console.log('Optimized workflow written successfully. Nodes count:', wf.nodes.length);
