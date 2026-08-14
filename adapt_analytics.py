import re

filepath = '/Users/sai/Documents/Dental/src/components/inventory/reports/InventoryAnalyticsClientPage.tsx'
with open(filepath, 'r') as f:
    content = f.read()

content = content.replace('AnalyticsClientPage', 'InventoryAnalyticsClientPage')
content = content.replace('Submission', 'PurchaseOrder')
content = content.replace('submissions', 'orders')
content = content.replace('labs', 'dealers')
content = content.replace('sub.', 'order.')
content = content.replace('lab.', 'dealer.')
content = content.replace('createdAt', 'orderDate')
content = content.replace('labName', 'dealer')
content = content.replace('item', 'itemName')
content = content.replace('patientName', 'company')
content = content.replace('billAmount', 'price')
content = content.replace('Total Expenses', 'Total Spending')
content = content.replace('Services Breakdown', 'Items Breakdown')
content = content.replace('Lab Performance', 'Dealer Performance')
content = content.replace('Lab Spending', 'Dealer Spending')
content = content.replace('Lab', 'Dealer')

# Clean up services since dealers don't have services property like labs do
# Just mock allServices as unique itemNames
content = re.sub(r'const allServices = useMemo[\s\S]*?\}, \[dealers\]\);', '''const allServices = useMemo(() => {
    const services = new Set<string>();
    orders.forEach((order: any) => {
      if (order.itemName) services.add(order.itemName.trim());
    });
    return Array.from(services).sort();
}, [orders]);''', content)

with open(filepath, 'w') as f:
    f.write(content)

