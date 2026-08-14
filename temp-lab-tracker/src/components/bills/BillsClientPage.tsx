"use client";

import { Submission, LabTransaction } from "@/lib/types";
import { useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { 
    Receipt, IndianRupee, ExternalLink, Calendar, CheckCircle2, 
    Clock, Camera, Loader2, X, Plus, Minus, Download, History,
    Wallet, CreditCard, AlertCircle
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { updatePaymentStatusAction, addLabTransactionAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { CameraModal } from "../CameraModal";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CombinedRecord {
    id: string;
    date: string;
    type: 'Bill' | 'Payment' | 'Adjustment' | 'Challan';
    amount: number;
    description: string;
    item?: string;
    patientName?: string;
    photoUrl?: string;
    status?: string;
    submissionId?: string;
}

export function BillsClientPage({ 
    submissions, 
    transactions 
}: { 
    submissions: Submission[], 
    transactions: LabTransaction[] 
}) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  
  // Transaction Dialog State
  const [isTxDialogOpen, setIsTxDialogOpen] = useState(false);
  const [txType, setTxType] = useState<'Bill' | 'Payment' | 'Adjustment'>('Payment');
  const [selectedLab, setSelectedLab] = useState<string>("");
  const [txAmount, setTxAmount] = useState("");
  const [txDesc, setTxDesc] = useState("");
  const [txPhoto, setTxPhoto] = useState<File | null>(null);
  const [isAddingTx, setIsAddingTx] = useState(false);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const labAccounts = useMemo(() => {
    const accounts: Record<string, { totalBilled: number; totalPaid: number; ledger: CombinedRecord[] }> = {};

    const filteredSubmissions = submissions.filter(sub => {
      if (fromDate && new Date(sub.createdAt) < new Date(fromDate)) return false;
      if (toDate && new Date(sub.createdAt) > new Date(toDate + 'T23:59:59.999Z')) return false;
      return true;
    });

    const filteredTransactions = transactions.filter(tx => {
      if (fromDate && new Date(tx.createdAt) < new Date(fromDate)) return false;
      if (toDate && new Date(tx.createdAt) > new Date(toDate + 'T23:59:59.999Z')) return false;
      return true;
    });

    // Process Submissions as Bills
    filteredSubmissions.forEach((sub) => {
      const type = sub.documentType || (sub.hasBill ? 'Bill' : 'None');
      if (type !== 'None') {
        if (!accounts[sub.labName]) {
          accounts[sub.labName] = { totalBilled: 0, totalPaid: 0, ledger: [] };
        }
        
        const amount = Number(sub.billAmount) || 0;
        
        if (type !== 'Challan') {
            accounts[sub.labName].totalBilled += amount;
        }
        
        accounts[sub.labName].ledger.push({
            id: sub.id,
            date: sub.createdAt,
            type: type as any,
            amount: amount,
            description: `${sub.item} - ${sub.patientName}`,
            item: sub.item,
            patientName: sub.patientName,
            photoUrl: sub.billPhotoUrl,
            status: sub.paymentStatus || 'Pending',
            submissionId: sub.id
        });

        if (sub.paymentStatus === 'Paid' && type !== 'Challan') {
            accounts[sub.labName].totalPaid += amount;
        }
      }

      if (sub.documents && sub.documents.length > 0) {
        if (!accounts[sub.labName]) {
          accounts[sub.labName] = { totalBilled: 0, totalPaid: 0, ledger: [] };
        }
        sub.documents.forEach((doc, idx) => {
            const amount = Number(doc.amount) || 0;
            
            if (doc.type === 'Bill') {
                accounts[sub.labName].totalBilled += amount;
            }
            
            accounts[sub.labName].ledger.push({
                id: `${sub.id}-doc-${idx}`,
                date: sub.createdAt,
                type: doc.type as any,
                amount: amount,
                description: `${sub.item} - ${sub.patientName} (${doc.type})`,
                item: sub.item,
                patientName: sub.patientName,
                photoUrl: doc.photoUrl,
                status: sub.paymentStatus || 'Pending',
                submissionId: sub.id
            });

            if (sub.paymentStatus === 'Paid' && doc.type === 'Bill') {
                accounts[sub.labName].totalPaid += amount;
            }
        });
      }
    });

    // Process Manual Transactions
    filteredTransactions.forEach((tx) => {
        if (!accounts[tx.labName]) {
            accounts[tx.labName] = { totalBilled: 0, totalPaid: 0, ledger: [] };
        }

        accounts[tx.labName].ledger.push({
            id: tx.id,
            date: tx.createdAt,
            type: tx.type,
            amount: tx.amount,
            description: tx.description,
            photoUrl: tx.photoUrl,
            submissionId: tx.submissionId
        });

        if (tx.amount > 0) {
            accounts[tx.labName].totalBilled += tx.amount;
        } else {
            accounts[tx.labName].totalPaid += Math.abs(tx.amount);
        }
    });

    return Object.entries(accounts)
      .map(([labName, data]) => ({ 
        labName, 
        ...data,
        balance: data.totalBilled - data.totalPaid,
        sortedLedger: data.ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }))
      .sort((a, b) => b.balance - a.balance);
  }, [submissions, transactions, fromDate, toDate]);

  const handleMarkAsPaid = async (submissionId: string, proofFile?: File) => {
    setIsUpdating(submissionId);
    try {
      const formData = new FormData();
      formData.append('submissionId', submissionId);
      formData.append('status', 'Paid');
      if (proofFile) {
        formData.append('proofFile', proofFile);
      }

      const result = await updatePaymentStatusAction(formData);
      if (result.success) {
        toast({ title: "Success", description: "Payment status updated to Paid." });
      } else {
        toast({ title: "Error", description: result.error || "Failed to update payment status.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsUpdating(null);
      setIsCameraOpen(false);
      setActiveSubmissionId(null);
    }
  };

  const handleAddTransaction = async () => {
    if (!selectedLab || !txAmount) return;
    setIsAddingTx(true);
    try {
        const amount = Number(txAmount);
        
        // Validation to prevent payment exceeding due amount
        const account = labAccounts.find(a => a.labName === selectedLab);
        if (txType === 'Payment' && account) {
            if (account.balance <= 0) {
                toast({ title: "Error", description: "There is no outstanding balance due.", variant: "destructive" });
                setIsAddingTx(false);
                return;
            }
            if (amount > account.balance) {
                toast({ title: "Error", description: `Payment cannot exceed the outstanding due of ₹${account.balance.toLocaleString('en-IN')}.`, variant: "destructive" });
                setIsAddingTx(false);
                return;
            }
        }

        const formData = new FormData();
        formData.append('labName', selectedLab);
        formData.append('amount', (txType === 'Payment' ? -Math.abs(amount) : Math.abs(amount)).toString());
        formData.append('type', txType);
        formData.append('description', txDesc || `${txType} transaction`);
        if (txPhoto) {
            formData.append('photoFile', txPhoto);
        }

        const result = await addLabTransactionAction(formData);

        if (result.success) {
            toast({ title: "Success", description: "Transaction added successfully." });
            setIsTxDialogOpen(false);
            setTxAmount("");
            setTxDesc("");
            setTxPhoto(null);
        } else {
            toast({ title: "Error", description: result.error || "Failed to add transaction.", variant: "destructive" });
        }
    } catch (error: any) {
        toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
        setIsAddingTx(false);
    }
  };

  const generatePDF = (account: any) => {
    const doc = new jsPDF();
    const labName = account.labName;
    const dateRange = format(new Date(), "PPP");

    // Header
    doc.setFontSize(20);
    doc.text("Lab Account Statement", 14, 22);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Lab: ${labName}`, 14, 32);
    doc.text(`Statement Date: ${dateRange}`, 14, 38);

    // Summary Table
    autoTable(doc, {
        startY: 45,
        head: [['Total Billed', 'Total Paid', 'Outstanding Balance']],
        body: [[
            `INR ${account.totalBilled.toLocaleString('en-IN')}`,
            `INR ${account.totalPaid.toLocaleString('en-IN')}`,
            `INR ${account.balance.toLocaleString('en-IN')}`
        ]],
        theme: 'grid',
        headStyles: { fillStyle: 'F', fillColor: [79, 70, 229] }
    });

    // Ledger Table
    const tableData = account.sortedLedger.map((rec: CombinedRecord) => [
        format(new Date(rec.date), "dd/MM/yyyy"),
        rec.type,
        rec.description,
        rec.amount > 0 ? rec.amount.toLocaleString('en-IN') : '-',
        rec.amount < 0 ? Math.abs(rec.amount).toLocaleString('en-IN') : '-'
    ]);

    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 15,
        head: [['Date', 'Type', 'Description', 'Debit (+)', 'Credit (-)']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [100, 100, 100] }
    });

    doc.save(`LabTrack_${labName.replace(/\s+/g, '_')}_Statement.pdf`);
    toast({ title: "PDF Generated", description: `Statement for ${labName} downloaded.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/50 dark:bg-white/5 p-4 rounded-3xl shadow-sm border border-border/10">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <CalendarIcon className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Filter Date:</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input 
            type="date" 
            value={fromDate} 
            onChange={(e) => setFromDate(e.target.value)} 
            className="rounded-xl h-12 w-full sm:w-[150px] bg-background font-medium"
          />
          <span className="text-muted-foreground font-medium text-sm">to</span>
          <Input 
            type="date" 
            value={toDate} 
            onChange={(e) => setToDate(e.target.value)} 
            className="rounded-xl h-12 w-full sm:w-[150px] bg-background font-medium"
          />
        </div>
        {(fromDate || toDate) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setFromDate(""); setToDate(""); }}
            className="rounded-xl text-muted-foreground hover:text-primary font-bold ml-auto"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {labAccounts.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-4">
          <Receipt className="w-12 h-12 opacity-20" />
          <p>No bills or transactions recorded yet.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {labAccounts.map((account) => (
            <Card key={account.labName} className="overflow-hidden border-none shadow-lg bg-white/50 dark:bg-white/5 ring-1 ring-border/5">
              <CardHeader className="bg-primary/5 pb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-2xl shadow-inner">
                      <Receipt className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-black tracking-tight">{account.labName}</CardTitle>
                      <CardDescription className="flex items-center gap-2 font-medium">
                        <History className="w-3 h-3" />
                        {account.ledger.length} total transactions
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                    <div className="text-right">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Total Paid</span>
                        <div className="text-lg font-black text-emerald-600">
                          ₹{account.totalPaid.toLocaleString('en-IN')}
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-bold text-destructive uppercase tracking-widest block mb-1">Outstanding</span>
                        <Badge variant="outline" className="text-xl py-1 px-4 bg-destructive/10 text-destructive border-destructive/20 gap-1 font-black shadow-sm">
                          <IndianRupee className="w-4 h-4" />
                          {account.balance.toLocaleString('en-IN')}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-10 w-10 p-0 rounded-xl border-primary/20 text-primary hover:bg-primary/5 shadow-sm"
                            title="Download PDF Statement"
                            onClick={() => generatePDF(account)}
                        >
                            <Download className="w-5 h-5" />
                        </Button>
                        <Button 
                            variant="default" 
                            size="sm" 
                            className="h-10 px-4 rounded-xl gap-2 font-bold shadow-lg shadow-primary/20"
                            onClick={() => {
                                setSelectedLab(account.labName);
                                setTxType('Payment');
                                setIsTxDialogOpen(true);
                            }}
                        >
                            <Plus className="w-4 h-4" />
                            Update Balance
                        </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="ledger" className="border-none">
                    <AccordionTrigger className="px-6 py-4 hover:bg-muted/30 hover:no-underline font-bold text-sm tracking-wide text-muted-foreground data-[state=open]:bg-muted/30">
                      View Ledger History
                    </AccordionTrigger>
                    <AccordionContent className="p-0">
                      <div className="divide-y divide-border/10">
                        {account.sortedLedger.map((record: CombinedRecord) => (
                          <div key={record.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-muted/5 transition-colors group">
                            <div className="flex items-start gap-4">
                                <div className={cn(
                                    "p-2 rounded-xl shrink-0 mt-1",
                                    record.type === 'Bill' ? "bg-amber-500/10 text-amber-600" : 
                                    record.type === 'Challan' ? "bg-purple-500/10 text-purple-600" :
                                    record.type === 'Payment' ? "bg-emerald-500/10 text-emerald-600" :
                                    "bg-blue-500/10 text-blue-600"
                                )}>
                                    {record.type === 'Bill' || record.type === 'Challan' ? <CreditCard className="w-5 h-5" /> : 
                                     record.type === 'Payment' ? <Wallet className="w-5 h-5" /> :
                                     <AlertCircle className="w-5 h-5" />}
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={cn(
                                            "border-none px-2 py-0 font-black uppercase text-[10px]",
                                            record.type === 'Bill' ? "bg-amber-500/10 text-amber-600" : 
                                            record.type === 'Challan' ? "bg-purple-500/10 text-purple-600" :
                                            record.type === 'Payment' ? "bg-emerald-500/10 text-emerald-600" :
                                            "bg-blue-500/10 text-blue-600"
                                        )}>
                                            {record.type}
                                        </Badge>
                                        <span className="font-bold text-sm tracking-tight">{record.description}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 opacity-60" />
                                            {format(new Date(record.date), "PPP p")}
                                        </div>
                                        {record.status && (
                                            <Badge variant="outline" className={cn(
                                                "gap-1 border-none px-2 py-0 font-bold uppercase text-[9px]",
                                                record.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                                            )}>
                                                {record.status === 'Paid' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                                                {record.status}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-6 shrink-0 ml-12 sm:ml-0">
                                {record.photoUrl && (
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter">Receipt</span>
                                        <a href={record.photoUrl} target="_blank" rel="noreferrer" className="relative w-12 h-12 rounded-xl overflow-hidden border shadow-sm group-hover:shadow-md transition-shadow">
                                            <Image src={record.photoUrl} alt="Record" fill className="object-cover group-hover:scale-110 transition-transform" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ExternalLink className="w-4 h-4 text-white" />
                                            </div>
                                        </a>
                                    </div>
                                )}
                                <div className="flex flex-col items-end gap-2">
                                    <div className={cn(
                                        "font-black text-xl px-4 py-2 rounded-2xl border shadow-sm flex items-center gap-1 min-w-[120px] justify-end",
                                        record.type === 'Challan' ? "bg-purple-500/5 text-purple-600 border-purple-500/10" :
                                        record.amount > 0 ? "bg-destructive/5 text-destructive border-destructive/10" : "bg-emerald-500/5 text-emerald-600 border-emerald-500/10"
                                    )}>
                                        {record.amount > 0 ? '+' : '-'}₹{Math.abs(record.amount).toLocaleString('en-IN')}
                                    </div>
                                </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Manual Transaction Dialog */}
      <Dialog open={isTxDialogOpen} onOpenChange={setIsTxDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl overflow-hidden p-0 gap-0 border-none shadow-2xl">
          <DialogHeader className="bg-primary/5 p-6 md:p-8">
            <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-xl">
                    <Wallet className="w-6 h-6 text-primary" />
                </div>
                Update Account Balance
            </DialogTitle>
            <DialogDescription className="text-base font-medium">
                Add a payment or adjustment for <strong>{selectedLab}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 md:p-8 space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-black uppercase tracking-widest opacity-60">Transaction Type</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                    { id: 'Payment', icon: Wallet, label: 'Payment', color: 'emerald' },
                    { id: 'Bill', icon: CreditCard, label: 'Add Bill', color: 'amber' },
                    { id: 'Adjustment', icon: AlertCircle, label: 'Adjust', color: 'blue' }
                ].map((type) => (
                    <button
                        key={type.id}
                        onClick={() => setTxType(type.id as any)}
                        className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                            txType === type.id 
                                ? `bg-${type.color}-500/10 border-${type.color}-500 text-${type.color}-600` 
                                : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
                        )}
                    >
                        <type.icon className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase">{type.label}</span>
                    </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="amount" className="text-sm font-black uppercase tracking-widest opacity-60">Amount (INR)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  className="pl-12 h-14 text-xl font-black rounded-2xl bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="desc" className="text-sm font-black uppercase tracking-widest opacity-60">Description / Remarks</Label>
              <Textarea
                id="desc"
                placeholder="What is this for?"
                className="min-h-[100px] rounded-2xl bg-muted/30 border-none resize-none focus-visible:ring-2 focus-visible:ring-primary/20 p-4"
                value={txDesc}
                onChange={(e) => setTxDesc(e.target.value)}
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-black uppercase tracking-widest opacity-60">Attach Proof (Optional)</Label>
              <div className="flex gap-3">
                <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1 h-14 rounded-2xl border-dashed border-2 hover:bg-primary/5 hover:border-primary/50 gap-2 font-bold"
                    onClick={() => document.getElementById('manual-upload')?.click()}
                >
                    {txPhoto ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <ExternalLink className="w-5 h-5 opacity-60" />}
                    {txPhoto ? "File Selected" : "Upload Image"}
                </Button>
                <input 
                    type="file" 
                    id="manual-upload" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => setTxPhoto(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 md:p-8 bg-muted/10 border-t border-border/5">
            <Button variant="ghost" onClick={() => setIsTxDialogOpen(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button 
                onClick={handleAddTransaction} 
                disabled={!txAmount || isAddingTx}
                className="rounded-xl font-bold min-w-[120px] shadow-lg shadow-primary/20"
            >
                {isAddingTx ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </div>
  );
}
