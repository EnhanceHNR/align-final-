
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"

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
export type EnrichedOrder = any;

const statusVariantMap: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
    'Pending Approval': 'secondary',
    'Pending': 'outline',
    'Delivered': 'default',
    'Delayed': 'secondary',
    'Rejected': 'destructive',
};

const paymentStatusVariantMap: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
    'Paid': 'default',
    'Pending Statement': 'secondary',
    'Unpaid': 'outline',
};


type GetColumnsOptions = {
    onDelete: (orderId: string) => void;
    onViewDetails: (orderId: string) => void;
    onVerifyDelivery: (orderId: string) => void;
    onApprove: (orderId: string) => void;
    onReject: (orderId: string) => void;
    onBypassApproval: (orderId: string) => void;
    isAdmin: boolean;
}

export const columns = (options: GetColumnsOptions): ColumnDef<EnrichedOrder>[] => [
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
    accessorKey: "id",
    header: "Order ID",
  },
  {
    accessorKey: "itemName",
    header: "Item",
    cell: ({ row }) => <div className="min-w-[120px] max-w-[200px]">{row.getValue("itemName")}</div>
  },
  {
    accessorKey: "itemBrand",
    header: "Brand"
  },
  {
    accessorKey: "itemCompany",
    header: "Company"
  },
  {
    accessorKey: "status",
    header: "Delivery Status",
    cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return <Badge variant={statusVariantMap[status] || 'default'}>{status}</Badge>;
    }
  },
  {
    accessorKey: "approvedByOrBypassed",
    header: "Approved / Bypassed",
  },
  {
    accessorKey: "deliveryExpiry",
    header: "Expiry Date",
  },
  {
    id: "dealerInfo",
    header: "Dealer (Mobile Number)",
    cell: ({ row }) => {
        return (
            <div>
                <div>{row.original.dealer}</div>
                <div className="text-xs text-muted-foreground">{row.original.dealerMobile}</div>
            </div>
        )
    }
  },
  {
    accessorKey: "orderedByName",
    header: "Ordered By",
  },
  {
    accessorKey: "receivedByName",
    header: "Received By",
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
  },
  {
    accessorKey: "price",
    header: () => <div className="text-right whitespace-nowrap">Cost</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("price"))
 
      return <div className="text-right font-medium whitespace-nowrap">INR {amount.toFixed(2)}</div>
    },
  },
   {
    accessorKey: "orderDate",
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-2"
          >
            Order Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    sortingFn: "datetime",
    cell: ({row}) => {
        return <div className="pl-4 whitespace-nowrap min-w-[90px]">{new Date(row.getValue("orderDate")).toLocaleDateString()}</div>
    }
  },
  {
    accessorKey: "estimatedArrival",
    header: () => <div className="whitespace-nowrap">ETA</div>,
    cell: ({row}) => {
        return <div className="whitespace-nowrap min-w-[80px]">{new Date(row.getValue("estimatedArrival")).toLocaleDateString()}</div>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const order = row.original
      const isActionable = order.status === 'Pending' || order.status === 'Delayed';
      const isApproving = order.status === 'Pending Approval' && options.isAdmin;
      const isBypassable = order.status === 'Pending Approval' && !options.isAdmin;
 
      if (!isActionable && !isApproving && !isBypassable) {
        return (
            <div className="text-right whitespace-nowrap">
                <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => options.onViewDetails(order.id)}>
                    View details
                </Button>
            </div>
        )
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
             <DropdownMenuItem onClick={() => options.onViewDetails(order.id)}>View details</DropdownMenuItem>
             {isApproving && (
                <>
                    <DropdownMenuItem className="text-green-600" onClick={() => options.onApprove(order.id)}>Approve Order</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => options.onReject(order.id)}>Reject Order</DropdownMenuItem>
                </>
             )}
             {isBypassable && (
                 <DropdownMenuItem onClick={() => options.onBypassApproval(order.id)}>Bypass Approval</DropdownMenuItem>
             )}
             {isActionable && (
                 <DropdownMenuItem onClick={() => options.onVerifyDelivery(order.id)}>Verify Delivery</DropdownMenuItem>
             )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(order.id)}
            >
              Copy order ID
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => options.onDelete(order.id)}>Cancel Order</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

    