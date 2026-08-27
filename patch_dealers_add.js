const fs = require('fs');

let content = fs.readFileSync('src/app/dashboard/inventory/dealers/add/page.tsx', 'utf8');

// Add PapaParse and Dialog imports
content = content.replace('import { useToast } from "@/hooks/use-toast";', `import { useToast } from "@/hooks/use-toast";\nimport Papa from "papaparse";\nimport { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";`);

// Add api.inventory.create and api.inventory.getAll.refetch
content = content.replace('const createDealer = api.inventory.createDealer.useMutation();', `const createDealer = api.inventory.createDealer.useMutation();\n    const createItem = api.inventory.create.useMutation();\n    const utils = api.useUtils();\n\n    const [isAddItemOpen, setIsAddItemOpen] = useState(false);\n    const [newItemName, setNewItemName] = useState("");\n    const [newItemBrand, setNewItemBrand] = useState("");\n    const [newItemPrice, setNewItemPrice] = useState("");`);

// Add handleFileUpload and handleAddManualItem
const helperFunctions = `
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const data = results.data as Record<string, string>[];
                let addedCount = 0;
                
                const newSelected = [...selectedItems];
                const newPrices = { ...itemPrices };
                
                for (const row of data) {
                    const name = row['Item Name'] || row['name'] || row['Name'];
                    const brand = row['Brand Name'] || row['brand'] || row['Brand'] || '';
                    const price = row['Price'] || row['price'] || '';
                    
                    if (!name) continue;

                    // find existing item
                    let item = inventoryItems?.find(i => i.name.toLowerCase() === name.toLowerCase());
                    
                    if (!item) {
                        try {
                            item = await createItem.mutateAsync({ name, brandName: brand, itemCount: 0, costPerUnit: parseFloat(price) || 0 });
                        } catch(err) {
                            console.error(err);
                            continue;
                        }
                    }

                    if (item && !newSelected.includes(item.id)) {
                        newSelected.push(item.id);
                        newPrices[item.id] = price;
                        addedCount++;
                    }
                }
                
                setSelectedItems(newSelected);
                setItemPrices(newPrices);
                
                if (addedCount > 0) {
                    utils.inventory.getAll.invalidate();
                }

                toast({ title: "CSV Processed", description: \`Added \${addedCount} items from CSV.\` });
            }
        });
    };

    const handleAddManualItem = async () => {
        if (!newItemName) {
            toast({ title: "Name required", variant: "destructive" });
            return;
        }
        try {
            const item = await createItem.mutateAsync({
                name: newItemName,
                brandName: newItemBrand,
                itemCount: 0,
                costPerUnit: parseFloat(newItemPrice) || 0
            });
            setSelectedItems(prev => [...prev, item.id]);
            setItemPrices(prev => ({ ...prev, [item.id]: newItemPrice }));
            utils.inventory.getAll.invalidate();
            setIsAddItemOpen(false);
            setNewItemName("");
            setNewItemBrand("");
            setNewItemPrice("");
            toast({ title: "Item added successfully" });
        } catch(e) {
            toast({ title: "Failed to add item", variant: "destructive" });
        }
    };
`;

content = content.replace('const handleItemToggle = (itemId: string) => {', helperFunctions + '\n    const handleItemToggle = (itemId: string) => {');

// Replace file input onChange
content = content.replace('onChange={() => toast({ title: "CSV upload simulated" })}', 'onChange={handleFileUpload}');

// Add "Add Manual Item" button
const addManualBtn = `
                            <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">Add Item Manually</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add New Item to Dealer</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Item Name</Label>
                                            <Input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="e.g. Dental Mirror" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Brand Name (Optional)</Label>
                                            <Input value={newItemBrand} onChange={e => setNewItemBrand(e.target.value)} placeholder="e.g. OralB" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Price</Label>
                                            <Input type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} placeholder="0.00" />
                                        </div>
                                        <Button className="w-full" onClick={handleAddManualItem} disabled={createItem.isPending}>
                                            {createItem.isPending ? "Adding..." : "Add to List"}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
`;

content = content.replace('<Button variant="outline" onClick={() => fileInputRef.current?.click()}>', addManualBtn + '\n                            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>');

fs.writeFileSync('src/app/dashboard/inventory/dealers/add/page.tsx', content);
