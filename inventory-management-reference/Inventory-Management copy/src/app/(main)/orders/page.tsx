'use client';
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { InventoryDataTable } from "@/components/inventory/data-table";
import { columns } from "@/components/orders/columns";
import Link from "next/link";
import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useCollection, firestore, useUser } from "@/firebase";
import { collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { PurchaseOrder, StaffUser } from "@/lib/types";
import { exportToCsv, exportToPdf } from "@/lib/utils";
import { Table } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Filter } from "lucide-react";

export default function OrdersPage() {
    const { toast } = useToast();
    const router = useRouter();
    const ordersCollection = useMemo(() => collection(firestore, 'orderRecords'), []);
    const { data: purchaseOrders, isLoading: isOrdersLoading } = useCollection<PurchaseOrder>(ordersCollection as any);
    
    const [bypassingOrderId, setBypassingOrderId] = React.useState<string | null>(null);
    const [bypassNote, setBypassNote] = React.useState("");
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

    const [exportMonth, setExportMonth] = React.useState<string>('all');
    const [exportYear, setExportYear] = React.useState<string>('all');
    const [exportDealer, setExportDealer] = React.useState<string>('all');
    const [exportItem, setExportItem] = React.useState<string>('all');
    const [isExportDialogOpen, setIsExportDialogOpen] = React.useState(false);

    const { user } = useUser();
    const usersCollection = useMemo(() => collection(firestore, 'users'), []);
    const { data: staffUsers, isLoading: isUsersLoading } = useCollection<StaffUser>(usersCollection as any);
    const isAdmin = staffUsers?.find(u => u.id === user?.uid)?.role === 'Admin';

    const itemsCollection = useMemo(() => collection(firestore, 'items'), []);
    const { data: items, isLoading: isItemsLoading } = useCollection<any>(itemsCollection as any);

    const dealersCollection = useMemo(() => collection(firestore, 'dealers'), []);
    const { data: dealers, isLoading: isDealersLoading } = useCollection<any>(dealersCollection as any);

    const deliveriesCollection = useMemo(() => collection(firestore, 'deliveries'), []);
    const { data: deliveries, isLoading: isDeliveriesLoading } = useCollection<any>(deliveriesCollection as any);

    const enrichedOrders = useMemo(() => {
        if (!purchaseOrders) return [];
        return purchaseOrders.map(order => {
            const item = items?.find((i: any) => i.name === order.itemName);
            const dealer = dealers?.find((d: any) => d.name === order.dealer);
            const delivery = deliveries?.find((d: any) => d.orderRecordId === order.id);
            const orderedBy = staffUsers?.find(u => u.id === order.placedBy)?.name || 'Unknown';
            const receivedBy = delivery ? (staffUsers?.find(u => u.id === delivery.receiverId)?.name || 'Unknown') : 'N/A';
            
            return {
                ...order,
                itemBrand: item?.brandName || '-',
                itemCompany: item?.company || '-',
                dealerMobile: dealer?.phone || '-',
                orderedByName: orderedBy,
                receivedByName: receivedBy,
                approvedByOrBypassed: order.notes ? 'Bypassed' : (order.status === 'Pending Approval' ? 'Pending' : 'Admin Approved'),
                deliveryExpiry: delivery ? 'Updated in Stock' : '-',
            };
        });
    }, [purchaseOrders, items, dealers, staffUsers, deliveries]);

    const uniqueMonths = useMemo(() => {
        if (!enrichedOrders) return [];
        const months = new Set(
            enrichedOrders.map(o => {
                if (!o.orderDate) return null;
                const d = new Date(o.orderDate);
                return isNaN(d.getTime()) ? null : format(d, 'yyyy-MM');
            }).filter(Boolean) as string[]
        );
        return Array.from(months).sort().reverse();
    }, [enrichedOrders]);

    const uniqueYearsForExport = useMemo(() => {
        if (!enrichedOrders) return [];
        const years = new Set(
            enrichedOrders.map(o => {
                if (!o.orderDate) return null;
                const d = new Date(o.orderDate);
                return isNaN(d.getTime()) ? null : format(d, 'yyyy');
            }).filter(Boolean) as string[]
        );
        return Array.from(years).sort().reverse();
    }, [enrichedOrders]);

    const uniqueDealers = useMemo(() => {
        if (!enrichedOrders) return [];
        return Array.from(new Set(enrichedOrders.map(o => o.dealer))).sort();
    }, [enrichedOrders]);

    const uniqueItems = useMemo(() => {
        if (!enrichedOrders) return [];
        return Array.from(new Set(enrichedOrders.map(o => o.itemName))).sort();
    }, [enrichedOrders]);

    const filteredOrders = useMemo(() => {
        if (!enrichedOrders) return [];
        return enrichedOrders.filter(o => {
            const d = o.orderDate ? new Date(o.orderDate) : null;
            const validDate = d && !isNaN(d.getTime());
            const matchMonth = selectedMonth === 'all' || (validDate && format(d, 'yyyy-MM') === selectedMonth);
            const matchDealer = selectedDealers.length === 0 || selectedDealers.includes(o.dealer);
            const matchItem = selectedItems.length === 0 || selectedItems.includes(o.itemName);
            
            let matchAlert = true;
            if (alertFilter === 'pending-approvals') {
                matchAlert = o.status === 'Pending Approval';
            } else if (alertFilter === 'eta') {
                if (o.status !== 'Pending' && o.status !== 'Delayed') matchAlert = false;
                else if (!o.estimatedArrival) matchAlert = false;
                else {
                    const eta = new Date(o.estimatedArrival);
                    const twoDaysFromNow = new Date();
                    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
                    twoDaysFromNow.setHours(23, 59, 59, 999);
                    matchAlert = eta <= twoDaysFromNow;
                }
            }

            return matchMonth && matchDealer && matchItem && matchAlert;
        });
    }, [enrichedOrders, selectedMonth, selectedDealers, selectedItems, alertFilter]);

    const toggleDealer = (dealer: string) => {
        setSelectedDealers(prev => prev.includes(dealer) ? prev.filter(d => d !== dealer) : [...prev, dealer]);
    };
    
    const handleDeleteOrder = async (orderId: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, "orderRecords", orderId));
            toast({
                title: "Order Cancelled",
                description: `Order ${orderId} has been cancelled.`,
            });
        } catch(e) {
            console.error(e);
            toast({
                variant: "destructive",
                title: "Uh oh! Something went wrong.",
                description: "Could not cancel order.",
            });
        }
    };

    const handleViewDetails = (orderId: string) => {
        router.push(`/orders/${orderId}`);
    }

    const handleVerifyDelivery = (orderId: string) => {
        router.push(`/orders/${orderId}/verify`);
    }

    const handleApproveOrder = async (orderId: string) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, "orderRecords", orderId), { status: 'Pending' });
            toast({ title: "Order Approved", description: "The order has been approved and moved to Pending." });
        } catch(e) {
            toast({ variant: "destructive", title: "Error", description: "Could not approve order." });
        }
    };

    const handleRejectPendingOrder = async (orderId: string) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, "orderRecords", orderId), { status: 'Rejected' });
            toast({ title: "Order Rejected", description: "The order has been rejected." });
        } catch(e) {
            toast({ variant: "destructive", title: "Error", description: "Could not reject order." });
        }
    };
    
    const handleBypassApprovalSubmit = async () => {
        if (!firestore || !bypassingOrderId) return;
        if (!bypassNote.trim()) {
            toast({ variant: "destructive", title: "Note Required", description: "Please provide a reason for bypassing approval." });
            return;
        }
        try {
            await updateDoc(doc(firestore, "orderRecords", bypassingOrderId), { 
                status: 'Pending', 
                notes: bypassNote 
            });
            toast({ title: "Approval Bypassed", description: "Order has been moved to Pending." });
            setBypassingOrderId(null);
            setBypassNote("");
        } catch(e) {
            toast({ variant: "destructive", title: "Error", description: "Could not bypass approval." });
        }
    };
    
    const handleExport = (format: 'csv' | 'pdf', table: Table<PurchaseOrder>) => {
        const selectedRows = table.getFilteredSelectedRowModel().rows;
        const dataToExport = selectedRows.length > 0 ? selectedRows.map(row => row.original) : table.getFilteredRowModel().rows.map(row => row.original);
        
        const exportColumns = [
            { key: 'id', title: 'ID' },
            { key: 'itemName', title: 'Item Name' },
            { key: 'quantity', title: 'Quantity' },
            { key: 'dealer', title: 'Dealer' },
            { key: 'price', title: 'Price' },
            { key: 'status', title: 'Status' },
            { key: 'orderDate', title: 'Order Date' },
            { key: 'estimatedArrival', title: 'ETA' },
        ] as { key: keyof PurchaseOrder, title: string }[];

        if (format === 'csv') {
            exportToCsv(dataToExport, 'orders.csv', exportColumns);
        } else {
            exportToPdf(dataToExport, 'orders.pdf', exportColumns);
        }
    };

    const orderColumns = columns({
        onDelete: handleDeleteOrder,
        onViewDetails: handleViewDetails,
        onVerifyDelivery: handleVerifyDelivery,
        onApprove: handleApproveOrder,
        onReject: handleRejectPendingOrder,
        onBypassApproval: (id) => setBypassingOrderId(id),
        isAdmin: !!isAdmin,
    });

    if (isOrdersLoading || isUsersLoading || isItemsLoading || isDealersLoading || isDeliveriesLoading) {
        return <div>Loading...</div>
    }

    const renderMobileCard = (order: PurchaseOrder) => {
        let statusBadge = null;
        if (order.status === 'Pending Approval') statusBadge = <Badge className="bg-purple-500 hover:bg-purple-600">Needs Approval</Badge>;
        else if (order.status === 'Pending') statusBadge = <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending</Badge>;
        else if (order.status === 'Delivered') statusBadge = <Badge className="bg-green-500 hover:bg-green-600">Delivered</Badge>;
        else statusBadge = <Badge variant="destructive">{order.status}</Badge>;

        return (
            <div className="p-4 border rounded-xl bg-card text-card-foreground shadow-sm flex flex-col gap-3 relative">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-lg leading-tight text-primary cursor-pointer hover:underline" onClick={() => handleViewDetails(order.id)}>{order.itemName}</h3>
                        <p className="text-sm text-muted-foreground font-medium">Dealer: {order.dealer}</p>
                    </div>
                    {statusBadge}
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                        <p className="text-muted-foreground text-xs">Quantity</p>
                        <p className="font-semibold text-base">{order.quantity}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs">Total Price</p>
                        <p className="font-semibold text-base">INR {order.price.toFixed(2)}</p>
                    </div>
                    <div className="col-span-2 mt-1">
                        <p className="text-muted-foreground text-xs">ETA</p>
                        <p className="font-semibold">{order.estimatedArrival && !isNaN(new Date(order.estimatedArrival).getTime()) ? format(new Date(order.estimatedArrival), 'PPP') : 'Unknown'}</p>
                    </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-2">
                    {order.status === 'Pending Approval' && isAdmin && (
                        <>
                            <Button size="sm" variant="destructive" onClick={() => handleRejectPendingOrder(order.id)}>Reject</Button>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproveOrder(order.id)}>Approve</Button>
                        </>
                    )}
                    {order.status === 'Pending Approval' && !isAdmin && (
                        <Button size="sm" variant="outline" onClick={() => setBypassingOrderId(order.id)}>Bypass</Button>
                    )}
                    {order.status === 'Pending' && (
                        <Button size="sm" onClick={() => handleVerifyDelivery(order.id)}>Verify Delivery</Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(order.id)}>Details</Button>
                </div>
            </div>
        );
    };

    const handleAdvancedExport = (formatType: 'csv' | 'pdf') => {
        let toExport = enrichedOrders || [];
        
        if (exportYear !== 'all') {
            toExport = toExport.filter(o => o.orderDate && !isNaN(new Date(o.orderDate).getTime()) && format(new Date(o.orderDate), 'yyyy') === exportYear);
        }
        if (exportMonth !== 'all') {
            toExport = toExport.filter(o => o.orderDate && !isNaN(new Date(o.orderDate).getTime()) && format(new Date(o.orderDate), 'MM') === exportMonth);
        }
        if (exportDealer !== 'all') {
            toExport = toExport.filter(o => o.dealer === exportDealer);
        }
        if (exportItem !== 'all') {
            toExport = toExport.filter(o => o.itemName === exportItem);
        }

        const exportColumns = [
            { key: 'id', title: 'ID' },
            { key: 'itemName', title: 'Item Name' },
            { key: 'quantity', title: 'Quantity' },
            { key: 'dealer', title: 'Dealer' },
            { key: 'price', title: 'Price' },
            { key: 'status', title: 'Status' },
            { key: 'orderDate', title: 'Order Date' },
            { key: 'estimatedArrival', title: 'ETA' },
        ] as { key: keyof PurchaseOrder, title: string }[];

        if (formatType === 'csv') {
            exportToCsv(toExport, 'orders_export.csv', exportColumns);
        } else {
            exportToPdf(toExport, 'orders_export.pdf', exportColumns);
        }
        setIsExportDialogOpen(false);
    };

    const customExportButton = (
        <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" /> Export Options
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Advanced Export</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Year</Label>
                        <Select value={exportYear} onValueChange={setExportYear}>
                            <SelectTrigger className="col-span-3"><SelectValue placeholder="All Years" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Years</SelectItem>
                                {uniqueYearsForExport.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Month</Label>
                        <Select value={exportMonth} onValueChange={setExportMonth}>
                            <SelectTrigger className="col-span-3"><SelectValue placeholder="All Months" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Months</SelectItem>
                                {Array.from({length: 12}).map((_, i) => {
                                    const m = (i + 1).toString().padStart(2, '0');
                                    return <SelectItem key={m} value={m}>{format(new Date(`2000-${m}-01`), 'MMMM')}</SelectItem>
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Dealer</Label>
                        <Select value={exportDealer} onValueChange={setExportDealer}>
                            <SelectTrigger className="col-span-3"><SelectValue placeholder="All Dealers" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Dealers</SelectItem>
                                {uniqueDealers.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Item</Label>
                        <Select value={exportItem} onValueChange={setExportItem}>
                            <SelectTrigger className="col-span-3"><SelectValue placeholder="All Items" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Items</SelectItem>
                                {uniqueItems.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter className="flex justify-between sm:justify-end gap-2">
                    <Button variant="outline" onClick={() => handleAdvancedExport('pdf')}>Export PDF</Button>
                    <Button onClick={() => handleAdvancedExport('csv')}>Export CSV</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="Purchase Orders">
                <Button asChild>
                    <Link href="/orders/create">
                        <PlusCircle />
                        Create Order
                    </Link>
                </Button>
            </PageHeader>
            <div className="space-y-4">
                <div className="flex flex-wrap gap-4 items-center">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by Month" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Months</SelectItem>
                            {uniqueMonths.map(m => (
                                <SelectItem key={m} value={m}>{format(new Date(m + "-01"), 'MMMM yyyy')}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <Filter className="mr-2 h-4 w-4" />
                                Dealers ({selectedDealers.length === 0 ? 'All' : selectedDealers.length})
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 max-h-[300px] overflow-y-auto">
                            {uniqueDealers.map(dealer => (
                                <DropdownMenuCheckboxItem
                                    key={dealer}
                                    checked={selectedDealers.includes(dealer)}
                                    onCheckedChange={() => toggleDealer(dealer)}
                                >
                                    {dealer}
                                </DropdownMenuCheckboxItem>
                            ))}
                            {selectedDealers.length > 0 && (
                                <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setSelectedDealers([])}>
                                    Clear Filters
                                </Button>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <Filter className="mr-2 h-4 w-4" />
                                Items ({selectedItems.length === 0 ? 'All' : selectedItems.length})
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 max-h-[300px] overflow-y-auto">
                            {uniqueItems.map(item => (
                                <DropdownMenuCheckboxItem
                                    key={item}
                                    checked={selectedItems.includes(item)}
                                    onCheckedChange={() => toggleItem(item)}
                                >
                                    {item}
                                </DropdownMenuCheckboxItem>
                            ))}
                            {selectedItems.length > 0 && (
                                <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setSelectedItems([])}>
                                    Clear Filters
                                </Button>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <InventoryDataTable 
                    columns={orderColumns as any} 
                    data={filteredOrders}
                    initialSorting={[{ id: "orderDate", desc: true }]}
                    filterColumn="itemName"
                    filterPlaceholder="Search items..." 
                    customExportButton={customExportButton}
                    renderMobileCard={renderMobileCard}
                />
            </div>

            <AlertDialog open={!!bypassingOrderId} onOpenChange={(open) => !open && setBypassingOrderId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Bypass Admin Approval</AlertDialogTitle>
                        <AlertDialogDescription>
                           If this order is urgent, you can bypass the admin approval process. Please provide a mandatory reason for doing so.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="bypass-note" className="text-right">
                                Reason
                            </Label>
                            <Input
                                id="bypass-note"
                                value={bypassNote}
                                onChange={(e) => setBypassNote(e.target.value)}
                                className="col-span-3"
                                placeholder="e.g., Urgent requirement for surgery tomorrow"
                            />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setBypassNote("")}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBypassApprovalSubmit} disabled={!bypassNote.trim()} className="bg-primary hover:bg-primary/90">
                            Submit & Bypass
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
