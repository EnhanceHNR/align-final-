"use client";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ChevronLeft, PlusCircle, Trash2, Camera, Upload, X } from "lucide-react";
import Link from "next/link";
import React, { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const SearchableSelect = ({ options, value, onValueChange, placeholder }: any) => {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal bg-background"
                >
                    {value
                        ? options.find((opt: any) => opt.value === value)?.label || placeholder
                        : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
                    <CommandList>
                        <CommandEmpty>No matching item found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((opt: any) => (
                                <CommandItem
                                    key={opt.value}
                                    value={opt.value + " " + opt.label + (opt.keywords ? " " + opt.keywords : "")} // Allow searching by keywords!
                                    onSelect={() => {
                                        onValueChange(opt.value);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === opt.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {opt.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};


const getDealerStatus = (dealer: any, selectedItemId: string, allItems: any[]) => {
    if (!selectedItemId) return { color: 'red', price: undefined, expiryDate: '', matchedName: undefined };
    
    const selectedItem = allItems?.find(i => i.id === selectedItemId);
    if (!selectedItem) return { color: 'red', price: undefined, matchedName: undefined };
    
    const isSupplied = dealer.suppliedItems?.some((si: any) => si.id === selectedItemId);
    
    if (isSupplied) {
        const suppliedDetail = dealer.suppliedItems?.find((si: any) => si.id === selectedItemId);
        const price = suppliedDetail?.price || selectedItem.costPerUnit || 0;
        const expiryDate = suppliedDetail?.expiryDate || "";
        
        // Blue if out of stock in my inventory but available with dealer
        const isOutOfStock = !selectedItem.itemCount || selectedItem.itemCount <= 0;
        if (isOutOfStock) {
            return { color: 'blue', price, expiryDate, matchedName: undefined };
        }
        return { color: 'green', price, expiryDate, matchedName: undefined };
    }
    
    // Check for keyword matches (Orange)
    const getTokens = (str?: string) => {
        if (!str) return [];
        return str.toLowerCase().split(/[\s,]+/).filter(t => t.length > 2);
    };
    
    const itemTokens = [...getTokens(selectedItem.name), ...getTokens(selectedItem.keywords)];
    
    if (itemTokens.length > 0 && dealer.suppliedItems && dealer.suppliedItems.length > 0) {
        for (const si of dealer.suppliedItems) {
            const dItem = allItems?.find(i => i.id === si.id);
            if (dItem) {
                const dTokens = [...getTokens(dItem.name), ...getTokens(dItem.keywords)];
                const hasMatch = dTokens.some(dToken => itemTokens.some(iToken => iToken.includes(dToken) || dToken.includes(iToken)));
                if (hasMatch) {
                    return { color: 'orange', price: si.price || dItem.costPerUnit || 0, expiryDate: si.expiryDate || '', matchedName: dItem.name };
                }
            }
        }
    }
    
    return { color: 'red', price: undefined, matchedName: undefined };
};

export default function CreateOrderPage() {
    const { toast } = useToast();
    const router = useRouter();
    
    const { data: items } = api.inventory.getAll.useQuery();
    const { data: dealers } = api.inventory.getDealers.useQuery();
    // Assuming we don't have a staff query right now, we'll mock it based on users or just text
    const staffOptions = [{ value: "admin", label: "Enhance Head Neck Rehabilitation" }];
    
    const createOrder = api.inventory.createOrder.useMutation();
    const updateDealerItem = api.inventory.updateDealerItem.useMutation();

    const [selectedStaff, setSelectedStaff] = useState("admin");
    const [baseOrderId, setBaseOrderId] = useState("A17");
    
    type OrderItem = { id: string; quantity: number; dealerId: string; price: number; expiryDate?: string; isCollapsed: boolean };
    const [orderItems, setOrderItems] = useState<OrderItem[]>([
        { id: "", quantity: 1, dealerId: "", price: 0, expiryDate: "", isCollapsed: false }
    ]);
    
    const [notes, setNotes] = useState("");
    const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split("T")[0]);
    
    // Photo verification state
    const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setIsCameraActive(true);
        } catch (err) {
            console.error("Error accessing camera:", err);
            toast({ title: "Camera access denied", variant: "destructive" });
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    };

    
    useEffect(() => {
        if (isCameraActive && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isCameraActive]);

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
            setPhotoDataUri(canvas.toDataURL("image/png"));
            stopCamera();
        }
    };

    const handleSubmit = async () => {
        const validItems = orderItems.filter(item => item.id && item.dealerId);
        if (validItems.length === 0) {
            toast({ title: "Please select an item and dealer.", variant: "destructive" });
            return;
        }
        if (!photoDataUri) {
            toast({ title: "Photo verification is required.", variant: "destructive" });
            return;
        }

        try {
            // Process each item as a separate PurchaseOrder
            for (const item of validItems) {
                await createOrder.mutateAsync({
                    inventoryItemId: item.id,
                    dealerId: item.dealerId,
                    quantity: item.quantity,
                    price: item.price,
                    notes: notes
                });
            }
            toast({ title: "Orders created successfully!" });
            router.push("/dashboard/inventory/orders");
        } catch (err: any) {
            toast({ title: "Failed to create order", description: err.message, variant: "destructive" });
        }
    };

    return (
        <div className="p-8 flex flex-col gap-6 h-full animate-in fade-in max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <PageHeader title="Create Purchase Order" />
                <Button variant="outline" asChild>
                    <Link href="/dashboard/inventory/orders">Cancel</Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Order Details</CardTitle>
                    <CardDescription>Select the item, dealer, and staff placing the order.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Placed By <span className="text-destructive">*</span></Label>
                        <SearchableSelect 
                            options={staffOptions} 
                            value={selectedStaff} 
                            onValueChange={setSelectedStaff} 
                            placeholder="Select your name" 
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Base Order ID</Label>
                        <Input value={baseOrderId} onChange={e => setBaseOrderId(e.target.value)} />
                    </div>

                    <div className="space-y-4">
                        <Label className="text-lg font-semibold block">Items to Order</Label>
                        {orderItems.map((oi, index) => (
                            <div key={index} className="flex flex-col gap-4 bg-muted/20 p-4 rounded-lg border border-border">
                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1 space-y-2 w-full">
                                        <Label>Item {index + 1}</Label>
                                        <SearchableSelect 
                                            options={items?.map(i => ({ value: i.id, label: i.name, keywords: i.keywords })) || []}
                                            value={oi.id}
                                            onValueChange={(val: string) => {
                                                const newItems = [...orderItems];
                                                newItems[index].id = val;
                                                setOrderItems(newItems);
                                            }}
                                            placeholder="Select an item"
                                        />
                                    </div>
                                    <div className="w-full md:w-32 space-y-2">
                                        <Label>Quantity</Label>
                                        <Input type="number" min="1" value={oi.quantity} onChange={e => {
                                            const newItems = [...orderItems];
                                            newItems[index].quantity = parseInt(e.target.value) || 1;
                                            setOrderItems(newItems);
                                        }} />
                                    </div>
                                    {orderItems.length > 1 && (
                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => {
                                            const newItems = [...orderItems];
                                            newItems.splice(index, 1);
                                            setOrderItems(newItems);
                                        }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                
                                <div className="flex-1 space-y-2 w-full mt-4">
                                    <Label>Dealer</Label>
                                    <div className="border rounded-md overflow-hidden bg-background">
                                        <div className="flex items-center px-3 py-2 border-b bg-muted/50">
                                            <span className="text-sm text-muted-foreground">Search dealers...</span>
                                        </div>
                                        <div className="grid grid-cols-3 p-2 text-xs text-muted-foreground border-b">
                                            <span>Name</span>
                                            <span className="text-right">Price</span>
                                            <span className="text-right">Expiry Date</span>
                                        </div>
                                        {(() => {
                                            if (!dealers || !items) return null;
                                            
                                            // Compute statuses
                                            const dealersWithStatus = dealers.map(dealer => ({
                                                dealer,
                                                ...getDealerStatus(dealer, oi.id, items)
                                            }));
                                            
                                            // Sort: Green -> Blue -> Orange -> Red
                                            dealersWithStatus.sort((a, b) => {
                                                const weight = { green: 1, blue: 2, orange: 3, red: 4 };
                                                return (weight[a.color as keyof typeof weight] || 4) - (weight[b.color as keyof typeof weight] || 4);
                                            });

                                            return dealersWithStatus.map(({ dealer, color, price, expiryDate, matchedName }) => {
                                                let bgClass = "bg-muted";
                                                let textClass = "text-muted-foreground";
                                                let selectedBgClass = "bg-muted/80";
                                                
                                                if (color === 'green') {
                                                    bgClass = 'bg-emerald-50/50 dark:bg-emerald-900/10';
                                                    selectedBgClass = 'bg-emerald-100/50 dark:bg-emerald-900/20';
                                                    textClass = 'text-emerald-800 dark:text-emerald-400';
                                                } else if (color === 'blue') {
                                                    bgClass = 'bg-blue-50/50 dark:bg-blue-900/10';
                                                    selectedBgClass = 'bg-blue-100/50 dark:bg-blue-900/20';
                                                    textClass = 'text-blue-800 dark:text-blue-400';
                                                } else if (color === 'orange') {
                                                    bgClass = 'bg-orange-50/50 dark:bg-orange-900/10';
                                                    selectedBgClass = 'bg-orange-100/50 dark:bg-orange-900/20';
                                                    textClass = 'text-orange-800 dark:text-orange-400';
                                                } else {
                                                    bgClass = 'bg-red-50/50 dark:bg-red-900/10';
                                                    selectedBgClass = 'bg-red-100/50 dark:bg-red-900/20';
                                                    textClass = 'text-red-800 dark:text-red-400';
                                                }

                                                return (
                                                                                                        <div 
                                                        key={dealer.id} 
                                                        className={`grid grid-cols-3 gap-2 p-3 text-sm items-center cursor-pointer hover:bg-muted/80 ${oi.dealerId === dealer.id ? selectedBgClass : bgClass} border-b last:border-0 transition-colors`}
                                                        onClick={() => {
                                                            if (oi.dealerId !== dealer.id) {
                                                                const newItems = [...orderItems];
                                                                newItems[index].dealerId = dealer.id;
                                                                if (price !== undefined) newItems[index].price = price;
                                                                if (expiryDate !== undefined) newItems[index].expiryDate = expiryDate;
                                                                setOrderItems(newItems);
                                                            }
                                                        }}
                                                    >
                                                        <span className={`flex flex-col ${textClass}`}>
                                                            {dealer.name}
                                                            {matchedName && <span className="text-[10px] italic opacity-80">Matches: {matchedName}</span>}
                                                            {color === 'blue' && <span className="text-[10px] font-semibold uppercase opacity-80">Out of Stock Locally</span>}
                                                        </span>
                                                        <div className="flex justify-end" onClick={e => oi.dealerId === dealer.id && e.stopPropagation()}>
                                                            {oi.dealerId === dealer.id ? (
                                                                <div className="flex items-center space-x-1">
                                                                    <span className={textClass}>$</span>
                                                                    <Input 
                                                                        type="number" 
                                                                        className={`h-7 w-20 ${textClass} bg-background/50`}
                                                                        value={oi.price}
                                                                        onChange={e => {
                                                                            const newItems = [...orderItems];
                                                                            newItems[index].price = parseFloat(e.target.value) || 0;
                                                                            setOrderItems(newItems);
                                                                        }}
                                                                        onBlur={() => {
                                                                            if (oi.dealerId && oi.id) {
                                                                                updateDealerItem.mutate({ dealerId: oi.dealerId, itemId: oi.id, price: oi.price, expiryDate: oi.expiryDate });
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <span className={`text-right ${textClass}`}>{price !== undefined ? `$${price.toFixed(2)}` : '-'}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex justify-end" onClick={e => oi.dealerId === dealer.id && e.stopPropagation()}>
                                                            {oi.dealerId === dealer.id ? (
                                                                <Input 
                                                                    type="date" 
                                                                    className={`h-7 w-32 text-xs ${textClass} bg-background/50`}
                                                                    value={oi.expiryDate || ''}
                                                                    onChange={e => {
                                                                        const newItems = [...orderItems];
                                                                        newItems[index].expiryDate = e.target.value;
                                                                        setOrderItems(newItems);
                                                                    }}
                                                                    onBlur={() => {
                                                                        if (oi.dealerId && oi.id) {
                                                                            updateDealerItem.mutate({ dealerId: oi.dealerId, itemId: oi.id, price: oi.price, expiryDate: oi.expiryDate });
                                                                        }
                                                                    }}
                                                                />
                                                            ) : (
                                                                <span className={`text-right ${textClass}`}>{expiryDate ? new Date(expiryDate).toLocaleDateString() : '-'}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button variant="outline" className="w-full border-dashed" onClick={() => {
                        setOrderItems([...orderItems, { id: "", quantity: 1, dealerId: "", price: 0, expiryDate: "", isCollapsed: false }]);
                    }}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Another Item
                    </Button>

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea placeholder="e.g., General notes about these orders" value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>Order Date</Label>
                        <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
                    </div>

                    <div className="space-y-2 pt-4">
                        <Label className="text-lg">Photo Verification <span className="text-destructive">*</span></Label>
                        <Card className="border-dashed shadow-none bg-muted/20 relative">
                            {photoDataUri && (
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 rounded-full bg-background border shadow-sm z-10" onClick={() => setPhotoDataUri(null)}>
                                    <X className="h-4 w-4 text-destructive" />
                                </Button>
                            )}
                            <CardContent className="p-6">
                                {photoDataUri ? (
                                    <div className="flex justify-center">
                                        <img src={photoDataUri} alt="Verification" className="rounded-md max-h-[300px]" />
                                    </div>
                                ) : isCameraActive ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <video ref={videoRef} autoPlay playsInline className="rounded-md max-h-[300px] w-full object-cover bg-black" />
                                        <div className="flex gap-2">
                                            <Button onClick={capturePhoto}><Camera className="mr-2 h-4 w-4" /> Capture</Button>
                                            <Button variant="outline" onClick={stopCamera}>Cancel</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-4 py-8">
                                        <p className="text-sm text-muted-foreground">Capture or upload a photo.</p>
                                        <div className="flex gap-4 w-full max-w-md">
                                            <Button className="flex-1" onClick={startCamera}><Camera className="mr-2 h-4 w-4" /> Capture</Button>
                                            <Button className="flex-1" variant="outline"><Upload className="mr-2 h-4 w-4" /> Upload</Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex justify-end mt-8">
                        <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white" onClick={handleSubmit} disabled={createOrder.isPending}>
                            {createOrder.isPending ? "Processing..." : "Review Order"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
