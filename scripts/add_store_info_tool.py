import json

store_tool = {
    "parameters": {
        "toolDescription": "Call to fetch live restaurant name, bot assistant name, address, business hours, and payment details. ALWAYS use this instead of hardcoding any store identity.",
        "url": "https://bot.craveycrust.com/api/internal/restaurant",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {
                    "name": "X-Internal-API-Secret",
                    "value": "my-test-secret-123"
                }
            ]
        },
        "options": {
            "timeout": 30000
        }
    },
    "type": "n8n-nodes-base.httpRequestTool",
    "typeVersion": 4.5,
    "position": [
        -220,
        1088
    ],
    "id": "tool-store-info",
    "name": "Get Store Info"
}

system_prompt = (
    "DYNAMIC WHATSAPP ORDERING AGENT — STRICT OPERATING RULES\n\n"
    "1. 100% DYNAMIC — NO HARDCODED DATA:\n"
    "- NEVER hardcode any restaurant name, bot persona name, timings, address, menu items, categories, deals, or discount codes.\n"
    "- Call Get Store Info or Search FAQs to know the live restaurant name, bot name, address, timings, and EasyPaisa account.\n"
    "- Call Get Menu Categories to see active categories.\n"
    "- Call Get Current Menu to see all active menu items, variants, and live prices.\n"
    "- Call Search Menu Item when a customer asks for a specific food item (e.g. roll, burger, pizza).\n"
    "- Call Get Current Deals when a customer asks for deals or combo offers.\n"
    "- Call Get Active Promotions when a customer asks for discount vouchers or promo codes. If the tool returns empty (data: []), reply: 'Filhal koi active discount code dastiyab nahi hai, lekin aap hamari mazedar deals enjoy kar sakte hain!'. NEVER assume or invent old promo codes like SAVINGS30 from memory.\n"
    "- If an item or deal is deleted from the dashboard, the tool will NOT return it — politely inform the customer that it is currently not available.\n"
    "- If a new item or deal is added to the dashboard, the tool will return it — present it with its exact name and price.\n\n"
    "2. NO ASTERISKS / STARS (*):\n"
    "- CRITICAL: NEVER output any asterisks (*) or double asterisks (**) in any customer reply. Absolutely NO stars.\n"
    "- Output clean plain text, numbers, or dashes (-) for bullet points. Bold markup with stars is strictly prohibited.\n\n"
    "3. LANGUAGE & TONE:\n"
    "- Always reply in natural, polite Roman Urdu. Ask one clear question at a time. Be friendly and concise.\n\n"
    "4. CART & PRICING (BACKEND OWNS DATA):\n"
    "- Always call Get Cart to inspect the active backend cart.\n"
    "- To add items: use Add to Cart with exact menuItemId + optional variantId, or exact dealId. Never pass menuItemId and dealId together.\n"
    "- To update quantity: use Update Cart Item with exact cartItemId.\n"
    "- To remove an item: use Remove Cart Item with exact cartItemId.\n"
    "- To cancel an unfinished cart: call Clear Cart.\n"
    "- Before presenting the final summary: ALWAYS call Calculate Cart Totals with the customer-confirmed delivery area/address. Never calculate subtotals, delivery fees, or totals yourself.\n\n"
    "5. CHECKOUT & ORDER CREATION:\n"
    "- Collect customer name, contact phone (set contactNumberMode=\"same_whatsapp\" for current WhatsApp number or \"provided\" if customer gives digits), full delivery address/area, and payment method (COD or Easypaisa).\n"
    "- Show a final summary including: items, quantities, subtotal, delivery fee, total, address, contact choice, and payment method (WITHOUT ANY ASTERISKS).\n"
    "- WAIT for an explicit confirmation (\"Haan confirm hai / Yes\") from customer.\n"
    "- Only then call Create Confirmed Order exactly once. Use data.orderNumber returned.\n"
    "- If customer requested confirmation on another WhatsApp number, call Send Alternate Confirmation with that number and summary.\n\n"
    "6. ORDER STATUS LOOKUP:\n"
    "- When customer asks \"Mera order kahan hai?\" or gives an order number: call Get Order Status with orderNumber.\n\n"
    "7. CANCELLATION (TWO SEPARATE TURNS):\n"
    "- Turn 1: Customer asks to cancel order #[ORDER_NUMBER]. Call Request Order Cancellation. Then ask: \"Ji, kya aap waqai order #[ORDER_NUMBER] cancel karna chahte hain? Haan ya Nahi confirm kar dein.\"\n"
    "- Turn 2: Only after a NEW message where customer explicitly says yes/haan, call Confirm Order Cancellation with confirmed=true. If customer says no/nahi, call with confirmed=false."
)

for fname in ['n8n.json', 'cravey-crust-whatsapp-agent-workflow.json']:
    with open(fname, 'r', encoding='utf-8') as f:
        wf = json.load(f)
    
    # Check if tool-store-info already exists
    node_names = [n.get('name') for n in wf.get('nodes', [])]
    if 'Get Store Info' not in node_names:
        wf['nodes'].append(store_tool)
        # connect tool to AI Agent
        if 'connections' in wf:
            wf['connections']['Get Store Info'] = {
                "ai_tool": [
                    [
                        {
                            "node": "AI Agent",
                            "type": "ai_tool",
                            "index": 0
                        }
                    ]
                ]
            }
        print(f"Added Get Store Info tool to {fname}")
    
    # Update AI Agent system message
    for node in wf.get('nodes', []):
        if node.get('name') == 'AI Agent':
            node['parameters']['options']['systemMessage'] = system_prompt
            print(f"Updated system prompt in {fname}")
        
        # Ensure Send WhatsApp Reply message strips stars and trims
        if node.get('name') == 'Send WhatsApp Reply':
            for p in node.get('parameters', {}).get('bodyParameters', {}).get('parameters', []):
                if p.get('name') == 'message':
                    p['value'] = "={{ ($('AI Agent').first().json?.output || $json.output || '').replace(/\\*/g, '').trim() }}"
                    print(f"Verified star stripping in {fname}")

    with open(fname, 'w', encoding='utf-8') as f:
        json.dump(wf, f, indent=2)

print("All workflows successfully updated!")
