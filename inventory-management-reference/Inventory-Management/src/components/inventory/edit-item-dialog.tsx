'use client';

import React, { useState, useEffect } from 'react';
import { InventoryItem, StockEntry, Dealer } from "@/lib/types";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Calendar as CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useCollection, firestore } from "@/firebase";
import { collection } from 'firebase/firestore';

interface EditItemDialogProps {
    item: InventoryItem;
    onSave: (updatedItem: InventoryItem) => Promise<void>;
    onOpenChange: (open: boolean) => void;
}

export function EditItemDialog({ item, onSave, onOpenChange }: EditItemDialogProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [name, setName] = useState(item.name);
    const [brandName, setBrandName] = useState(item.brandName);
    const [description, setDescription] = useState(item.description || '');
    const [tagsInput, setTagsInput] = useState(item.tags ? item.tags.join(', ') : '');
    const [company, setCompany] = useState(item.company || '');
    const [category, setCategory] = useState(item.category);
    const [costPerUnit, setCostPerUnit] = useState(item.costPerUnit);
    const [minQuantity, setMinQuantity] = useState(item.minQuantity);
    const [unit, setUnit] = useState(item.quantity.unit);
    const [unitValue, setUnitValue] = useState(item.quantity.value);
    const [dealer, setDealer] = useState(item.dealer || '');
    const [stock, setStock] = useState<StockEntry[]>([...(item.stock || [])]);
    const [isSaving, setIsSaving] = useState(false);

    const dealersCollection = React.useMemo(() => firestore ? collection(firestore, 'dealers') : null, []);
    const { data: dealers } = useCollection<Dealer>(dealersCollection as any);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            setTimeout(() => onOpenChange(false), 300);
            setTimeout(() => { document.body.style.pointerEvents = ""; }, 500);
        }
    };

    const handleAddBatch = () => {
        setStock([...stock, { quantity: 0, expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() }]);
    };

    const handleRemoveBatch = (index: number) => {
        setStock(stock.filter((_, i) => i !== index));
    };

    const handleUpdateBatch = (index: number, updates: Partial<StockEntry>) => {
        const newStock = [...stock];
        newStock[index] = { ...newStock[index], ...updates };
        setStock(newStock);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const totalCount = stock.reduce((sum, entry) => sum + entry.quantity, 0);
            const updatedItem: InventoryItem = {
                ...item,
                name: name.trim(),
                brandName,
                tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
                description,
                company,
                category,
                costPerUnit,
                minQuantity,
                quantity: {
                    value: unitValue,
                    unit: unit as any
                },
                dealer,
                stock,
                itemCount: totalCount,
                status: totalCount === 0 ? 'Out of Stock' : (totalCount <= minQuantity ? 'Low Stock' : 'In Stock')
            };
            await onSave(updatedItem);
            
            if (dealer && firestore) {
                const { getDoc, doc, updateDoc } = await import('firebase/firestore');
                const dealerRef = doc(firestore, 'dealers', dealer);
                const dealerSnap = await getDoc(dealerRef);
                if (dealerSnap.exists()) {
                    const d = dealerSnap.data() as Dealer;
                    const newPrices = { ...(d.itemPrices || {}) };
                    newPrices[item.id] = costPerUnit;
                    
                    const newExpiries = { ...(d.itemExpiries || {}) };
                    if (stock.length > 0 && stock[0].expiryDate) {
                        newExpiries[item.id] = stock[0].expiryDate;
                    }
                    
                    const suppliedItems = new Set(d.suppliedItems || []);
                    suppliedItems.add(item.id);
                    
                    await updateDoc(dealerRef, {
                        itemPrices: newPrices,
                        itemExpiries: newExpiries,
                        suppliedItems: Array.from(suppliedItems)
                    });
                }
            }

            handleOpenChange(false);
        } catch (error) {
            console.error("Error saving item:", error);
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Inventory Item</DialogTitle>
                    <DialogDescription>
                        Update item details and manage stock batches.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-1 md:col-span-2">
                            <Label htmlFor="edit-name">Item Name</Label>
                            <Input id="edit-name" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-brand">Brand Name</Label>
                            <Input id="edit-brand" value={brandName} onChange={e => setBrandName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-company">Company</Label>
                            <Input id="edit-company" value={company} onChange={e => setCompany(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-desc">Description</Label>
                        <Textarea id="edit-desc" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-tags">Tags / Keywords</Label>
                        <Input id="edit-tags" placeholder="e.g., consumable, liquid (comma-separated)" value={tagsInput} onChange={e => setTagsInput(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-cat">Category</Label>
                            <SearchableSelect
                                options={[
                                    { value: 'instruments', label: 'Instruments' },
                                    { value: 'consumables', label: 'Consumables' },
                                    { value: 'materials', label: 'Materials' },
                                    { value: 'equipment', label: 'Equipment' },
                                    { value: 'General', label: 'General' },
                                ]}
                                value={category}
                                onValueChange={setCategory}
                                placeholder="Category"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-cost">Cost (INR)</Label>
                            <Input id="edit-cost" type="number" value={costPerUnit} onChange={e => setCostPerUnit(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-min">Min. Threshold</Label>
                            <Input id="edit-min" type="number" value={minQuantity} onChange={e => setMinQuantity(Number(e.target.value))} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-dealer">Dealer</Label>
                            <SearchableSelect
                                options={dealers?.map(d => ({ value: d.name, label: d.name })) || []}
                                value={dealer}
                                onValueChange={setDealer}
                                placeholder="Select dealer"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                             <div className="space-y-2">
                                <Label htmlFor="edit-unit-val">Unit Size</Label>
                                <Input id="edit-unit-val" type="number" value={unitValue} onChange={e => setUnitValue(Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-unit">Unit</Label>
                                <SearchableSelect
                                    options={[
                                        { value: 'pcs', label: 'pcs' },
                                        { value: 'gm', label: 'gm' },
                                        { value: 'ml', label: 'ml' },
                                        { value: 'kg', label: 'kg' },
                                        { value: 'ltr', label: 'ltr' },
                                        { value: 'cm', label: 'cm' },
                                        { value: 'mm', label: 'mm' },
                                    ]}
                                    value={unit}
                                    onValueChange={(v) => setUnit(v as any)}
                                    placeholder="Unit"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Stock Batches</Label>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddBatch}>
                                <Plus className="mr-2 h-4 w-4" /> Add Batch
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {stock.map((entry, index) => (
                                <div key={index} className="flex items-end gap-3 p-3 border rounded-md bg-muted/30">
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Quantity</Label>
                                        <Input 
                                            type="number" 
                                            value={entry.quantity} 
                                            onChange={e => handleUpdateBatch(index, { quantity: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Expiry Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !entry.expiryDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {entry.expiryDate ? format(new Date(entry.expiryDate), "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={new Date(entry.expiryDate)}
                                                    onSelect={(date) => date && handleUpdateBatch(index, { expiryDate: date.toISOString() })}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemoveBatch(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {stock.length === 0 && (
                                <p className="text-center py-4 text-sm text-muted-foreground italic border border-dashed rounded-md">
                                    No stock batches. Item will be marked as "Out of Stock".
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
