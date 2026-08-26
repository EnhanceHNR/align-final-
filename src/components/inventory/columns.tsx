
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
import { type InventoryItem } from "@/types/models"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"

const statusVariantMap: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
    'In Stock': 'default',
    'Low Stock': 'outline',
    'Out of Stock': 'destructive',
};

type GetColumnsOptions = {
    onDelete: (itemId: string) => void;
    onViewDetails: (itemId: string) => void;
    onAdjustStock: (item: InventoryItem) => void;
    onEdit: (item: InventoryItem) => void;
}

export const columns = (options: GetColumnsOptions): ColumnDef<InventoryItem>[] => [
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
    accessorKey: "name",
    header: "Item",
    cell: ({ row }) => {
        const item = row.original
        return (
            <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 rounded-md">
                    <AvatarImage src={item.imageUrl} alt={item.name} data-ai-hint="dental product" className="rounded-md" />
                    <AvatarFallback className="rounded-md">{item.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">{item.brandName}</div>
                </div>
            </div>
        )
    }
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
        const item = row.original;
        const status = item.itemCount > item.minQuantity ? 'In Stock' : (item.itemCount > 0 ? 'Low Stock' : 'Out of Stock');
        return <Badge variant={statusVariantMap[status] || 'default'}>{status}</Badge>;
    }
  },
  {
    accessorKey: "itemCount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Item Count
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
        const item = row.original
        return <div className="text-center">{item.itemCount}</div>
    }
  },
  {
    accessorKey: "quantityValue",
    header: "Unit Size",
    cell: ({ row }) => {
        const item = row.original
        return <div className="text-center">{`${item.quantityValue} ${item.quantityUnit}`}</div>
    }
  },
  {
    accessorKey: "costPerUnit",
    header: () => <div className="text-right">Cost</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("costPerUnit"))
 
      return <div className="text-right font-medium">INR {amount.toFixed(2)}</div>
    },
  },
   {
    accessorKey: "expiryDate",
    header: "Next Expiry",
    cell: ({row}) => {
        const item = row.original;
        if (!item.stockEntries || item.stockEntries.length === 0) return "N/A";
        const soonestExpiry = [...item.stockEntries].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0]?.expiryDate;
        if (!soonestExpiry) return "N/A";
        return new Date(soonestExpiry).toLocaleDateString()
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const item = row.original
 
      return (
        <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => options.onAdjustStock(item)}>Adjust</Button>
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => options.onViewDetails(item.id)}>View details</DropdownMenuItem>
                <DropdownMenuItem onClick={() => options.onEdit(item)}>Edit item</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(item.id)}
                >
                Copy item ID
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => options.onDelete(item.id)}>Delete item</DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )
    },
  },
]

    