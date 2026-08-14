'use client';

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useCollection, firestore } from "@/firebase";
import { addDoc, collection, doc, runTransaction } from "firebase/firestore";
import { generateSequentialId } from "@/lib/utils";
import { Dealer, InventoryItem } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function AddInventoryItemPage() {
    const router = useRouter();
    const [expiryDate, setExpiryDate] = React.useState<Date>();
    const [nameParts, setNameParts] = useState<string[]>(Array(8).fill(''));
    const [brandName, setBrandName] = useState('');
    const [description, setDescription] = useState('');
    const [company, setCompany] = useState('');
    const [category, setCategory] = useState('');
    const [itemCount, setItemCount] = useState(0);
    const [quantityValue, setQuantityValue] = useState(0);
    const [quantityUnit, setQuantityUnit] = useState<'pcs' | 'gm' | 'ml' | 'kg' | 'ltr'>('pcs');
    const [cost, setCost] = useState(0);
    const [minQuantity, setMinQuantity] = useState(0);
    const [dealer, setDealer] = useState('');

    const dealersCollection = useMemo(() => {
        if (!firestore) return null;
        return collection(firestore, 'dealers');
    }, []);
    const { data: dealers } = useCollection<Dealer>(dealersCollection as any);
    
    const handleSave = async () => {
        if (!firestore || !expiryDate) return;

        const stockEntry = {
            quantity: itemCount,
            expiryDate: expiryDate.toISOString(),
        };

        const finalName = nameParts.filter(p => p.trim() !== '').join(' ');
        
        const newItem: Omit<InventoryItem, 'id' | 'status' | 'imageUrl' | 'consumption'> = {
            name: finalName,
            brandName,
            description,
            company,
            category,
            itemCount: itemCount,
            stock: [stockEntry],
            quantity: { value: quantityValue, unit: quantityUnit },
            costPerUnit: cost,
            minQuantity,
            dealer,
            dealerAvailability: true, 
            cases: 0, 
        };
        try {
            await runTransaction(firestore, async (transaction) => {
                const counterRef = doc(firestore, 'metadata', 'itemCounter');
                const counterDoc = await transaction.get(counterRef);
                let currentCount = 0;
                if (counterDoc.exists()) {
                    currentCount = counterDoc.data().lastItemId || 0;
                }
                
                currentCount++;
                const newId = generateSequentialId(currentCount);
                
                transaction.set(counterRef, { lastItemId: currentCount }, { merge: true });
                
                const newItemRef = doc(firestore, 'items', newId);
                transaction.set(newItemRef, newItem);
            });
            router.push('/inventory');
        } catch (error) {
            console.error("Error adding item: ", error);
        }
    };


    return (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <PageHeader title="Add New Item" />
                <Button variant="outline" asChild>
                  <Link href="/inventory">Cancel</Link>
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Item Details</CardTitle>
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
                            <p className="text-sm text-muted-foreground mt-1">Preview: <span className="font-medium text-foreground">{nameParts.filter(p => p.trim() !== '').join(' ')}</span></p>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="brandName">Brand Name</Label>
                            <Input id="brandName" placeholder="e.g., Explore-It" value={brandName} onChange={e => setBrandName(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" placeholder="A sharp-pointed instrument..." value={description} onChange={e => setDescription(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="company">Company</Label>
                            <Input id="company" placeholder="e.g., DentalPro" value={company} onChange={e => setCompany(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                             <Select onValueChange={setCategory} value={category}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="instruments">Instruments</SelectItem>
                                    <SelectItem value="consumables">Consumables</SelectItem>
                                    <SelectItem value="materials">Materials</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="space-y-2">
                            <Label htmlFor="itemCount">Initial Item Count</Label>
                            <Input id="itemCount" type="number" placeholder="e.g., 50" value={itemCount} onChange={e => setItemCount(Number(e.target.value))} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="quantityValue">Unit Size</Label>
                            <Input id="quantityValue" type="number" placeholder="e.g., 50" value={quantityValue} onChange={e => setQuantityValue(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quantityUnit">Unit</Label>
                            <Select onValueChange={(v) => setQuantityUnit(v as any)} value={quantityUnit}>
                                <SelectTrigger>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="cost">Cost per Unit</Label>
                            <Input id="cost" type="number" placeholder="e.g., 15.50" value={cost} onChange={e => setCost(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="minQuantity">Minimum Quantity Threshold</Label>
                            <Input id="minQuantity" type="number" placeholder="e.g., 10" value={minQuantity} onChange={e => setMinQuantity(Number(e.target.value))} />
                        </div>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="dealer">Dealer</Label>
                            <Select onValueChange={setDealer} value={dealer}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a dealer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {dealers?.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
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
                    
                    <div className="flex justify-end gap-2">
                        <Button onClick={handleSave}>Save Item</Button>
                        <Button variant="ghost">Save and Add Another</Button>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
