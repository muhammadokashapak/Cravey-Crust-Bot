import json

def fix_workflow(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        wf = json.load(f)
    
    count = 0
    for node in wf.get('nodes', []):
        params = node.get('parameters', {})
        if 'jsonBody' in params:
            val = params['jsonBody'].strip()
            if (val.startswith('=={{') or val.startswith('={{')) and 'JSON.stringify' not in val:
                # Remove leading '=' and trailing '}}' and leading '{{'
                inner = val.lstrip('=').strip()
                if inner.startswith('{{') and inner.endswith('}}'):
                    inner_expr = inner[2:-2].strip()
                    new_val = '={{ JSON.stringify(' + inner_expr + ') }}'
                    params['jsonBody'] = new_val
                    count += 1
                    print(f"Fixed '{node.get('name')}' in {filepath}")
    
    # Specific fix for Send WhatsApp Reply node to make sure fallback logic is resilient
    for node in wf.get('nodes', []):
        if node.get('name') == 'Send WhatsApp Reply':
            node['parameters']['jsonBody'] = "={{ JSON.stringify({ sessionId: $('Webhook').first().json.body?.sessionId || 'primary', chatId: $('Prepare Session').first().json?.chatId || $('Webhook').first().json.body?.chatId, message: $('AI Agent').first().json?.output || $json.output || '' }) }}"
            print(f"Hardened 'Send WhatsApp Reply' in {filepath}")

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(wf, f, indent=2)
    print(f"Successfully saved {filepath} with {count} fixes.")

fix_workflow('n8n.json')
fix_workflow('cravey-crust-whatsapp-agent-workflow.json')
