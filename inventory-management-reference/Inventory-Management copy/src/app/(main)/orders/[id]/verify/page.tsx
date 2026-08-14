
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, useDoc, useUser, firestore, storage, errorEmitter, FirestorePermissionError, useCollection } from '@/firebase';
import { InventoryItem, PurchaseOrder } from '@/lib/types';
import { doc, addDoc, collection, updateDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, Upload, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { PhotoCaptureCard } from '@/components/shared/photo-capture-card';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StaffUser } from "@/lib/types";
import { Trash2, Plus } from 'lucide-react';

type PhotoType = 'item' | 'receiver' | 'bill' | 'deliveryPerson';
type CameraStatus = 'idle' | 'requesting' | 'ready' | 'denied';



export default function VerifyDeliveryPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const orderId = params.id as string;

    const { user } = useUser();

    const orderRef = useMemo(() => {
        if (!firestore || !orderId) return null;
        return doc(firestore, 'orderRecords', orderId);
    }, [orderId]);
    const { data: order, isLoading: orderLoading } = useDoc<PurchaseOrder>(orderRef);

    const [isProcessing, setIsProcessing] = useState(false);
    const [billPrice, setBillPrice] = useState<number | ''>('');
    const [comments, setComments] = useState('');
    const [batches, setBatches] = useState<{ quantity: number | '', expiryDate: Date | undefined, company: string }>([
        { quantity: '', expiryDate: undefined, company: '' }
    ]);
    const [isPriceAlertOpen, setIsPriceAlertOpen] = useState(false);
    const [isCompanyAlertOpen, setIsCompanyAlertOpen] = useState(false);
    
    useEffect(() => {
        if (order && batches.length === 1 && !batches[0].company && !batches[0].quantity && !batches[0].expiryDate) {
            setBatches([{ quantity: '', expiryDate: undefined, company: order.company || '' }]);
        }
    }, [order]);

    const quantityReceived = batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
    
    const usersCollection = useMemo(() => firestore ? collection(firestore, 'users') : null, []);
    const { data: staffUsers, isLoading: isStaffLoading } = useCollection<StaffUser>(usersCollection as any);
    const [selectedReceiverId, setSelectedReceiverId] = useState<string>('');


    const [itemImage, setItemImage] = useState<string | null>(null);
    const [receiverImage, setReceiverImage] = useState<string | null>(null);
    const [billImage, setBillImage] = useState<string | null>(null);
    const [deliveryPersonImage, setDeliveryPersonImage] = useState<string | null>(null);

    const [activeCapture, setActiveCapture] = useState<PhotoType | null>(null);
    const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    
    useEffect(() => {
        const startCamera = async () => {
            if (!activeCapture) return;
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

        if (activeCapture) {
            startCamera();
        } else {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [activeCapture]);

    const handleCapture = () => {
        if (cameraStatus !== 'ready' || !videoRef.current || !canvasRef.current || !activeCapture) return;

        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (!context) return;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        
        if (activeCapture === 'item') setItemImage(dataUrl);
        else if (activeCapture === 'receiver') setReceiverImage(dataUrl);
        else if (activeCapture === 'bill') setBillImage(dataUrl);
        else if (activeCapture === 'deliveryPerson') setDeliveryPersonImage(dataUrl);
        
        setActiveCapture(null);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const currentActiveCapture = activeCapture; 
        if (e.target.files && e.target.files[0] && currentActiveCapture) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const dataUrl = loadEvent.target?.result as string;
                if (currentActiveCapture === 'item') setItemImage(dataUrl);
                else if (currentActiveCapture === 'receiver') setReceiverImage(dataUrl);
                else if (currentActiveCapture === 'bill') setBillImage(dataUrl);
                else if (currentActiveCapture === 'deliveryPerson') setDeliveryPersonImage(dataUrl);
                setActiveCapture(null);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
        e.target.value = '';
    };
    
    const openUploadDialog = (type: PhotoType) => {
        setActiveCapture(type);
        fileInputRef.current?.click();
    };

    const uploadImage = async (dataUrl: string, name: string): Promise<string> => {
        if (!storage || !orderId) throw new Error("Storage service is not available.");
        const imageRef = ref(storage, `verifications/${orderId}/${name}-${Date.now()}.png`);
        await uploadString(imageRef, dataUrl, 'data_url');
        return getDownloadURL(imageRef);
    };

    const handleVerification = async (isApproved: boolean, skipPriceCheck = false, skipCompanyCheck = false) => {
         if (isApproved && (!itemImage || !receiverImage || !billImage || billPrice === '' || quantityReceived === 0 || !selectedReceiverId)) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide all required photos, fields, select a receiver, and ensure quantity is greater than 0.' });
            return;
        }

        if (isApproved) {
            for (let i = 0; i < batches.length; i++) {
                if (!batches[i].quantity || !batches[i].expiryDate || !batches[i].company?.trim()) {
                    toast({ variant: 'destructive', title: 'Incomplete Batch', description: `Please provide quantity, expiry date, and company for batch ${i + 1}.` });
                    return;
                }
            }
        }

        if (!isApproved && !comments) {
            toast({ variant: 'destructive', title: 'Missing Comments', description: 'Please provide comments explaining the rejection.' });
            return;
        }

        if (!firestore || !storage || !user || !orderRef || !order) {
            toast({ variant: 'destructive', title: 'Error', description: 'Core services not ready. Please try again.' });
            return;
        }

        const hasCompanyMismatch = isApproved && batches.some(b => b.company.trim() !== (order.company || ''));

        if (isApproved && !skipPriceCheck && Number(billPrice) !== order.price) {
            setIsPriceAlertOpen(true);
            return;
        }

        if (hasCompanyMismatch && !skipCompanyCheck) {
            setIsCompanyAlertOpen(true);
            return;
        }

        setIsProcessing(true);
        toast({ title: "Submitting Verification...", description: "Please wait. Uploading images..." });

        try {
            const itemPhotoUrl = await uploadImage(itemImage, 'item-photo');
            const receiverPhotoUrl = await uploadImage(receiverImage, 'receiver-photo');
            const billPhotoUrl = await uploadImage(billImage, 'bill-photo');
            let deliveryPersonPhotoUrl: string | undefined = undefined;

            if (deliveryPersonImage) {
                 deliveryPersonPhotoUrl = await uploadImage(deliveryPersonImage, 'delivery-person-photo');
            }
            
            const deliveryData: any = {
                orderRecordId: orderId,
                itemPhotoUrl,
                receiverPhotoUrl,
                billPhotoUrl,
                receiverId: selectedReceiverId,
                actualPrice: Number(billPrice),
                quantityReceived: Number(quantityReceived),
                deliveryDate: new Date().toISOString(),
                isApproved,
                comments,
                isPaid: false
            };

            if (deliveryPersonPhotoUrl) {
                deliveryData.deliveryPersonPhotoUrl = deliveryPersonPhotoUrl;
            }

            const batch = writeBatch(firestore);
            
            const deliveriesCol = collection(firestore, 'deliveries');
            const deliveryRef = doc(deliveriesCol);
            batch.set(deliveryRef, deliveryData);

            if (isApproved) {
                const itemsCol = collection(firestore, 'items');
                const nameQ = query(itemsCol, where("name", "==", order.itemName));
                const nameSnapshot = await getDocs(nameQ);

                if (nameSnapshot.empty) throw new Error(`Inventory item "${order.itemName}" not found.`);
                
                const originalItemDoc = nameSnapshot.docs.find(d => d.data().company === order.company) || nameSnapshot.docs[0];
                const originalItemData = originalItemDoc.data() as InventoryItem;

                const expectedCompany = order.company || '';
                const matchingBatches = batches.filter(b => b.company.trim() === expectedCompany);
                const mismatchingBatches = batches.filter(b => b.company.trim() !== expectedCompany);

                if (matchingBatches.length > 0) {
                    const newStockEntries = matchingBatches.map(b => ({
                        quantity: Number(b.quantity),
                        expiryDate: b.expiryDate!.toISOString(),
                    }));
                    const newStock = [...(originalItemData.stock || []), ...newStockEntries];
                    const newTotalCount = newStock.reduce((sum, entry) => sum + entry.quantity, 0);

                    batch.update(originalItemDoc.ref, {
                        stock: newStock,
                        itemCount: newTotalCount
                    });
                }

                for (const mismatchBatch of mismatchingBatches) {
                    const mismatchCompany = mismatchBatch.company.trim();
                    const mismatchQ = query(itemsCol, where("name", "==", order.itemName), where("company", "==", mismatchCompany));
                    const mismatchSnapshot = await getDocs(mismatchQ);

                    const newStockEntry = {
                        quantity: Number(mismatchBatch.quantity),
                        expiryDate: mismatchBatch.expiryDate!.toISOString(),
                    };

                    if (!mismatchSnapshot.empty) {
                        const existingDoc = mismatchSnapshot.docs[0];
                        const existingData = existingDoc.data() as InventoryItem;
                        const newStock = [...(existingData.stock || []), newStockEntry];
                        const newTotalCount = newStock.reduce((sum, entry) => sum + entry.quantity, 0);
                        batch.update(existingDoc.ref, {
                            stock: newStock,
                            itemCount: newTotalCount
                        });
                    } else {
                        const newItemRef = doc(itemsCol);
                        const newItemData: InventoryItem = {
                            ...originalItemData,
                            id: newItemRef.id,
                            company: mismatchCompany,
                            stock: [newStockEntry],
                            itemCount: Number(mismatchBatch.quantity)
                        };
                        batch.set(newItemRef, newItemData);
                    }
                }

                batch.update(orderRef, { status: 'Delivered' });

            } else { // It's a rejection
                batch.update(orderRef, { status: 'Rejected' });
            }
            
            await batch.commit().catch(serverError => {
                 const permissionError = new FirestorePermissionError({
                    path: 'batch-write', // path is dynamic within the batch
                    operation: 'write',
                    requestResourceData: deliveryData
                });
                errorEmitter.emit('permission-error', permissionError);
                // Re-throw to prevent further execution in this block
                throw permissionError;
            });

            toast({ title: "Success!", description: `Delivery has been ${isApproved ? 'approved' : 'rejected'} and inventory updated.` });
            router.push('/orders');

        } catch (error: any) {
            // Only show toast if it's not a permission error we've already emitted
             if (!(error instanceof FirestorePermissionError)) {
                toast({ variant: 'destructive', title: 'Verification Failed', description: error.message || "An unknown error occurred." });
             }
        } finally {
            setIsProcessing(false);
        }
    };

    if (orderLoading) return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
            <p className="ml-2">Loading order details...</p>
        </div>
    );
    if (!order) return <div className="p-4 text-center text-muted-foreground">Order not found.</div>;
    
    const areFieldsFilled = !!itemImage && !!receiverImage && !!billImage && billPrice !== '' && quantityReceived > 0;

    return (
        <>
            <div className="flex flex-col gap-8 max-w-4xl mx-auto">
                <div className="flex justify-between items-center">
                    <PageHeader title={`Verify Delivery: ${order.itemName}`} />
                     <Button variant="outline" asChild>
                        <Link href={`/orders/${orderId}`}>Cancel</Link>
                    </Button>
                </div>
                
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="font-headline">Receiver Information</CardTitle>
                        <CardDescription>Select who is receiving this delivery.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 md:w-1/2">
                            <Label htmlFor="receiver">Receiver Name <span className="text-destructive">*</span></Label>
                            <Select value={selectedReceiverId} onValueChange={setSelectedReceiverId} disabled={isProcessing || isStaffLoading}>
                                <SelectTrigger id="receiver">
                                    <SelectValue placeholder="Select your name" />
                                </SelectTrigger>
                                <SelectContent>
                                    {staffUsers?.map(staff => (
                                        <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <PhotoCaptureCard 
                        title="Item Photo"
                        photo={itemImage}
                        onCaptureClick={() => setActiveCapture('item')}
                        onUploadClick={() => openUploadDialog('item')}
                        onClearClick={() => setItemImage(null)}
                        isProcessing={isProcessing}
                    />
                    <PhotoCaptureCard 
                        title="Receiver's Photo"
                        photo={receiverImage}
                        onCaptureClick={() => {
                            if (!selectedReceiverId) {
                                toast({ title: "Select Receiver", description: "Please select your name from the dropdown first.", variant: "destructive" });
                                return;
                            }
                            setActiveCapture('receiver')
                        }}
                        onUploadClick={() => openUploadDialog('receiver')}
                        onClearClick={() => setReceiverImage(null)}
                        isProcessing={isProcessing}
                    />
                    <PhotoCaptureCard 
                        title="Bill/Voucher Photo"
                        photo={billImage}
                        onCaptureClick={() => setActiveCapture('bill')}
                        onUploadClick={() => openUploadDialog('bill')}
                        onClearClick={() => setBillImage(null)}
                        isProcessing={isProcessing}
                    />
                    <PhotoCaptureCard 
                        title="Delivery Person (Optional)"
                        photo={deliveryPersonImage}
                        onCaptureClick={() => setActiveCapture('deliveryPerson')}
                        onUploadClick={() => openUploadDialog('deliveryPerson')}
                        onClearClick={() => setDeliveryPersonImage(null)}
                        isProcessing={isProcessing}
                        isOptional={true}
                    />
                </div>
                

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Verification Details</CardTitle>
                        <CardDescription>Confirm the details of the received order.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="quantityReceived">Total Quantity Received</Label>
                                <Input id="quantityReceived" type="number" placeholder={`Ordered: ${order.quantity}`} value={quantityReceived || ''} readOnly className="bg-muted" />
                                <p className="text-xs text-muted-foreground">Calculated automatically from batches below.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="billPrice">Actual Bill Price (Total)</Label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">INR</span>
                                    <Input id="billPrice" type="number" className="pl-10" placeholder={`Expected: ${order.price.toFixed(2)}`} value={billPrice} onChange={e => setBillPrice(e.target.value === '' ? '' : Number(e.target.value))} disabled={isProcessing} />
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>New Stock Batches (only for approval)</Label>
                                <Button variant="outline" size="sm" type="button" onClick={() => setBatches([...batches, { quantity: '', expiryDate: undefined, company: order.company || '' }])} disabled={isProcessing}>
                                    <Plus className="h-4 w-4 mr-1" /> Add Batch
                                </Button>
                            </div>
                            
                            {batches.map((batch, index) => (
                                <div key={index} className="flex items-end gap-4 p-4 border rounded-md relative bg-muted/20">
                                    <div className="space-y-2 flex-1">
                                        <Label>Quantity</Label>
                                        <Input 
                                            type="number" 
                                            placeholder="Qty" 
                                            value={batch.quantity} 
                                            onChange={e => {
                                                const newBatches = [...batches];
                                                newBatches[index].quantity = e.target.value === '' ? '' : Number(e.target.value);
                                                setBatches(newBatches);
                                            }} 
                                            disabled={isProcessing} 
                                        />
                                    </div>
                                     <div className="space-y-2 flex-1">
                                        <Label>Company</Label>
                                        <Input 
                                            placeholder="Company Name" 
                                            value={batch.company} 
                                            onChange={e => {
                                                const newBatches = [...batches];
                                                newBatches[index].company = e.target.value;
                                                setBatches(newBatches);
                                            }} 
                                            disabled={isProcessing} 
                                        />
                                    </div>
                                    <div className="space-y-2 flex-[2]">
                                        <Label>Expiry Date</Label>
                                         <Popover>
                                            <PopoverTrigger asChild>
                                              <Button
                                                variant={"outline"}
                                                className={cn(
                                                  "w-full justify-start text-left font-normal",
                                                  !batch.expiryDate && "text-muted-foreground"
                                                )}
                                                disabled={isProcessing}
                                              >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {batch.expiryDate ? format(batch.expiryDate, "PPP") : <span>Pick a date</span>}
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                              <Calendar
                                                mode="single"
                                                selected={batch.expiryDate}
                                                onSelect={(date) => {
                                                    const newBatches = [...batches];
                                                    newBatches[index].expiryDate = date;
                                                    setBatches(newBatches);
                                                }}
                                                initialFocus
                                              />
                                            </PopoverContent>
                                          </Popover>
                                    </div>
                                    {batches.length > 1 && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                                            onClick={() => {
                                                const newBatches = [...batches];
                                                newBatches.splice(index, 1);
                                                setBatches(newBatches);
                                            }}
                                            disabled={isProcessing}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="comments">Comments</Label>
                            <Textarea id="comments" placeholder="Required for rejection. Add comments about discrepancies or damage..." value={comments} onChange={e => setComments(e.target.value)} disabled={isProcessing} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="destructive" onClick={() => handleVerification(false)} disabled={isProcessing || !comments}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Reject Delivery
                            </Button>
                            <Button onClick={() => handleVerification(true)} disabled={isProcessing || !areFieldsFilled || batches.some(b => !b.quantity || !b.expiryDate)}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Approve & Add to Inventory
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <canvas ref={canvasRef} className="hidden"></canvas>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />

            <Dialog open={!!activeCapture} onOpenChange={(isOpen) => { if (!isOpen) setActiveCapture(null); }}>
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
                        <Button onClick={() => setActiveCapture(null)} variant="outline">Cancel</Button>
                        <Button onClick={handleCapture} disabled={cameraStatus !== 'ready'}>
                            <Camera className="mr-2" /> Capture
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isPriceAlertOpen} onOpenChange={setIsPriceAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Price Mismatch Detected</AlertDialogTitle>
                        <AlertDialogDescription>
                            The actual bill price (INR {billPrice}) is different from the originally estimated price (INR {order?.price}).
                            <br /><br />
                            Are you sure you want to approve this delivery with the new price?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            setIsPriceAlertOpen(false);
                            // Set skipPriceCheck to true
                            handleVerification(true, true, false);
                        }}>
                            Proceed & Approve
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={isCompanyAlertOpen} onOpenChange={setIsCompanyAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Company Mismatch Detected</AlertDialogTitle>
                        <AlertDialogDescription>
                            One or more batches have a different company name than the originally ordered item ({order?.company || 'N/A'}).
                            <br /><br />
                            If you proceed, these batches will be automatically saved as new Inventory Items to track the different companies separately.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            setIsCompanyAlertOpen(false);
                            // Set skipPriceCheck and skipCompanyCheck to true since we might have already passed price check
                            handleVerification(true, true, true);
                        }}>
                            Confirm & Split Inventory
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

    