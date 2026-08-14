import { useState, useMemo } from "react";
import { Search, Plus, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type LabSelectorProps = {
    form: any;
    name: string;
    label?: string;
    labs: any[];
    selectedService?: string;
    disabled?: boolean;
};

export function LabSelector({ form, name, label, labs, selectedService, disabled }: LabSelectorProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const selectedLab = form.watch(name);

    const globalKeywordsForSelected = useMemo(() => {
        if (!selectedService) return new Set<string>();
        const keywords = new Set<string>();
        labs.forEach(l => {
            l.services?.forEach((s: any) => {
                if (s.name === selectedService && s.keywords) {
                    s.keywords.forEach((k: string) => {
                        if (k) keywords.add(k.trim().toLowerCase());
                    });
                }
            });
        });
        return keywords;
    }, [labs, selectedService]);

    const sortedAndFilteredLabs = useMemo(() => {
        let filtered = labs;
        if (searchQuery) {
            filtered = filtered.filter(l => l.name?.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        return filtered.map(l => {
            if (!selectedService) return { ...l, highlight: 'default', matchingService: null };
            
            const exactService = l.services?.find((s: any) => s.name === selectedService);
            if (exactService) {
                return { ...l, highlight: 'green', matchingService: exactService };
            }

            const relatedService = l.services?.find((s: any) => {
                const sKeywords = s.keywords?.map((k: string) => k?.trim().toLowerCase()).filter(Boolean) || [];
                return sKeywords.includes(selectedService.toLowerCase()) || 
                       sKeywords.some((k: string) => globalKeywordsForSelected.has(k)) ||
                       (s.name && s.name.toLowerCase().includes(selectedService.toLowerCase()));
            });

            if (relatedService) {
                return { ...l, highlight: 'yellow', matchingService: relatedService };
            }

            return { ...l, highlight: 'red', matchingService: null };
        }).sort((a, b) => {
            const score: Record<string, number> = { green: 0, yellow: 1, red: 2, default: 3 };
            if (score[a.highlight] !== score[b.highlight]) return score[a.highlight] - score[b.highlight];
            return (a.name || "").localeCompare(b.name || "");
        });
    }, [labs, searchQuery, selectedService, globalKeywordsForSelected]);

    const exactMatch = labs.some(l => l.name?.toLowerCase() === searchQuery.toLowerCase());

    const handleSelect = (val: string) => {
        if (disabled) return;
        form.setValue(name, val, { shouldValidate: true });
    };

    return (
        <div className="space-y-4">
            {label && <Label className="font-bold">{label}</Label>}
            <div className="relative">
                <Search className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                <Input 
                    placeholder="Search for a lab..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 rounded-xl bg-background/50 border-primary/20"
                    disabled={disabled}
                    autoComplete="off"
                />
            </div>

            <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {sortedAndFilteredLabs.length > 0 && selectedService && (
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] uppercase tracking-widest font-black text-muted-foreground border-b border-border/50">
                        <div className="col-span-4">Lab Name</div>
                        <div className="col-span-4">Service</div>
                        <div className="col-span-2 text-right">Price</div>
                        <div className="col-span-2 text-right">TAT</div>
                    </div>
                )}
                
                {sortedAndFilteredLabs.map(lab => {
                    return (
                        <div 
                            key={lab.name}
                            onClick={() => handleSelect(lab.name)}
                            className={cn(
                                "p-3 rounded-xl cursor-pointer border-2 transition-all flex items-center justify-between",
                                disabled && "opacity-50 cursor-not-allowed",
                                selectedLab === lab.name ? "border-primary bg-primary/10 shadow-sm" : "border-transparent bg-background hover:border-primary/20 shadow-sm",
                                lab.highlight === 'green' ? "border-green-500/30 bg-green-500/10 hover:bg-green-500/20" : 
                                lab.highlight === 'yellow' ? "border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20" :
                                lab.highlight === 'red' ? "border-red-500/30 bg-red-500/10 hover:bg-red-500/20" : ""
                            )}
                        >
                            <div className={cn("w-full grid gap-2 items-center", selectedService ? "grid-cols-12" : "grid-cols-1")}>
                                <div className={cn("font-bold text-base flex items-center gap-2", selectedService ? "col-span-4" : "", lab.highlight === 'green' ? "text-green-700" : lab.highlight === 'red' ? "text-red-700" : lab.highlight === 'yellow' ? "text-yellow-700" : "")}>
                                    {lab.name}
                                    {selectedLab === lab.name && <Check className="w-4 h-4 text-primary ml-1" />}
                                </div>
                                
                                {selectedService && (
                                    <>
                                        {(lab.highlight === 'green' || lab.highlight === 'yellow') && lab.matchingService ? (
                                            <>
                                                <div className={cn("col-span-4 text-sm font-medium truncate flex items-center gap-2", lab.highlight === 'yellow' ? "text-yellow-700/80" : "text-green-700/80")} title={lab.matchingService.name}>
                                                    {lab.matchingService.name}
                                                    {lab.highlight === 'yellow' && <span className="text-[9px] uppercase tracking-widest font-black bg-yellow-500/20 px-1.5 py-0.5 rounded text-yellow-700">Alternative</span>}
                                                </div>
                                                <div className={cn("col-span-2 text-right text-sm font-black", lab.highlight === 'yellow' ? "text-yellow-700" : "text-green-700")}>
                                                    {lab.matchingService.price ? `₹${lab.matchingService.price}` : '-'}
                                                </div>
                                                <div className={cn("col-span-2 text-right text-sm font-bold", lab.highlight === 'yellow' ? "text-yellow-700/80" : "text-green-700/80")}>
                                                    {lab.matchingService.tat ? `${lab.matchingService.tat}d` : '-'}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="col-span-8 text-[11px] font-black uppercase tracking-widest text-red-500/60 flex items-center">
                                                Does not provide {selectedService}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}

                {searchQuery && !exactMatch && (
                    <div 
                        onClick={() => handleSelect(searchQuery)}
                        className={cn(
                            "p-4 rounded-xl cursor-pointer border-2 border-dashed border-primary/50 bg-primary/5 transition-all flex items-center justify-between",
                            disabled && "opacity-50 cursor-not-allowed",
                            selectedLab === searchQuery ? "border-primary border-solid shadow-sm bg-primary/10" : "hover:bg-primary/10"
                        )}
                    >
                        <span className="font-bold text-lg">Add new lab: "{searchQuery}"</span>
                        <Plus className="w-6 h-6 text-primary" />
                    </div>
                )}

                {sortedAndFilteredLabs.length === 0 && !searchQuery && (
                    <div className="text-center p-4 text-muted-foreground text-sm font-medium">
                        No labs available. Type to add a new lab.
                    </div>
                )}
            </div>
            {form.formState.errors[name] && <p className="text-sm text-destructive font-bold">{form.formState.errors[name]?.message as string}</p>}
        </div>
    );
}
