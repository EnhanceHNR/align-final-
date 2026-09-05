'use client';

import { useState } from "react";
import { type InventoryItem } from "@/types/models";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type AdjustStockDialogProps = {
  item: InventoryItem;
  onConfirm: (
    item: InventoryItem, 
    adjustmentType: 'add' | 'use',
    quantity: number,
    expiryDate?: Date,
    batchToUpdateExpiry?: string,
  ) => Promise<void>;
  onOpenChange: (open: boolean) => void;
};

export function AdjustStockDialog({ item, onConfirm, onOpenChange }: AdjustStockDialogProps) {
  const [activeTab, setActiveTab] = useState<'add' | 'use'>('use');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [addExpiryDate, setAddExpiryDate] = useState<Date>();
  const [useBatchExpiry, setUseBatchExpiry] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    if (typeof quantity !== 'number' || quantity <= 0) {
      return;
    }
    setIsProcessing(true);
    await onConfirm(item, activeTab, quantity, addExpiryDate, useBatchExpiry);
    setIsProcessing(false);
  };
  
  const getButtonDisabledState = () => {
    if (isProcessing || quantity === '' || quantity <= 0) {
        return true;
    }
    if (activeTab === 'add' && !addExpiryDate) {
        return true;
    }
    if (activeTab === 'use' && !useBatchExpiry) {
        return true;
    }
    return false;
  }
  
  const sortedStock = [...(item.stockEntries || [])].sort((a: any, b: any) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock for {item.name}</DialogTitle>
          <DialogDescription>
            Add new stock or record consumed items. Current total: {item.itemCount} {item.quantityUnit}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="use">Use Stock</TabsTrigger>
                <TabsTrigger value="add">Add Stock</TabsTrigger>
            </TabsList>
            <TabsContent value="use">
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="useBatch">Select Batch</Label>
                         <Select onValueChange={setUseBatchExpiry} value={useBatchExpiry}>
                            <SelectTrigger id="useBatch">
                                <SelectValue placeholder="Select a batch to use..." />
                            </SelectTrigger>
                            <SelectContent>
                                {sortedStock && sortedStock.length > 0 ? (
                                    sortedStock.map((stock, index) => (
                                        <SelectItem key={`${stock.expiryDate}-${index}`} value={stock.expiryDate}>
                                            Expires: {format(new Date(stock.expiryDate), 'PPP')} ({stock.quantity} left)
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-sm text-muted-foreground">No stock batches available.</div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    {useBatchExpiry && (
                        <div className="space-y-2">
                            <Label htmlFor="usedQuantity">Quantity Used</Label>
                            <Input
                                id="usedQuantity"
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder={`Max: ${item.stockEntries?.find((s: any) => s.expiryDate === useBatchExpiry)?.quantity}`}
                            />
                        </div>
                    )}
                </div>
            </TabsContent>
            <TabsContent value="add">
                 <div className="grid gap-4 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="addQuantity">Quantity Added</Label>
                            <Input
                                id="addQuantity"
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="e.g., 50"
                            />
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="expiryDate">Expiry Date</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !addExpiryDate && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {addExpiryDate ? format(addExpiryDate, "PPP") : <span>Pick a date</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={addExpiryDate}
                                    onSelect={setAddExpiryDate}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                        </div>
                    </div>
                 </div>
            </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={getButtonDisabledState()}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {activeTab === 'add' ? 'Add Stock' : 'Confirm Consumption'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
