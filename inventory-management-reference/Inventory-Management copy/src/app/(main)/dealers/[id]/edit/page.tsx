
'use client';

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { firestore, useCollection, useDoc } from "@/firebase";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Dealer, InventoryItem } from "@/lib/types";
import { collection, doc } from "firebase/firestore";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function EditDealerPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const dealerId = params.id as string;

    const dealerRef = useMemo(() => firestore && dealerId ? doc(firestore, 'dealers', dealerId) : null, [dealerId]);
    const { data: dealer, isLoading: isDealerLoading } = useDoc<Dealer>(dealerRef);
    
    const [name, setName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [website, setWebsite] = useState('');
    const [address, setAddress] = useState('');
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [itemPrices, setItemPrices] = useState<Record<string, number>>({});
    const [itemExpiries, setItemExpiries] = useState<Record<string, Date>>({});
    
    const itemsCollection = useMemo(() => firestore ? collection(firestore, 'items') : null, []);
    const { data: inventoryItems, isLoading: areItemsLoading } = useCollection<InventoryItem>(itemsCollection);

    useEffect(() => {
        if (dealer) {
            setName(dealer.name || '');
            setContactPerson(dealer.contactPerson || '');
            setEmail(dealer.email || '');
            setPhone(dealer.phone || '');
            setAddress(dealer.address || '');
            setWebsite(dealer.website || '');
            setSelectedItems(dealer.suppliedItems || []);
            setItemPrices(dealer.itemPrices || {});
            
            const expiries: Record<string, Date> = {};
            if (dealer.itemExpiries) {
                for (const [id, dateStr] of Object.entries(dealer.itemExpiries)) {
                    expiries[id] = new Date(dateStr);
                }
            }
            setItemExpiries(expiries);
        }
    }, [dealer]);

    const handleItemToggle = (itemId: string) => {
        setSelectedItems(prev => {
            const isSelected = prev.includes(itemId);
            if (isSelected) {
                setItemPrices(prices => {
                    const newPrices = { ...prices };
                    delete newPrices[itemId];
                    return newPrices;
                });
                setItemExpiries(expiries => {
                    const newExpiries = { ...expiries };
                    delete newExpiries[itemId];
                    return newExpiries;
                });
                return prev.filter(id => id !== itemId);
            } else {
                return [...prev, itemId];
            }
        });
    };

    const handlePriceChange = (itemId: string, price: string) => {
        setItemPrices(prev => ({
            ...prev,
            [itemId]: parseFloat(price) || 0
        }));
    };

    const handleExpiryChange = (itemId: string, date: Date | undefined) => {
        if (!date) return;
        setItemExpiries(prev => ({
            ...prev,
            [itemId]: date
        }));
    };

    const handleUpdateDealer = () => {
        if (!dealerRef) return;
        
        const expiriesToSave: Record<string, string> = {};
        for (const [id, date] of Object.entries(itemExpiries)) {
            expiriesToSave[id] = date.toISOString();
        }

        const dealerData: Partial<Dealer> = {
            name,
            contactPerson,
            email,
            phone,
            address,
            website,
            suppliedItems: selectedItems,
            itemPrices,
            itemExpiries: expiriesToSave
        };
        updateDocumentNonBlocking(dealerRef, dealerData);
        toast({ title: "Dealer Updated", description: "The dealer information has been saved." });
        router.push('/dealers');
    };

    if (isDealerLoading) {
        return <div>Loading dealer information...</div>;
    }

    if (!dealer) {
        return <div>Dealer not found.</div>;
    }

    return (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <PageHeader title={`Edit: ${dealer.name}`} />
                <Button variant="outline" asChild>
                  <Link href="/dealers">Cancel</Link>
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Dealer Information</CardTitle>
                    <CardDescription>Update the dealer's information below.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Dealer Name</Label>
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
                            <Label htmlFor="website">Website</Label>
                            <Input id="website" placeholder="e.g., www.globaldentalsupplies.com" value={website} onChange={e => setWebsite(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea id="address" placeholder="123 Dental Ave, Smile City, CA 90210" value={address} onChange={e => setAddress(e.target.value)} />
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Supplied Items</Label>
                        <CardDescription>Select all items that this dealer supplies.</CardDescription>
                        <ScrollArea className="h-48 rounded-md border p-4">
                            {areItemsLoading && <p>Loading inventory...</p>}
                            {inventoryItems && inventoryItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between mb-3 border-b pb-2 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id={`item-${item.id}`}
                                            checked={selectedItems.includes(item.id)}
                                            onCheckedChange={() => handleItemToggle(item.id)}
                                        />
                                        <Label htmlFor={`item-${item.id}`} className="font-normal cursor-pointer">
                                            {item.name} ({item.brandName})
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
                                                            {itemExpiries[item.id] ? format(itemExpiries[item.id], "PP") : <span className="text-xs">Select date</span>}
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

                    <div className="flex justify-end gap-2">
                        <Button onClick={handleUpdateDealer}>Save Changes</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
