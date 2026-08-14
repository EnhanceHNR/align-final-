'use client';

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DealerSelect } from "@/components/orders/dealer-select";
import { StaffUser } from "@/lib/types";
import { Calendar as CalendarIcon, Check, PlusCircle, Trash2, Camera, Upload, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import React, { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PhotoCaptureCard } from '@/components/shared/photo-capture-card';
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCollection, firestore, useUser, storage } from "@/firebase";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc, writeBatch, updateDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { Dealer, InventoryItem, PurchaseOrder } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

type EditableDealer = {
    id: string;
    name: string;
    phone: string;
    price: number;
    expiryDate?: Date;
    estimatedArrival: Date;
    available: boolean;
    hasAllItems?: boolean;
    missingItems?: any[];
}

type CameraStatus = 'idle' | 'requesting' | 'ready' | 'denied';

function getNextOrderId(orders: PurchaseOrder[]): string {
    if (!orders || orders.length === 0) {
        return "A1";
    }

    let maxNum = 0;
    let latestPrefix = "A";
    
    orders.forEach(order => {
        const match = order.id.match(/^([a-zA-Z]*)(\d+)(?:-\d+)?$/);
        if (match) {
            const [, prefix, numStr] = match;
            const num = parseInt(numStr, 10);
            if (num > maxNum) {
                maxNum = num;
                latestPrefix = prefix;
            }
        }
    });

    return `${latestPrefix}${maxNum + 1}`;
}


export default function CreateOrderPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const [isProcessing, setIsProcessing] = useState(false);
    
    const usersCollection = useMemo(() => firestore ? collection(firestore, 'users') : null, []);
    const { data: staffUsers, isLoading: isStaffLoading } = useCollection<StaffUser>(usersCollection as any);

    const [selectedStaffUserId, setSelectedStaffUserId] = useState<string>('');
    const [manualOrderId, setManualOrderId] = React.useState('');
    const [orderDate, setOrderDate] = React.useState<Date>(new Date());
    type SelectedItem = { 
        id: string; 
        quantity: number; 
        dealerId?: string;
        price?: number;
        estimatedArrival?: Date;
        expiryDate?: Date;
        isCollapsed?: boolean;
    };
    const [selectedItems, setSelectedItems] = React.useState<SelectedItem[]>([{ 
        id: '', 
        quantity: 1, 
        estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) 
    }]);
    
    // Legacy state not needed for global dealer selection, keeping for compatibility if used elsewhere, 
    // but we will use selectedItems to track dealer selection per item.
    const [dealerSearchQuery, setDealerSearchQuery] = React.useState("");
    const [availableDealers, setAvailableDealers] = React.useState<EditableDealer[]>([]);
    const [notes, setNotes] = React.useState("");

    // Quick Add Dealer State
    const [isAddDealerDialogOpen, setIsAddDealerDialogOpen] = React.useState(false);
    const [newDealerName, setNewDealerName] = React.useState("");
    const [newDealerPhone, setNewDealerPhone] = React.useState("");
    const [isAddingDealer, setIsAddingDealer] = React.useState(false);

    const itemsCollection = useMemo(() => collection(firestore, 'items'), []);
    const { data: inventoryItems, isLoading: itemsLoading } = useCollection<InventoryItem>(itemsCollection as any);
    
    const dealersCollection = useMemo(() => collection(firestore, 'dealers'), []);
    const { data: allDealers, isLoading: dealersLoading } = useCollection<Dealer>(dealersCollection as any);
    
    const ordersCollection = useMemo(() => collection(firestore, 'orderRecords'), []);
    const { data: purchaseOrders, isLoading: ordersLoading } = useCollection<PurchaseOrder>(ordersCollection as any);

    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

    const [placedByPhoto, setPlacedByPhoto] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        const startCamera = async () => {
            if (!isCameraActive) return;
            setCameraStatus('requesting');
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setCameraStatus('ready');
            } catch (error) {
                console.error('Error accessing camera:', error);
                setCameraStatus('denied');
            }
        };

        const stopCamera = () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
             if(videoRef.current) {
                videoRef.current.srcObject = null;
            }
            setCameraStatus('idle');
        };

        if (isCameraActive) {
            startCamera();
        } else {
            stopCamera();
        }

        return () => stopCamera();
    }, [isCameraActive]);

    const handleCapture = () => {
        if (cameraStatus !== 'ready' || !videoRef.current || !canvasRef.current || !isCameraActive) return;

        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (!context) return;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        
        setPlacedByPhoto(dataUrl);
        setIsCameraActive(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && isCameraActive) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                setPlacedByPhoto(loadEvent.target?.result as string);
                setIsCameraActive(false);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
        e.target.value = '';
    };

    useEffect(() => {
        if (purchaseOrders && !ordersLoading) {
            setManualOrderId(getNextOrderId(purchaseOrders));
        }
    }, [purchaseOrders, ordersLoading]);

    // We no longer need the global availableDealers computation since dealers are selected per item.
    const resolvedSelectedItems = useMemo(() => {
        if (!inventoryItems) return [];
        return selectedItems
            .filter(si => si.id !== '')
            .map(si => {
                const item = inventoryItems.find(i => i.id === si.id);
                return item ? { ...item, orderQuantity: si.quantity, selectedItemRef: si } : null;
            })
            .filter(Boolean) as (InventoryItem & { orderQuantity: number, selectedItemRef: SelectedItem })[];
    }, [inventoryItems, selectedItems]);

    useEffect(() => {
        if (user && staffUsers) {
            const staff = staffUsers.find(s => s.email === user.email);
            if (staff) setSelectedStaffUserId(staff.id);
        }
    }, [user, staffUsers]);

    // Keeping placeholder for any quick add dealer logic, though we might not need it
    const filteredDealers = useMemo(() => {
        if (!allDealers) return [];
        if (!dealerSearchQuery.trim()) return allDealers;
        return allDealers.filter(d => d.name.toLowerCase().includes(dealerSearchQuery.toLowerCase()));
    }, [allDealers, dealerSearchQuery]);

    const handleUpdateDealerItems = async (dealerId: string, missingItems: any[]) => {
        if (!firestore) return;
        try {
            const dealer = allDealers?.find(d => d.id === dealerId);
            if (!dealer) return;
            const newSuppliedItems = [...(dealer.suppliedItems || [])];
            missingItems.forEach(mi => {
                if (!newSuppliedItems.includes(mi.id)) {
                    newSuppliedItems.push(mi.id);
                }
            });
            await updateDoc(doc(firestore, "dealers", dealerId), {
                suppliedItems: newSuppliedItems
            });
            toast({
                title: "Dealer Updated",
                description: "Items successfully added to the dealer."
            });
        } catch(e) {
            toast({ variant: "destructive", title: "Error", description: "Failed to update dealer." });
        }
    };

    const handleSaveToDealer = async (itemIndex: number) => {
        if (!firestore) return;
        const si = selectedItems[itemIndex];
        const item = inventoryItems?.find(i => i.id === si.id);
        const dealer = allDealers?.find(d => d.id === si.dealerId);
        
        if (!item || !dealer || !si.dealerId) return;

        setIsProcessing(true);
        try {
            const newSuppliedItems = [...(dealer.suppliedItems || [])];
            if (!newSuppliedItems.includes(item.id)) {
                newSuppliedItems.push(item.id);
            }

            const currentPrice = si.price ?? dealer.itemPrices?.[item.id] ?? item.costPerUnit ?? 0;
            const newItemPrices = { ...(dealer.itemPrices || {}) };
            newItemPrices[item.id] = currentPrice;

            const newItemExpiries = { ...(dealer.itemExpiries || {}) };
            if (si.expiryDate) {
                newItemExpiries[item.id] = si.expiryDate.toISOString();
            } else if (!newItemExpiries[item.id] && item.stock && item.stock.length > 0 && item.stock[0].expiryDate) {
                newItemExpiries[item.id] = item.stock[0].expiryDate;
            }

            await updateDoc(doc(firestore, "dealers", dealer.id), {
                suppliedItems: newSuppliedItems,
                itemPrices: newItemPrices,
                itemExpiries: newItemExpiries
            });

            toast({
                title: "Dealer Updated",
                description: `${item.name} information has been updated for ${dealer.name}.`
            });
        } catch(e) {
            toast({ variant: "destructive", title: "Error", description: "Failed to update dealer." });
        } finally {
            setIsProcessing(false);
        }
    };

    // handleDealerPropChange is no longer used since we track props in selectedItems directly

    const handleAddDealer = () => {
        setIsAddDealerDialogOpen(true);
    };

    const handleCreateNewDealer = async () => {
        if (!firestore) return;
        if (!newDealerName.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Dealer name is required.' });
            return;
        }

        setIsAddingDealer(true);
        try {
            const dealerRef = doc(collection(firestore, 'dealers'));
            const suppliedItemIds = resolvedSelectedItems.map(i => i.id);
            
            const newDealer: Omit<Dealer, 'id'> = {
                name: newDealerName.trim(),
                phone: newDealerPhone.trim(),
                email: "",
                contactPerson: "",
                address: "",
                website: "",
                suppliedItems: suppliedItemIds,
            };

            await setDocumentNonBlocking(dealerRef, newDealer);

            toast({
                title: "Dealer Added",
                description: `${newDealer.name} has been added and linked to your selected items.`
            });

            setNewDealerName("");
            setNewDealerPhone("");
            setIsAddDealerDialogOpen(false);
            
            setSelectedDealerId(dealerRef.id);
        } catch (e: any) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to add dealer.' });
        } finally {
            setIsAddingDealer(false);
        }
    };

    const handleRemoveDealer = (dealerId: string) => {
        // no-op for now
    };

    const handleReviewOrder = () => {
        if (!firestore || resolvedSelectedItems.length === 0 || !manualOrderId || !selectedStaffUserId || !placedByPhoto) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please fill out all fields, select at least one item, and include your Photo Verification.',
            });
            return;
        }

        const missingDealer = selectedItems.find(si => si.id && !si.dealerId);
        if (missingDealer) {
            toast({
                variant: 'destructive',
                title: 'Missing Dealer',
                description: 'Please select a dealer for all items in your order.',
            });
            return;
        }
        
        setIsConfirmDialogOpen(true);
    };

    const handleCreateOrder = async () => {
        setIsProcessing(true);
        setIsConfirmDialogOpen(false);

        let photoUrl = '';
        try {
            if (!storage || !manualOrderId) throw new Error("Storage service is not available.");
            const imageRef = ref(storage, `verifications/${manualOrderId}/placedBy-${Date.now()}.png`);
            await uploadString(imageRef, placedByPhoto, 'data_url');
            photoUrl = await getDownloadURL(imageRef);
        } catch(e) {
            console.error("Photo upload failed:", e);
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Failed to upload photo verification.' });
            setIsProcessing(false);
            return;
        }

        try {
            const batch = writeBatch(firestore);

            let orderIndex = 1;
            const multipleItems = resolvedSelectedItems.length > 1;

            for (const item of resolvedSelectedItems) {
                const dId = item.selectedItemRef.dealerId!;
                const dealer = allDealers?.find(d => d.id === dId);
                const orderId = multipleItems ? `${manualOrderId}-${orderIndex}` : manualOrderId;
                
                const price = item.selectedItemRef.price ?? (dealer?.itemPrices?.[item.id] || item.costPerUnit || 0);
                const totalPrice = price * item.orderQuantity;
                
                const eta = item.selectedItemRef.estimatedArrival || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

                const newOrder: Omit<PurchaseOrder, 'id'> = {
                    itemName: item.name,
                    company: item.company || 'Unknown',
                    quantity: item.orderQuantity,
                    dealer: dealer?.name || 'Unknown Dealer',
                    price: totalPrice,
                    estimatedArrival: eta.toISOString(),
                    orderDate: orderDate.toISOString(),
                    status: 'Pending',
                    placedBy: selectedStaffUserId,
                    placedByPhotoUrl: photoUrl,
                    ...(notes.trim() ? { notes: notes.trim() } : {}),
                };

                const orderRef = doc(firestore, 'orderRecords', orderId);
                batch.set(orderRef, newOrder);
                orderIndex++;
            }

            await batch.commit();

            toast({
                title: 'Order Created',
                description: `Purchase order(s) placed successfully.`,
            });

            router.push('/orders');
        } catch (e: any) {
            console.error(e);
            toast({
                variant: 'destructive',
                title: 'Error creating order',
                description: e.message || 'An unexpected error occurred.',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <PageHeader title="Create Purchase Order" />
                <Button variant="outline" asChild>
                  <Link href="/orders">Cancel</Link>
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Order Details</CardTitle>
                    <CardDescription>Select the item, dealer, and staff placing the order.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="staff">Placed By <span className="text-destructive">*</span></Label>
                            <SearchableSelect
                                options={staffUsers?.map(staff => ({ value: staff.id, label: staff.name })) || []}
                                value={selectedStaffUserId}
                                onValueChange={setSelectedStaffUserId}
                                placeholder="Select your name"
                                disabled={isProcessing || isStaffLoading}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="orderId">Base Order ID</Label>
                        <Input id="orderId" placeholder="Enter a unique order ID" value={manualOrderId} onChange={e => setManualOrderId(e.target.value)} />
                    </div>

                    <div className="space-y-4">
                        <Label className="text-lg font-semibold block">Items to Order</Label>
                        {selectedItems.map((si, index) => {
                            const itemDetails = inventoryItems?.find(i => i.id === si.id);
                            return (
                                <div key={index} className="flex flex-col gap-4 bg-muted/20 p-4 rounded-lg border border-border">
                                    <div className="flex flex-col md:flex-row gap-4 items-end">
                                        <div className="flex-1 space-y-2 w-full">
                                            <Label>Item {index + 1}</Label>
                                            <SearchableSelect
                                                options={inventoryItems?.map((item) => {
                                                    const kw = [];
                                                    if (item.genericName) kw.push(item.genericName.toLowerCase());
                                                    if (item.tags) kw.push(...item.tags.map(t => t.toLowerCase()));
                                                    return { 
                                                        value: item.id, 
                                                        label: `${item.name} (${item.brandName})`,
                                                        keywords: kw
                                                    };
                                                }) || []}
                                                value={si.id}
                                                onValueChange={(val) => {
                                                    const newItems = [...selectedItems];
                                                    newItems[index].id = val;
                                                    newItems[index].dealerId = ''; // Reset dealer when item changes
                                                    newItems[index].isCollapsed = false;
                                                    setSelectedItems(newItems);
                                                }}
                                                placeholder="Select an item"
                                                disabled={itemsLoading}
                                            />
                                        </div>
                                        <div className="w-full md:w-32 space-y-2">
                                            <Label>Quantity</Label>
                                            <div className="relative">
                                                <Input 
                                                    type="number" 
                                                    min="1" 
                                                    value={si.quantity || ''} 
                                                    onChange={e => {
                                                        const newItems = [...selectedItems];
                                                        newItems[index].quantity = parseInt(e.target.value) || 0;
                                                        newItems[index].isCollapsed = false;
                                                        setSelectedItems(newItems);
                                                    }} 
                                                />
                                                {itemDetails && (
                                                    <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">{itemDetails.quantity.unit}</span>
                                                )}
                                            </div>
                                        </div>
                                        {selectedItems.length > 1 && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="text-muted-foreground hover:text-destructive w-10 h-10 shrink-0"
                                                onClick={() => {
                                                    const newItems = [...selectedItems];
                                                    newItems.splice(index, 1);
                                                    setSelectedItems(newItems);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    {!si.isCollapsed ? (
                                        <div className="flex-1 space-y-2 w-full">
                                            <Label>Dealer</Label>
                                            <DealerSelect
                                                dealers={allDealers || []}
                                                item={itemDetails!}
                                                allItems={inventoryItems || []}
                                                value={si.dealerId || ''}
                                                onValueChange={(val) => {
                                                    const newItems = [...selectedItems];
                                                    newItems[index].dealerId = val;
                                                    setSelectedItems(newItems);
                                                }}
                                                disabled={dealersLoading}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex-1 space-y-2 w-full">
                                            <Label>Dealer</Label>
                                            <div 
                                                className="p-3 border rounded-md bg-muted text-sm cursor-pointer hover:bg-muted/80 flex justify-between items-center"
                                                onClick={() => {
                                                    const newItems = [...selectedItems];
                                                    newItems[index].isCollapsed = false;
                                                    setSelectedItems(newItems);
                                                }}
                                            >
                                                <span>{allDealers?.find(d => d.id === si.dealerId)?.name || "Select Dealer"}</span>
                                                <span className="text-muted-foreground text-xs">Click to edit</span>
                                            </div>
                                        </div>
                                    )}

                                    {si.dealerId && (
                                        <div className="flex flex-col md:flex-row gap-4 items-end bg-background p-3 rounded-md border border-border relative">
                                            <div className="flex-1 space-y-2 w-full">
                                                <Label>Price (per unit)</Label>
                                                <Input 
                                                    type="number"
                                                    value={si.price ?? (allDealers?.find(d => d.id === si.dealerId)?.itemPrices?.[si.id] || itemDetails?.costPerUnit || 0)}
                                                    onChange={e => {
                                                        const newItems = [...selectedItems];
                                                        newItems[index].price = parseFloat(e.target.value) || 0;
                                                        setSelectedItems(newItems);
                                                    }}
                                                />
                                            </div>
                                            <div className="flex-1 space-y-2 w-full">
                                                <Label>ETA</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                      <Button
                                                        variant={"outline"}
                                                        className={cn("w-full justify-start text-left font-normal", !si.estimatedArrival && "text-muted-foreground")}
                                                      >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {si.estimatedArrival ? format(si.estimatedArrival, "PPP") : <span>Pick a date</span>}
                                                      </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                      <Calendar
                                                        mode="single"
                                                        selected={si.estimatedArrival}
                                                        onSelect={(d) => {
                                                            const newItems = [...selectedItems];
                                                            newItems[index].estimatedArrival = d || undefined;
                                                            setSelectedItems(newItems);
                                                        }}
                                                        initialFocus
                                                      />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                            <div className="flex-1 space-y-2 w-full">
                                                <Label>Item Expiry (Optional)</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                      <Button
                                                        variant={"outline"}
                                                        className={cn("w-full justify-start text-left font-normal", !si.expiryDate && !(allDealers?.find(d => d.id === si.dealerId)?.itemExpiries?.[si.id]) && "text-muted-foreground")}
                                                      >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {si.expiryDate 
                                                            ? format(si.expiryDate, "PPP") 
                                                            : (allDealers?.find(d => d.id === si.dealerId)?.itemExpiries?.[si.id]
                                                                ? format(new Date(allDealers!.find(d => d.id === si.dealerId)!.itemExpiries![si.id]), "PPP")
                                                                : <span>No expiry</span>)}
                                                      </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                      <Calendar
                                                        mode="single"
                                                        selected={si.expiryDate}
                                                        onSelect={(d) => {
                                                            const newItems = [...selectedItems];
                                                            newItems[index].expiryDate = d || undefined;
                                                            setSelectedItems(newItems);
                                                        }}
                                                        initialFocus
                                                      />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                            
                                            {si.dealerId && allDealers?.find(d => d.id === si.dealerId) && (
                                                <div className="w-full md:w-auto flex flex-col gap-2">
                                                    <Button 
                                                        variant="secondary" 
                                                        onClick={() => handleSaveToDealer(index)}
                                                        disabled={isProcessing}
                                                    >
                                                        {!allDealers?.find(d => d.id === si.dealerId)?.suppliedItems?.includes(si.id) ? "Save to Dealer" : "Update Dealer"}
                                                    </Button>
                                                    <Button
                                                        variant="default"
                                                        onClick={() => {
                                                            handleSaveToDealer(index);
                                                            const newItems = [...selectedItems];
                                                            newItems[index].isCollapsed = true;
                                                            if (index === newItems.length - 1) {
                                                                newItems.push({ id: '', quantity: 1, isCollapsed: false });
                                                            }
                                                            setSelectedItems(newItems);
                                                        }}
                                                        disabled={isProcessing}
                                                    >
                                                        OK (Next Item)
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        
                        <Button 
                            variant="outline" 
                            className="w-full border-dashed" 
                            onClick={() => setSelectedItems([...selectedItems, { id: '', quantity: 1 }])}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Another Item
                        </Button>
                    </div>

                    {/* Removed global dealer selection */}
                    
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea id="notes" placeholder="e.g., General notes about these orders" value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>


                     <div className="space-y-2">
                         <Label htmlFor="orderDate">Order Date</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !orderDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {orderDate ? format(orderDate, "PPP") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={orderDate}
                                onSelect={(d) => setOrderDate(d || new Date())}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Photo Verification <span className="text-destructive">*</span></Label>
                        <PhotoCaptureCard 
                            title="Placer's Photo"
                            photo={placedByPhoto}
                            onCaptureClick={() => setIsCameraActive(true)}
                            onUploadClick={() => {
                                setIsCameraActive(true);
                                fileInputRef.current?.click();
                            }}
                            onClearClick={() => setPlacedByPhoto(null)}
                            isProcessing={isProcessing}
                        />
                    </div>
                    
                    <div className="flex justify-end gap-2">
                        <Button onClick={handleReviewOrder} disabled={resolvedSelectedItems.length === 0 || selectedItems.some(i => !i.id || !i.dealerId) || !manualOrderId || !placedByPhoto || isProcessing}>
                            Review Order
                        </Button>
                    </div>

                </CardContent>
            </Card>

            <canvas ref={canvasRef} className="hidden"></canvas>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />

            <Dialog open={isCameraActive} onOpenChange={(isOpen) => setIsCameraActive(isOpen)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Capture Photo</DialogTitle>
                    </DialogHeader>
                    <div className="bg-muted rounded-md aspect-video flex items-center justify-center overflow-hidden">
                       <video ref={videoRef} className="w-full aspect-video rounded-md" autoPlay muted playsInline />
                       {cameraStatus === 'denied' && (
                            <Alert variant="destructive" className="m-4">
                               <AlertTitle>Camera Access Denied</AlertTitle>
                               <AlertDescription>
                                 Please allow camera access in your browser settings to use this feature.
                               </AlertDescription>
                             </Alert>
                       )}
                       {cameraStatus === 'requesting' && (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                                <p className="text-muted-foreground">Requesting camera...</p>
                           </div>
                       )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsCameraActive(false)} variant="outline">Cancel</Button>
                        <Button onClick={handleCapture} disabled={cameraStatus !== 'ready'}>
                            <Camera className="mr-2" /> Capture
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddDealerDialogOpen} onOpenChange={setIsAddDealerDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Quick Add Dealer</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="dealer-name">Dealer Name <span className="text-destructive">*</span></Label>
                            <Input 
                                id="dealer-name" 
                                placeholder="e.g., Prime Medical Supplies" 
                                value={newDealerName} 
                                onChange={e => setNewDealerName(e.target.value)} 
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="dealer-phone">Mobile Number</Label>
                            <Input 
                                id="dealer-phone" 
                                placeholder="e.g., +91 98765 43210" 
                                value={newDealerPhone} 
                                onChange={e => setNewDealerPhone(e.target.value)} 
                            />
                        </div>
                        <div className="bg-muted p-3 rounded-md text-sm mt-2 border border-border">
                            <p className="font-semibold mb-1">Items that will be assigned to this dealer:</p>
                            <ul className="list-disc list-inside text-muted-foreground">
                                {resolvedSelectedItems.map((item, idx) => (
                                    <li key={idx}>{item.name} {item.brandName ? `(${item.brandName})` : ''}</li>
                                ))}
                                {resolvedSelectedItems.length === 0 && <li>No items selected yet.</li>}
                            </ul>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDealerDialogOpen(false)} disabled={isAddingDealer}>Cancel</Button>
                        <Button onClick={handleCreateNewDealer} disabled={isAddingDealer || !newDealerName.trim()}>
                            {isAddingDealer && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Dealer & Continue
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Confirm Order Details</DialogTitle>
                        <DialogDescription>Please review the grouped orders before submitting. This will create multiple purchase orders.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        {Object.entries(resolvedSelectedItems.reduce((acc, item) => {
                            const dId = item.selectedItemRef.dealerId!;
                            if (!acc[dId]) acc[dId] = [];
                            acc[dId].push(item);
                            return acc;
                        }, {} as Record<string, typeof resolvedSelectedItems>)).map(([dId, items], idx) => {
                            const dealer = allDealers?.find(d => d.id === dId);
                            const orderId = Object.keys(resolvedSelectedItems.reduce((a, i) => { a[i.selectedItemRef.dealerId!] = true; return a; }, {} as any)).length > 1 ? `${manualOrderId}-${idx + 1}` : manualOrderId;
                            const totalPrice = items.reduce((sum, item) => {
                                const price = item.selectedItemRef.price ?? (dealer?.itemPrices?.[item.id] || item.costPerUnit || 0);
                                return sum + (price * item.orderQuantity);
                            }, 0);
                            
                            return (
                                <div key={dId} className="border rounded-lg p-4 bg-muted/10">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-semibold text-lg">{dealer?.name || 'Unknown Dealer'}</h3>
                                        <span className="text-sm text-muted-foreground font-mono">Order ID: {orderId}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {items.map((item, i) => {
                                            const price = item.selectedItemRef.price ?? (dealer?.itemPrices?.[item.id] || item.costPerUnit || 0);
                                            return (
                                                <div key={i} className="flex justify-between text-sm items-center border-b pb-2 last:border-0 last:pb-0">
                                                    <div>
                                                        <span className="font-medium">{item.name}</span>
                                                        <span className="text-muted-foreground ml-2">x{item.orderQuantity} {item.quantity?.unit}</span>
                                                    </div>
                                                    <span>INR {price * item.orderQuantity}</span>
                                                </div>
                                            );
                                        })}
                                        <div className="flex justify-between font-bold pt-2 border-t">
                                            <span>Dealer Total</span>
                                            <span>INR {totalPrice}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)} disabled={isProcessing}>Cancel</Button>
                        <Button onClick={handleCreateOrder} disabled={isProcessing}>
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm & Submit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );

    
}
    
