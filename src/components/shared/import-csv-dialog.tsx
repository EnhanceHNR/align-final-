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
import { type InventoryItem, type Dealer } from "@/types/models";

interface ImportCsvDialogProps {
    mode: 'inventory' | 'dealers' | 'patients';
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
        if (previewData.length === 0) return;

        setIsImporting(true);
        
        try {
            console.log("Mock import data: ", previewData);
            
            toast({
                title: "Import MOCKED",
                description: `Successfully read ${previewData.length} records (Backend not connected yet).`,
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
