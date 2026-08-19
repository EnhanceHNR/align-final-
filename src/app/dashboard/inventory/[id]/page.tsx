'use client';

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Box, Building, Package, Tag, Layers } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from 'date-fns';
import { api } from "~/trpc/react";

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

    const { data: item, isLoading } = api.inventory.getById.useQuery({ id: itemId }, { enabled: !!itemId });

    if (isLoading) {
        return <div className="p-8">Loading item details...</div>;
    }

    if (!item) {
        return <div className="p-8">Item not found.</div>;
    }
    
    // Using stockEntries from Prisma
    const sortedStock = item.stockEntries?.sort((a: any, b: any) => {
        if (!a.expiryDate || !b.expiryDate) return 0;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
    });

    return (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto p-8">
            <div className="flex justify-between items-center">
                <PageHeader title={item.name} />
                <Button variant="outline" asChild>
                    <Link href="/dashboard/inventory">
                        <ArrowLeft className="mr-2"/>
                        Back to Inventory
                    </Link>
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">{item.brandName || "No Brand"}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <InfoItem icon={Package} label="Total Quantity" value={`${item.itemCount} ${item.quantityUnit}`} />
                    <InfoItem icon={Tag} label="Category" value={item.category || "N/A"} />
                    <InfoItem icon={Building} label="Company" value={item.company || "N/A"} />
                    <InfoItem icon={Layers} label="Cost per Unit" value={`INR ${item.costPerUnit.toFixed(2)}`} />
                    <InfoItem icon={Layers} label="Min. Quantity" value={item.minQuantity.toString()} />
                    <InfoItem icon={Box} label="Unit Size" value={`${item.quantityValue} ${item.quantityUnit}`} />
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
                                {sortedStock.map((stockEntry: any, index: number) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{stockEntry.quantity} {item.quantityUnit}</TableCell>
                                        <TableCell className="text-right">{stockEntry.expiryDate ? format(new Date(stockEntry.expiryDate), 'PPP') : 'N/A'}</TableCell>
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
