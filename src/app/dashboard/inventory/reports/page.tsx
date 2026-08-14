"use client";

import React, { useMemo } from "react";
import { InventoryAnalyticsClientPage } from "@/components/inventory/reports/InventoryAnalyticsClientPage";
import { Loader2 } from "lucide-react";

export default function ReportsPage() {
    // Mocking tRPC for now
    const { data: orders, isLoading: ordersLoading } = useMemo(() => ({ data: [] as any[], isLoading: false }), []);
    const { data: dealers, isLoading: dealersLoading } = useMemo(() => ({ data: [] as any[], isLoading: false }), []);

    const validOrders = useMemo(() => {
        return orders.map(order => ({
            ...order,
            orderDate: new Date(order.orderDate),
        }));
    }, [orders]);

    if (ordersLoading || dealersLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="ml-2">Loading reports...</p>
            </div>
        );
    }

    return <InventoryAnalyticsClientPage orders={validOrders} dealers={dealers} />;
}
