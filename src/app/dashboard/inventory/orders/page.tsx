"use client";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
    const utils = api.useUtils();
    
    // Mocking tRPC for now
    const { data: purchaseOrders, isLoading: isOrdersLoading } = api.inventory.getOrders.useQuery();
    
        const [bypassingOrderId, setBypassingOrderId] = React.useState<string | null>(null);
    const [bypassNote, setBypassNote] = React.useState("");
    const [orderToDelete, setOrderToDelete] = React.useState<string | null>(null);
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
            receivedByName: order.receivedByName || "-",
            approvedByOrBypassed: order.approvedByOrBypassed || "-",
            deliveryExpiry: order.deliveryExpiry || "-"
        }));
    }, [purchaseOrders]);

        const executeDeleteOrder = () => {
        if (orderToDelete) {
            deleteOrder.mutate({ id: orderToDelete });
            setOrderToDelete(null);
        }
    };

    const handleBypassApprovalSubmit = () => {
        if (bypassingOrderId && bypassNote.trim()) {
            updateOrderStatus.mutate({ id: bypassingOrderId, status: 'Pending', bypassReason: bypassNote });
            setBypassingOrderId(null);
            setBypassNote("");
        }
    };

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

    
    const updateOrderStatus = api.inventory.updateOrderStatus.useMutation({
        onSuccess: () => {
            toast({ title: "Order status updated" });
            utils.inventory.getOrders.invalidate();
        }
    });
    
    const deleteOrder = api.inventory.deleteOrder.useMutation({
        onSuccess: () => {
            toast({ title: "Order cancelled" });
            utils.inventory.getOrders.invalidate();
        }
    });

    const tableColumns = useMemo(() => columns({
        onDelete: (id) => setOrderToDelete(id),
        onViewDetails: (id) => router.push(`/dashboard/inventory/orders/${id}`),
        onVerifyDelivery: (id) => router.push(`/dashboard/inventory/orders/${id}/verify`),
        onApprove: (id) => updateOrderStatus.mutate({ id, status: 'Pending' }),
        onReject: (id) => updateOrderStatus.mutate({ id, status: 'Rejected' }),
        onBypassApproval: (id) => setBypassingOrderId(id),
        isAdmin: true,
    }), [router]);

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
