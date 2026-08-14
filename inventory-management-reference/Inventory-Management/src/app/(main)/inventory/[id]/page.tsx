
'use client';

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDoc, firestore } from "@/firebase";
import { InventoryItem } from "@/lib/types";
import { doc } from "firebase/firestore";
import { ArrowLeft, Box, Building, Calendar, Package, Tag, Layers, Barcode } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { format } from 'date-fns';

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 text-muted-foreground mt-1" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-base font-medium">{value}</p>
        </div>
    </div>
);

export default function ItemDetailsPage() {
    const params = useParams();
    const itemId = params.id as string;

    const itemRef = useMemo(() => (firestore && itemId ? doc(firestore, 'items', itemId) : null), [itemId]);
    const { data: item, isLoading } = useDoc<InventoryItem>(itemRef);

    if (isLoading) {
        return <div>Loading item details...</div>;
    }

    if (!item) {
        return <div>Item not found.</div>;
    }
    
    const sortedStock = item.stock?.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    return (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <PageHeader title={item.name} />
                <Button variant="outline" asChild>
                    <Link href="/inventory">
                        <ArrowLeft className="mr-2"/>
                        Back to Inventory
                    </Link>
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">{item.brandName}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <InfoItem icon={Package} label="Total Quantity" value={`${item.itemCount} ${item.quantity.unit}`} />
                    <InfoItem icon={Tag} label="Category" value={item.category} />
                    <InfoItem icon={Building} label="Company" value={item.company} />
                    <InfoItem icon={Layers} label="Cost per Unit" value={`INR ${item.costPerUnit.toFixed(2)}`} />
                    <InfoItem icon={Layers} label="Min. Quantity" value={item.minQuantity.toString()} />
                    <InfoItem icon={Box} label="Unit Size" value={`${item.quantity.value} ${item.quantity.unit}`} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Stock Details</CardTitle>
                    <CardDescription>
                        Individual stock batches for &quot;{item.name}&quot; sorted by expiry date.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {sortedStock && sortedStock.length > 0 ? (
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead className="text-right">Expiry Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedStock.map((stockEntry, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{stockEntry.quantity} {item.quantity.unit}</TableCell>
                                        <TableCell className="text-right">{format(new Date(stockEntry.expiryDate), 'PPP')}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">
                            No stock information available for this item.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

    