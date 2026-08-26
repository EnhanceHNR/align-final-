
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusCircle, Edit } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
import { exportToCsv, exportToPdf } from "@/lib/utils";
import type { Table } from "@tanstack/react-table";

import { InventoryDataTable } from "@/components/inventory/data-table";
import { columns } from "@/components/inventory/columns";
import { AdjustStockDialog } from "@/components/inventory/adjust-stock-dialog";
import { EditItemDialog } from "@/components/inventory/edit-item-dialog";
import { DashboardAlerts } from "@/components/dashboard/dashboard-alerts";

import { api } from "~/trpc/react";
import { type InventoryItem } from "@/types/models";

export default function InventoryPage() {
    const { toast } = useToast();
    const router = useRouter();

    const { data: inventoryItems, isLoading, refetch } = api.inventory.getAll.useQuery();

    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [itemsToBulkDelete, setItemsToBulkDelete] = useState<string[] | null>(null);
    const [clearSelectionFn, setClearSelectionFn] = useState<(() => void) | null>(null);
    const [itemToAdjust, setItemToAdjust] = useState<InventoryItem | null>(null);
    const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
    const [alertFilter, setAlertFilter] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            setAlertFilter(params.get("alert"));
        }
    }, []);

    const filteredInventoryItems = useMemo(() => {
        if (!inventoryItems) return [];
        if (alertFilter === "low-stock") {
            return inventoryItems.filter((item) => item.itemCount <= item.minQuantity);
        } else if (alertFilter === "expired") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return inventoryItems.filter((item) =>
                item.stockEntries?.some((s: any) => new Date(s.expiryDate) <= today)
            );
        }
        return inventoryItems;
    }, [inventoryItems, alertFilter]);

    // TODO: Implement mutations for delete/update/adjust in the tRPC router and use them here
    const handleDeleteItem = async () => {
        if (!itemToDelete) return;
        // implement trpc delete
        toast({ title: "Item Deleted (UI Mock)", description: "Backend integration pending." });
        setItemToDelete(null);
    };

    const handleBulkDeleteItems = async () => {
        if (!itemsToBulkDelete) return;
        toast({ title: "Items Deleted (UI Mock)", description: "Backend integration pending." });
        setItemsToBulkDelete(null);
        if (clearSelectionFn) {
            clearSelectionFn();
            setClearSelectionFn(null);
        }
    };

    const handleViewDetails = (itemId: string) => {
        router.push(`/dashboard/inventory/${itemId}`);
    };

    const handleEditItem = async (updatedItem: any) => {
        toast({ title: "Item Updated (UI Mock)", description: "Backend integration pending." });
        setItemToEdit(null);
    };

    const handleAdjustStock = async (
        item: any,
        adjustmentType: "add" | "use",
        quantity: number,
        expiryDate?: Date,
        batchToUpdateExpiry?: string
    ) => {
        toast({ title: "Stock Adjusted (UI Mock)", description: "Backend integration pending." });
        setItemToAdjust(null);
    };

    const inventoryColumns = useMemo(
        () =>
            columns({
                onDelete: (itemId: string) => setItemToDelete(itemId),
                onViewDetails: handleViewDetails,
                onAdjustStock: (item: any) => setItemToAdjust(item),
                onEdit: (item: any) => setItemToEdit(item),
            }),
        []
    );

    const handleExport = (format: "csv" | "pdf", table: Table<any>) => {
        toast({ title: "Export Started", description: `Exporting as ${format}` });
    };

    if (isLoading) {
        return <div className="p-8">Loading inventory...</div>;
    }

    const renderMobileCard = (item: any) => {
        let statusBadge = null;
        if (item.itemCount === 0) {
            statusBadge = <Badge variant="destructive">Out of Stock</Badge>;
        } else if (item.itemCount <= item.minQuantity) {
            statusBadge = (
                <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">
                    Low Stock
                </Badge>
            );
        } else {
            statusBadge = (
                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                    In Stock
                </Badge>
            );
        }

        return (
            <div className="flex flex-col relative gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
                <div className="flex items-start justify-between">
                    <div>
                        <h3
                            className="cursor-pointer text-lg font-bold leading-tight text-primary hover:underline"
                            onClick={() => handleViewDetails(item.id)}
                        >
                            {item.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {item.brandName || "Unknown Brand"} • {item.category || "Uncategorized"}
                        </p>
                    </div>
                    {statusBadge}
                </div>

                <div className="mt-2 flex items-end justify-between">
                    <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Current Stock</span>
                        <span className="text-2xl font-bold">
                            {item.itemCount}{" "}
                            <span className="text-base font-normal text-muted-foreground">
                                {item.quantityUnit}s
                            </span>
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setItemToAdjust(item)}>
                            Adjust
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setItemToEdit(item)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-8 flex flex-col gap-6 h-full">
            <PageHeader title="Inventory">
                <Button asChild>
                    <Link href="/dashboard/inventory/add">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Item
                    </Link>
                </Button>
            </PageHeader>
            <DashboardAlerts />
            <InventoryDataTable
                columns={inventoryColumns}
                data={filteredInventoryItems || []}
                onExport={handleExport}
                onBulkDelete={(items: any, clearFn: any) => {
                    setItemsToBulkDelete(items.map((item: any) => item.id));
                    setClearSelectionFn(() => clearFn);
                }}
                renderMobileCard={renderMobileCard}
            />

            {/* Dialogs */}
            <AlertDialog
                open={!!itemToDelete}
                onOpenChange={(open) => !open && setItemToDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the item from
                            your inventory.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setItemToDelete(null)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteItem}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog
                open={!!itemsToBulkDelete}
                onOpenChange={(open) => !open && setItemsToBulkDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete {itemsToBulkDelete?.length} Items?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the selected
                            items from your inventory.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setItemsToBulkDelete(null)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDeleteItems}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Delete All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {itemToAdjust && (
                <AdjustStockDialog
                    item={itemToAdjust}
                    onConfirm={handleAdjustStock}
                    onOpenChange={(open: any) => !open && setItemToAdjust(null)}
                />
            )}
            {itemToEdit && (
                <EditItemDialog
                    item={itemToEdit}
                    onSave={handleEditItem}
                    onOpenChange={(open: any) => !open && setItemToEdit(null)}
                />
            )}
        </div>
    );
}
