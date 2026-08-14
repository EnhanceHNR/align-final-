"use client";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { InventoryDataTable } from "@/components/inventory/data-table";
import { columns } from "@/components/orders/columns";
import Link from "next/link";
import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { exportToCsv, exportToPdf } from "@/lib/utils";
import { type Table } from "@tanstack/react-table";
import { api } from "~/trpc/react";

export default function OrdersPage() {
    const { toast } = useToast();
    const router = useRouter();
    
    // Mocking tRPC for now
    const { data: purchaseOrders, isLoading: isOrdersLoading } = { data: [] as any[], isLoading: false };
    
    const [selectedMonth, setSelectedMonth] = React.useState<string>('all');
    const [selectedDealers, setSelectedDealers] = React.useState<string[]>([]);
    const [selectedItems, setSelectedItems] = React.useState<string[]>([]);
    const [alertFilter, setAlertFilter] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            setAlertFilter(params.get('alert'));
        }
    }, []);

    const enrichedOrders = useMemo(() => {
        if (!purchaseOrders) return [];
        return purchaseOrders.map(order => ({
            ...order,
            itemBrand: "Brand",
            itemCompany: "Company",
            dealerMobile: "1234567890",
            orderedByName: "Admin",
            receivedByName: "Staff",
            approvedByOrBypassed: "Admin",
            deliveryExpiry: "2027-01-01"
        }));
    }, [purchaseOrders]);

    const handleExport = (format: 'csv' | 'pdf', table: Table<any>) => {
        const dataToExport = table.getFilteredRowModel().rows.map(row => row.original);
        
        const exportColumns = [
            { key: 'id', title: 'Order ID' },
            { key: 'orderDate', title: 'Order Date' },
            { key: 'itemName', title: 'Item Name' },
            { key: 'orderedQuantity', title: 'Quantity' },
            { key: 'status', title: 'Status' },
        ] as any[];

        if (format === 'csv') {
            exportToCsv(dataToExport, 'orders.csv', exportColumns);
        } else {
            exportToPdf(dataToExport, 'orders.pdf', exportColumns);
        }
    };

    const tableColumns = useMemo(() => columns({
        onDelete: (id) => console.log('delete', id),
        onViewDetails: (id) => console.log('view', id),
        onVerifyDelivery: (id) => console.log('verify', id),
        onApprove: (id) => console.log('approve', id),
        onReject: (id) => console.log('reject', id),
        onBypassApproval: (id) => console.log('bypass', id),
        isAdmin: true,
    }), []);

    if (isOrdersLoading) {
        return <div className="p-8">Loading orders...</div>;
    }

    return (
        <div className="p-8 flex flex-col gap-6 h-full">
            <PageHeader title="Orders">
                <Button asChild>
                    <Link href="/dashboard/inventory/orders/create">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Order
                    </Link>
                </Button>
            </PageHeader>

            <InventoryDataTable
                columns={tableColumns}
                data={enrichedOrders}
                filterColumn="itemName"
                filterPlaceholder="Filter by item name..."
                onExport={handleExport}
            />
        </div>
    );
}
