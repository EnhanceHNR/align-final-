
"use client";

import { useState, useEffect, useCallback } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { getSuggestions } from "@/app/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Loader2, Search } from "lucide-react";
import { QuickAddDialog } from "./QuickAddDialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type AutocompleteInputProps = {
  form: any;
  name: string;
  label: string;
  collection: 'patients' | 'labs';
  disabled?: boolean;
};

export function AutocompleteInput({ form, name, label, collection, disabled }: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<{ id: string, name: string }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const fetchSuggestions = useCallback(async (query: string) => {
    const result = await getSuggestions(collection, query);
    setSuggestions(result);
  }, [collection]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchSuggestions(inputValue);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue, fetchSuggestions]);

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={name}>{label}</Label>
            <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10 gap-1 rounded-full"
                disabled={disabled}
                onClick={() => setQuickAddOpen(true)}
            >
                <Plus className="w-3 h-3" />
                Add New
            </Button>
          </div>
          
          <div className="relative group">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <div className="relative flex items-center">
                        <Search className="absolute left-3 w-4 h-4 text-muted-foreground z-10" />
                        <Input
                            {...field}
                            id={name}
                            placeholder={`Search or add new ${collection.slice(0, -1)}`}
                            className={cn(
                                "pl-10 rounded-xl bg-background/50 h-12 transition-all border-border/50",
                                open && "border-primary/50 ring-2 ring-primary/10 bg-background"
                            )}
                            onFocus={() => {
                                setOpen(true);
                                fetchSuggestions(inputValue);
                            }}
                            onChange={(e) => {
                                field.onChange(e);
                                setInputValue(e.target.value);
                                setOpen(true);
                            }}
                            value={field.value}
                            autoComplete="off"
                            disabled={disabled}
                        />
                    </div>
                </PopoverTrigger>
                <PopoverContent 
                    className="w-[--radix-popover-trigger-width] p-0 glass-card border-none shadow-2xl" 
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onInteractOutside={(e) => {
                        // Only close if we didn't click the input
                        const target = e.target as HTMLElement;
                        if (target.id === name) return;
                        setOpen(false);
                    }}
                >
                    <Command className="bg-transparent" shouldFilter={false}>
                        <CommandList>
                            <CommandEmpty className="p-4 text-center">
                                <p className="text-xs text-muted-foreground font-medium mb-2">No {collection.slice(0, -1)} found.</p>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 rounded-lg text-[10px] font-bold"
                                    onClick={() => {
                                        setQuickAddOpen(true);
                                        setOpen(false);
                                    }}
                                >
                                    Create '{inputValue || 'New'}'
                                </Button>
                            </CommandEmpty>
                            <CommandGroup>
                                {suggestions.map((suggestion) => (
                                <CommandItem
                                    key={suggestion.id}
                                    value={suggestion.name}
                                    onSelect={(currentValue) => {
                                        form.setValue(name, currentValue, { shouldValidate: true });
                                        setInputValue(currentValue);
                                        setSuggestions([]);
                                        setOpen(false);
                                    }}
                                    className="h-10 px-4 cursor-pointer hover:bg-primary/10 rounded-lg mx-1"
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className="font-medium">{suggestion.name}</span>
                                        <Plus className="w-3 h-3 opacity-20" />
                                    </div>
                                </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <QuickAddDialog 
                isOpen={quickAddOpen}
                onClose={() => setQuickAddOpen(false)}
                collection={collection}
                onSuccess={(newName) => {
                    form.setValue(name, newName, { shouldValidate: true });
                    setInputValue(newName);
                    setOpen(false);
                }}
            />
          </div>
          {fieldState.error && <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>}
        </div>
      )}
    />
  );
}
