'use client';

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StaffUser } from "@/lib/types";
import { Calendar as CalendarIcon, Check, PlusCircle, Trash2, Camera, Upload, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import React, { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PhotoCaptureCard } from '@/components/shared/photo-capture-card';
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCollection, firestore, useUser, storage } from "@/firebase";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc, writeBatch } from "firebase/firestore";
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
}

type CameraStatus = 'idle' | 'requesting' | 'ready' | 'denied';

function getNextOrderId(orders: PurchaseOrder[]): string {
    if (!orders || orders.length === 0) {
        return "A1";
    }

    let maxNum = 0;
    let latestPrefix = "A";
    
    orders.forEach(order => {
        const match = order.id.match(/^([a-zA-Z]*)(\d+)$/);
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
    const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);
    const [selectedDealerId, setSelectedDealerId] = React.useState<string | null>(null);
    const [availableDealers, setAvailableDealers] = React.useState<EditableDealer[]>([]);
    const [quantity, setQuantity] = React.useState(1);
    const [notes, setNotes] = React.useState("");

    const itemsCollection = useMemo(() => collection(firestore, 'items'), []);
    const { data: inventoryItems, isLoading: itemsLoading } = useCollection<InventoryItem>(itemsCollection as any);
    
    const dealersCollection = useMemo(() => collection(firestore, 'dealers'), []);
    const { data: allDealers, isLoading: dealersLoading } = useCollection<Dealer>(dealersCollection as any);
    
    const ordersCollection = useMemo(() => collection(firestore, 'orderRecords'), []);
    const { data: purchaseOrders, isLoading: ordersLoading } = useCollection<PurchaseOrder>(ordersCollection as any);

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

    useEffect(() => {
        if (user && staffUsers) {
            const staff = staffUsers.find(s => s.email === user.email);
            if (staff) setSelectedStaffUserId(staff.id);
        }
    }, [user, staffUsers]);

    const selectedItem = useMemo(() => inventoryItems?.find(i => i.id === selectedItemId), [inventoryItems, selectedItemId]);
    
    React.useEffect(() => {
        if (!selectedItem || !allDealers) {
            setAvailableDealers([]);
            return;
        };
        
        const supplyingDealers = allDealers.filter(dealer => dealer.suppliedItems?.includes(selectedItem.id));

        const mockDealers = supplyingDealers.map((dealer, index) => ({
            id: dealer.id,
            name: dealer.name,
            phone: dealer.phone || 'N/A',
            price: dealer.itemPrices?.[selectedItem.id] || selectedItem.costPerUnit || 0,
            expiryDate: dealer.itemExpiries?.[selectedItem.id] ? new Date(dealer.itemExpiries[selectedItem.id]) : undefined,
            estimatedArrival: new Date(Date.now() + (index + 1) * 3 * 24 * 60 * 60 * 1000),
            available: true,
        }));
        setAvailableDealers(mockDealers);
        setSelectedDealerId(null);
        if (mockDealers.length > 0) {
            setSelectedDealerId(mockDealers[0].id)
        }

    }, [selectedItem, allDealers]);

    const handleDealerPropChange = (dealerId: string, field: keyof EditableDealer, value: any) => {
        setAvailableDealers(currentDealers => 
            currentDealers.map(d => d.id === dealerId ? { ...d, [field]: value } : d)
        );
    };

    const handleAddDealer = () => {
        router.push('/dealers/add');
    };

    const handleRemoveDealer = (dealerId: string) => {
        setAvailableDealers(current => current.filter(d => d.id !== dealerId));
        if (selectedDealerId === dealerId) {
            setSelectedDealerId(null);
        }
    };

    const handleCreateOrder = async () => {
        if (!firestore || !selectedItem || !selectedDealerId || !orderDate || !manualOrderId || !selectedStaffUserId || !placedByPhoto) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please fill out all fields, including the Order ID, Placed By, and your Photo Verification.',
            });
            return;
        }

        setIsProcessing(true);
        const dealerInfo = availableDealers.find(d => d.id === selectedDealerId);
        if (!dealerInfo) return;

        const dealerComparisons = availableDealers.map(d => {
            const comp: any = {
                dealerName: d.name,
                price: d.price,
            };
            if (d.expiryDate) {
                comp.expiryDate = d.expiryDate.toISOString();
            } else {
                comp.expiryDate = null;
            }
            return comp;
        });

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

        const initialStatus = 'Pending';

        const newOrder: Omit<PurchaseOrder, 'id'> = {
            itemName: selectedItem.name,
            company: selectedItem.company,
            quantity,
            dealer: dealerInfo.name,
            price: dealerInfo.price * quantity,
            estimatedArrival: dealerInfo.estimatedArrival.toISOString(),
            orderDate: orderDate.toISOString(),
            status: initialStatus,
            dealerComparisons,
            placedBy: selectedStaffUserId,
            placedByPhotoUrl: photoUrl,
            ...(notes.trim() ? { notes: notes.trim() } : {}),
        };

        try {
            const batch = writeBatch(firestore);

            const orderRef = doc(firestore, 'orderRecords', manualOrderId);
            batch.set(orderRef, newOrder);

            await batch.commit();

            toast({ title: 'Order Created', description: `Order for ${selectedItem.name} placed successfully.` });

            const originalDealer = allDealers?.find(d => d.id === selectedDealerId);
            
            const priceChanged = originalDealer && originalDealer.itemPrices?.[selectedItem.id] !== dealerInfo.price;
            const currentExpiryIso = dealerInfo.expiryDate?.toISOString() || undefined;
            const originalExpiryIso = originalDealer?.itemExpiries?.[selectedItem.id];
            const expiryChanged = originalDealer && originalExpiryIso !== currentExpiryIso;
            
            if (priceChanged || expiryChanged) {
                const dealerRef = doc(firestore, 'dealers', selectedDealerId);
                const updateData: any = {};
                if (priceChanged) {
                    updateData.itemPrices = {
                        ...(originalDealer?.itemPrices || {}),
                        [selectedItem.id]: dealerInfo.price
                    };
                }
                if (expiryChanged && currentExpiryIso) {
                    updateData.itemExpiries = {
                        ...(originalDealer?.itemExpiries || {}),
                        [selectedItem.id]: currentExpiryIso
                    };
                }
                if (Object.keys(updateData).length > 0) {
                    await setDocumentNonBlocking(dealerRef, updateData, { merge: true });
                }
            }
            
            toast({
                title: 'Order Created',
                description: `Purchase order ${manualOrderId} has been created successfully.`,
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
                            <Select value={selectedStaffUserId} onValueChange={setSelectedStaffUserId} disabled={isProcessing || isStaffLoading}>
                                <SelectTrigger id="staff">
                                    <SelectValue placeholder="Select your name" />
                                </SelectTrigger>
                                <SelectContent>
                                    {staffUsers?.map(staff => (
                                        <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <Label htmlFor="orderId">Order ID</Label>
                            <Input id="orderId" placeholder="Enter a unique order ID" value={manualOrderId} onChange={e => setManualOrderId(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity</Label>
                            <div className="relative">
                                <Input id="quantity" type="number" placeholder="e.g., 10" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                                {selectedItem && (
                                    <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">{selectedItem.quantity.unit}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="item">Select Item</Label>
                         <Select onValueChange={setSelectedItemId} disabled={itemsLoading}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an item to order" />
                            </SelectTrigger>
                            <SelectContent>
                                {inventoryItems?.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>{item.name} ({item.brandName})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedItem && (
                        <div className="space-y-4">
                             <div className="flex justify-between items-center">
                                <Label>Select a Dealer</Label>
                                <Button variant="ghost" size="sm" onClick={handleAddDealer} disabled={dealersLoading}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Dealer
                                </Button>
                            </div>
                            {availableDealers.length > 0 ? (
                                <RadioGroup 
                                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                    value={selectedDealerId || ''}
                                    onValueChange={setSelectedDealerId}
                                >
                                    {availableDealers.map(dealer => (
                                        <div key={dealer.id} className="relative">
                                            <Label 
                                                htmlFor={dealer.id}
                                                className={cn(
                                                    "border-2 rounded-lg p-4 cursor-pointer transition-all block",
                                                    selectedDealerId === dealer.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                                )}
                                            >
                                                <RadioGroupItem value={dealer.id} id={dealer.id} className="sr-only" />
                                                {selectedDealerId === dealer.id && (
                                                    <div className="absolute top-2 right-2 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                                                        <Check className="w-3 h-3" />
                                                    </div>
                                                )}
                                                <p className="font-semibold text-base p-0 border-0 h-auto mb-1 bg-transparent">
                                                    {dealer.name}
                                                </p>
                                                <p className="text-sm text-muted-foreground mb-3">{dealer.phone}</p>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Label htmlFor={`price-${dealer.id}`} className="text-sm text-muted-foreground">Price:</Label>
                                                    <Input 
                                                        id={`price-${dealer.id}`}
                                                        type="number"
                                                        className="h-8"
                                                        value={dealer.price}
                                                        onChange={(e) => handleDealerPropChange(dealer.id, 'price', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                                 <div className="flex items-center gap-2 mb-2">
                                                    <Label className="text-sm text-muted-foreground">Expiry:</Label>
                                                     <Popover>
                                                        <PopoverTrigger asChild>
                                                          <Button
                                                            variant={"outline"}
                                                            size="sm"
                                                            className={cn(
                                                              "w-full justify-start text-left font-normal h-8",
                                                              !dealer.expiryDate && "text-muted-foreground"
                                                            )}
                                                          >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {dealer.expiryDate ? format(dealer.expiryDate, "PPP") : <span>Select date</span>}
                                                          </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0">
                                                          <Calendar
                                                            mode="single"
                                                            selected={dealer.expiryDate}
                                                            onSelect={(date) => handleDealerPropChange(dealer.id, 'expiryDate', date)}
                                                            initialFocus
                                                          />
                                                        </PopoverContent>
                                                      </Popover>
                                                </div>
                                                 <div className="flex items-center gap-2">
                                                    <Label htmlFor={`eta-${dealer.id}`} className="text-sm text-muted-foreground">ETA:</Label>
                                                     <Popover>
                                                        <PopoverTrigger asChild>
                                                          <Button
                                                            variant={"outline"}
                                                            size="sm"
                                                            className={cn(
                                                              "w-full justify-start text-left font-normal h-8",
                                                              !dealer.estimatedArrival && "text-muted-foreground"
                                                            )}
                                                          >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {dealer.estimatedArrival ? format(dealer.estimatedArrival, "PPP") : <span>Pick a date</span>}
                                                          </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0">
                                                          <Calendar
                                                            mode="single"
                                                            selected={dealer.estimatedArrival}
                                                            onSelect={(date) => date && handleDealerPropChange(dealer.id, 'estimatedArrival', date)}
                                                            initialFocus
                                                          />
                                                        </PopoverContent>
                                                      </Popover>
                                                </div>
                                            </Label>
                                             <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="absolute bottom-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleRemoveDealer(dealer.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </RadioGroup>
                            ) : (
                                <div className="text-center text-muted-foreground p-4 border-2 border-dashed rounded-lg">
                                    <p>No dealers found that supply this item.</p>
                                    <Button variant="link" asChild><Link href="/dealers">Manage Dealers</Link></Button>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {selectedDealerId && (
                         <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea id="notes" placeholder="e.g., Chose this dealer due to faster delivery time." value={notes} onChange={e => setNotes(e.target.value)} />
                        </div>
                    )}


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
                        <Button onClick={handleCreateOrder} disabled={!selectedItemId || !selectedDealerId || !manualOrderId || !placedByPhoto || isProcessing}>
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Order
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
        </div>
    );

    
}
    
