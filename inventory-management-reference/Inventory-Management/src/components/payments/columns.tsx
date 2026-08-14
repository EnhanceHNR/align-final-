
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown, CheckCircle } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Statement } from "@/lib/types"

const statusVariantMap: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
    'Paid': 'default',
    'Pending': 'outline',
};

type GetColumnsOptions = {
    onMarkAsPaid: (statement: Statement) => void;
}

export const columns = (options: GetColumnsOptions): ColumnDef<Statement>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "dealerName",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Dealer
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
     cell: ({ row }) => <div className="pl-4">{row.getValue("dealerName")}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return <Badge variant={statusVariantMap[status] || 'default'}>{status}</Badge>;
    }
  },
  {
    accessorKey: "totalAmount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("totalAmount"))
      return <div className="text-right font-medium">INR {amount.toFixed(2)}</div>
    },
  },
   {
    accessorKey: "paymentDetails",
    header: "Payment Details",
    cell: ({row}) => {
        const statement = row.original;
        if (statement.status !== 'Paid') return <div className="text-muted-foreground text-center">-</div>;
        return (
            <div>
                <div className="font-medium">{statement.paymentMode}</div>
                {statement.paymentReference && <div className="text-sm text-muted-foreground">{statement.paymentReference}</div>}
            </div>
        )
    }
  },
  {
    accessorKey: "generatedDate",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Generated On
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    sortingFn: "datetime",
    cell: ({row}) => <div className="pl-4">{format(new Date(row.getValue("generatedDate")), "PP")}</div>
  },
  {
    accessorKey: "period",
    header: "Billing Period",
    cell: ({row}) => {
        const startDate = new Date(row.original.startDate);
        const endDate = new Date(row.original.endDate);
        return `${format(startDate, "PP")} - ${format(endDate, "PP")}`
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const statement = row.original
      const isPending = statement.status === 'Pending';
 
      return (
        <div className="text-right">
            {isPending ? (
                 <Button variant="outline" size="sm" onClick={() => options.onMarkAsPaid(statement)}>
                    Mark as Paid
                 </Button>
            ) : (
                <div className="flex justify-end items-center text-green-600">
                    <CheckCircle className="h-5 w-5" />
                </div>
            )}
        </div>
      )
    },
  },
]

    