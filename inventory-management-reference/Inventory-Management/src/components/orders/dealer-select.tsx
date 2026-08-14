"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

import { Dealer, InventoryItem } from "@/lib/types"

interface DealerSelectProps {
  dealers: Dealer[];
  item?: InventoryItem;
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function DealerSelect({
  dealers,
  item,
  allItems = [],
  value,
  onValueChange,
  disabled = false,
}: DealerSelectProps & { allItems?: InventoryItem[] }) {
  const [open, setOpen] = React.useState(false)

  const options = React.useMemo(() => {
    if (!item) {
        return dealers.map(dealer => ({
            value: dealer.id,
            label: dealer.name,
            status: 'red' as const
        }));
    }

    return dealers.map(dealer => {
        const suppliesItem = dealer.suppliedItems?.includes(item.id);
        let status: 'green' | 'yellow' | 'red' = 'red';
        
        let price: number | undefined;
        let expiry: string | undefined;
        let matchedItemName: string | undefined;

        if (suppliesItem) {
            status = 'green';
            price = dealer.itemPrices?.[item.id];
            expiry = dealer.itemExpiries?.[item.id];
        } else {
            const getTokens = (str?: string | string[]) => {
                if (!str) return [];
                const text = Array.isArray(str) ? str.join(' ') : str;
                return text.toLowerCase().split(/[\s,]+/).filter(t => t.length > 2);
            };

            const itemTokens = [...getTokens(item.genericName), ...getTokens(item.tags)];
            const suppliedItems = allItems.filter(i => dealer.suppliedItems?.includes(i.id));

            for (const sItem of suppliedItems) {
                const sTokens = [...getTokens(sItem.genericName), ...getTokens(sItem.tags)];
                if (itemTokens.length > 0 && sTokens.length > 0) {
                    const hasMatch = sTokens.some(dToken => itemTokens.some(iToken => iToken.includes(dToken) || dToken.includes(iToken)));
                    if (hasMatch) {
                        status = 'yellow';
                        price = dealer.itemPrices?.[sItem.id];
                        expiry = dealer.itemExpiries?.[sItem.id];
                        matchedItemName = sItem.name;
                        break;
                    }
                }
            }
        }
        
        return {
            value: dealer.id,
            label: dealer.name,
            status,
            price,
            expiry,
            matchedItemName
        };
    }).sort((a, b) => {
        const statusWeight = { green: 1, yellow: 2, red: 3 };
        return statusWeight[a.status] - statusWeight[b.status];
    });
  }, [dealers, item]);

  const selectedOption = options.find((option) => option.value === value)

  if (disabled) {
      return (
          <div className="p-3 border rounded-md bg-muted text-muted-foreground text-sm">
              Please select an item first to see available dealers.
          </div>
      );
  }

  return (
    <div className="border rounded-md shadow-sm bg-background overflow-hidden">
        <Command>
          <CommandInput placeholder="Search dealers..." />
          <div className="flex items-center px-4 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/50 pr-8">
              <div className="w-6 mr-2"></div>
              <div className="flex-1 min-w-0">Name</div>
              <div className="w-[200px] flex justify-end gap-4 shrink-0 pr-2">
                  <div className="w-[80px] text-right">Price</div>
                  <div className="w-[100px] text-right">Expiry Date</div>
              </div>
          </div>
          <CommandList className="max-h-[250px] overflow-y-auto">
            <CommandEmpty>No dealer found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  className={cn("mb-1 cursor-pointer transition-colors px-4 py-2", {
                      'bg-green-50 text-green-900 data-[selected=true]:bg-green-100 data-[selected=true]:text-green-900': option.status === 'green' && value !== option.value,
                      'bg-yellow-50 text-yellow-900 data-[selected=true]:bg-yellow-100 data-[selected=true]:text-yellow-900': option.status === 'yellow' && value !== option.value,
                      'bg-red-50 text-red-900 data-[selected=true]:bg-red-100 data-[selected=true]:text-red-900': option.status === 'red' && value !== option.value,
                      'bg-primary text-primary-foreground data-[selected=true]:bg-primary/90 data-[selected=true]:text-primary-foreground': value === option.value,
                  })}
                  onSelect={() => {
                    onValueChange(option.value)
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                      <div className="flex items-center flex-1 min-w-0 mr-4">
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              value === option.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="truncate font-medium">{option.label}</span>
                          {option.matchedItemName && (
                              <span className="italic text-[10px] ml-2 truncate shrink-0 max-w-[120px]" title={`Matches: ${option.matchedItemName}`}>
                                  Matches: {option.matchedItemName}
                              </span>
                          )}
                      </div>
                      
                      <div className={cn("flex items-center w-[200px] shrink-0 justify-end gap-4 text-sm", value === option.value ? "opacity-100" : "opacity-80")}>
                          <div className="w-[80px] text-right">
                              {option.price !== undefined ? `\u20B9${option.price}` : '-'}
                          </div>
                          <div className="w-[100px] text-right">
                              {option.expiry ? new Date(option.expiry).toLocaleDateString() : '-'}
                          </div>
                      </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
    </div>
  )
}
