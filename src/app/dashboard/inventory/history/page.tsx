"use client";

import { useMemo } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { InventoryDataTable } from '@/components/inventory/data-table';
import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { exportToCsv, exportToPdf } from '@/lib/utils';
import type { Table } from '@tanstack/react-table';
import { type ConsumptionRecord } from '@prisma/client';
import { api } from "~/trpc/react";

const columns: ColumnDef<any>[] = [
    {
        accessorKey: 'consumptionDate',
        header: 'Date',
        cell: ({ row }) => format(new Date(row.original.consumptionDate), 'PPp'),
    },
    {
        accessorKey: 'itemName',
        header: 'Item Name',
    },
    {
        accessorKey: 'quantityConsumed',
        header: 'Quantity',
        cell: ({ row }) => `${row.original.quantityConsumed} ${row.original.unit || ''}`,
    },
    {
        accessorKey: 'consumedByName',
        header: 'Consumed By',
    },
];

export default function HistoryPage() {
    // Using tRPC instead of Firebase
    // TODO: Connect this to actual router (e.g., api.inventory.getHistory)
    const { data: consumptionRecords, isLoading } = { data: [] as any[], isLoading: false };

    const handleExport = (format: 'csv' | 'pdf', table: Table<any>) => {
        const dataToExport = consumptionRecords || [];
        
        const exportColumns = [
            { key: 'consumptionDate', title: 'Date' },
            { key: 'itemName', title: 'Item Name' },
            { key: 'quantityConsumed', title: 'Quantity Consumed' },
            { key: 'unit', title: 'Unit' },
            { key: 'consumedByName', title: 'Consumed By' },
        ] as { key: string, title: string }[];

        if (format === 'csv') {
            exportToCsv(dataToExport, 'consumption-history.csv', exportColumns);
        } else {
            exportToPdf(dataToExport, 'consumption-history.pdf', exportColumns);
        }
    };

    if (isLoading) {
        return <div className="p-8">Loading consumption history...</div>;
    }

    return (
        <div className="p-8 flex flex-col gap-6 h-full">
            <PageHeader title="Consumption History" />
            <InventoryDataTable
                columns={columns}
                data={consumptionRecords || []}
                filterColumn="itemName"
                filterPlaceholder="Filter by item name..."
                onExport={handleExport}
            />
        </div>
    );
}
