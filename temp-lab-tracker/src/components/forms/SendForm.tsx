"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { sendSchemaClient } from "@/lib/schemas";
import { sendSubmissionAction, fetchEntitiesAction } from "@/app/actions";
import { useEffect, useState, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/firebase";
import Image from 'next/image';
import { AutocompleteInput } from "./AutocompleteInput";
import { LocalCombobox } from "./LocalCombobox";
import { LabSelector } from "./LabSelector";
import { Send, Image as ImageIcon, Clock, Camera, ChevronRight, ChevronLeft, Plus, X, UserCheck, Package, Truck, User, FlaskConical, Upload, Repeat, FileEdit, Trash2 } from "lucide-react";
import { CameraModal } from "../CameraModal";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import type { Lab, LabService, Submission } from "@/lib/types";

type SendFormValues = z.infer<typeof sendSchemaClient>;

type SendFormProps = {
  users?: { id: string; fullName: string; email: string }[];
  receivedRecords?: Submission[];
};

export function SendForm({ users = [], receivedRecords = [] }: SendFormProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [isLoadingLabs, setIsLoadingLabs] = useState(true);
  
  // Camera Modal States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraType, setCameraType] = useState<'selfie' | 'product' | 'delivery' | 'bill'>('product');
  const [uploadType, setUploadType] = useState<'selfie' | 'product' | 'delivery' | 'bill'>('product');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Photo Previews and Files
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [productPreviews, setProductPreviews] = useState<{url: string, type: string}[]>([]);
  const [deliveryPreview, setDeliveryPreview] = useState<string | null>(null);
  const [billPreview, setBillPreview] = useState<string | null>(null);
  
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [productFiles, setProductFiles] = useState<File[]>([]);
  const [deliveryFile, setDeliveryFile] = useState<File | null>(null);
  const [billFile, setBillFile] = useState<File | null>(null);

  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendType, setSendType] = useState<'new' | 'resend'>('new');
  const [selectedReceivedId, setSelectedReceivedId] = useState<string | null>(null);

  const form = useForm<SendFormValues>({
    resolver: zodResolver(sendSchemaClient),
    defaultValues: {
      type: "send",
      senderName: "",
      item: "",
      subType: "",
      deliveryPerson: "",
      labName: "",
      patientName: "",
      appointmentStatus: undefined,
      productPhotos: [],
      documentType: "None",
      billAmount: "",
      remarks: "",
    },
  });

  const deleteSpecificDraft = (id: string) => {
    const saved = localStorage.getItem('send_drafts');
    let currentDrafts = [];
    try { if (saved) currentDrafts = JSON.parse(saved); } catch (e) {}
    const newDrafts = currentDrafts.filter((d: any) => d.id !== id);
    localStorage.setItem('send_drafts', JSON.stringify(newDrafts));
    setDrafts(newDrafts);
    
    if (currentDraftIdRef.current === id) {
      currentDraftIdRef.current = null;
      form.reset({
        type: "send",
        senderName: "",
        item: "",
        subType: "",
        deliveryPerson: "",
        labName: "",
        patientName: "",
        appointmentStatus: undefined,
        productPhotos: [],
        documentType: "None",
        billAmount: "",
        remarks: "",
      });
    }
  };

  const [patients, setPatients] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  
  const [drafts, setDrafts] = useState<any[]>([]);
  const currentDraftIdRef = useRef<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('send_drafts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setDrafts(parsed);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const subscription = form.watch((value) => {
      const hasData = value.patientName || value.item || value.labName || value.remarks || value.deliveryPerson;
      if (hasData) {
        const saved = localStorage.getItem('send_drafts');
        let currentDrafts = [];
        try { if (saved) currentDrafts = JSON.parse(saved); } catch (e) {}
        
        let id = currentDraftIdRef.current;
        if (!id) {
          id = Date.now().toString();
          currentDraftIdRef.current = id;
        }

        const draftIndex = currentDrafts.findIndex((d: any) => d.id === id);
        const newDraft = {
          id,
          updatedAt: Date.now(),
          data: {
            senderName: value.senderName,
            item: value.item,
            deliveryPerson: value.deliveryPerson,
            labName: value.labName,
            patientName: value.patientName,
            appointmentStatus: value.appointmentStatus,
            remarks: value.remarks,
          }
        };

        if (draftIndex >= 0) {
          currentDrafts[draftIndex] = newDraft;
        } else {
          currentDrafts.unshift(newDraft);
        }
        
        currentDrafts.sort((a: any, b: any) => b.updatedAt - a.updatedAt);
        currentDrafts = currentDrafts.slice(0, 10);
        
        localStorage.setItem('send_drafts', JSON.stringify(currentDrafts));
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const loadDraft = (id: string) => {
    const draft = drafts.find(d => d.id === id);
    if (draft) {
      form.reset({ ...form.getValues(), ...draft.data });
      currentDraftIdRef.current = id;
      toast({ title: "Draft Loaded", description: "Form populated with draft data." });
    }
  };

  const clearCurrentDraft = () => {
    if (currentDraftIdRef.current) {
      const saved = localStorage.getItem('send_drafts');
      let currentDrafts = [];
      try { if (saved) currentDrafts = JSON.parse(saved); } catch (e) {}
      const newDrafts = currentDrafts.filter((d: any) => d.id !== currentDraftIdRef.current);
      localStorage.setItem('send_drafts', JSON.stringify(newDrafts));
      setDrafts(newDrafts);
    }
    currentDraftIdRef.current = null;
    form.reset({
      type: "send",
      senderName: "",
      item: "",
      deliveryPerson: "",
      labName: "",
      patientName: "",
      appointmentStatus: undefined,
      productPhotos: [],
      remarks: "",
    });
  };

  const handleOpenDrafts = () => {
    const saved = localStorage.getItem('send_drafts');
    if (saved) {
       try { setDrafts(JSON.parse(saved)); } catch (e) {}
    }
  };

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    async function loadEntities() {
        try {
            const [labsData, patientsData, templatesData] = await Promise.all([
                fetchEntitiesAction('labs'),
                fetchEntitiesAction('patients'),
                fetchEntitiesAction('templates')
            ]);
            setLabs(labsData as Lab[]);
            setPatients(patientsData as any[]);
            setTemplates(templatesData as any[]);
        } catch (error) {
            console.error("Failed to load entities:", error);
        } finally {
            setIsLoadingLabs(false);
        }
    }
    loadEntities();
    
    return () => clearInterval(timer);
  }, []);

  // Derived data
  const allServices = useMemo(() => {
    const services = new Set<string>();
    labs.forEach(lab => {
      lab.services?.forEach(s => {
        if (s.name) services.add(s.name.trim());
      });
    });
    return Array.from(services).sort();
  }, [labs]);

  const selectedService = form.watch("item");
  const selectedSubType = form.watch("subType");
  const availableLabs = useMemo(() => {
    if (!selectedService) return [];
    return labs.filter(lab => lab.services?.some(s => s.name === selectedService));
  }, [labs, selectedService]);

  const selectedLabName = form.watch("labName");
  const appointmentStatus = form.watch("appointmentStatus");
  const documentType = form.watch("documentType");

  // Collect available sub-types for the selected service across all labs
  const availableSubTypes = useMemo(() => {
    if (!selectedService) return [];
    const subTypeMap = new Map<string, string>();
    labs.forEach(lab => {
      lab.services?.forEach(s => {
        if (s.name === selectedService && s.subTypes) {
          s.subTypes.forEach(st => {
            if (st.name && !subTypeMap.has(st.name)) {
              subTypeMap.set(st.name, st.price || '');
            }
          });
        }
      });
    });
    return Array.from(subTypeMap.entries()).map(([name, price]) => ({ name, price }));
  }, [labs, selectedService]);

  const selectedPrice = useMemo(() => {
    if (!selectedLabName || !selectedService) return null;
    const lab = labs.find(l => l.name === selectedLabName);
    const service = lab?.services?.find(s => s.name === selectedService);
    // If a sub-type is selected, use the sub-type's price from this lab's service
    if (selectedSubType && service?.subTypes) {
      const st = service.subTypes.find(st => st.name === selectedSubType);
      if (st?.price) return st.price;
    }
    return service?.price;
  }, [labs, selectedLabName, selectedService, selectedSubType]);

  const selectedTat = useMemo(() => {
    if (!selectedLabName || !selectedService) return null;
    const lab = labs.find(l => l.name === selectedLabName);
    return lab?.services?.find(s => s.name === selectedService)?.tat;
  }, [labs, selectedLabName, selectedService]);

  // Reset subType when service changes
  useEffect(() => {
    form.setValue('subType', '');
  }, [selectedService]);

  useEffect(() => {
      form.setValue('servicePrice', selectedPrice ? String(selectedPrice) : '');
      form.setValue('tat', selectedTat ? String(selectedTat) : '');
  }, [selectedPrice, selectedTat, form]);

  const selectedPatientName = form.watch("patientName");
  
  const patientReceivedRecords = useMemo(() => {
    if (!selectedPatientName) return [];
    return receivedRecords.filter(r => r.patientName === selectedPatientName);
  }, [receivedRecords, selectedPatientName]);

  const handleReceivedRecordSelect = (id: string) => {
    if (id === "none") {
        setSelectedReceivedId(null);
        form.setValue("item", "");
        form.setValue("labName", "");
        return;
    }

    const record = receivedRecords.find(r => r.id === id);
    if (record) {
        setSelectedReceivedId(id);
        form.setValue("item", record.item);
        form.setValue("labName", record.labName);
        toast({
            title: "Record Linked",
            description: `Auto-filled details for ${record.patientName}`,
        });
    }
  };

  const handleCapture = (file: File) => {
    if (cameraType === 'selfie') {
      setSelfieFile(file);
      setSelfiePreview(URL.createObjectURL(file));
      form.setValue("senderSelfie", file, { shouldValidate: true });
    } else if (cameraType === 'product') {
      const newFiles = [...productFiles, file];
      setProductFiles([...productFiles, file]);
      setProductPreviews([...productPreviews, { url: URL.createObjectURL(file), type: file.type }]);
      form.setValue("productPhotos", newFiles, { shouldValidate: true });
    } else if (cameraType === 'delivery') {
      setDeliveryFile(file);
      setDeliveryPreview(URL.createObjectURL(file));
      form.setValue("deliveryPersonPhoto", file, { shouldValidate: true });
    } else if (cameraType === 'bill') {
      setBillFile(file);
      setBillPreview(URL.createObjectURL(file));
      form.setValue("billPhoto", file, { shouldValidate: true });
    }
    setIsCameraOpen(false);
  };

  const triggerUpload = (type: 'selfie' | 'product' | 'delivery' | 'bill') => {
    setUploadType(type);
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (uploadType === 'product') {
        const fileArray = Array.from(files);
        const newFiles = [...productFiles, ...fileArray];
        const newPreviews = [...productPreviews, ...fileArray.map(f => ({ url: URL.createObjectURL(f), type: f.type }))];
        setProductFiles(newFiles);
        setProductPreviews(newPreviews);
        form.setValue("productPhotos", newFiles, { shouldValidate: true });
      } else {
        const file = files[0];
        if (uploadType === 'selfie') {
          setSelfieFile(file);
          setSelfiePreview(URL.createObjectURL(file));
          form.setValue("senderSelfie", file, { shouldValidate: true });
        } else if (uploadType === 'delivery') {
          setDeliveryFile(file);
          setDeliveryPreview(URL.createObjectURL(file));
          form.setValue("deliveryPersonPhoto", file, { shouldValidate: true });
        } else if (uploadType === 'bill') {
          setBillFile(file);
          setBillPreview(URL.createObjectURL(file));
          form.setValue("billPhoto", file, { shouldValidate: true });
        }
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeProductPhoto = (index: number) => {
    const newFiles = productFiles.filter((_, i) => i !== index);
    const newPreviews = productPreviews.filter((_, i) => i !== index);
    setProductFiles(newFiles);
    setProductPreviews(newPreviews);
    form.setValue("productPhotos", newFiles, { shouldValidate: true });
  };

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate = ["patientName", "item"];
    if (step === 2) fieldsToValidate = ["labName"];
    if (step === 3) fieldsToValidate = ["senderSelfie", "productPhotos"];

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const onSubmit = async (data: SendFormValues) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("type", "send");
      formData.append("senderName", data.senderName);
      formData.append("item", data.item);
      formData.append("deliveryPerson", data.deliveryPerson || "");
      formData.append("labName", data.labName);
      formData.append("patientName", data.patientName);
      formData.append("approvalStatus", "Pending");
      if (user?.email) {
          formData.append("senderEmail", user.email);
      }
      
      if (data.appointmentDate) {
        formData.append("appointmentDate", data.appointmentDate.toISOString());
      }

      if (sendType === 'resend' && selectedReceivedId) {
        formData.append("linkedRecordId", selectedReceivedId);
      }
      
      if (selfieFile) formData.append("senderSelfie", selfieFile);
      if (deliveryFile) formData.append("deliveryPersonPhoto", deliveryFile);
      productFiles.forEach((file) => formData.append("productPhotos", file));
      
      // Add price and tat info
      if (data.servicePrice) formData.append("servicePrice", data.servicePrice);
      if (data.tat) formData.append("tat", data.tat);
      
      if (data.remarks) formData.append("remarks", data.remarks);
      if (data.subType) formData.append("subType", data.subType);

      const result = await sendSubmissionAction({}, formData);

      if (result?.message && !result?.errors) {
        toast({ title: "Success!", description: result.message });
        form.reset();
        setStep(1);
        setSelfiePreview(null);
        setSelfieFile(null);
        setProductPreviews([]);
        setProductFiles([]);
        setDeliveryPreview(null);
        setDeliveryFile(null);
        setSelectedReceivedId(null);

        // Remove the current draft on success
        if (currentDraftIdRef.current) {
            const saved = localStorage.getItem('send_drafts');
            let currentDrafts = [];
            try { if (saved) currentDrafts = JSON.parse(saved); } catch (e) {}
            const newDrafts = currentDrafts.filter((d: any) => d.id !== currentDraftIdRef.current);
            localStorage.setItem('send_drafts', JSON.stringify(newDrafts));
            setDrafts(newDrafts);
            currentDraftIdRef.current = null;
        }
      } else if (result?.errors) {
        const errorMessages = Object.entries(result.errors)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
          .join("\n");
        toast({ 
          title: "Validation Error", 
          description: errorMessages, 
          variant: "destructive" 
        });

        // Navigate to the step containing the first error
        const firstErrorKey = Object.keys(result.errors)[0];
        const step1Fields = ["patientName", "item"];
        const step2Fields = ["labName"];
        const step3Fields = ["senderSelfie", "productPhotos"];
        const step4Fields = ["deliveryPersonPhoto", "billPhoto"];

        if (step1Fields.includes(firstErrorKey)) setStep(1);
        else if (step2Fields.includes(firstErrorKey)) setStep(2);
        else if (step3Fields.includes(firstErrorKey)) setStep(3);
        else if (step4Fields.includes(firstErrorKey)) setStep(4);
      } else if (result?.message) {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Submission failed.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-4 px-2 sm:px-0 relative">
      <div className="flex justify-end mb-4">
        <DropdownMenu onOpenChange={(open) => { if (open) handleOpenDrafts(); }}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 rounded-xl text-muted-foreground hover:text-primary">
              <FileEdit className="w-4 h-4" />
              Drafts {drafts.length > 0 && `(${drafts.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 rounded-xl p-2">
            {drafts.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No saved drafts</div>
            ) : (
              drafts.map((draft) => (
                <div key={draft.id} className="flex items-center gap-1 group">
                  <DropdownMenuItem onClick={() => loadDraft(draft.id)} className="cursor-pointer flex-1 flex flex-col items-start gap-1 p-3 rounded-lg focus:bg-muted">
                    <span className="font-bold text-sm truncate w-full text-foreground">
                      {draft.data.patientName || 'Unknown Patient'} {draft.data.item ? `(${draft.data.item})` : ''}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                      {format(new Date(draft.updatedAt), 'MMM d, h:mm a')}
                    </span>
                  </DropdownMenuItem>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive/50 hover:text-destructive hover:bg-destructive/10 h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteSpecificDraft(draft.id); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-12">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-between px-2 mb-8">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                    <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-500",
                        step === i ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110" : 
                        step > i ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                        {step > i ? <UserCheck className="w-5 h-5" /> : i}
                    </div>
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest", step === i ? "text-primary" : "text-muted-foreground")}>
                        {i === 1 ? 'Start' : i === 2 ? 'Lab' : i === 3 ? 'Photos' : 'Final'}
                    </span>
                </div>
            ))}
        </div>

        {/* Step 1: Patient & Service */}
        {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="glass-card p-6 rounded-3xl space-y-6">
                    <div className="flex bg-muted p-1 rounded-xl">
                        <button 
                            type="button" 
                            className={cn("flex-1 py-3 text-sm font-bold rounded-lg transition-all", sendType === 'new' ? "bg-background shadow text-primary" : "text-muted-foreground")}
                            onClick={() => { setSendType('new'); setSelectedReceivedId(null); }}
                        >
                            <span className="flex items-center justify-center gap-2"><Send className="w-4 h-4" /> Send New</span>
                        </button>
                        <button 
                            type="button" 
                            className={cn("flex-1 py-3 text-sm font-bold rounded-lg transition-all", sendType === 'resend' ? "bg-background shadow text-primary" : "text-muted-foreground")}
                            onClick={() => setSendType('resend')}
                        >
                            <span className="flex items-center justify-center gap-2"><Repeat className="w-4 h-4" /> Resend</span>
                        </button>
                    </div>

                    <h2 className="text-xl font-black flex items-center gap-2 mt-4">
                        <User className="w-5 h-5 text-primary" />
                        Patient Details
                    </h2>
                    <LocalCombobox 
                        form={form} 
                        name="patientName" 
                        label="Patient Name" 
                        options={patients.map(p => p.name)}
                        placeholder="Search or add new patient..."
                    />
                    
                    {sendType === 'resend' && (
                        <div className="space-y-4 p-4 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2">
                            <Label className="text-sm font-bold">Select Past Received Item</Label>
                            <Select onValueChange={handleReceivedRecordSelect} value={selectedReceivedId || "none"}>
                                <SelectTrigger className="h-12 rounded-xl bg-background border-none shadow-sm">
                                    <SelectValue placeholder={patientReceivedRecords.length > 0 ? "Select past received item..." : (selectedPatientName ? "No past records found for this patient." : "Enter patient name first")} />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl max-h-[250px]">
                                    <SelectItem value="none" className="rounded-xl font-bold text-muted-foreground">-- Select Item --</SelectItem>
                                    {patientReceivedRecords.map(record => (
                                        <SelectItem key={record.id} value={record.id} className="rounded-xl">
                                            <div className="flex flex-col gap-0.5 py-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-black">{record.item}</span>
                                                </div>
                                                <span className="text-[10px] text-muted-foreground italic">{record.labName} • Received {format(new Date(record.createdAt), 'PP')}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-4">
                        <LocalCombobox 
                            form={form} 
                            name="item" 
                            label="Service / Product Needed" 
                            options={allServices} 
                            placeholder="What are we sending?" 
                        />

                        {/* Sub-Type Selector */}
                        {availableSubTypes.length > 0 && (
                            <FormField
                                control={form.control}
                                name="subType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Sub Type</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ""}>
                                            <FormControl>
                                                <SelectTrigger className="h-12 rounded-xl bg-background/50 border-none shadow-inner">
                                                    <SelectValue placeholder="Select sub-type..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                                <SelectItem value="none" className="rounded-lg text-muted-foreground">None (Base Service)</SelectItem>
                                                {availableSubTypes.map((st) => (
                                                    <SelectItem key={st.name} value={st.name} className="rounded-lg cursor-pointer">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold">{st.name}</span>
                                                            {st.price && <span className="text-primary font-black">₹{st.price}</span>}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                        )}
                    </div>
                </div>
                <Button type="button" onClick={nextStep} className="w-full h-14 rounded-2xl font-black text-lg gap-2 shadow-xl shadow-primary/20">
                    Next Step <ChevronRight className="w-5 h-5" />
                </Button>
            </div>
        )}

        {/* Step 2: Lab & Price */}
        {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="glass-card p-6 rounded-3xl space-y-6">
                    <h2 className="text-xl font-black flex items-center gap-2">
                        <FlaskConical className="w-5 h-5 text-primary" />
                        Select Lab
                    </h2>
                    
                    <LabSelector 
                        form={form} 
                        name="labName" 
                        label="Lab / Person" 
                        labs={labs}
                        selectedService={selectedService}
                    />

                    {selectedLabName && selectedService && (
                        <div className="flex flex-col gap-4 mt-6">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="servicePrice"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Service Price (₹) <span className="opacity-50">(Optional)</span></FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="Enter price" {...field} className="h-12 rounded-xl bg-background/50 font-bold text-lg" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="tat"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Turn Around Time (Days) <span className="opacity-50">(Optional)</span></FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="e.g., 2" {...field} className="h-12 rounded-xl bg-background/50 font-bold text-lg" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Button type="button" variant="ghost" onClick={prevStep} className="h-14 rounded-2xl font-bold gap-2">
                        <ChevronLeft className="w-5 h-5" /> Back
                    </Button>
                    <Button type="button" onClick={nextStep} className="h-14 rounded-2xl font-black text-lg gap-2 shadow-xl shadow-primary/20">
                        Next <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>
            </div>
        )}

        {/* Step 3: Photos */}
        {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                {/* Sender & Selfie Section */}
                <div className="glass-card p-6 rounded-3xl space-y-6 border-l-4 border-l-primary">
                    <h2 className="text-xl font-black flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-primary" />
                        Staff Verification
                    </h2>
                    
                    <FormField
                        control={form.control}
                        name="senderName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-bold">Select Staff Member</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl bg-background/50 border-none shadow-inner">
                                            <SelectValue placeholder="Who is sending this?" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="rounded-xl border-none shadow-2xl">
                                        {users.map((u, idx) => (
                                            <SelectItem key={u.id || idx} value={u.fullName} className="rounded-lg cursor-pointer">
                                                <div className="flex flex-col text-left">
                                                    <span className="font-bold">{u.fullName}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="space-y-4">
                        <Label className="text-sm font-bold">Sender Selfie</Label>
                        <div className="relative aspect-square sm:aspect-video rounded-2xl bg-muted/30 overflow-hidden border-2 border-dashed border-primary/20 flex items-center justify-center">
                            {selfiePreview ? (
                                <Image src={selfiePreview} alt="Selfie" fill className="object-cover" />
                            ) : (
                                <div className="flex flex-row items-center justify-center gap-2 sm:gap-4 w-full h-full p-2 sm:p-4">
                                    <Button type="button" variant="ghost" className="flex-1 flex flex-col gap-1 sm:gap-2 h-auto py-4 px-1 sm:py-6 sm:px-6 text-muted-foreground hover:text-primary transition-colors rounded-2xl bg-background/50 border border-transparent hover:border-primary/20 shadow-sm" onClick={() => { setCameraType('selfie'); setIsCameraOpen(true); }}>
                                        <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                                        <span className="font-bold text-[10px] sm:text-xs uppercase">Camera</span>
                                    </Button>
                                    <span className="text-muted-foreground font-medium text-[10px] sm:text-xs uppercase tracking-widest hidden sm:block">OR</span>
                                    <Button type="button" variant="ghost" className="flex-1 flex flex-col gap-1 sm:gap-2 h-auto py-4 px-1 sm:py-6 sm:px-6 text-muted-foreground hover:text-primary transition-colors rounded-2xl bg-background/50 border border-transparent hover:border-primary/20 shadow-sm" onClick={() => triggerUpload('selfie')}>
                                        <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                                        <span className="font-bold text-[10px] sm:text-xs uppercase">Upload</span>
                                    </Button>
                                </div>
                            )}
                            {selfiePreview && (
                                <button type="button" onClick={() => { setSelfiePreview(null); setSelfieFile(null); }} className="absolute top-2 right-2 w-7 h-7 bg-background/50 text-white rounded-full flex items-center justify-center backdrop-blur-md">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {form.formState.errors.senderSelfie && <p className="text-xs text-destructive font-bold text-center mt-2 uppercase tracking-tight">{form.formState.errors.senderSelfie.message as string}</p>}
                    </div>
                </div>

                {/* Product Photos */}
                <div className="glass-card p-6 rounded-3xl space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-black flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary" />
                            Product Media
                        </h2>
                        <div className="flex gap-2">
                            <Button type="button" size="sm" variant="outline" className="rounded-xl h-8 gap-1 font-bold text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => triggerUpload('product')}>
                                <Upload className="w-4 h-4" /> Upload
                            </Button>
                            <Button type="button" size="sm" variant="outline" className="rounded-xl h-8 gap-1 font-bold text-primary border-primary/20 hover:bg-primary/5" onClick={() => { setCameraType('product'); setIsCameraOpen(true); }}>
                                <Camera className="w-4 h-4" /> Capture
                            </Button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        {productPreviews.map((preview, i) => (
                            <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group bg-black/5">
                                {preview.type.startsWith('video/') ? (
                                    <video src={preview.url} className="object-cover w-full h-full" controls playsInline />
                                ) : (
                                    <Image src={preview.url} alt={`Product ${i+1}`} fill className="object-cover" />
                                )}
                                <button type="button" onClick={() => removeProductPhoto(i)} className="absolute top-2 right-2 w-7 h-7 bg-destructive text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {productPreviews.length === 0 && (
                            <div className="col-span-2 py-12 border-2 border-dashed border-muted rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                <ImageIcon className="w-8 h-8 opacity-20" />
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">At least 1 photo/video required</span>
                            </div>
                        )}
                    </div>
                    {form.formState.errors.productPhotos && <p className="text-xs text-destructive font-bold">{form.formState.errors.productPhotos.message as string}</p>}
                </div>

                {/* Instructions / Remarks */}
                <FormField
                    control={form.control}
                    name="remarks"
                    render={({ field }) => (
                        <FormItem className="glass-card p-6 rounded-3xl space-y-4">
                            <FormLabel className="text-lg font-black flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <FileEdit className="w-5 h-5 text-primary" />
                                    Instructions
                                </div>
                                {templates.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {templates.map(t => (
                                            <Badge 
                                                key={t.id}
                                                variant="outline"
                                                className="cursor-pointer font-medium hover:bg-primary/10 transition-colors bg-background"
                                                onClick={() => {
                                                    const current = form.getValues("remarks") || "";
                                                    form.setValue("remarks", current ? `${current}\n${t.text}` : t.text, { shouldValidate: true });
                                                }}
                                            >
                                                {t.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </FormLabel>
                            <FormControl>
                                <Textarea 
                                    placeholder="Enter any specific instructions or remarks..." 
                                    className="min-h-[100px] resize-none rounded-2xl bg-background/50 border-none shadow-inner p-4" 
                                    {...field} 
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Delivery Photo */}
                <div className="glass-card p-6 rounded-3xl space-y-4">
                    <h2 className="text-lg font-black flex items-center gap-2">
                        <Truck className="w-5 h-5 text-primary" />
                        Delivery Person Photo
                    </h2>
                    <div className="relative aspect-square sm:aspect-video rounded-2xl bg-muted/30 overflow-hidden border-2 border-dashed border-primary/20 flex items-center justify-center">
                        {deliveryPreview ? (
                            <Image src={deliveryPreview} alt="Delivery" fill className="object-cover" />
                        ) : (
                            <div className="flex flex-row items-center justify-center gap-2 sm:gap-4 w-full h-full p-2 sm:p-4">
                                <Button type="button" variant="ghost" className="flex-1 flex flex-col gap-1 sm:gap-2 h-auto py-4 px-1 sm:py-6 sm:px-6 text-muted-foreground hover:text-primary transition-colors rounded-2xl bg-background/50 border border-transparent hover:border-primary/20 shadow-sm" onClick={() => { setCameraType('delivery'); setIsCameraOpen(true); }}>
                                    <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                                    <span className="font-bold text-[10px] sm:text-xs uppercase">Camera</span>
                                </Button>
                                <span className="text-muted-foreground font-medium text-[10px] sm:text-xs uppercase tracking-widest hidden sm:block">OR</span>
                                <Button type="button" variant="ghost" className="flex-1 flex flex-col gap-1 sm:gap-2 h-auto py-4 px-1 sm:py-6 sm:px-6 text-muted-foreground hover:text-primary transition-colors rounded-2xl bg-background/50 border border-transparent hover:border-primary/20 shadow-sm" onClick={() => triggerUpload('delivery')}>
                                    <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                                    <span className="font-bold text-[10px] sm:text-xs uppercase">Upload</span>
                                </Button>
                            </div>
                        )}
                        {deliveryPreview && (
                            <button type="button" onClick={() => { setDeliveryPreview(null); setDeliveryFile(null); }} className="absolute top-2 right-2 w-7 h-7 bg-background/50 text-white rounded-full flex items-center justify-center backdrop-blur-md">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Button type="button" variant="ghost" onClick={prevStep} className="h-14 rounded-2xl font-bold gap-2">
                        <ChevronLeft className="w-5 h-5" /> Back
                    </Button>
                    <Button type="button" onClick={nextStep} className="h-14 rounded-2xl font-black text-lg gap-2 shadow-xl shadow-primary/20">
                        Next <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>
            </div>
        )}

        {/* Step 4: Final Details */}
        {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="glass-card p-6 rounded-3xl space-y-6">
                    <h2 className="text-xl font-black flex items-center gap-2">
                        <Send className="w-5 h-5 text-primary" />
                        Final Logistics
                    </h2>

                    <FormField
                        control={form.control}
                        name="deliveryPerson"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="font-bold">Delivery Person / Service</FormLabel>
                            <FormControl>
                                <Input placeholder="Courier name, staff, etc." {...field} className="h-12 rounded-xl bg-background/50" />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex flex-col gap-3 mt-8">
                    <div className="grid grid-cols-2 gap-4">
                        <Button type="button" variant="ghost" onClick={prevStep} className="h-14 rounded-2xl font-bold gap-2">
                            <ChevronLeft className="w-5 h-5" /> Back
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="h-14 rounded-2xl font-black text-lg gap-2 shadow-xl shadow-primary/20">
                            {isSubmitting ? "Sending..." : "Confirm & Send"}
                            <Send className="w-5 h-5" />
                        </Button>
                    </div>
                    <Button type="button" variant="ghost" onClick={clearCurrentDraft} className="w-full h-12 rounded-xl font-bold text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4 mr-2" /> Discard Form
                    </Button>
                </div>
            </div>
        )}

        <CameraModal
            isOpen={isCameraOpen}
            onClose={() => setIsCameraOpen(false)}
            onCapture={handleCapture}
        />
        
        {/* Hidden File Input */}
        <input 
            type="file" 
            accept={uploadType === 'product' ? "image/*,video/*" : "image/*"} 
            multiple={uploadType === 'product'} 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
        />
      </form>
    </Form>
    </div>
  );
}
