
'use client';

import { useMemo } from 'react';
import { useCollection, firestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { ConsumptionRecord } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { InventoryDataTable } from '@/components/inventory/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { exportToCsv, exportToPdf } from '@/lib/utils';
import type { Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

const columns: ColumnDef<ConsumptionRecord>[] = [
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
        cell: ({ row }) => `${row.original.quantityConsumed} ${row.original.unit}`,
    },
    {
        accessorKey: 'consumedByName',
        header: 'Consumed By',
    },
];

export default function HistoryPage() {
    const consumptionQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'consumptionHistory'), orderBy('consumptionDate', 'desc'));
    }, []);

    const { data: consumptionRecords, isLoading } = useCollection<ConsumptionRecord>(consumptionQuery);

    const handleExport = (format: 'csv' | 'pdf', table: Table<ConsumptionRecord>) => {
        const dataToExport = consumptionRecords || [];
        
        const exportColumns = [
            { key: 'consumptionDate', title: 'Date' },
            { key: 'itemName', title: 'Item Name' },
            { key: 'quantityConsumed', title: 'Quantity Consumed' },
            { key: 'unit', title: 'Unit' },
            { key: 'consumedByName', title: 'Consumed By' },
        ] as { key: keyof ConsumptionRecord, title: string }[];

        if (format === 'csv') {
            exportToCsv(dataToExport, 'consumption-history.csv', exportColumns);
        } else {
            exportToPdf(dataToExport, 'consumption-history.pdf', exportColumns);
        }
    };

    if (isLoading) {
        return <div>Loading consumption history...</div>;
    }

    return (
        <div className="flex flex-col gap-6">
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
