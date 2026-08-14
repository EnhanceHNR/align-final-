
'use client';

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCollection, useDoc, firestore } from "@/firebase";
import { Dealer, Delivery, InventoryItem, PurchaseOrder } from "@/lib/types";
import { collection, doc, query, where } from "firebase/firestore";
import { ArrowLeft, Calendar, Package, ShoppingCart, Truck, Users, Paperclip, MessageSquare, Tag, Hash } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { setDocumentNonBlocking } from "@/firebase";


const statusVariantMap: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
    'Pending Approval': 'secondary',
    'Pending': 'outline',
    'Delivered': 'default',
    'Delayed': 'secondary',
    'Rejected': 'destructive',
};

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | React.ReactNode }) => (
    <div className="flex items-start gap-4">
        <div className="bg-muted p-2 rounded-md">
            <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-base font-medium">{value}</p>
        </div>
    </div>
);

export default function OrderDetailsPage() {
    const params = useParams();
    const orderId = params.id as string;
    const { toast } = useToast();
    
    const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
    const [returnQuantity, setReturnQuantity] = useState('');
    const [returnAmount, setReturnAmount] = useState('');
    const [returnReason, setReturnReason] = useState('');

    const orderRef = useMemo(() => firestore ? doc(firestore, 'orderRecords', orderId) : null, [orderId]);
    const { data: order, isLoading: isOrderLoading } = useDoc<PurchaseOrder>(orderRef);

    const itemQuery = useMemo(() => {
        if (!firestore || !order) return null;
        return query(collection(firestore, 'items'), where('name', '==', order.itemName));
    }, [order]);
    const { data: items, isLoading: areItemsLoading } = useCollection<InventoryItem>(itemQuery);
    const item = useMemo(() => items?.[0], [items]);

    const dealersCollection = useMemo(() => firestore ? collection(firestore, 'dealers') : null, []);
    const { data: dealers, isLoading: areDealersLoading } = useCollection<Dealer>(dealersCollection);

    const deliveryQuery = useMemo(() => {
        if (!firestore || !orderId) return null;
        return query(collection(firestore, 'deliveries'), where('orderRecordId', '==', orderId));
    }, [orderId]);
    const { data: deliveries, isLoading: areDeliveriesLoading } = useCollection<Delivery>(deliveryQuery);
    const delivery = useMemo(() => deliveries?.[0], [deliveries]);


    const dealerPrices = useMemo(() => {
        if (!order) return [];
        if (order.dealerComparisons && order.dealerComparisons.length > 0) {
            return order.dealerComparisons.map(dc => ({
                dealerName: dc.dealerName,
                price: dc.price,
                expiryDate: dc.expiryDate,
                isChosen: dc.dealerName === order.dealer
            })).sort((a,b) => a.price - b.price);
        }
        
        // Fallback for older orders without snapshots
        if (!item || !dealers) return [];
        return dealers.map((dealer) => ({
            dealerName: dealer.name,
            price: dealer.itemPrices?.[item.id] || item.costPerUnit || 0,
            expiryDate: dealer.itemExpiries?.[item.id],
            isChosen: dealer.name === order.dealer,
        })).sort((a,b) => a.price - b.price);
    }, [item, dealers, order]);

    const handleReturnItems = () => {
        const qty = parseInt(returnQuantity);
        const amt = parseFloat(returnAmount);
        if (isNaN(qty) || qty <= 0 || isNaN(amt) || amt < 0 || !delivery || !item || !firestore) {
            toast({ title: 'Error', description: 'Please enter valid quantity and amount.', variant: 'destructive'});
            return;
        }

        const newReturn = {
            quantity: qty,
            refundAmount: amt,
            date: new Date().toISOString(),
            reason: returnReason
        };

        const existingReturns = delivery.returnDetails || [];
        const deliveryRef = doc(firestore, 'deliveries', delivery.id);
        setDocumentNonBlocking(deliveryRef, {
            returnDetails: [...existingReturns, newReturn]
        }, { merge: true });

        let remainingQtyToReturn = qty;
        const newStock = [...(item.stock || [])].sort((a,b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
        
        for (let i = 0; i < newStock.length; i++) {
             if (remainingQtyToReturn <= 0) break;
             if (newStock[i].quantity >= remainingQtyToReturn) {
                 newStock[i].quantity -= remainingQtyToReturn;
                 remainingQtyToReturn = 0;
             } else {
                 remainingQtyToReturn -= newStock[i].quantity;
                 newStock[i].quantity = 0;
             }
        }
        const filteredStock = newStock.filter(s => s.quantity > 0);
        const newItemCount = filteredStock.reduce((acc, s) => acc + s.quantity, 0);

        const itemRef = doc(firestore, 'items', item.id);
        setDocumentNonBlocking(itemRef, {
             stock: filteredStock,
             itemCount: newItemCount
        }, { merge: true });

        toast({ title: 'Success', description: 'Return recorded successfully.'});
        setIsReturnDialogOpen(false);
        setReturnQuantity('');
        setReturnAmount('');
        setReturnReason('');
    };
    
    if (isOrderLoading || areItemsLoading || areDealersLoading || areDeliveriesLoading) {
        return <div>Loading order details...</div>;
    }

    if (!order) {
        return <div>Order not found.</div>;
    }

    const isLoading = isOrderLoading || areItemsLoading || areDealersLoading || areDeliveriesLoading;

    return (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <PageHeader title={`Order: ${order.id}`} />
                <Button variant="outline" asChild>
                    <Link href="/orders">
                        <ArrowLeft className="mr-2"/>
                        Back to Orders
                    </Link>
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">{order.itemName}</CardTitle>
                        <Badge variant={statusVariantMap[order.status] || 'default'} className="text-base">
                            {order.status}
                        </Badge>
                    </div>
                    <CardDescription>
                        Details for purchase order ID: {order.id}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     <InfoItem 
                        icon={Package} 
                        label="Item Name" 
                        value={order.itemName} 
                    />
                    <InfoItem 
                        icon={ShoppingCart} 
                        label="Quantity Ordered" 
                        value={order.quantity.toString()} 
                    />
                     <InfoItem 
                        icon={ShoppingCart} 
                        label="Expected Price" 
                        value={`INR ${order.price.toFixed(2)}`}
                    />
                     <InfoItem 
                        icon={Users} 
                        label="Dealer" 
                        value={order.dealer} 
                    />
                    <InfoItem 
                        icon={Calendar} 
                        label="Order Date" 
                        value={format(new Date(order.orderDate), 'PPP')} 
                    />
                    <InfoItem 
                        icon={Truck} 
                        label="Estimated Arrival" 
                        value={format(new Date(order.estimatedArrival), 'PPP')} 
                    />
                    {order.notes && (
                        <InfoItem 
                            icon={MessageSquare} 
                            label="Notes" 
                            value={order.notes} 
                        />
                    )}
                    {order.placedByPhotoUrl && (
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Placed By Verification</p>
                            <Image src={order.placedByPhotoUrl} alt="Placer photo" width={200} height={150} className="rounded-md object-cover border aspect-video" />
                        </div>
                    )}
                </CardContent>
            </Card>

            {isLoading && (
                <Card>
                    <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </CardContent>
                </Card>
            )}

            {delivery && (
                 <Card>
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle className="font-headline">Delivery Verification Details</CardTitle>
                            <CardDescription>
                                Photos and details from the delivery on {format(new Date(delivery.deliveryDate), 'PPp')}
                            </CardDescription>
                        </div>
                        {order.status === 'Delivered' && (
                             <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
                                 <DialogTrigger asChild>
                                     <Button variant="outline">Return Items</Button>
                                 </DialogTrigger>
                                 <DialogContent>
                                     <DialogHeader>
                                         <DialogTitle>Return Items</DialogTitle>
                                         <DialogDescription>
                                             Record a return for this delivery. This will update the final billing amount and deduct the returned quantity from your inventory.
                                         </DialogDescription>
                                     </DialogHeader>
                                     <div className="grid gap-4 py-4">
                                         <div className="grid gap-2">
                                             <Label>Quantity to Return</Label>
                                             <Input type="number" placeholder="0" value={returnQuantity} onChange={(e) => setReturnQuantity(e.target.value)} />
                                         </div>
                                         <div className="grid gap-2">
                                             <Label>Refund Amount (INR)</Label>
                                             <Input type="number" placeholder="0.00" value={returnAmount} onChange={(e) => setReturnAmount(e.target.value)} />
                                         </div>
                                         <div className="grid gap-2">
                                             <Label>Reason for Return (Optional)</Label>
                                             <Textarea placeholder="e.g. Damaged goods, expired" value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />
                                         </div>
                                     </div>
                                     <DialogFooter>
                                         <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)}>Cancel</Button>
                                         <Button onClick={handleReturnItems}>Confirm Return</Button>
                                     </DialogFooter>
                                 </DialogContent>
                             </Dialog>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-muted-foreground">Item Photo</Label>
                                <Image src={delivery.itemPhotoUrl} alt="Item photo" width={400} height={300} className="rounded-lg mt-1 object-cover aspect-video border" />
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Receiver Photo</Label>
                                <Image src={delivery.receiverPhotoUrl} alt="Receiver photo" width={400} height={300} className="rounded-lg mt-1 object-cover aspect-video border" />
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Bill Photo</Label>
                                <Image src={delivery.billPhotoUrl} alt="Bill photo" width={400} height={300} className="rounded-lg mt-1 object-cover aspect-video border" />
                            </div>
                            {delivery.deliveryPersonPhotoUrl && (
                                <div>
                                    <Label className="text-muted-foreground">Delivery Person Photo</Label>
                                    <Image src={delivery.deliveryPersonPhotoUrl} alt="Delivery person photo" width={400} height={300} className="rounded-lg mt-1 object-cover aspect-video border" />
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
                            <InfoItem icon={Tag} label="Original Price Paid" value={`INR ${delivery.actualPrice.toFixed(2)}`} />
                            {(delivery.returnDetails?.reduce((acc, r) => acc + r.refundAmount, 0) || 0) > 0 && (
                                <InfoItem icon={Tag} label="Total Refund" value={`- INR ${(delivery.returnDetails?.reduce((acc, r) => acc + r.refundAmount, 0) || 0).toFixed(2)}`} />
                            )}
                            <InfoItem 
                                icon={Tag} 
                                label={(delivery.returnDetails?.length || 0) > 0 ? "Revised Billing Amount" : "Final Billing Amount"} 
                                value={`INR ${(delivery.actualPrice - (delivery.returnDetails?.reduce((acc, r) => acc + r.refundAmount, 0) || 0)).toFixed(2)}`} 
                            />
                            
                            <InfoItem icon={Hash} label="Quantity Received" value={delivery.quantityReceived.toString()} />
                            {(delivery.returnDetails?.reduce((acc, r) => acc + r.quantity, 0) || 0) > 0 && (
                                 <InfoItem icon={Hash} label="Quantity Returned" value={(delivery.returnDetails?.reduce((acc, r) => acc + r.quantity, 0) || 0).toString()} />
                            )}
                            <InfoItem icon={MessageSquare} label="Comments" value={delivery.comments || "No comments."} />
                        </div>
                    </CardContent>
                </Card>
            )}


            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Dealer Price Comparison</CardTitle>
                    <CardDescription>
                        Price for &quot;{order.itemName}&quot; from all available dealers at time of order.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {dealerPrices.length > 0 ? (
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Dealer</TableHead>
                                        <TableHead>Expiry Date</TableHead>
                                        <TableHead className="text-right">Price per unit</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dealerPrices.map(dp => (
                                        <TableRow key={dp.dealerName} className={dp.isChosen ? 'bg-primary/10' : ''}>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                {dp.dealerName} 
                                                {dp.isChosen && <Badge variant="secondary">Selected</Badge>}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {dp.expiryDate ? format(new Date(dp.expiryDate), 'PPP') : 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-right">INR {dp.price.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                             </Table>
                    ) : (
                        <p className="text-muted-foreground text-sm p-4 text-center">
                            No dealer pricing information is available for this item.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

    