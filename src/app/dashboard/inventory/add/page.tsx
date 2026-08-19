'use client';

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

// Inline SearchableSelect component replicating the original Behavior
const SearchableSelect = ({ options, value, onValueChange, placeholder }: { options: {value: string, label: string}[], value: string, onValueChange: (v: string) => void, placeholder: string }) => {
    return (
        <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={value} 
            onChange={e => onValueChange(e.target.value)}
        >
            <option value="">{placeholder}</option>
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    );
};

export default function AddInventoryItem() {
    const router = useRouter();
    const createItem = api.inventory.create.useMutation();
    const { data: dealers } = api.inventory.getDealers.useQuery();

    const [nameParts, setNameParts] = useState<string[]>(Array(8).fill(''));
    const [brandName, setBrandName] = useState("");
    const [genericName, setGenericName] = useState("");
    const [description, setDescription] = useState("");
    const [tagsInput, setTagsInput] = useState("");
    const [company, setCompany] = useState("");
    const [category, setCategory] = useState("");
    const [itemCount, setItemCount] = useState<number | ''>(0);
    const [quantityValue, setQuantityValue] = useState<number | ''>(0);
    const [quantityUnit, setQuantityUnit] = useState("pcs");
    const [cost, setCost] = useState<number | ''>(0);
    const [minQuantity, setMinQuantity] = useState<number | ''>(0);
    const [dealer, setDealer] = useState("");
    const [expiryDate, setExpiryDate] = useState<Date | undefined>();

    const handleSave = async () => {
        const fullName = nameParts.filter(p => p.trim() !== '').join(' ');
        if (!fullName) {
            alert("Item name is required.");
            return;
        }

        const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

        try {
            await createItem.mutateAsync({
                name: fullName,
                brandName,
                genericName,
                description,
                tags,
                company,
                category,
                itemCount: Number(itemCount) || 0,
                quantityValue: Number(quantityValue) || 1,
                quantityUnit,
                costPerUnit: Number(cost) || 0,
                minQuantity: Number(minQuantity) || 0,
                dealerId: dealer || undefined,
                expiryDate: expiryDate ? expiryDate.toISOString() : undefined
            });
            router.push('/dashboard/inventory');
        } catch (error) {
            console.error("Error saving item:", error);
            alert("Failed to save item.");
        }
    };

    return (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Add New Item</h1>
                <Button variant="outline" asChild>
                    <Link href="/dashboard/inventory">Cancel</Link>
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Item Details</CardTitle>
                    <CardDescription>Fill out the form to add a new item to the inventory.</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Item Name Parts (combine to form full name)</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
                        {nameParts.some(p => p.trim() !== '') && (
                            <p className="text-sm text-muted-foreground mt-1">
                                Preview: <span className="font-medium text-foreground">{nameParts.filter(p => p.trim() !== '').join(' ')}</span>
                            </p>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="brandName">Brand Name</Label>
                            <Input id="brandName" placeholder="e.g., Explore-It" value={brandName} onChange={e => setBrandName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="genericName">Generic Name</Label>
                            <Input id="genericName" placeholder="e.g., Paracetamol" value={genericName} onChange={e => setGenericName(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" placeholder="A sharp-pointed instrument..." value={description} onChange={e => setDescription(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tags">Tags / Keywords</Label>
                        <Input id="tags" placeholder="e.g., consumable, liquid, surgery (comma-separated)" value={tagsInput} onChange={e => setTagsInput(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="company">Company</Label>
                            <Input id="company" placeholder="e.g., DentalPro" value={company} onChange={e => setCompany(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                             <SearchableSelect
                                options={[
                                    { value: 'instruments', label: 'Instruments' },
                                    { value: 'consumables', label: 'Consumables' },
                                    { value: 'materials', label: 'Materials' },
                                ]}
                                value={category}
                                onValueChange={setCategory}
                                placeholder="Select a category"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="space-y-2">
                            <Label htmlFor="itemCount">Initial Item Count</Label>
                            <Input id="itemCount" type="number" placeholder="e.g., 0" value={itemCount} onChange={e => setItemCount(e.target.value === '' ? '' : Number(e.target.value))} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="quantityValue">Unit Size</Label>
                            <Input id="quantityValue" type="number" placeholder="e.g., 0" value={quantityValue} onChange={e => setQuantityValue(e.target.value === '' ? '' : Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quantityUnit">Unit</Label>
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
                                value={quantityUnit}
                                onValueChange={setQuantityUnit}
                                placeholder="Unit"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="cost">Cost per Unit</Label>
                            <Input id="cost" type="number" placeholder="e.g., 0" value={cost} onChange={e => setCost(e.target.value === '' ? '' : Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="minQuantity">Minimum Quantity Threshold</Label>
                            <Input id="minQuantity" type="number" placeholder="e.g., 0" value={minQuantity} onChange={e => setMinQuantity(e.target.value === '' ? '' : Number(e.target.value))} />
                        </div>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="dealer">Dealer</Label>
                            <SearchableSelect
                                options={dealers?.map(d => ({ value: d.id, label: d.name })) || []}
                                value={dealer}
                                onValueChange={setDealer}
                                placeholder="Select a dealer"
                            />
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="expiryDate">Expiry Date</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !expiryDate && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {expiryDate ? format(expiryDate, "PPP") : <span>Pick a date</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={expiryDate}
                                    onSelect={setExpiryDate}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-8">
                        <Button onClick={handleSave} disabled={createItem.isPending}>
                            {createItem.isPending ? "Saving..." : "Save Item"}
                        </Button>
                        <Button variant="ghost" onClick={async () => {
                            await handleSave();
                            setNameParts(Array(8).fill(''));
                            setBrandName("");
                            setGenericName("");
                            setTagsInput("");
                        }}>
                            Save and Add Another
                        </Button>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
