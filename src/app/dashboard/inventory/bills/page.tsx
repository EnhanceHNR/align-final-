
'use client';

import React, { useMemo, useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as UiTableFooter } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "~/trpc/react";
import { Dealer, Delivery, PurchaseOrder, Statement } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

type EnrichedDelivery = Delivery & { id: string; dealerId: string; dealerName: string; paymentStatus: string };

type MonthlyBill = {
    dealerId: string;
    dealerName: string;
    month: string; // YYYY-MM format
    totalAmount: number;
    unbilledAmount: number;
    deliveryDocs: EnrichedDelivery[];
    hasPaidBills: boolean;
};

type BillSelectionDialogState = {
    isOpen: boolean;
    monthlyBill: MonthlyBill | null;
    selectedDeliveries: EnrichedDelivery[];
};


export default function BillsPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [monthlyBills, setMonthlyBills] = useState<MonthlyBill[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedStatementBills, setSelectedStatementBills] = useState<EnrichedDelivery[]>([]);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    const [billSelectionDialog, setBillSelectionDialog] = useState<BillSelectionDialogState>({ isOpen: false, monthlyBill: null, selectedDeliveries: [] });

    const { data: dealers, isLoading: dealersLoading } = useMemo(() => ({ data: [] as any[], isLoading: false }), []);
    const { data: deliveries, isLoading: deliveriesLoading } = useMemo(() => ({ data: [] as any[], isLoading: false }), []);
    const { data: orders, isLoading: ordersLoading } = useMemo(() => ({ data: [] as any[], isLoading: false }), []);
    
    useEffect(() => {
        if (deliveriesLoading || dealersLoading || ordersLoading) {
            setIsLoading(true);
            return;
        }

        if (!deliveries || !dealers || !orders) {
            setIsLoading(false);
            return;
        }

        const ordersMap = new Map(orders.map(o => [o.id, o]));

        const enrichedDeliveries = deliveries
            .filter(delivery => delivery.isApproved) 
            .map(delivery => {
                const order = ordersMap.get(delivery.orderRecordId);
                if (!order) return null;
                const dealer = dealers.find(d => d.name === order.dealer);
                if (!dealer) return null;
                
                return {
                    ...delivery,
                    dealerId: dealer.id,
                    dealerName: dealer.name,
                    paymentStatus: order.paymentStatus || 'Unpaid',
                };
            })
            .filter((d): d is EnrichedDelivery => d !== null);


        const billsByDealerMonth: { [key: string]: MonthlyBill } = {};
        
        enrichedDeliveries.forEach(delivery => {
            const deliveryYear = new Date(delivery.deliveryDate).getFullYear();
            if (deliveryYear !== currentYear) return;

            const month = format(new Date(delivery.deliveryDate), 'yyyy-MM');
            const key = `${delivery.dealerId}-${month}`;

            if (!billsByDealerMonth[key]) {
                billsByDealerMonth[key] = {
                    dealerId: delivery.dealerId,
                    dealerName: delivery.dealerName,
                    month,
                    totalAmount: 0,
                    unbilledAmount: 0,
                    deliveryDocs: [],
                    hasPaidBills: false,
                };
            }
            
            billsByDealerMonth[key].deliveryDocs.push(delivery);
            billsByDealerMonth[key].totalAmount += delivery.actualPrice;

            const isUnbilled = delivery.paymentStatus !== 'Pending Statement' && delivery.paymentStatus !== 'Paid';
            if (isUnbilled) {
                 billsByDealerMonth[key].unbilledAmount += delivery.actualPrice;
            }
            if (delivery.paymentStatus === 'Paid') {
                 billsByDealerMonth[key].hasPaidBills = true;
            }
        });
        
        setMonthlyBills(Object.values(billsByDealerMonth));
        setIsLoading(false);
        
    }, [deliveries, dealers, orders, deliveriesLoading, dealersLoading, ordersLoading, currentYear]);
    
    
    const handleGenerateStatement = async (dealer: {id: string, name: string}) => {
        setIsGenerating(true);
        setTimeout(() => {
            toast({ title: 'Statement Generated', description: `Statement for ${dealer.name} created.` });
            setSelectedStatementBills([]);
            setIsGenerating(false);
            router.push('/dashboard/inventory/payments');
        }, 1000);
    };

    const columns = useMemo(() => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return ["Dealer", ...months.map(m => `${m} ${currentYear}`)];
    }, [currentYear]);

    const tableData = useMemo(() => {
        if (!dealers) return [];
        const months = Array.from({ length: 12 }, (_, i) => format(new Date(currentYear, i, 1), 'yyyy-MM'));

        return dealers.map(dealer => {
            const row: { [key: string]: any } = { 'Dealer': dealer.name, 'id': dealer.id };
            months.forEach(month => {
                const bill = monthlyBills.find(b => b.dealerId === dealer.id && b.month === month);
                const colName = format(new Date(month + '-02'), 'MMM yyyy');
                row[colName] = bill || null;
            });
            return row;
        });
    }, [dealers, monthlyBills, currentYear]);

    const monthlyTotals = useMemo(() => {
        const totals: { [key: string]: number } = {};
        const months = Array.from({ length: 12 }, (_, i) => format(new Date(currentYear, i, 1), 'yyyy-MM'));
        const monthNames = months.map(m => format(new Date(m + '-02'), 'MMM yyyy'));
        
        monthNames.forEach((monthName, index) => {
            const month = months[index];
            const monthTotal = monthlyBills
                .filter(bill => bill.month === month)
                .reduce((sum, bill) => sum + bill.totalAmount, 0);
            totals[monthName] = monthTotal;
        });
        
        return totals;
    }, [monthlyBills, currentYear]);
    
    const selectedTotal = useMemo(() => selectedStatementBills.reduce((sum, b) => sum + b.actualPrice, 0), [selectedStatementBills]);
    
    const availableYears = useMemo(() => {
        if (!deliveries) return [new Date().getFullYear()];
        const years = new Set(deliveries.map(d => new Date(d.deliveryDate).getFullYear()));
        if (!years.has(new Date().getFullYear())) {
            years.add(new Date().getFullYear());
        }
        return Array.from(years).sort((a,b) => b-a);
    }, [deliveries]);

    const handleCellClick = (bill: MonthlyBill) => {
        if (bill.totalAmount > 0) {
            setBillSelectionDialog({
                isOpen: true,
                monthlyBill: bill,
                selectedDeliveries: selectedStatementBills.filter(ssb => bill.deliveryDocs.some(bd => bd.id === ssb.id)),
            });
        }
    };
    
    const handleDialogBillToggle = (delivery: EnrichedDelivery) => {
        setBillSelectionDialog(prev => {
            if (!prev.monthlyBill) return prev;

            const isSelected = prev.selectedDeliveries.some(d => d.id === delivery.id);
            let newSelected: EnrichedDelivery[];

            if (isSelected) {
                newSelected = prev.selectedDeliveries.filter(d => d.id !== delivery.id);
            } else {
                if (selectedStatementBills.length > 0 && selectedStatementBills[0].dealerId !== delivery.dealerId) {
                    toast({
                        variant: 'destructive',
                        title: 'Multiple Dealers',
                        description: 'You can only select bills from one dealer at a time for a statement.',
                    });
                    return prev;
                }
                newSelected = [...prev.selectedDeliveries, delivery];
            }
            return { ...prev, selectedDeliveries: newSelected };
        });
    };

    const handleDialogConfirm = () => {
        const { monthlyBill, selectedDeliveries } = billSelectionDialog;
        if (!monthlyBill) return;

        const otherBills = selectedStatementBills.filter(ssb => !monthlyBill.deliveryDocs.some(dd => dd.id === ssb.id));
        const newStatementSelection = [...otherBills, ...selectedDeliveries];

        setSelectedStatementBills(newStatementSelection);
        setBillSelectionDialog({ isOpen: false, monthlyBill: null, selectedDeliveries: [] });
    };

    const handleDialogCancel = () => {
        setBillSelectionDialog({ isOpen: false, monthlyBill: null, selectedDeliveries: [] });
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="Dealer Bills Summary" />
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="font-headline">Monthly Bills Summary</CardTitle>
                            <CardDescription>Click on a cell with unpaid bills to select them for statement generation. Paid bills are marked green.</CardDescription>
                        </div>
                         <div className="w-48">
                            <Select
                                value={currentYear.toString()}
                                onValueChange={(value) => {
                                    setCurrentYear(Number(value));
                                    setSelectedStatementBills([]);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableYears.map(year => (
                                        <SelectItem key={year} value={year.toString()}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <div className="flex items-center justify-center h-48">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <p className="ml-2">Processing all delivery bills...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {columns.map(col => <TableHead key={col}>{col}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tableData.map((row) => (
                                        <TableRow key={row.id}>
                                            {columns.map((col, colIndex) => {
                                                if (colIndex === 0) {
                                                    return <TableCell key={col} className="text-left font-medium sticky left-0 bg-card">{row['Dealer']}</TableCell>;
                                                }
                                                const bill = row[col] as MonthlyBill | null;
                                                const isPartiallySelected = bill ? bill.deliveryDocs.some(d => (d.paymentStatus !== 'Pending Statement' && d.paymentStatus !== 'Paid') && selectedStatementBills.some(s => s.id === d.id)) : false;
                                                
                                                return (
                                                    <TableCell 
                                                        key={col}
                                                        onClick={() => bill && handleCellClick(bill)}
                                                        className={cn(
                                                            "text-right whitespace-nowrap",
                                                            bill && bill.unbilledAmount > 0 && "cursor-pointer hover:bg-muted",
                                                            bill?.unbilledAmount === 0 && bill.totalAmount > 0 && "bg-green-100 dark:bg-green-900/50 text-muted-foreground cursor-pointer",
                                                            isPartiallySelected && "bg-primary/20"
                                                        )}
                                                    >
                                                         {bill && bill.unbilledAmount > 0 ? (
                                                            <span>INR {bill.unbilledAmount.toFixed(2)}</span> 
                                                         ) : (
                                                            bill && bill.totalAmount > 0 ? <span>INR {bill.totalAmount.toFixed(2)}</span> : '-'
                                                         )}
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <UiTableFooter>
                                    <TableRow>
                                        <TableCell className="font-bold sticky left-0 bg-card">Total</TableCell>
                                        {columns.slice(1).map(col => (
                                            <TableCell key={col} className="text-right font-bold">
                                                {monthlyTotals[col] > 0 ? (
                                                    <span>INR {monthlyTotals[col].toFixed(2)}</span>
                                                ) : '-'}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </UiTableFooter>
                            </Table>
                        </div>
                    )}
                </CardContent>
                 {selectedStatementBills.length > 0 && (
                    <CardFooter className="flex justify-between items-center bg-muted/50 p-4 rounded-b-lg border-t">
                        <div>
                             <p className="font-semibold">{selectedStatementBills.length} individual bill(s) selected</p>
                             <p className="text-xl font-bold">Total: INR {selectedTotal.toFixed(2)}</p>
                        </div>
                        <Button onClick={handleGenerateStatement} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <FileText className="mr-2" />} 
                            {isGenerating ? 'Generating...' : 'Generate Statement'}
                        </Button>
                    </CardFooter>
                )}
            </Card>

            <Dialog open={billSelectionDialog.isOpen} onOpenChange={(isOpen) => !isOpen && handleDialogCancel()}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Select Bills for {billSelectionDialog.monthlyBill?.dealerName}</DialogTitle>
                        <DialogDescription>
                            Select individual bills from {billSelectionDialog.monthlyBill ? format(new Date(billSelectionDialog.monthlyBill.month + '-02'), 'MMMM yyyy') : ''} to include in the statement.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] -mx-6 px-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Delivery Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {billSelectionDialog.monthlyBill?.deliveryDocs.map(delivery => {
                                    const isBilled = delivery.paymentStatus === 'Pending Statement' || delivery.paymentStatus === 'Paid';
                                    return (
                                    <TableRow key={delivery.id} className={isBilled ? "opacity-50" : ""}>
                                        <TableCell>
                                            <Checkbox
                                                checked={billSelectionDialog.selectedDeliveries.some(d => d.id === delivery.id)}
                                                onCheckedChange={() => handleDialogBillToggle(delivery)}
                                                disabled={isBilled}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {delivery.orderRecordId}
                                            {isBilled && <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-1 rounded">Billed</span>}
                                        </TableCell>
                                        <TableCell>{format(new Date(delivery.deliveryDate), 'PP')}</TableCell>
                                        <TableCell className="text-right">INR {delivery.actualPrice.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            {!isBilled && (
                                                <Button variant="outline" size="sm" onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/bills/return/${delivery.id}`);
                                                }}>
                                                    Return Items
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleDialogCancel}>Cancel</Button>
                        <Button onClick={handleDialogConfirm}>Confirm Selection</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

    

    