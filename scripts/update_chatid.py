import json

val = "={{ $('Prepare Session').first().json?.senderJid || $('Prepare Session').first().json?.chatId || $('Webhook').first().json.body?.senderJid || $('Webhook').first().json.body?.chatId }}"

for fname in ['n8n.json', 'cravey-crust-whatsapp-agent-workflow.json']:
    with open(fname, 'r', encoding='utf-8') as f:
        wf = json.load(f)
    for node in wf.get('nodes', []):
        if node.get('name') == 'Send WhatsApp Reply':
            for p in node.get('parameters', {}).get('bodyParameters', {}).get('parameters', []):
                if p.get('name') == 'chatId':
                    p['value'] = val
                    print(f"Updated chatId in {fname}")
    with open(fname, 'w', encoding='utf-8') as f:
        json.dump(wf, f, indent=2)

print("Done!")
