
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
import { InventoryItem } from "@/lib/types"
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
                    <AvatarImage src={item.imageUrl} alt={item.name} data-ai-hint="dental product" className="rounded-md object-cover" />
                    <AvatarFallback className="rounded-md bg-muted text-muted-foreground">{item.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <div className="font-medium">{item.name}</div>
                </div>
            </div>
        )
    }
  },
  {
    accessorKey: "tags",
    header: "Keynames",
    cell: ({ row }) => {
        const item = row.original;
        if (!item.tags || item.tags.length === 0) return <div className="text-muted-foreground">-</div>;
        return (
            <div className="flex flex-wrap gap-1">
                {item.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0 h-4">{tag}</Badge>
                ))}
            </div>
        )
    }
  },
  {
    accessorKey: "brandName",
    header: "Brand",
    cell: ({ row }) => {
        return <div className="text-muted-foreground">{row.original.brandName || '-'}</div>;
    }
  },
  {
    accessorKey: "company",
    header: "Company",
    cell: ({ row }) => {
        return <div className="text-muted-foreground">{row.original.company || '-'}</div>;
    }
  },
  {
    accessorKey: "costPerUnit",
    header: () => <div className="text-right">Pricing</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("costPerUnit") || "0")
      return <div className="text-right font-medium">INR {amount.toFixed(2)}</div>
    },
  },
  {
    accessorKey: "expiryDate",
    header: "Expiry",
    cell: ({row}) => {
        const item = row.original;
        if (!item.stock || item.stock.length === 0) return <span className="text-muted-foreground">N/A</span>;
        const soonestExpiry = [...item.stock].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0]?.expiryDate;
        if (!soonestExpiry) return <span className="text-muted-foreground">N/A</span>;
        
        const expiry = new Date(soonestExpiry);
        const isExpired = expiry < new Date();
        const isExpiringSoon = expiry < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) && !isExpired;
        
        return (
            <div className={`flex items-center ${isExpired ? 'text-destructive font-bold' : isExpiringSoon ? 'text-yellow-600 font-medium' : 'text-muted-foreground'}`}>
                {expiry.toLocaleDateString()}
            </div>
        )
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
          Available
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
        const item = row.original
        return <div className="text-center font-medium">{item.itemCount}</div>
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

    