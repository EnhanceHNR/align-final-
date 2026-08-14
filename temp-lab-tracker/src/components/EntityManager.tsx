"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRoles } from "@/hooks/use-roles";
import { fetchEntitiesAction, addEntityAction, deleteEntityAction, updateEntityAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import Papa from 'papaparse';
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, ArrowLeft, Loader2, Pencil, Download, Upload, FlaskConical, X, ChevronDown, ChevronUp, User, Users, PlusCircle, FileText } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface EntityManagerProps {
    title: string;
    description: string;
    collectionName: 'patients' | 'labs';
    icon: React.ElementType;
}

export function EntityManager({ title, description, collectionName, icon: Icon }: EntityManagerProps) {
  const { isAdmin, isLoading: isRoleLoading } = useRoles();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const serviceFileInputRef = useRef<HTMLInputElement>(null);
  
  const [entities, setEntities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedLabs, setExpandedLabs] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [services, setServices] = useState<{ name: string; price: string; tat?: string; keywords?: string[]; subTypes?: { name: string; price: string }[] }>([{ name: "", price: "" }]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [expandedServiceIndex, setExpandedServiceIndex] = useState<number | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedLabs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    loadEntities();
  }, [collectionName]);

  const loadEntities = async () => {
    setIsLoading(true);
    const data = await fetchEntitiesAction(collectionName);
    setEntities(data);
    setIsLoading(false);
  };

  const handleOpenAdd = () => {
    setEditingEntity(null);
    setNewName("");
    setNewPhone("");
    setServices([{ name: "", price: "" }]);
    setIsAddDialogOpen(true);
  };

  const handleOpenEdit = (entity: any) => {
    setEditingEntity(entity);
    setNewName(entity.name);
    if (collectionName === 'labs') {
        setNewPhone(entity.phone || "");
        setServices(entity.services || [{ name: "", price: "" }]);
    }
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    try {
      const validServices = services.filter(s => s.name.trim() !== "");
      const additionalData = collectionName === 'labs' ? { services: validServices, phone: newPhone.trim() } : {};
      let result;
      if (editingEntity) {
        result = await updateEntityAction(collectionName, editingEntity.id, newName.trim(), additionalData);
      } else {
        result = await addEntityAction(collectionName, newName.trim(), additionalData);
      }

      if (result.success) {
        toast({ title: editingEntity ? "Updated" : "Created", description: result.message });
        setIsAddDialogOpen(false);
        loadEntities();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addServiceField = () => {
    setServices([...services, { name: "", price: "" }]);
  };

  const removeServiceField = (index: number) => {
    if (expandedServiceIndex === index) setExpandedServiceIndex(null);
    else if (expandedServiceIndex !== null && expandedServiceIndex > index) setExpandedServiceIndex(expandedServiceIndex - 1);
    setServices(services.filter((_, i) => i !== index));
  };

  const updateServiceField = (index: number, field: 'name' | 'price' | 'tat' | 'keywords', value: string | string[]) => {
    const updated = [...services];
    if (field === 'keywords' && typeof value === 'string') {
       updated[index][field] = value.split(',').map(k => k.trim()).filter(Boolean);
    } else {
       updated[index][field] = value as any;
    }
    setServices(updated);
  };

  const addSubType = (serviceIndex: number) => {
    const updated = [...services];
    if (!updated[serviceIndex].subTypes) updated[serviceIndex].subTypes = [];
    updated[serviceIndex].subTypes!.push({ name: "", price: "" });
    setServices(updated);
  };

  const removeSubType = (serviceIndex: number, subTypeIndex: number) => {
    const updated = [...services];
    updated[serviceIndex].subTypes = updated[serviceIndex].subTypes?.filter((_, i) => i !== subTypeIndex);
    setServices(updated);
  };

  const updateSubTypeField = (serviceIndex: number, subTypeIndex: number, field: 'name' | 'price', value: string) => {
    const updated = [...services];
    if (updated[serviceIndex].subTypes) {
      updated[serviceIndex].subTypes![subTypeIndex][field] = value;
    }
    setServices(updated);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!isAdmin) {
        toast({ title: "Forbidden", description: "Only Admins can delete records.", variant: "destructive" });
        return;
    }
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const result = await deleteEntityAction(collectionName, id);
      if (result.success) {
        toast({ title: "Deleted", description: `${name} has been removed.` });
        setEntities(entities.filter(e => e.id !== id));
      } else {
        toast({ 
          title: "Deletion Failed", 
          description: result.error || "An unknown error occurred.", 
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const exportCSV = () => {
    let csv = "";
    if (collectionName === 'labs') {
        const exportData: any[] = [];
        entities.forEach(e => {
            if (e.services && e.services.length > 0) {
                e.services.forEach((s: any) => {
                    exportData.push({
                        Name: e.name,
                        Phone: e.phone || "",
                        'Service Name': s.name,
                        Price: s.price,
                        TAT: s.tat || "",
                        Keywords: s.keywords ? s.keywords.join(", ") : ""
                    });
                });
            } else {
                exportData.push({
                    Name: e.name,
                    Phone: e.phone || "",
                    'Service Name': "",
                    Price: "",
                    TAT: "",
                    Keywords: ""
                });
            }
        });
        csv = Papa.unparse(exportData);
    } else {
        const exportData = entities.map(e => ({ Name: e.name }));
        csv = Papa.unparse(exportData);
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${collectionName}_export.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        const text = event.target?.result as string;
        
        Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                setIsSubmitting(true);
                let successCount = 0;
                let errorCount = 0;

                if (collectionName === 'labs') {
                    const labsMap = new Map<string, any[]>();
                    results.data.forEach((row: any) => {
                        const name = row['Name'] || row[Object.keys(row)[0]];
                        if (!name) return;
                        
                        const sName = row['Service Name'] || '';
                        const sPrice = row['Price'] || '';
                        const sTat = row['TAT'] || '';
                        const sKeywords = row['Keywords'] || '';
                        
                        if (!labsMap.has(name)) {
                            labsMap.set(name, []);
                        }
                        
                        if (sName) {
                            labsMap.get(name)!.push({ 
                                name: sName, 
                                price: sPrice, 
                                tat: sTat,
                                keywords: sKeywords ? String(sKeywords).split(',').map((k: string) => k.trim()).filter(Boolean) : []
                            });
                        }
                    });

                    for (const [name, services] of labsMap.entries()) {
                        const result = await addEntityAction(collectionName, name, { services });
                        if (result.success) successCount++;
                        else errorCount++;
                    }
                } else {
                    const patientsList = new Set<string>();
                    results.data.forEach((row: any) => {
                        const name = row['Name'] || row[Object.keys(row)[0]];
                        if (name) patientsList.add(name);
                    });

                    for (const name of patientsList) {
                        const result = await addEntityAction(collectionName, name);
                        if (result.success) successCount++;
                        else errorCount++;
                    }
                }

                toast({ 
                    title: "Import Completed", 
                    description: `Successfully imported records. ${errorCount > 0 ? `${errorCount} failed.` : ''}` 
                });
                loadEntities();
                setIsSubmitting(false);
            }
        });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const importServicesCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        const text = event.target?.result as string;
        
        Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const newServices: {name: string, price: string, tat: string}[] = [];
                results.data.forEach((row: any) => {
                    const sName = row['Service Name'] || row['Service'] || row['Name'] || '';
                    const sPrice = row['Price'] || row['Cost'] || row['Amount'] || '';
                    const sTat = row['TAT'] || row['Turnaround Time'] || row['Days'] || '';
                    const sKeywords = row['Keywords'] || row['Tags'] || '';
                    
                    if (sName) {
                        newServices.push({ 
                            name: String(sName), 
                            price: String(sPrice).replace(/[^0-9.]/g, ''), 
                            tat: String(sTat),
                            keywords: String(sKeywords).split(',').map((k: string) => k.trim()).filter(Boolean)
                        });
                    }
                });

                if (newServices.length > 0) {
                    const validExisting = services.filter(s => s.name.trim() !== "");
                    setServices([...validExisting, ...newServices]);
                    toast({ 
                        title: "Services Imported", 
                        description: `Successfully imported ${newServices.length} services.` 
                    });
                } else {
                    toast({ 
                        title: "Import Failed", 
                        description: "Could not find valid service data in the CSV. Make sure headers include 'Service Name' and 'Price'.", 
                        variant: "destructive" 
                    });
                }
            }
        });
    };
    reader.readAsText(file);
    if (serviceFileInputRef.current) serviceFileInputRef.current.value = '';
  };

  const exportServicesCSV = () => {
    const validServices = services.filter(s => s.name.trim() !== "");
    let exportData;
    if (validServices.length === 0) {
        exportData = [{
            'Service Name': '',
            'Price': '',
            'TAT': ''
        }];
    } else {
        exportData = validServices.map(s => ({
            'Service Name': s.name,
            'Price': s.price,
            'TAT': s.tat || "",
            'Keywords': s.keywords ? s.keywords.join(", ") : ""
        }));
    }
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${newName.trim() || 'Lab'}_Services.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = entities.filter(e => {
      const query = searchQuery.toLowerCase();
      const matchesName = (e.name || "").toLowerCase().includes(query);
      const matchesService = e.services && e.services.some((s: any) => (s.name || "").toLowerCase().includes(query));
      return matchesName || matchesService;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight">{title}</h1>
            <p className="text-muted-foreground font-medium">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} className="rounded-xl h-10 gap-2 font-bold border-primary/20 text-primary hover:bg-primary/5">
                <Download className="w-4 h-4" />
                Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-xl h-10 gap-2 font-bold border-primary/20 text-primary hover:bg-primary/5">
                <Upload className="w-4 h-4" />
                Import
            </Button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={importCSV} 
                accept=".csv" 
                className="hidden" 
            />
            <Button onClick={handleOpenAdd} className="rounded-2xl h-12 px-6 font-bold shadow-lg shadow-primary/20 gap-2">
                <Plus className="w-5 h-5" />
                Add {collectionName === 'patients' ? 'Patient' : 'Lab'}
            </Button>
        </div>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className={cn("glass-card border-none rounded-3xl", collectionName === 'labs' ? "sm:max-w-2xl" : "sm:max-w-md")}>
                <DialogHeader>
                    <DialogTitle>{editingEntity ? 'Edit' : 'Add New'} {collectionName === 'patients' ? 'Patient' : 'Lab/Person'}</DialogTitle>
                    <DialogDescription>
                        {editingEntity ? 'Update the details for this record.' : `Enter the name of the new ${collectionName.slice(0, -1)}.`}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <Input 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)} 
                        placeholder={collectionName === 'patients' ? "Full Name" : "Lab/Partner Name"} 
                        className="rounded-xl bg-background/50 h-12"
                        required
                    />
                    {collectionName === 'labs' && (
                        <>
                            <Input 
                                value={newPhone} 
                                onChange={(e) => setNewPhone(e.target.value)} 
                                placeholder="Phone Number (Optional)" 
                                className="rounded-xl bg-background/50 h-12"
                                type="tel"
                            />
                            <div className="space-y-4 mt-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-muted-foreground">Services & Pricing</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="file" 
                                        ref={serviceFileInputRef} 
                                        onChange={importServicesCSV} 
                                        accept=".csv" 
                                        className="hidden" 
                                    />
                                    <Button type="button" variant="outline" size="sm" onClick={exportServicesCSV} className="rounded-xl h-8 gap-1">
                                        <Download className="w-4 h-4" />
                                        Export
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" onClick={() => serviceFileInputRef.current?.click()} className="rounded-xl h-8 gap-1">
                                        <Upload className="w-4 h-4" />
                                        Import
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" onClick={addServiceField} className="rounded-xl h-8 gap-1">
                                        <PlusCircle className="w-4 h-4" />
                                        Add Service
                                    </Button>
                                </div>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto border border-border/10 rounded-xl scrollbar-thin scrollbar-thumb-primary/20">
                                <Table>
                                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead>Service Name</TableHead>
                                            <TableHead className="w-[120px]">Price (₹)</TableHead>
                                            <TableHead className="w-[120px]">TAT (Days)</TableHead>
                                            <TableHead className="w-[200px]">Keywords (Tags)</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {services.map((service, index) => (
                                            <React.Fragment key={index}>
                                            <TableRow className={expandedServiceIndex === index ? 'bg-primary/5' : ''}>
                                                <TableCell className="p-2">
                                                    <div className="flex items-center gap-1">
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => setExpandedServiceIndex(expandedServiceIndex === index ? null : index)} className="h-7 w-7 rounded-full shrink-0 hover:bg-primary/10">
                                                            {expandedServiceIndex === index ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                        </Button>
                                                        <Input 
                                                            value={service.name} 
                                                            onChange={(e) => updateServiceField(index, 'name', e.target.value)} 
                                                            placeholder="Name" 
                                                            className="h-9 text-sm rounded-lg"
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <Input 
                                                        type="number"
                                                        value={service.price} 
                                                        onChange={(e) => updateServiceField(index, 'price', e.target.value)} 
                                                        placeholder="Price" 
                                                        className="h-9 text-sm rounded-lg"
                                                    />
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <Input 
                                                        type="number"
                                                        value={service.tat || ""} 
                                                        onChange={(e) => updateServiceField(index, 'tat', e.target.value)} 
                                                        placeholder="TAT" 
                                                        className="h-9 text-sm rounded-lg"
                                                    />
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <Input 
                                                        value={service.keywords ? service.keywords.join(", ") : ""} 
                                                        onChange={(e) => updateServiceField(index, 'keywords', e.target.value)} 
                                                        placeholder="comma, separated" 
                                                        className="h-9 text-sm rounded-lg"
                                                    />
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    {services.length > 1 && (
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeServiceField(index)} className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full">
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                            {expandedServiceIndex === index && (
                                                <>
                                                <TableRow className="bg-primary/5 border-none">
                                                    <TableCell colSpan={5} className="p-0 pt-0 pb-2 pl-12">
                                                        <div className="flex items-center justify-between px-2 py-2">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sub-Types</span>
                                                            <Button type="button" variant="outline" size="sm" onClick={() => addSubType(index)} className="rounded-lg h-7 gap-1 text-xs">
                                                                <PlusCircle className="w-3 h-3" /> Add Sub-Type
                                                            </Button>
                                                        </div>
                                                        {(service.subTypes && service.subTypes.length > 0) ? (
                                                            <div className="space-y-1 px-2 pb-2">
                                                                {service.subTypes.map((st, stIdx) => (
                                                                    <div key={stIdx} className="flex items-center gap-2 bg-background rounded-lg p-1.5 border border-border/20">
                                                                        <span className="text-muted-foreground text-xs pl-1">└</span>
                                                                        <Input 
                                                                            value={st.name}
                                                                            onChange={(e) => updateSubTypeField(index, stIdx, 'name', e.target.value)}
                                                                            placeholder="Sub-type name"
                                                                            className="h-8 text-sm rounded-lg flex-1"
                                                                        />
                                                                        <Input 
                                                                            type="number"
                                                                            value={st.price}
                                                                            onChange={(e) => updateSubTypeField(index, stIdx, 'price', e.target.value)}
                                                                            placeholder="Price"
                                                                            className="h-8 text-sm rounded-lg w-[100px]"
                                                                        />
                                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSubType(index, stIdx)} className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-full shrink-0">
                                                                            <X className="w-3 h-3" />
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-muted-foreground italic px-2 pb-2">No sub-types added yet.</p>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                                </>
                                            )}
                                            </React.Fragment>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            </div>
                        </>
                    )}
                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting} className="rounded-xl w-full h-12 font-bold">
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {editingEntity ? 'Update Changes' : 'Save Record'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

      <Card className="glass-card border-none shadow-xl">
        <CardHeader className="pb-4">
            <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                    placeholder={`Search ${collectionName}...`} 
                    className="pl-10 rounded-xl bg-background/50 border-none h-11 font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="h-64 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="rounded-2xl border border-border/10 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="font-bold">Name</TableHead>
                                {collectionName === 'labs' && (
                                    <>
                                        <TableHead className="font-bold">Services Offered</TableHead>
                                    </>
                                )}
                                <TableHead className="font-bold">Added on</TableHead>
                                <TableHead className="text-right font-bold pr-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={collectionName === 'labs' ? 4 : 3} className="h-24 text-center text-muted-foreground">
                                        No records found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((e) => (
                                    <React.Fragment key={e.id}>
                                        <TableRow className="hover:bg-primary/5 transition-colors group">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <Icon className="w-4 h-4 text-primary" />
                                                    </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-foreground flex items-center gap-2">
                                                        {e.name}
                                                    </span>
                                                    {e.phone && <span className="text-xs text-muted-foreground">{e.phone}</span>}
                                                </div>
                                                </div>
                                            </TableCell>
                                            {collectionName === 'labs' && (
                                                <TableCell>
                                                    {e.services && e.services.length > 0 ? (
                                                        <Button 
                                                            variant="ghost" 
                                                            onClick={() => toggleExpand(e.id)}
                                                            className="h-8 gap-2 px-3 text-xs font-bold rounded-xl hover:bg-primary/10 text-primary"
                                                        >
                                                            {e.services.length} {e.services.length === 1 ? 'Service' : 'Services'}
                                                            {expandedLabs[e.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </Button>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs font-medium">No services listed</span>
                                                    )}
                                                </TableCell>
                                            )}
                                            <TableCell className="text-xs text-muted-foreground font-medium">
                                                {e.createdAt ? (
                                                    typeof e.createdAt === 'string' 
                                                    ? new Date(e.createdAt).toLocaleDateString()
                                                    : e.createdAt.toDate 
                                                        ? e.createdAt.toDate().toLocaleDateString() 
                                                        : new Date(e.createdAt).toLocaleDateString()
                                                ) : 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-right pr-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:bg-primary/10 rounded-full"
                                                        onClick={() => handleOpenEdit(e)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className={cn(
                                                            "opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10 rounded-full",
                                                            !isAdmin && "opacity-50"
                                                        )}
                                                        onClick={() => {
                                                            console.log("Delete clicked for:", e.id);
                                                            handleDelete(e.id, e.name);
                                                        }}
                                                        disabled={isRoleLoading}
                                                    >
                                                        {isRoleLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {collectionName === 'labs' && expandedLabs[e.id] && e.services && e.services.length > 0 && (
                                            <TableRow className="bg-primary/5 hover:bg-primary/5 border-none">
                                                <TableCell colSpan={4} className="p-0">
                                                    <div className="p-4 pl-14">
                                                        <div className="bg-background border border-border/10 rounded-xl shadow-sm max-h-[500px] overflow-y-auto custom-scrollbar">
                                                            <Table>
                                                                <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                                                                    <TableRow>
                                                                        <TableHead className="font-bold">Service Name</TableHead>
                                                                        <TableHead className="font-bold text-right">Price</TableHead>
                                                                        <TableHead className="font-bold text-center">Tentative Time of Arrival</TableHead>
                                                                        <TableHead className="font-bold">Key words (Tags)</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {e.services.map((s: any, i: number) => (
                                                                        <React.Fragment key={i}>
                                                                        <TableRow className="hover:bg-primary/5">
                                                                            <TableCell className="font-bold text-foreground">
                                                                                {s.name}
                                                                                {s.subTypes && s.subTypes.length > 0 && (
                                                                                    <span className="ml-2 text-[10px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                                                                        {s.subTypes.length} sub-type{s.subTypes.length > 1 ? 's' : ''}
                                                                                    </span>
                                                                                )}
                                                                            </TableCell>
                                                                            <TableCell className="text-right font-black text-primary">₹{s.price}</TableCell>
                                                                            <TableCell className="text-center text-muted-foreground font-medium">
                                                                                {s.tat ? (
                                                                                    <span className="text-xs font-bold uppercase tracking-widest bg-muted px-2 py-1 rounded-md">
                                                                                        {s.tat} Days
                                                                                    </span>
                                                                                ) : '-'}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <div className="flex flex-wrap gap-1">
                                                                                    {s.keywords && s.keywords.length > 0 ? s.keywords.map((k: string, j: number) => (
                                                                                        <span key={j} className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                                                                            {k}
                                                                                        </span>
                                                                                    )) : <span className="text-muted-foreground text-xs italic">-</span>}
                                                                                </div>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                        {s.subTypes && s.subTypes.length > 0 && s.subTypes.map((st: any, j: number) => (
                                                                            <TableRow key={`${i}-st-${j}`} className="hover:bg-primary/5 bg-muted/20">
                                                                                <TableCell className="text-muted-foreground font-medium pl-8">
                                                                                    <span className="text-muted-foreground/50 mr-1">└</span> {st.name}
                                                                                </TableCell>
                                                                                <TableCell className="text-right font-bold text-primary/80">₹{st.price}</TableCell>
                                                                                <TableCell></TableCell>
                                                                                <TableCell></TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                        </React.Fragment>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
