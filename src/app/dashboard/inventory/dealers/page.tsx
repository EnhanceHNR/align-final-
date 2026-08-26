
"use client";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type Dealer } from "@/types/models";
import { MoreVertical, PlusCircle, Trash2, FileDown, Edit } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast";
import { exportToCsv, exportToPdf } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

import { ImportCsvDialog } from "@/components/shared/import-csv-dialog";
import { api } from "~/trpc/react";


export default function DealersPage() {
    const { toast } = useToast();
    
    // Using tRPC instead of Firebase
    // TODO: Connect this to api.dealer.getAll once router is added
    const { data: dealers, isLoading, refetch } = { data: [] as any[], isLoading: false, refetch: () => {} };

    const [dealerToDelete, setDealerToDelete] = useState<string | null>(null);

    const handleDeleteDealer = async () => {
        if (!dealerToDelete) return;

        try {
            // Mock delete
            toast({
                title: "Dealer Deleted (Mock)",
                description: "The dealer has been successfully deleted.",
            });
        } catch (error) {
            console.error("Error deleting dealer: ", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete dealer. Please try again.",
            });
        } finally {
            setDealerToDelete(null);
        }
    };
    
    const handleExport = (format: 'csv' | 'pdf') => {
        if (!dealers) return;
        
        const columns = [
            { key: 'id', title: 'ID' },
            { key: 'name', title: 'Name' },
            { key: 'contactPerson', title: 'Contact Person' },
            { key: 'email', title: 'Email' },
            { key: 'phone', title: 'Phone' },
            { key: 'address', title: 'Address' },
            { key: 'website', title: 'Website' },
        ] as { key: keyof Dealer, title: string }[];
        
        if (format === 'csv') {
            exportToCsv(dealers, 'dealers.csv', columns);
        } else {
            exportToPdf(dealers, 'dealers.pdf', columns);
        }
    };

    return (
        <div className="p-8 flex flex-col gap-6 h-full">
            <div className="flex flex-col gap-6">
                <PageHeader title="Dealers">
                    <div className="flex items-center gap-2">
                        <ImportCsvDialog mode="dealers" onSuccess={() => refetch()} />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <FileDown className="mr-2" /> Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleExport('csv')}>Export as CSV</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('pdf')}>Export as PDF</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button asChild>
                            <Link href="/dashboard/inventory/dealers/add">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Dealer
                            </Link>
                        </Button>
                    </div>
                </PageHeader>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Dealer Management</CardTitle>
                        <CardDescription>
                            A list of all dealers in your system.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         {isLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                         ) : dealers && dealers.length > 0 ? (
                            <>
                            {/* Mobile View: Cards */}
                            <div className="block md:hidden space-y-4">
                                {dealers.map(dealer => (
                                    <div key={dealer.id} className="p-4 border rounded-xl bg-card shadow-sm flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-lg text-primary leading-tight">{dealer.name}</h3>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/dashboard/inventory/dealers/${dealer.id}/edit`}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => setDealerToDelete(dealer.id)} className="text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <div className="grid grid-cols-1 gap-1 text-sm text-muted-foreground mt-2">
                                            <p><span className="font-semibold">Contact:</span> {dealer.contactPerson || 'N/A'}</p>
                                            <p><span className="font-semibold">Phone:</span> {dealer.phone || 'N/A'}</p>
                                            <p><span className="font-semibold">Email:</span> {dealer.email || 'N/A'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop View: Table */}
                            <div className="hidden md:block rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Contact Person</TableHead>
                                            <TableHead>Phone</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {dealers.map((dealer) => (
                                            <TableRow key={dealer.id}>
                                                <TableCell className="font-medium">{dealer.name}</TableCell>
                                                <TableCell>{dealer.contactPerson || '-'}</TableCell>
                                                <TableCell>{dealer.phone || '-'}</TableCell>
                                                <TableCell>{dealer.email || '-'}</TableCell>
                                                <TableCell className="text-right">
                                                     <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/dashboard/inventory/dealers/${dealer.id}/edit`}>
                                                                    Edit Dealer
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => setDealerToDelete(dealer.id)} className="text-destructive">
                                                                Delete Dealer
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-xl border border-dashed">
                                <div className="p-4 bg-muted/50 rounded-full mb-4">
                                    <FileDown className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">No Dealers Found</h3>
                                <p className="text-muted-foreground mb-4 max-w-sm">
                                    You haven't added any dealers yet. Add your first dealer to start managing your suppliers.
                                </p>
                                <Button asChild>
                                    <Link href="/dashboard/inventory/dealers/add">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add Dealer
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <AlertDialog open={!!dealerToDelete} onOpenChange={(open) => !open && setDealerToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the dealer and remove their data from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDealerToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteDealer} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
