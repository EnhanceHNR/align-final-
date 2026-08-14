'use client';

import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { firestore } from "@/firebase";
import { collection, addDoc, writeBatch, doc, query, where, getDocs, getDoc } from "firebase/firestore";
import { generateSequentialId } from "@/lib/utils";
import { InventoryItem, Dealer, StockEntry } from "@/lib/types";

interface ImportCsvDialogProps {
    mode: 'inventory' | 'dealers';
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

export function ImportCsvDialog({ mode, onSuccess, trigger }: ImportCsvDialogProps) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = () => {
        setFile(null);
        setPreviewData([]);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
                setError("Please upload a valid CSV file.");
                return;
            }
            setFile(selectedFile);
            setError(null);
            parseFile(selectedFile);
        }
    };

    const parseFile = (file: File) => {
        setIsParsing(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setPreviewData(results.data);
                setIsParsing(false);
                if (results.errors.length > 0) {
                    console.warn("CSV Parsing errors:", results.errors);
                }
            },
            error: (err) => {
                setError(`Failed to parse CSV: ${err.message}`);
                setIsParsing(false);
            }
        });
    };

    const handleImport = async () => {
        if (!firestore || previewData.length === 0) return;

        setIsImporting(true);
        const batch = writeBatch(firestore);
        let successCount = 0;

        try {
            if (mode === 'dealers') {
                for (const row of previewData) {
                    const dealersRef = collection(firestore, 'dealers');
                    const dealerData: Omit<Dealer, 'id'> = {
                        name: row.Name || row.name || '',
                        contactPerson: row['Contact Person'] || row.contactPerson || '',
                        email: row.Email || row.email || '',
                        phone: row.Phone || row.phone || '',
                        address: row.Address || row.address || '',
                        website: row.Website || row.website || '',
                        suppliedItems: []
                    };

                    if (!dealerData.name) continue; // Skip entries without name

                    const newDocRef = doc(dealersRef);
                    batch.set(newDocRef, dealerData);
                    successCount++;
                }
            } else if (mode === 'inventory') {
                // Initialize counter
                const counterRef = doc(firestore, 'metadata', 'itemCounter');
                const [counterDoc, existingItemsSnapshot] = await Promise.all([
                    getDoc(counterRef),
                    getDocs(collection(firestore, 'items'))
                ]);
                let currentCount = counterDoc.exists() ? counterDoc.data().lastItemId || 0 : 0;
                let counterChanged = false;
                
                const existingItems = existingItemsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));
                const itemLookup = new Map<string, string>();
                for (const item of existingItems) {
                    const key = `${(item.name || '').trim().toLowerCase()}|${(item.brandName || item.company || '').trim().toLowerCase()}`;
                    if (!itemLookup.has(key)) {
                        itemLookup.set(key, item.id);
                    }
                }

                for (const row of previewData) {
                    const itemsRef = collection(firestore, 'items');
                    
                    const nameParts = [
                        row['Name Part 1'] || row['Name 1'] || row.name1 || '',
                        row['Name Part 2'] || row['Name 2'] || row.name2 || '',
                        row['Name Part 3'] || row['Name 3'] || row.name3 || '',
                        row['Name Part 4'] || row['Name 4'] || row.name4 || '',
                        row['Name Part 5'] || row['Name 5'] || row.name5 || '',
                        row['Name Part 6'] || row['Name 6'] || row.name6 || '',
                        row['Name Part 7'] || row['Name 7'] || row.name7 || '',
                        row['Name Part 8'] || row['Name 8'] || row.name8 || ''
                    ];
                    let name = nameParts.filter(p => p.trim() !== '').join(' ');
                    
                    if (!name) {
                        name = row.Name || row.name || '';
                    }

                    if (!name) continue;

                    const itemCount = parseInt(row['Initial Quantity'] || row.itemCount || '0');
                    const minQuantity = parseInt(row['Min Quantity'] || row.minQuantity || '10');
                    const expiryDate = row['Expiry Date'] || row.expiryDate || '';
                    
                    const stock: StockEntry[] = [];
                    if (itemCount > 0) {
                        stock.push({
                            quantity: itemCount,
                            expiryDate: expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // Default to 1 year if empty
                        });
                    }

                    const itemData: Omit<InventoryItem, 'id'> = {
                        name,
                        brandName: row.Brand || row.brandName || '',
                        category: row.Category || row.category || 'General',
                        company: row.Company || row.company || '',
                        description: row.Description || row.description || '',
                        itemCount: itemCount,
                        stock: stock,
                        quantity: {
                            value: 1,
                            unit: (row.Unit || row.unit || 'pcs') as any
                        },
                        costPerUnit: parseFloat(row['Cost Per Unit'] || row.costPerUnit || '0'),
                        minQuantity: minQuantity,
                        dealer: row.Dealer || row.dealer || '',
                        dealerAvailability: true,
                        status: itemCount === 0 ? 'Out of Stock' : (itemCount <= minQuantity ? 'Low Stock' : 'In Stock'),
                        cases: 0
                    };

                    let itemId = row.ID || row.id || row.Id || row['ID'] || '';
                    const lookupKey = `${name.trim().toLowerCase()}|${(row.Brand || row.brandName || row.Company || row.company || '').trim().toLowerCase()}`;
                    
                    if (!itemId && itemLookup.has(lookupKey)) {
                        itemId = itemLookup.get(lookupKey)!;
                    }

                    let newDocRef;
                    if (itemId) {
                        newDocRef = doc(itemsRef, itemId);
                    } else {
                        currentCount++;
                        counterChanged = true;
                        itemId = generateSequentialId(currentCount);
                        newDocRef = doc(itemsRef, itemId);
                        itemLookup.set(lookupKey, itemId); // Add new item to lookup so subsequent rows in same CSV merge
                    }
                    
                    batch.set(newDocRef, itemData, { merge: true });
                    successCount++;
                }

                if (counterChanged) {
                    const counterRef = doc(firestore, 'metadata', 'itemCounter');
                    batch.set(counterRef, { lastItemId: currentCount }, { merge: true });
                }
            }

            await batch.commit();
            toast({
                title: "Import Successful",
                description: `Successfully imported ${successCount} ${mode} records.`,
            });
            setIsOpen(false);
            resetState();
            if (onSuccess) onSuccess();
        } catch (err: any) {
            console.error("Import error:", err);
            toast({
                variant: "destructive",
                title: "Import Failed",
                description: err.message || "An error occurred during import.",
            });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetState();
        }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline">
                        <Upload className="mr-2 h-4 w-4" /> Import CSV
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Import {mode === 'inventory' ? 'Inventory' : 'Dealers'}</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to bulk import records.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                            {file ? file.name : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            CSV files only
                        </p>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".csv"
                            onChange={handleFileChange}
                        />
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {previewData.length > 0 && (
                        <Alert className="bg-primary/5 border-primary/20">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <AlertTitle>File Ready</AlertTitle>
                            <AlertDescription>
                                Found {previewData.length} records. Ready to import.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="bg-muted p-3 rounded-md">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Expected Headers</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                            {mode === 'dealers' 
                                ? "Name*, Contact Person, Email, Phone, Address, Website"
                                : "Name Part 1 to 8 (or Name*), Brand, Category, Company, Cost Per Unit, Initial Quantity, Min Quantity, Unit, Expiry Date, Dealer"}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 italic">*Required fields</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={handleImport} 
                        disabled={previewData.length === 0 || isImporting || isParsing}
                    >
                        {isImporting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            "Start Import"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
