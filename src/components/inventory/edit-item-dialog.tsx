'use client';

import React, { useState, useEffect } from 'react';

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
import { Calendar as CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { api } from "~/trpc/react";

interface EditItemDialogProps {
    item: any;
    onSave: (updatedItem: any) => Promise<void>;
    onOpenChange: (open: boolean) => void;
}

export function EditItemDialog({ item, onSave, onOpenChange }: EditItemDialogProps) {
    const [nameParts, setNameParts] = useState<string[]>(() => {
        const parts = item.name.split(' ');
        const initial = Array(8).fill('');
        for (let i = 0; i < 7; i++) {
            if (parts[i]) initial[i] = parts[i];
        }
        if (parts.length > 7) {
            initial[7] = parts.slice(7).join(' ');
        }
        return initial;
    });
    const [brandName, setBrandName] = useState(item.brandName);
    const [description, setDescription] = useState(item.description || '');
    const [company, setCompany] = useState(item.company || '');
    const [category, setCategory] = useState(item.category);
    const [costPerUnit, setCostPerUnit] = useState(item.costPerUnit);
    const [minQuantity, setMinQuantity] = useState(item.minQuantity);
    const [unit, setUnit] = useState(item.quantityUnit || "pcs");
    const [unitValue, setUnitValue] = useState(item.quantityValue || 1);
    const [dealerId, setDealerId] = useState(item.dealerId || item.dealer?.id || '');
    const [stock, setStock] = useState<any[]>([...(item.stockEntries || [])]);
    const [keywords, setKeywords] = useState(item.keywords || "");
    const [isSaving, setIsSaving] = useState(false);

    const { data: dealers } = api.inventory.getDealers.useQuery();

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
            const finalName = nameParts.filter(p => p.trim() !== '').join(' ');
            const totalCount = stock.reduce((sum, entry) => sum + entry.quantity, 0);
            const updatedItem: InventoryItem = {
                ...item,
                name: finalName,
                brandName,
                description,
                company,
                category,
                costPerUnit,
                minQuantity,
                quantityValue: unitValue,
                quantityUnit: unit,
                stockEntries: stock,
                keywords,
                dealerId,
                itemCount: totalCount,
                status: totalCount === 0 ? 'Out of Stock' : (totalCount <= minQuantity ? 'Low Stock' : 'In Stock')
            };
            await onSave(updatedItem);
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving item:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const hasName = nameParts.some(p => p.trim() !== '');

    return (
        <Dialog open={true} onOpenChange={onOpenChange}>
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
                            <Label>Item Name Parts (combine to form full name)</Label>
                            <div className="grid grid-cols-4 gap-2">
                                {nameParts.map((part, i) => (
                                    <Input 
                                        key={i} 
                                        placeholder={`Part ${i + 1}`} 
                                        value={part} 
                                        onChange={e => {
                                            const newParts = [...nameParts];
                                            newParts[i] = e.target.value;
                                            setNameParts(newParts);
                                        }} 
                                    />
                                ))}
                            </div>
                            {hasName && (
                                <p className="text-sm text-muted-foreground mt-1">Preview: <span className="font-medium text-foreground">{nameParts.filter(p => p.trim() !== '').join(' ')}</span></p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-brand">Brand Name</Label>
                            <Input id="edit-brand" value={brandName} onChange={e => setBrandName(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-desc">Description</Label>
                        <Textarea id="edit-desc" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-cat">Category</Label>
                            <Select onValueChange={setCategory} value={category}>
                                <SelectTrigger id="edit-cat">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="instruments">Instruments</SelectItem>
                                    <SelectItem value="consumables">Consumables</SelectItem>
                                    <SelectItem value="materials">Materials</SelectItem>
                                    <SelectItem value="equipment">Equipment</SelectItem>
                                    <SelectItem value="General">General</SelectItem>
                                </SelectContent>
                            </Select>
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
                            <Select onValueChange={setDealerId} value={dealerId}>
                                <SelectTrigger id="edit-dealer">
                                    <SelectValue placeholder="Select dealer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {dealers?.map(d => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                             <div className="space-y-2">
                                <Label htmlFor="edit-unit-val">Unit Size</Label>
                                <Input id="edit-unit-val" type="number" value={unitValue} onChange={e => setUnitValue(Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-unit">Unit</Label>
                                <Select onValueChange={(v) => setUnit(v as any)} value={unit}>
                                    <SelectTrigger id="edit-unit">
                                        <SelectValue placeholder="Unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pcs">pcs</SelectItem>
                                        <SelectItem value="gm">gm</SelectItem>
                                        <SelectItem value="ml">ml</SelectItem>
                                        <SelectItem value="kg">kg</SelectItem>
                                        <SelectItem value="ltr">ltr</SelectItem>
                                    </SelectContent>
                                </Select>
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
                    <Button onClick={handleSave} disabled={isSaving || !hasName}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
