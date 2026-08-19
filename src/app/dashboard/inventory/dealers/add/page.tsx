"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarIcon, Upload, Search } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import React, { useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { useToast } from "@/hooks/use-toast";

export default function AddDealerPage() {
    const router = useRouter();
    const { toast } = useToast();
    
    const { data: inventoryItems, isLoading: itemsLoading } = api.inventory.getAll.useQuery();
    const createDealer = api.inventory.createDealer.useMutation();

    const [name, setName] = useState("");
    const [contactPerson, setContactPerson] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [website, setWebsite] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [itemPrices, setItemPrices] = useState<Record<string, string>>({});
    const [itemExpiries, setItemExpiries] = useState<Record<string, Date | undefined>>({});

    const filteredItems = useMemo(() => {
        if (!inventoryItems) return [];
        if (!searchTerm.trim()) return inventoryItems;
        const lowerTerm = searchTerm.toLowerCase();
        return inventoryItems.filter(item => 
            item.name.toLowerCase().includes(lowerTerm) || 
            (item.brandName && item.brandName.toLowerCase().includes(lowerTerm))
        );
    }, [inventoryItems, searchTerm]);

    const handleItemToggle = (itemId: string) => {
        setSelectedItems(prev => 
            prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
        );
    };

    const handlePriceChange = (itemId: string, val: string) => {
        setItemPrices(prev => ({ ...prev, [itemId]: val }));
    };

    const handleExpiryChange = (itemId: string, date: Date | undefined) => {
        setItemExpiries(prev => ({ ...prev, [itemId]: date }));
    };

    const handleSaveDealer = async () => {
        if (!name.trim()) {
            toast({ title: "Dealer name is required", variant: "destructive" });
            return;
        }

        const suppliedItems = selectedItems.map(id => ({
            id,
            price: itemPrices[id] ? parseFloat(itemPrices[id]) : undefined
        }));

        try {
            await createDealer.mutateAsync({
                name,
                contactPerson,
                email,
                phone,
                address,
                website,
                suppliedItems
            });
            toast({ title: "Dealer created successfully" });
            router.push("/dashboard/inventory");
        } catch (err: any) {
            toast({ title: "Failed to create dealer", description: err.message, variant: "destructive" });
        }
    };

    return (
        <div className="p-8 flex flex-col gap-8 max-w-4xl mx-auto h-full animate-in fade-in">
            <div className="flex justify-between items-center">
                <PageHeader title="Add New Dealer" />
                <Button variant="outline" asChild>
                    <Link href="/dashboard/inventory">Cancel</Link>
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Dealer Information</CardTitle>
                    <CardDescription>Enter the details for the new dealer or supplier.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Dealer Name <span className="text-destructive">*</span></Label>
                        <Input id="name" placeholder="e.g., Global Dental Supplies" value={name} onChange={e => setName(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="contact-person">Contact Person</Label>
                            <Input id="contact-person" placeholder="e.g., John Doe" value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder="e.g., contact@gds.com" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input id="phone" placeholder="e.g., +1 234 567 890" value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Textarea id="address" placeholder="e.g., 123 Main St, City, Country" value={address} onChange={e => setAddress(e.target.value)} rows={3} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="website">Website</Label>
                            <Input id="website" placeholder="e.g., www.globaldentalsupplies.com" value={website} onChange={e => setWebsite(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2 pt-6">
                        <Label className="text-lg">Supplied Items</Label>
                        <CardDescription>Select all items that this dealer supplies. Or upload a CSV with Item Name, Brand Name, Price, Expiry Date.</CardDescription>
                        
                        <div className="flex gap-2 mb-2 items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Search items by name or brand..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={() => toast({ title: "CSV upload simulated" })}
                            />
                            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload CSV
                            </Button>
                        </div>

                        <ScrollArea className="h-[400px] rounded-md border p-4 bg-muted/20">
                            {itemsLoading && <p className="text-sm text-muted-foreground">Loading inventory...</p>}
                            {filteredItems.map(item => (
                                <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between mb-3 border-b pb-3 last:border-0">
                                    <div className="flex items-center gap-3 mb-2 md:mb-0">
                                        <Checkbox
                                            id={`item-${item.id}`}
                                            checked={selectedItems.includes(item.id)}
                                            onCheckedChange={() => handleItemToggle(item.id)}
                                        />
                                        <Label htmlFor={`item-${item.id}`} className="font-normal cursor-pointer">
                                            {item.name} {item.brandName ? `(${item.brandName})` : ''}
                                        </Label>
                                    </div>
                                    {selectedItems.includes(item.id) && (
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor={`price-${item.id}`} className="text-sm text-muted-foreground whitespace-nowrap">Price:</Label>
                                                <Input
                                                    id={`price-${item.id}`}
                                                    type="number"
                                                    className="w-24 h-8"
                                                    placeholder="0.00"
                                                    value={itemPrices[item.id] || ''}
                                                    onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Label className="text-sm text-muted-foreground whitespace-nowrap">Expiry:</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className={cn(
                                                                "h-8 w-[140px] justify-start text-left font-normal",
                                                                !itemExpiries[item.id] && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-3 w-3" />
                                                            {itemExpiries[item.id] ? format(itemExpiries[item.id] as Date, "PP") : <span className="text-xs">Select date</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar
                                                            mode="single"
                                                            selected={itemExpiries[item.id]}
                                                            onSelect={(date) => handleExpiryChange(item.id, date)}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </ScrollArea>
                    </div>

                    <div className="flex justify-end gap-2 mt-8">
                        <Button size="lg" onClick={handleSaveDealer} disabled={createDealer.isPending}>
                            {createDealer.isPending ? "Saving..." : "Save Dealer"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
