"use client";

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '~/trpc/react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Camera } from 'lucide-react';
import { PhotoCaptureCard } from '@/components/shared/photo-capture-card';

export default function VerifyDeliveryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { toast } = useToast();
    
    const { data: order, isLoading } = api.inventory.getOrderById.useQuery({ id });
    const verifyDelivery = api.inventory.verifyDelivery.useMutation({
        onSuccess: () => {
            toast({ title: "Delivery Verified", description: "The order has been marked as delivered and stock updated." });
            router.push('/dashboard/inventory/orders');
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const [receivedQuantity, setReceivedQuantity] = useState<string>('');
    const [expiryDate, setExpiryDate] = useState<string>('');
    const [billAmount, setBillAmount] = useState<string>('');
    const [batchNumber, setBatchNumber] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [photo, setPhoto] = useState<string | null>(null);

    // Initialize quantity once loaded
    React.useEffect(() => {
        if (order && !receivedQuantity) {
            setReceivedQuantity(order.quantity.toString());
        }
    }, [order]);

    if (isLoading) {
        return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    if (!order) {
        return <div className="p-8 text-center text-muted-foreground">Order not found</div>;
    }

    const handleSubmit = async () => {
        const qty = parseInt(receivedQuantity);
        if (isNaN(qty) || qty < 0) {
            return toast({ title: "Invalid Quantity", variant: "destructive" });
        }

        verifyDelivery.mutate({
            orderId: id,
            receivedQuantity: qty,
            expiryDate: expiryDate || undefined,
            billAmount: billAmount ? parseFloat(billAmount) : undefined,
            batchNumber: batchNumber || undefined,
            notes: notes || undefined,
            photos: photo ? [photo] : undefined
        });
    };

    return (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto p-4 sm:p-8">
            <PageHeader title="Verify Delivery" description="Confirm the items received to update your stock.">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Delivery Details</CardTitle>
                        <CardDescription>Enter the details from the delivery invoice.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Item Ordered</Label>
                            <div className="p-3 bg-muted rounded-md font-medium">{order.item?.name || 'Unknown'} (Ordered: {order.quantity})</div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Received Quantity *</Label>
                            <Input type="number" value={receivedQuantity} onChange={e => setReceivedQuantity(e.target.value)} min="0" />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Expiry Date</Label>
                            <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Batch Number</Label>
                            <Input value={batchNumber} onChange={e => setBatchNumber(e.target.value)} placeholder="e.g. BATCH-123" />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Bill Amount ($)</Label>
                            <Input type="number" step="0.01" value={billAmount} onChange={e => setBillAmount(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label>Delivery Notes</Label>
                            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any discrepancies or notes..." />
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Invoice / Bill Photo</CardTitle>
                            <CardDescription>Upload a photo of the bill for records.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PhotoCaptureCard
                                title="Bill Photo"
                                description="Capture the invoice"
                                onCapture={(data) => setPhoto(data)}
                                onClear={() => setPhoto(null)}
                            />
                        </CardContent>
                    </Card>

                    <Button size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleSubmit} disabled={verifyDelivery.isPending}>
                        {verifyDelivery.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : 'Confirm & Update Stock'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
