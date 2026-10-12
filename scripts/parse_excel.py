import json

with open('excel_dump.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=== MENU ITEMS ===")
for r in data.get('Menu', []):
    cat = r.get('A')
    item = r.get('B')
    variant = r.get('C')
    desc = r.get('D')
    price = r.get('E')
    avail = r.get('F')
    spicy = r.get('G')
    print(f"[{cat}] {item} ({variant}) - Rs. {price} | Avail: {avail} | Spicy: {spicy}")

print("\n=== FAQS ===")
for r in data.get('FAQs', []):
    faq_id = r.get('A')
    q = r.get('B')
    a = r.get('C')
    cat = r.get('D')
    print(f"[{faq_id}] ({cat}) Q: {q}\nA: {a}\n")

print("\n=== DISCOUNTS ===")
for r in data.get('Discounts', []):
    param = r.get('A')
    val = r.get('B')
    if param:
        print(f"{param}: {val}")
