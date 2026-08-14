"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Row,
  Table as ReactTable
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { type InventoryItem } from "@prisma/client"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu"
import { FileDown, Trash2 } from "lucide-react"
import { ImportCsvDialog } from "@/components/shared/import-csv-dialog"
import { useRouter } from "next/navigation"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  filterColumn?: string
  filterPlaceholder?: string
  onExport?: (format: 'csv' | 'pdf', table: ReactTable<TData>) => void
  customExportButton?: React.ReactNode
  onBulkDelete?: (items: TData[], clearSelection: () => void) => void
  renderMobileCard?: (row: TData) => React.ReactNode
  initialSorting?: SortingState
}

export function InventoryDataTable<TData, TValue>({
  columns,
  data,
  filterColumn = "name",
  filterPlaceholder = "Filter items...",
  onExport,
  customExportButton,
  onBulkDelete,
  renderMobileCard,
  initialSorting = []
}: DataTableProps<TData, TValue>) {
    const router = useRouter()
    const [sorting, setSorting] = React.useState<SortingState>(initialSorting)
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [globalFilter, setGlobalFilter] = React.useState("")
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    getRowId: (row: any) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
    },
    globalFilterFn: (row, columnId, filterValue) => {
        const cellValue = String(row.getValue(columnId) || '').toLowerCase();
        const searchTerms = String(filterValue).toLowerCase().split(' ').filter(Boolean);
        return searchTerms.every(term => cellValue.includes(term));
    },
  })

  return (
    <div>
        <div className="flex items-center py-4">
            <Input
            placeholder={filterPlaceholder}
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
            />
             <div className="ml-auto flex items-center gap-2">
                {onBulkDelete && table.getFilteredSelectedRowModel().rows.length > 0 && (
                    <Button 
                        variant="destructive" 
                        onClick={() => onBulkDelete(table.getFilteredSelectedRowModel().rows.map(r => r.original), () => setRowSelection({}))}
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> 
                        Delete Selected ({table.getFilteredSelectedRowModel().rows.length})
                    </Button>
                )}
                <ImportCsvDialog mode="inventory" onSuccess={() => router.refresh()} />
                {customExportButton ? customExportButton : (onExport && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <FileDown className="mr-2" /> Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => onExport('csv', table)}>Export as CSV</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onExport('pdf', table)}>Export as PDF</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ))}
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" >
                        Columns
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {table
                        .getAllColumns()
                        .filter(
                            (column) => column.getCanHide()
                        )
                        .map((column) => {
                            return (
                            <DropdownMenuCheckboxItem
                                key={column.id}
                                className="capitalize"
                                checked={column.getIsVisible()}
                                onCheckedChange={(value) =>
                                column.toggleVisibility(!!value)
                                }
                                onSelect={(e) => e.preventDefault()}
                            >
                                {column.id}
                            </DropdownMenuCheckboxItem>
                            )
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
             </div>
        </div>
        
        {/* Mobile View: Cards */}
        <div className="block md:hidden space-y-4 mb-4">
            {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                    <div key={row.id}>
                        {renderMobileCard ? renderMobileCard(row.original) : (
                            <div className="p-4 border rounded-md bg-card text-card-foreground shadow-sm">
                                <p className="font-medium">Item Data</p>
                                <p className="text-sm text-muted-foreground">Custom mobile card required.</p>
                            </div>
                        )}
                    </div>
                ))
            ) : (
                <div className="p-8 text-center text-muted-foreground border rounded-md">
                    No results found.
                </div>
            )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block rounded-md border bg-card">
        <Table>
            <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                    return (
                    <TableHead key={header.id}>
                        {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                            )}
                    </TableHead>
                    )
                })}
                </TableRow>
            ))}
            </TableHeader>
            <TableBody>
            {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                >
                    {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                    ))}
                </TableRow>
                ))
            ) : (
                <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
                {table.getFilteredSelectedRowModel().rows.length} of{" "}
                {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            >
            Previous
            </Button>
            <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            >
            Next
            </Button>
        </div>
    </div>
  )
}
