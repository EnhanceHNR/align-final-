'use client';
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { InventoryDataTable } from "@/components/inventory/data-table";
import { columns } from "@/components/inventory/columns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Edit, AlertCircle, TrendingDown } from "lucide-react";
import { useCollection, firestore, useUser } from "@/firebase";
import { collection, deleteDoc, doc, updateDoc, writeBatch, addDoc } from "firebase/firestore";
import { useMemo, useState, useEffect } from "react";
import { InventoryItem, StockEntry, ConsumptionRecord } from "@/lib/types";
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
import { useToast } from "@/hooks/use-toast";
import { exportToCsv, exportToPdf } from "@/lib/utils";
import type { Table } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { AdjustStockDialog } from "@/components/inventory/adjust-stock-dialog";
import { EditItemDialog } from "@/components/inventory/edit-item-dialog";
import { DashboardAlerts } from "@/components/dashboard/dashboard-alerts";

export default function InventoryPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useUser();
    const itemsCollection = useMemo(() => firestore ? collection(firestore, 'items') : null, []);
    const { data: inventoryItems, isLoading } = useCollection<InventoryItem>(itemsCollection);

    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [itemsToBulkDelete, setItemsToBulkDelete] = useState<string[] | null>(null);
    const [clearSelectionFn, setClearSelectionFn] = useState<(() => void) | null>(null);
    const [itemToAdjust, setItemToAdjust] = useState<InventoryItem | null>(null);
    const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
    const [alertFilter, setAlertFilter] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            setAlertFilter(params.get('alert'));
        }
    }, []);

    const filteredInventoryItems = useMemo(() => {
        if (!inventoryItems) return [];
        if (alertFilter === 'low-stock') {
            return inventoryItems.filter(item => item.itemCount <= item.minQuantity);
        } else if (alertFilter === 'expired') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return inventoryItems.filter(item => 
                item.stock?.some(s => new Date(s.expiryDate) <= today)
            );
        }
        return inventoryItems;
    }, [inventoryItems, alertFilter]);

    const handleDeleteItem = async () => {
        if (!itemToDelete || !firestore) return;

        try {
            await deleteDoc(doc(firestore, 'items', itemToDelete));
            toast({
                title: "Item Deleted",
                description: "The item has been successfully deleted from your inventory.",
            });
        } catch (error) {
            console.error("Error deleting item: ", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete item. Please try again.",
            });
        } finally {
            setItemToDelete(null);
        }
    };
    
    const handleBulkDeleteItems = async () => {
        if (!itemsToBulkDelete || !firestore) return;

        try {
            const batch = writeBatch(firestore);
            itemsToBulkDelete.forEach(id => {
                batch.delete(doc(firestore, 'items', id));
            });
            await batch.commit();
            toast({
                title: "Items Deleted",
                description: `Successfully deleted ${itemsToBulkDelete.length} items from your inventory.`,
            });
        } catch (error) {
            console.error("Error deleting items: ", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete items. Please try again.",
            });
        } finally {
            setItemsToBulkDelete(null);
            if (clearSelectionFn) {
                clearSelectionFn();
                setClearSelectionFn(null);
            }
        }
    };
    
    const handleViewDetails = (itemId: string) => {
        router.push(`/inventory/${itemId}`);
    };

    const handleEditItem = async (updatedItem: InventoryItem) => {
        if (!firestore) return;
        
        try {
            const { id, ...data } = updatedItem;
            await updateDoc(doc(firestore, 'items', id), data);
            toast({
                title: "Item Updated",
                description: `${updatedItem.name} has been successfully updated.`,
            });
        } catch (error) {
            console.error("Error updating item:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update item. Please try again.",
            });
        }
    };

    const handleAdjustStock = async (
        item: InventoryItem, 
        adjustmentType: 'add' | 'use',
        quantity: number,
        expiryDate?: Date,
        batchToUpdateExpiry?: string
    ) => {
        if (!firestore || !user) return;
        if (quantity <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Quantity', description: 'Quantity must be positive.' });
            return;
        }

        const itemRef = doc(firestore, 'items', item.id);
        const batch = writeBatch(firestore);


        if (adjustmentType === 'add') {
            if (!expiryDate) {
                toast({ variant: 'destructive', title: 'Expiry Date Required', description: 'Please provide an expiry date for the new stock.' });
                return;
            }
            const newStockEntry: StockEntry = {
                quantity,
                expiryDate: expiryDate.toISOString(),
            };
            const newStock = [...(item.stock || []), newStockEntry];
            const newItemCount = newStock.reduce((sum, entry) => sum + entry.quantity, 0);

            batch.update(itemRef, { stock: newStock, itemCount: newItemCount });
            toast({ title: 'Stock Added', description: `${quantity} unit(s) of ${item.name} added to inventory.` });

        } else { // 'use'
            if (!batchToUpdateExpiry) {
                toast({ variant: 'destructive', title: 'Batch Not Selected', description: 'Please select a stock batch to consume from.' });
                return;
            }
            
            const currentStock = item.stock || [];
            const batchIndex = currentStock.findIndex(entry => entry.expiryDate === batchToUpdateExpiry);
            
            if (batchIndex === -1) {
                toast({ variant: 'destructive', title: 'Batch Not Found', description: 'The selected stock batch could not be found.' });
                return;
            }
            
            const stockBatch = currentStock[batchIndex];
            if (quantity > stockBatch.quantity) {
                toast({ variant: 'destructive', title: 'Not Enough Stock', description: `Cannot consume ${quantity} units. Only ${stockBatch.quantity} available in this batch.` });
                return;
            }

            const newStock = [...currentStock];
            const updatedBatch = { ...stockBatch, quantity: stockBatch.quantity - quantity };

            if (updatedBatch.quantity > 0) {
                newStock[batchIndex] = updatedBatch;
            } else {
                newStock.splice(batchIndex, 1); // Remove the batch if quantity is zero
            }

            const newItemCount = newStock.reduce((sum, entry) => sum + entry.quantity, 0);

            batch.update(itemRef, {
                stock: newStock,
                itemCount: newItemCount,
            });

            // Create a consumption record
            const consumptionRecord: Omit<ConsumptionRecord, 'id'> = {
                itemId: item.id,
                itemName: item.name,
                quantityConsumed: quantity,
                unit: item.quantity.unit,
                consumedBy: user.uid,
                consumedByName: user.email || 'Unknown User',
                consumptionDate: new Date().toISOString(),
            };
            const consumptionRef = doc(collection(firestore, 'consumptionHistory'));
            batch.set(consumptionRef, consumptionRecord);


            toast({ title: 'Stock Adjusted', description: `${quantity} unit(s) of ${item.name} consumed.` });
        }
        
        try {
            await batch.commit();
        } catch (error) {
             console.error("Error adjusting stock:", error);
             toast({ variant: 'destructive', title: 'Error', description: 'Failed to adjust stock.' });
        }

        setItemToAdjust(null);
    };

    const inventoryColumns = useMemo(() => columns({
        onDelete: (itemId) => setItemToDelete(itemId),
        onViewDetails: handleViewDetails,
        onAdjustStock: (item) => setItemToAdjust(item),
        onEdit: (item) => setItemToEdit(item),
    }), []);

    const handleExport = (format: 'csv' | 'pdf', table: Table<InventoryItem>) => {
        const selectedRows = table.getFilteredSelectedRowModel().rows;
        const dataToExport = selectedRows.length > 0 ? selectedRows.map(row => row.original) : (inventoryItems || []);
        
        const exportColumns = [
            { key: 'id', title: 'ID' },
            { key: 'name', title: 'Name' },
            { key: 'genericName', title: 'Generic Name' },
            { key: 'brandName', title: 'Brand' },
            { key: 'category', title: 'Category' },
            { key: 'itemCount', title: 'Count' },
            { key: 'costPerUnit', title: 'Cost' },
            { key: 'status', title: 'Status' },
            { key: 'tags', title: 'Tags' },
        ] as { key: keyof InventoryItem, title: string }[];

        if (format === 'csv') {
            exportToCsv(dataToExport, 'inventory.csv', exportColumns);
        } else {
            exportToPdf(dataToExport, 'inventory.pdf', exportColumns);
        }
    };


    if (isLoading) {
        return <div>Loading...</div>
    }

    const renderMobileCard = (item: InventoryItem) => {
        let statusBadge = null;
        if (item.itemCount === 0) {
            statusBadge = <Badge variant="destructive">Out of Stock</Badge>;
        } else if (item.itemCount <= (item.threshold || 5)) {
            statusBadge = <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">Low Stock</Badge>;
        } else {
            statusBadge = <Badge variant="default" className="bg-green-500 hover:bg-green-600">In Stock</Badge>;
        }

        return (
            <div className="p-4 border rounded-xl bg-card text-card-foreground shadow-sm flex flex-col gap-3 relative">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-lg leading-tight text-primary cursor-pointer hover:underline" onClick={() => handleViewDetails(item.id)}>{item.name}</h3>
                        <p className="text-sm text-muted-foreground">{item.brandName || "Unknown Brand"} • {item.category || "Uncategorized"}</p>
                    </div>
                    {statusBadge}
                </div>
                
                <div className="flex justify-between items-end mt-2">
                    <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Current Stock</span>
                        <span className="font-bold text-2xl">{item.itemCount} <span className="text-base font-normal text-muted-foreground">{item.quantity.unit}s</span></span>
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
        <>
            <div className="flex flex-col gap-6">
                <PageHeader title="Inventory">
                    <Button asChild>
                        <Link href="/inventory/add">
                            <PlusCircle />
                            Add Item
                        </Link>
                    </Button>
                </PageHeader>
                <DashboardAlerts />
                <InventoryDataTable 
                    columns={inventoryColumns} 
                    data={filteredInventoryItems} 
                    onExport={handleExport}
                    onBulkDelete={(items, clearFn) => {
                        setItemsToBulkDelete(items.map(item => item.id));
                        setClearSelectionFn(() => clearFn);
                    }}
                    renderMobileCard={renderMobileCard}
                />
            </div>
            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the item
                            from your inventory.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={!!itemsToBulkDelete} onOpenChange={(open) => !open && setItemsToBulkDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {itemsToBulkDelete?.length} Items?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the selected items
                            from your inventory.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setItemsToBulkDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDeleteItems} className="bg-destructive hover:bg-destructive/90">
                            Delete All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {itemToAdjust && (
                <AdjustStockDialog
                    item={itemToAdjust}
                    onConfirm={handleAdjustStock}
                    onOpenChange={(open) => !open && setItemToAdjust(null)}
                />
            )}
            {itemToEdit && (
                <EditItemDialog
                    item={itemToEdit}
                    onSave={handleEditItem}
                    onOpenChange={(open) => !open && setItemToEdit(null)}
                />
            )}
        </>
    );
}
