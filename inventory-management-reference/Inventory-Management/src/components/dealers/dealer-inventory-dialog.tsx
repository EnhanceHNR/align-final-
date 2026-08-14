'use client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Dealer, InventoryItem } from "@/lib/types";
import { firestore, useCollection } from "@/firebase";
import { collection } from "firebase/firestore";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DealerInventoryDialogProps {
  dealer: Dealer | null;
  onClose: () => void;
}

export function DealerInventoryDialog({ dealer, onClose }: DealerInventoryDialogProps) {
  const itemsCollection = useMemo(() => firestore ? collection(firestore, 'items') : null, []);
  const { data: items, isLoading } = useCollection<InventoryItem>(itemsCollection);
  const [searchTerm, setSearchTerm] = useState("");

  const itemStatuses = useMemo(() => {
    if (!dealer || !items) return [];

    const getTokens = (str?: string | string[]) => {
      if (!str) return [];
      const text = Array.isArray(str) ? str.join(' ') : str;
      return text.toLowerCase().split(/[\s,]+/).filter(t => t.length > 2);
    };

    const suppliedItemsTokens = items
      .filter(i => dealer.suppliedItems?.includes(i.id))
      .flatMap(i => [...getTokens(i.genericName), ...getTokens(i.tags)]);

    return items.map(item => {
      const suppliesItem = dealer.suppliedItems?.includes(item.id);
      
      // Auto-created items from CSV upload have these specific placeholder values
      const isDealerOnly = item.itemCount === 0 && item.category === 'Uncategorized' && item.company === 'Unknown';
      const inMyInventory = !isDealerOnly;
      
      let status: 'green' | 'yellow' | 'red' | 'blue' | 'hidden' = 'hidden';
      
      if (suppliesItem) {
        if (inMyInventory) {
          status = 'green';
        } else {
          status = 'blue';
        }
      } else {
        const itemTokens = [...getTokens(item.genericName), ...getTokens(item.tags)];
        // Only yellow match if there are actual generic names or tags to match
        if (itemTokens.length > 0 && suppliedItemsTokens.length > 0) {
            const hasMatch = suppliedItemsTokens.some(dToken => itemTokens.some(iToken => iToken.includes(dToken) || dToken.includes(iToken)));
            if (hasMatch) {
              status = 'yellow';
            } else if (inMyInventory) {
              status = 'red';
            }
        } else if (inMyInventory) {
            status = 'red';
        }
      }
      return { item, status };
    }).filter(x => x.status !== 'hidden').sort((a, b) => {
      const rank = { 'green': 1, 'blue': 2, 'yellow': 3, 'red': 4, 'hidden': 5 };
      if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
      return a.item.name.localeCompare(b.item.name);
    });
  }, [dealer, items]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return itemStatuses;
    const lower = searchTerm.toLowerCase();
    return itemStatuses.filter(({ item }) => 
      item.name.toLowerCase().includes(lower) || 
      (item.brandName && item.brandName.toLowerCase().includes(lower)) ||
      (item.genericName && item.genericName.toLowerCase().includes(lower))
    );
  }, [itemStatuses, searchTerm]);

  return (
    <Dialog open={!!dealer} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{dealer?.name} - Inventory Match</DialogTitle>
          <DialogDescription>
            Items in both (Green), dealer-only (Blue), alternative matches (Yellow), and your items unavailable from dealer (Red).
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search items..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex-1 flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-4 px-4 mt-4 border-t">
            <div className="flex flex-col gap-2 py-4">
              {filteredItems.map(({ item, status }) => (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    status === 'green' ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' :
                    status === 'blue' ? 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400' :
                    status === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400' :
                    'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400 opacity-70'
                  }`}
                >
                  <div className="flex flex-col flex-1 min-w-0 mr-4">
                    <span className="font-semibold truncate">{item.name} {item.brandName ? `(${item.brandName})` : ''}</span>
                    {item.genericName && <span className="text-sm opacity-80 truncate">{item.genericName}</span>}
                  </div>
                  
                  {(dealer?.itemPrices?.[item.id] !== undefined || dealer?.itemExpiries?.[item.id]) && (
                      <div className="flex flex-col items-end mr-4 text-sm shrink-0">
                          {dealer.itemPrices?.[item.id] !== undefined && (
                              <span className="font-medium">&#8377;{dealer.itemPrices[item.id]}</span>
                          )}
                          {dealer.itemExpiries?.[item.id] && (
                              <span className="text-xs opacity-80">Exp: {new Date(dealer.itemExpiries[item.id]).toLocaleDateString()}</span>
                          )}
                      </div>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    {status === 'green' && <Badge className="bg-green-500 hover:bg-green-600">Available</Badge>}
                    {status === 'blue' && <Badge className="bg-blue-500 hover:bg-blue-600">Dealer Only</Badge>}
                    {status === 'yellow' && <Badge className="bg-yellow-500 hover:bg-yellow-600">Match</Badge>}
                    {status === 'red' && <Badge variant="outline" className="text-red-700 border-red-500/30">Unavailable</Badge>}
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No items match your search.
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
