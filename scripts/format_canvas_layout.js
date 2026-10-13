import fs from 'fs';

const wf = JSON.parse(fs.readFileSync('cravey-crust-whatsapp-agent-workflow.json', 'utf8'));

// Define clean, non-overlapping coordinates for every node
const positions = {
  // Main Flow (Left to Right)
  "Webhook": [100, 300],
  "Prepare Session": [320, 300],
  "Skip Empty Message": [540, 300],
  "Check Cache & Classify Intent": [780, 300],
  "Route by Intent": [1040, 300],

  // Branch 1: Live Categories (Top Row)
  "Fetch Live Categories": [1300, 140],
  "Format Live Categories": [1540, 140],

  // Branch 2: Live Deals (Middle Row)
  "Fetch Live Deals": [1300, 300],
  "Format Live Deals": [1540, 300],

  // Branch 3: AI Agent (Below Main Flow)
  "AI Agent": [1300, 480],

  // Converged Output: Send WhatsApp Reply
  "Send WhatsApp Reply": [1820, 300],

  // Attached to AI Agent: Models & Memory
  "Google Gemini Chat Model": [1060, 680],
  "DeepSeek Chat Model": [1300, 680],
  "Simple Memory": [1540, 680],

  // Tool Row 1: Information Tools (Y = 900)
  "Get Store Info": [500, 900],
  "Search FAQs": [740, 900],
  "Search Menu Item": [980, 900],
  "Get Menu Categories": [1220, 900],
  "Get Current Deals": [1460, 900],
  "Get Active Promotions": [1700, 900],
  "Check Delivery Availability": [1940, 900],
  "Get Order Status": [2180, 900],

  // Tool Row 2: Cart & Checkout Tools (Y = 1100)
  "Get Cart": [500, 1100],
  "Add to Cart": [740, 1100],
  "Update Cart Item": [980, 1100],
  "Remove Cart Item": [1220, 1100],
  "Clear Cart": [1460, 1100],
  "Calculate Cart Totals": [1700, 1100],
  "Create Confirmed Order": [1940, 1100],
  "Request Order Cancellation": [2180, 1100],

  // Tool Row 3: Action & Handover Tools (Y = 1300)
  "Confirm Order Cancellation": [1100, 1300],
  "Send Alternate Confirmation": [1340, 1300],
  "Request Human Handover": [1580, 1300]
};

// Apply positions
wf.nodes.forEach(node => {
  if (positions[node.name]) {
    node.position = positions[node.name];
  } else {
    console.warn('Missing position for:', node.name);
  }
});

// Check for collisions
const posMap = new Map();
let hasCollision = false;
wf.nodes.forEach(node => {
  const key = `${node.position[0]},${node.position[1]}`;
  if (posMap.has(key)) {
    console.error(`COLLISION DETECTED at ${key} between ${posMap.get(key)} and ${node.name}`);
    hasCollision = true;
  } else {
    posMap.set(key, node.name);
  }
});

if (!hasCollision) {
  console.log('✅ ALL 33 nodes have unique, clean, collision-free coordinates!');
  fs.writeFileSync('cravey-crust-whatsapp-agent-workflow.json', JSON.stringify(wf, null, 2), 'utf8');
  fs.writeFileSync('n8n.json', JSON.stringify(wf, null, 2), 'utf8');
  console.log('Updated both workflow files successfully.');
}
