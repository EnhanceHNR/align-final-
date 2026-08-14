
'use client';
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useCollection, firestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { Delivery, Statement } from "@/lib/types";
import { collection, doc, writeBatch, getDocs, query, where } from "firebase/firestore";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
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
import { InventoryDataTable } from "@/components/inventory/data-table";
import { columns as createColumns } from "@/components/payments/columns";
import { exportToCsv, exportToPdf } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Filter } from "lucide-react";

export default function PaymentsPage() {
    const { toast } = useToast();
    const statementsCollection = useMemo(() => firestore ? collection(firestore, 'statements') : null, []);
    const { data: statements, isLoading, forceRefetch } = useCollection<Statement>(statementsCollection);
    
    const [statementToPay, setStatementToPay] = useState<Statement | null>(null);
    const [paymentMode, setPaymentMode] = useState<'Card' | 'Cheque' | 'Cash' | 'UPI' | 'Other' | ''>('');
    const [paymentReference, setPaymentReference] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedDealers, setSelectedDealers] = useState<string[]>([]);
    const [exportMonth, setExportMonth] = useState<string>('all');
    const [exportYear, setExportYear] = useState<string>('all');
    const [exportDealer, setExportDealer] = useState<string>('all');
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

    const uniqueDealers = useMemo(() => {
        if (!statements) return [];
        return Array.from(new Set(statements.map(s => s.dealerName))).sort();
    }, [statements]);

    const uniqueMonths = useMemo(() => {
        if (!statements) return [];
        const months = new Set(
            statements.map(s => {
                if (!s.generatedDate) return null;
                const d = new Date(s.generatedDate);
                return isNaN(d.getTime()) ? null : format(d, 'yyyy-MM');
            }).filter(Boolean) as string[]
        );
        return Array.from(months).sort().reverse();
    }, [statements]);

    const uniqueYearsForExport = useMemo(() => {
        if (!statements) return [];
        const years = new Set(
            statements.map(s => {
                if (!s.generatedDate) return null;
                const d = new Date(s.generatedDate);
                return isNaN(d.getTime()) ? null : format(d, 'yyyy');
            }).filter(Boolean) as string[]
        );
        return Array.from(years).sort().reverse();
    }, [statements]);

    const filteredStatements = useMemo(() => {
        if (!statements) return [];
        return statements.filter(s => {
            const d = s.generatedDate ? new Date(s.generatedDate) : null;
            const validDate = d && !isNaN(d.getTime());
            const matchMonth = selectedMonth === 'all' || (validDate && format(d, 'yyyy-MM') === selectedMonth);
            const matchDealer = selectedDealers.length === 0 || selectedDealers.includes(s.dealerName);
            return matchMonth && matchDealer;
        });
    }, [statements, selectedMonth, selectedDealers]);

    const toggleDealer = (dealer: string) => {
        setSelectedDealers(prev => prev.includes(dealer) ? prev.filter(d => d !== dealer) : [...prev, dealer]);
    };


    const handleMarkAsPaid = async () => {
        if (!firestore || !statementToPay || !paymentMode) {
            toast({ variant: "destructive", title: "Missing Details", description: "Please select a mode of payment." });
            return;
        }
        
        const batch = writeBatch(firestore);
        
        const statementRef = doc(firestore, 'statements', statementToPay.id);
        batch.update(statementRef, { 
            status: 'Paid',
            paymentMode: paymentMode,
            paymentReference: paymentReference,
        });

        try {
            if (statementToPay.deliveryIds && statementToPay.deliveryIds.length > 0) {
                const deliveriesQuery = query(collection(firestore, 'deliveries'), where('__name__', 'in', statementToPay.deliveryIds));
                const deliverySnapshots = await getDocs(deliveriesQuery);
                const deliveries = deliverySnapshots.docs.map(d => ({...d.data(), id: d.id } as Delivery));
                const orderIdsToUpdate = new Set<string>();

                for (const delivery of deliveries) {
                    const deliveryRef = doc(firestore, 'deliveries', delivery.id);
                    batch.update(deliveryRef, { isPaid: true });
                    orderIdsToUpdate.add(delivery.orderRecordId);
                }

                for (const orderId of orderIdsToUpdate) {
                    const orderRef = doc(firestore, 'orderRecords', orderId);
                    batch.update(orderRef, { paymentStatus: 'Paid' });
                }
            }
            
            await batch.commit().catch(serverError => {
                const permissionError = new FirestorePermissionError({
                    path: 'batch-write',
                    operation: 'write',
                    requestResourceData: { statementId: statementToPay.id, status: 'Paid' }
                });
                errorEmitter.emit('permission-error', permissionError);
                throw permissionError;
            });

            toast({
                title: "Status Updated",
                description: `Statement for ${statementToPay.dealerName} marked as Paid.`,
            });
            forceRefetch();
        } catch (error) {
             if (!(error instanceof FirestorePermissionError)) {
                toast({
                    variant: "destructive",
                    title: "Update Failed",
                    description: "Could not update the statement status.",
                });
             }
        } finally {
            setStatementToPay(null);
            setPaymentMode('');
            setPaymentReference('');
        }
    };

    const openPaymentDialog = (statement: Statement) => {
        setStatementToPay(statement);
        setPaymentMode('');
        setPaymentReference('');
    };

    const statementColumns = useMemo(() => createColumns({
        onMarkAsPaid: (statement) => openPaymentDialog(statement),
    }), []);
    
    if (isLoading) {
        return <div>Loading payments...</div>;
    }

    const renderMobileCard = (statement: Statement) => {
        let statusBadge = null;
        if (statement.status === 'Paid') statusBadge = <Badge className="bg-green-500 hover:bg-green-600">Paid</Badge>;
        else if (statement.status === 'Unpaid') statusBadge = <Badge variant="destructive">Unpaid</Badge>;
        else statusBadge = <Badge variant="secondary">{statement.status}</Badge>;

        return (
            <div className="p-4 border rounded-xl bg-card text-card-foreground shadow-sm flex flex-col gap-3 relative">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-lg leading-tight text-primary">{statement.dealerName}</h3>
                        <p className="text-sm text-muted-foreground">{statement.generatedDate && !isNaN(new Date(statement.generatedDate).getTime()) ? format(new Date(statement.generatedDate), 'PPP') : 'Unknown Date'}</p>
                    </div>
                    {statusBadge}
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                        <p className="text-muted-foreground text-xs">Total Amount</p>
                        <p className="font-semibold text-lg text-primary">INR {statement.totalAmount.toFixed(2)}</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <p className="text-muted-foreground text-xs text-right">Period</p>
                        <p className="font-medium text-xs text-right">
                            {statement.startDate && !isNaN(new Date(statement.startDate).getTime()) ? format(new Date(statement.startDate), 'dd MMM') : '?'} - 
                            {statement.endDate && !isNaN(new Date(statement.endDate).getTime()) ? format(new Date(statement.endDate), 'dd MMM') : '?'}
                        </p>
                    </div>
                </div>

                {statement.status === 'Paid' && statement.paymentMode && (
                     <div className="mt-1 pt-2 border-t text-sm">
                         <p><span className="text-muted-foreground">Mode:</span> {statement.paymentMode} {statement.paymentReference ? `(${statement.paymentReference})` : ''}</p>
                     </div>
                )}
                
                <div className="flex justify-end gap-2 mt-2">
                    {statement.status === 'Unpaid' && (
                        <Button size="sm" onClick={() => openPaymentDialog(statement)}>Mark as Paid</Button>
                    )}
                </div>
            </div>
        );
    };

    const handleAdvancedExport = (formatType: 'csv' | 'pdf') => {
        let toExport = statements || [];
        
        if (exportYear !== 'all') {
            toExport = toExport.filter(s => s.generatedDate && !isNaN(new Date(s.generatedDate).getTime()) && format(new Date(s.generatedDate), 'yyyy') === exportYear);
        }
        if (exportMonth !== 'all') {
            toExport = toExport.filter(s => s.generatedDate && !isNaN(new Date(s.generatedDate).getTime()) && format(new Date(s.generatedDate), 'MM') === exportMonth);
        }
        if (exportDealer !== 'all') {
            toExport = toExport.filter(s => s.dealerName === exportDealer);
        }

        const exportColumns = [
            { key: 'id', title: 'ID' },
            { key: 'dealerName', title: 'Dealer' },
            { key: 'status', title: 'Status' },
            { key: 'totalAmount', title: 'Amount' },
            { key: 'generatedDate', title: 'Generated On' },
            { key: 'startDate', title: 'Period Start' },
            { key: 'endDate', title: 'Period End' },
        ] as { key: keyof Statement, title: string }[];

        if (formatType === 'csv') {
            exportToCsv(toExport, 'payments_export.csv', exportColumns);
        } else {
            exportToPdf(toExport, 'payments_export.pdf', exportColumns);
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
                </div>
                <DialogFooter className="flex justify-between sm:justify-end gap-2">
                    <Button variant="outline" onClick={() => handleAdvancedExport('pdf')}>Export PDF</Button>
                    <Button onClick={() => handleAdvancedExport('csv')}>Export CSV</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    return (
        <>
            <div className="flex flex-col gap-6">
                <PageHeader title="Payment Statements" />
                
                {statements && statements.length > 0 ? (
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
                                <DropdownMenuContent className="w-56">
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
                        </div>

                        <InventoryDataTable
                            columns={statementColumns}
                            data={statements || []}
                            initialSorting={[{ id: "generatedDate", desc: true }]}
                        filterColumn="dealerName"
                        filterPlaceholder="Search dealers..."
                        customExportButton={customExportButton}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg mt-8">
                        <h3 className="text-xl font-semibold">No Statements Found</h3>
                        <p className="text-muted-foreground mt-2 max-w-md">
                            You haven't generated any billing statements yet. Go to the "Bills" page to consolidate delivery bills from your dealers into a payment statement.
                        </p>
                        <Button asChild className="mt-4">
                           <Link href="/bills">Generate a Bill</Link>
                        </Button>
                    </div>
                )}
            </div>

            <AlertDialog open={!!statementToPay} onOpenChange={(open) => !open && setStatementToPay(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                        <AlertDialogDescription>
                           Please confirm the payment details for the statement for 
                           <span className="font-bold"> {statementToPay?.dealerName} </span>
                           amounting to <span className="font-bold">INR {statementToPay?.totalAmount.toFixed(2)}</span>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="payment-mode" className="text-right">
                                Mode
                            </Label>
                            <Select onValueChange={(value) => setPaymentMode(value as any)} value={paymentMode}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select payment mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Card">Card</SelectItem>
                                    <SelectItem value="Cheque">Cheque</SelectItem>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="UPI">UPI</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="reference" className="text-right">
                                Reference #
                            </Label>
                            <Input
                                id="reference"
                                value={paymentReference}
                                onChange={(e) => setPaymentReference(e.target.value)}
                                className="col-span-3"
                                placeholder="e.g., Transaction ID, Cheque No."
                            />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleMarkAsPaid} disabled={!paymentMode} className="bg-primary hover:bg-primary/90">
                            Yes, Mark as Paid
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

    