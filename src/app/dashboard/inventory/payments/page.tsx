"use client";

import React, { useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { InventoryPaymentsClientPage } from "@/components/inventory/payments/InventoryPaymentsClientPage";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreditCard, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";

export default function PaymentsPage() {
    // Mocking tRPC for now
    const { data: deliveries, isLoading: deliveriesLoading } = useMemo(() => ({ data: [] as any[], isLoading: false }), []);
    const { data: transactions, isLoading: transactionsLoading } = useMemo(() => ({ data: [] as any[], isLoading: false }), []);
    
    if (deliveriesLoading || transactionsLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="ml-2">Loading payments data...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="Payments" />

            <Card className="glass-card border-none shadow-xl overflow-hidden mb-8">
                <CardHeader className="bg-white/50 dark:bg-white/5 border-b border-border/10 p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="bg-primary/10 p-3 rounded-2xl">
                                <CreditCard className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-3xl font-bold tracking-tight">Dealer Accounts</CardTitle>
                                <CardDescription className="text-base">Track bills and payments for your dealers</CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <div className="p-4 md:p-8">
                    <InventoryPaymentsClientPage 
                        deliveries={deliveries || []} 
                        transactions={transactions || []}
                    />
                </div>
            </Card>
        </div>
    );
}