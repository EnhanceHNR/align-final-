"use client";

import React, { use } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "~/trpc/react";
import { format } from "date-fns";
import { Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { data: order, isLoading } = api.inventory.getOrderById.useQuery({ id });

    if (isLoading) {
        return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    if (!order) {
        return <div className="p-8 text-center text-muted-foreground">Order not found</div>;
    }

    return (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto p-4 sm:p-8">
            <PageHeader title="Order Details" description="View details for this purchase order.">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Orders
                </Button>
            </PageHeader>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Order #{order.id.slice(-6).toUpperCase()}</CardTitle>
                            <CardDescription>Placed on {order.createdAt?.toMillis ? format(new Date(order.createdAt.toMillis()), 'PPP') : '-'}</CardDescription>
                        </div>
                        <Badge variant={order.status === 'Delivered' ? 'default' : order.status === 'Rejected' ? 'destructive' : 'secondary'}>
                            {order.status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Item Name</p>
                            <p className="font-semibold">{order.item?.name || 'Unknown Item'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Dealer</p>
                            <p className="font-semibold">{order.dealer?.name || 'Unknown Dealer'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Quantity Ordered</p>
                            <p>{order.quantity} {order.item?.quantity?.unit}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Price</p>
                            <p>${order.price}</p>
                        </div>
                    </div>
                    {order.status === 'Delivered' && (
                        <div className="pt-6 border-t grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Received Quantity</p>
                                <p>{order.receivedQuantity || 0}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Bill Amount</p>
                                <p>${order.billAmount || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Received By</p>
                                <p>{order.receivedByName || '-'}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
