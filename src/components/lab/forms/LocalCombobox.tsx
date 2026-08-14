"use client";

import { useState, useEffect } from "react";
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Option = string | { label: string; highlight?: 'green' | 'red' | 'default' };

type LocalComboboxProps = {
  form: any;
  name: string;
  label?: string;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
};

export function LocalCombobox({ form, name, label, options, placeholder, disabled }: LocalComboboxProps) {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);

  // Keep internal input value in sync with form if it changes from outside
  const formValue = form.watch(name);
  useEffect(() => {
    if (formValue !== inputValue) {
        setInputValue(formValue || "");
    }
  }, [formValue]);

  const normalizedOptions = (options || []).filter(Boolean).map(opt => typeof opt === 'string' ? { label: opt, highlight: 'default' } : opt);
  const filteredOptions = normalizedOptions.filter(opt => opt.label?.toLowerCase().includes(inputValue.toLowerCase()));
  
  const handleSelect = (val: string) => {
    form.setValue(name, val, { shouldValidate: true });
    setInputValue(val);
    setOpen(false);
  };

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="space-y-2">
          {label && <Label htmlFor={name}>{label}</Label>}
          
          <div className="relative">
            <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-muted-foreground z-10" />
                <Input
                    id={name}
                    placeholder={placeholder || `Search or add new...`}
                    className={cn(
                        "pl-10 rounded-xl bg-background/50 h-12 transition-all border-border/50",
                        open && "border-primary/50 ring-2 ring-primary/10 bg-background"
                    )}
                    onFocus={() => setOpen(true)}
                    onBlur={() => {
                        // Delay closing to allow item clicks to register
                        setTimeout(() => setOpen(false), 200);
                    }}
                    onChange={(e) => {
                        field.onChange(e); // Sync form state as they type for custom values
                        setInputValue(e.target.value);
                        setOpen(true);
                    }}
                    value={inputValue}
                    autoComplete="off"
                    disabled={disabled}
                />
            </div>
            
            {open && (
                <div className="absolute top-full mt-2 w-full z-50 glass-card rounded-xl shadow-2xl overflow-hidden border border-border/50 animate-in fade-in slide-in-from-top-2">
                    <Command className="bg-transparent" shouldFilter={false}>
                        <CommandList className="max-h-[250px] overflow-y-auto custom-scrollbar p-1">
                            <CommandEmpty className="p-4 text-center">
                                <p className="text-xs text-muted-foreground font-medium mb-2">No matching options found.</p>
                                {inputValue && (
                                    <Button 
                                        type="button"
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 rounded-lg text-[10px] font-bold"
                                        onClick={() => {
                                            handleSelect(inputValue);
                                        }}
                                    >
                                        Use '{inputValue}'
                                    </Button>
                                )}
                            </CommandEmpty>
                            <CommandGroup>
                                {filteredOptions.map((opt) => (
                                <CommandItem
                                    key={opt.label}
                                    value={opt.label}
                                    onSelect={() => handleSelect(opt.label)}
                                    className={cn(
                                        "h-10 px-4 cursor-pointer rounded-lg mx-1 my-0.5",
                                        opt.highlight === 'green' ? "bg-green-500/10 text-green-600 hover:bg-green-500/20" : 
                                        opt.highlight === 'red' ? "bg-red-500/10 text-red-600 hover:bg-red-500/20" : 
                                        "hover:bg-primary/10"
                                    )}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className="font-medium">{opt.label}</span>
                                        <Plus className="w-3 h-3 opacity-20" />
                                    </div>
                                </CommandItem>
                                ))}
                                {inputValue && !normalizedOptions.some(opt => opt.label.toLowerCase() === inputValue.toLowerCase()) && filteredOptions.length > 0 && (
                                    <CommandItem
                                        value={inputValue}
                                        onSelect={() => handleSelect(inputValue)}
                                        className="h-10 px-4 cursor-pointer bg-primary/5 text-primary hover:bg-primary/10 rounded-lg mx-1 mt-1 border border-primary/10"
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className="font-bold">Use "{inputValue}"</span>
                                            <Plus className="w-3 h-3" />
                                        </div>
                                    </CommandItem>
                                )}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </div>
            )}
          </div>
          {fieldState.error && <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>}
        </div>
      )}
    />
  );
}
