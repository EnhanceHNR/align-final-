'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, useDoc, useUser, firestore, storage, errorEmitter, FirestorePermissionError, useCollection } from '@/firebase';
import { InventoryItem, PurchaseOrder, Delivery, StaffUser } from '@/lib/types';
import { doc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
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
import { Camera, Loader2 } from 'lucide-react';
import { PhotoCaptureCard } from '@/components/shared/photo-capture-card';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";

type PhotoType = 'item' | 'returner';
type CameraStatus = 'idle' | 'requesting' | 'ready' | 'denied';

export default function ReturnDeliveryPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const deliveryId = params.id as string;

    const { user } = useUser();

    const deliveryRef = useMemo(() => {
        if (!firestore || !deliveryId) return null;
        return doc(firestore, 'deliveries', deliveryId);
    }, [deliveryId]);
    const { data: delivery, isLoading: deliveryLoading } = useDoc<Delivery>(deliveryRef);

    const orderRef = useMemo(() => {
        if (!firestore || !delivery?.orderRecordId) return null;
        return doc(firestore, 'orderRecords', delivery.orderRecordId);
    }, [delivery?.orderRecordId]);
    const { data: order, isLoading: orderLoading } = useDoc<PurchaseOrder>(orderRef);

    const usersCollection = useMemo(() => firestore ? collection(firestore, 'users') : null, []);
    const { data: staffUsers, isLoading: isStaffLoading } = useCollection<StaffUser>(usersCollection as any);
    const [selectedReturnerId, setSelectedReturnerId] = useState<string>('');

    const [isProcessing, setIsProcessing] = useState(false);
    const [returnQuantity, setReturnQuantity] = useState<number | ''>('');
    const [overriddenAmount, setOverriddenAmount] = useState<number | ''>('');
    const [reason, setReason] = useState('');
    
    const [itemImage, setItemImage] = useState<string | null>(null);
    const [returnerImage, setReturnerImage] = useState<string | null>(null);

    const [activeCapture, setActiveCapture] = useState<PhotoType | null>(null);
    const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
    const [isMismatchAlertOpen, setIsMismatchAlertOpen] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const calculatedRevisedAmount = useMemo(() => {
        if (!delivery || !returnQuantity) return null;
        const unitPrice = delivery.actualPrice / delivery.quantityReceived;
        const remainingQuantity = delivery.quantityReceived - Number(returnQuantity);
        return Number((remainingQuantity * unitPrice).toFixed(2));
    }, [delivery, returnQuantity]);

    // Use override if provided, else use calculated
    const finalRevisedAmount = overriddenAmount !== '' ? Number(overriddenAmount) : (calculatedRevisedAmount ?? (delivery?.actualPrice || 0));

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
        else if (activeCapture === 'returner') setReturnerImage(dataUrl);
        
        setActiveCapture(null);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const currentActiveCapture = activeCapture; 
        if (e.target.files && e.target.files[0] && currentActiveCapture) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const dataUrl = loadEvent.target?.result as string;
                if (currentActiveCapture === 'item') setItemImage(dataUrl);
                else if (currentActiveCapture === 'returner') setReturnerImage(dataUrl);
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
        if (!storage || !deliveryId) throw new Error("Storage service is not available.");
        const imageRef = ref(storage, `returns/${deliveryId}/${name}-${Date.now()}.png`);
        await uploadString(imageRef, dataUrl, 'data_url');
        return getDownloadURL(imageRef);
    };

    const handleReturn = async (forceProceed = false) => {
        if (!itemImage || !returnerImage || returnQuantity === '' || returnQuantity <= 0 || !selectedReturnerId) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide all required photos, select a returner, and ensure return quantity is greater than 0.' });
            return;
        }

        if (Number(returnQuantity) > (delivery?.quantityReceived || 0)) {
            toast({ variant: 'destructive', title: 'Invalid Quantity', description: 'Cannot return more items than were received.' });
            return;
        }

        if (!firestore || !storage || !delivery || !order) {
            toast({ variant: 'destructive', title: 'Error', description: 'Core services not ready.' });
            return;
        }

        // Check for mismatch if overridden
        if (overriddenAmount !== '' && calculatedRevisedAmount !== null && finalRevisedAmount !== calculatedRevisedAmount && !forceProceed) {
            setIsMismatchAlertOpen(true);
            return;
        }

        setIsProcessing(true);
        toast({ title: "Processing Return...", description: "Please wait. Uploading images..." });

        try {
            const returnItemPhotoUrl = await uploadImage(itemImage, 'return-item');
            const returnerPhotoUrl = await uploadImage(returnerImage, 'returner');
            
            const selectedStaff = staffUsers?.find(s => s.id === selectedReturnerId);
            
            const newReturnDetail = {
                quantity: Number(returnQuantity),
                refundAmount: delivery.actualPrice - finalRevisedAmount, // amount reduced from the bill
                date: new Date().toISOString(),
                reason,
                returnedByUserId: selectedReturnerId,
                returnedByUserName: selectedStaff?.name || 'Unknown',
                returnerPhotoUrl,
                itemPhotoUrl: returnItemPhotoUrl
            };

            const batch = writeBatch(firestore);
            
            // 1. Update Delivery Record
            const updatedReturnDetails = [...(delivery.returnDetails || []), newReturnDetail];
            batch.update(deliveryRef!, {
                actualPrice: finalRevisedAmount,
                quantityReceived: delivery.quantityReceived - Number(returnQuantity),
                returnDetails: updatedReturnDetails
            });

            // 2. Update Inventory Stock
            const itemsCol = collection(firestore, 'items');
            // Assuming original company was used. A robust approach would also check company, 
            // but for partial returns from the initial receipt, it's typically the item we ordered.
            const itemQ = query(itemsCol, where("name", "==", order.itemName));
            const itemSnapshot = await getDocs(itemQ);

            if (!itemSnapshot.empty) {
                // Find matching item by company if available, else first one
                const itemDoc = itemSnapshot.docs.find(d => d.data().company === order.company) || itemSnapshot.docs[0];
                const itemData = itemDoc.data() as InventoryItem;

                let remainingQuantityToRemove = Number(returnQuantity);
                const updatedStock = [...(itemData.stock || [])];

                // Remove stock starting from the last added (LIFO) or just deduct from whatever is available
                for (let i = updatedStock.length - 1; i >= 0 && remainingQuantityToRemove > 0; i--) {
                    if (updatedStock[i].quantity >= remainingQuantityToRemove) {
                        updatedStock[i].quantity -= remainingQuantityToRemove;
                        remainingQuantityToRemove = 0;
                    } else {
                        remainingQuantityToRemove -= updatedStock[i].quantity;
                        updatedStock[i].quantity = 0;
                    }
                }
                
                // Remove empty stock entries
                const filteredStock = updatedStock.filter(s => s.quantity > 0);
                const newTotalCount = filteredStock.reduce((sum, entry) => sum + entry.quantity, 0);

                batch.update(itemDoc.ref, {
                    stock: filteredStock,
                    itemCount: newTotalCount
                });
            }

            await batch.commit();

            toast({ title: "Success!", description: "Return processed successfully. Bill has been revised." });
            router.push('/bills');

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Return Failed', description: error.message || "An unknown error occurred." });
        } finally {
            setIsProcessing(false);
        }
    };

    if (deliveryLoading || orderLoading) return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
            <p className="ml-2">Loading delivery details...</p>
        </div>
    );
    if (!delivery || !order) return <div className="p-4 text-center text-muted-foreground">Delivery not found.</div>;
    
    return (
        <>
            <div className="flex flex-col gap-8 max-w-4xl mx-auto">
                <div className="flex justify-between items-center">
                    <PageHeader title={`Return Items: ${order.itemName}`} />
                     <Button variant="outline" asChild>
                        <Link href={`/bills`}>Cancel</Link>
                    </Button>
                </div>
                
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="font-headline">Returner Information</CardTitle>
                        <CardDescription>Select who is processing this return.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 md:w-1/2">
                            <Label htmlFor="returner">Returner Name <span className="text-destructive">*</span></Label>
                            <SearchableSelect
                                options={staffUsers?.map(staff => ({ value: staff.id, label: staff.name })) || []}
                                value={selectedReturnerId}
                                onValueChange={setSelectedReturnerId}
                                placeholder="Select your name"
                                disabled={isProcessing || isStaffLoading}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <PhotoCaptureCard 
                        title="Returned Items Photo"
                        photo={itemImage}
                        onCaptureClick={() => setActiveCapture('item')}
                        onUploadClick={() => openUploadDialog('item')}
                        onClearClick={() => setItemImage(null)}
                        isProcessing={isProcessing}
                    />
                    <PhotoCaptureCard 
                        title="Returner's Photo"
                        photo={returnerImage}
                        onCaptureClick={() => {
                            if (!selectedReturnerId) {
                                toast({ title: "Select Returner", description: "Please select your name from the dropdown first.", variant: "destructive" });
                                return;
                            }
                            setActiveCapture('returner')
                        }}
                        onUploadClick={() => openUploadDialog('returner')}
                        onClearClick={() => setReturnerImage(null)}
                        isProcessing={isProcessing}
                    />
                </div>
                

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Return Details</CardTitle>
                        <CardDescription>Specify the quantity being returned and revise the bill amount.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="returnQuantity">Quantity to Return</Label>
                                <Input id="returnQuantity" type="number" placeholder={`Max: ${delivery.quantityReceived}`} value={returnQuantity} onChange={e => setReturnQuantity(e.target.value === '' ? '' : Number(e.target.value))} disabled={isProcessing} />
                                <p className="text-xs text-muted-foreground">Original quantity received: {delivery.quantityReceived}</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="revisedAmount">Revised Bill Amount (Total)</Label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">INR</span>
                                    <Input 
                                        id="revisedAmount" 
                                        type="number" 
                                        className="pl-10" 
                                        placeholder={calculatedRevisedAmount !== null ? `Calculated: ${calculatedRevisedAmount}` : "Enter revised amount"} 
                                        value={overriddenAmount !== '' ? overriddenAmount : (calculatedRevisedAmount ?? '')} 
                                        onChange={e => setOverriddenAmount(e.target.value === '' ? '' : Number(e.target.value))} 
                                        disabled={isProcessing} 
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">Original bill amount was INR {delivery.actualPrice.toFixed(2)}</p>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="reason">Reason for Return</Label>
                            <Textarea id="reason" placeholder="Add comments about why these items are being returned..." value={reason} onChange={e => setReason(e.target.value)} disabled={isProcessing} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button onClick={() => handleReturn(false)} disabled={isProcessing || returnQuantity === '' || !itemImage || !returnerImage}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Process Return & Revise Bill
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

            <AlertDialog open={isMismatchAlertOpen} onOpenChange={setIsMismatchAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Amount Mismatch Detected</AlertDialogTitle>
                        <AlertDialogDescription>
                            The revised bill amount you entered (INR {finalRevisedAmount}) does not match the automatically calculated amount based on the return quantity (INR {calculatedRevisedAmount}).
                            <br /><br />
                            Are you sure you want to proceed and override the bill with this amount?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            setIsMismatchAlertOpen(false);
                            handleReturn(true);
                        }}>
                            Confirm & Override
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
