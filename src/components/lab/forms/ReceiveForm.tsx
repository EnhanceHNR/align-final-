"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { receiveSchemaClient } from "@/lib/schemas";
import { receiveSubmissionAction } from "@/app/dashboard/lab/actions";
import { useEffect, useState, useRef, useMemo } from "react";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { AutocompleteInput } from "./AutocompleteInput";
import { LocalCombobox } from "./LocalCombobox";
import { LabSelector } from "./LabSelector";
import { cn } from "@/lib/utils";
import { api } from "~/trpc/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Archive, Image as ImageIcon, Clock, Camera, CalendarIcon, X, User, FlaskConical, Check, ChevronRight, UserCheck, Package, Truck, Upload, AlertCircle, FileEdit, Trash2, Plus } from "lucide-react";
import { CameraModal } from "../CameraModal";
import { Label } from "@/components/ui/label";
import { Submission } from "@/lib/types";

type ReceiveFormValues = z.infer<typeof receiveSchemaClient>;

type ReceiveFormProps = {
  users?: { id: string; fullName: string; email: string }[];
  sentRecords?: Submission[];
};

export function ReceiveForm({ users = [], sentRecords = [] }: ReceiveFormProps) {
  const { toast } = useToast();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraType, setCameraType] = useState<'selfie' | 'verification' | 'delivery' | 'bill'>('selfie');
  const [uploadType, setUploadType] = useState<'selfie' | 'verification' | 'delivery' | 'bill'>('selfie');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [verificationPreviews, setVerificationPreviews] = useState<string[]>([]);
  const [deliveryPreview, setDeliveryPreview] = useState<string | null>(null);
    
  // Files
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [verificationFiles, setVerificationFiles] = useState<File[]>([]);
  const [deliveryFile, setDeliveryFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<{ id: string; type: 'Challan'|'Bill'; amount: string; file?: File; preview?: string }[]>([]);
  
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSentId, setSelectedSentId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const form = useForm<ReceiveFormValues>({
    resolver: zodResolver(receiveSchemaClient),
    defaultValues: {
      type: "receive",
      receiverName: "",
      receiverSelfie: null,
      item: "",
      subType: "",
      deliveryPerson: "",
      deliveryPersonPhoto: null,
      labName: "",
      patientName: "",
      photo: [],
      appointmentStatus: undefined,
    },
  });

  
  const appointmentStatus = form.watch('appointmentStatus');
  const patientName = form.watch('patientName');

  const [labs, setLabs] = useState<any[]>([]);

  const [patients, setPatients] = useState<any[]>([]);

  const { data: trpcLabs, isLoading: isLoadingLabsQuery } = api.labs.listLabs.useQuery();
  const { data: trpcPatientsData, isLoading: isLoadingPatientsQuery } = api.patients.list.useQuery({ perPage: 1000 });
  const { data: trpcTemplates, isLoading: isLoadingTemplatesQuery } = api.labs.listTemplates.useQuery();

  const selectedPatientId = useMemo(() => patients.find(p => p.fullName === patientName)?.id, [patients, patientName]);
  
  const { data: patientAppointments } = api.appointment.list.useQuery(
      { patientId: selectedPatientId, status: "SCHEDULED" },
      { enabled: !!selectedPatientId }
  );

  const [templates, setTemplates] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const currentDraftIdRef = useRef<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('receive_drafts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setDrafts(parsed);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    form.register("receiverSelfie");
    form.register("photo");
    form.register("deliveryPersonPhoto");
  }, [form.register]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      const hasData = value.patientName || value.item || value.labName || value.deliveryPerson;
      if (hasData) {
        const saved = localStorage.getItem('receive_drafts');
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
            receiverName: value.receiverName,
            item: value.item,
            deliveryPerson: value.deliveryPerson,
            labName: value.labName,
            patientName: value.patientName,
            appointmentStatus: value.appointmentStatus,
          }
        };

        if (draftIndex >= 0) {
          currentDrafts[draftIndex] = newDraft;
        } else {
          currentDrafts.unshift(newDraft);
        }
        
        currentDrafts.sort((a: any, b: any) => b.updatedAt - a.updatedAt);
        currentDrafts = currentDrafts.slice(0, 10);
        
        localStorage.setItem('receive_drafts', JSON.stringify(currentDrafts));
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
      const saved = localStorage.getItem('receive_drafts');
      let currentDrafts = [];
      try { if (saved) currentDrafts = JSON.parse(saved); } catch (e) {}
      const newDrafts = currentDrafts.filter((d: any) => d.id !== currentDraftIdRef.current);
      localStorage.setItem('receive_drafts', JSON.stringify(newDrafts));
      setDrafts(newDrafts);
    }
    currentDraftIdRef.current = null;
    form.reset({
      type: "receive",
      receiverName: "",
      item: "",
      subType: "",
      deliveryPerson: "",
      labName: "",
      patientName: "",
      photo: [],
      appointmentStatus: undefined,
    });
  };

  const deleteSpecificDraft = (id: string) => {
    const saved = localStorage.getItem('receive_drafts');
    let currentDrafts = [];
    try { if (saved) currentDrafts = JSON.parse(saved); } catch (e) {}
    const newDrafts = currentDrafts.filter((d: any) => d.id !== id);
    localStorage.setItem('receive_drafts', JSON.stringify(newDrafts));
    setDrafts(newDrafts);
    
    if (currentDraftIdRef.current === id) {
      currentDraftIdRef.current = null;
      form.reset({
        type: "receive",
        receiverName: "",
        item: "",
        subType: "",
        deliveryPerson: "",
        labName: "",
        patientName: "",
        photo: [],
        appointmentStatus: undefined,
      });
    }
  };

  const handleOpenDrafts = () => {
    const saved = localStorage.getItem('receive_drafts');
    if (saved) {
       try { setDrafts(JSON.parse(saved)); } catch (e) {}
    }
  };

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (trpcLabs) setLabs(trpcLabs as any);
    if (trpcPatientsData?.patients) setPatients(trpcPatientsData.patients.map(p => ({ ...p, name: p.fullName })));
    if (trpcTemplates) setTemplates(trpcTemplates as any[]);
  }, [trpcLabs, trpcPatientsData, trpcTemplates]);

  const allServices = useMemo(() => {
    const services = new Set<string>();
    labs.forEach(lab => {
      lab.services?.forEach((s: any) => services.add(s.name));
    });
    return Array.from(services).sort();
  }, [labs]);

  const selectedItem = form.watch("item");

  // Collect available sub-types for the selected service across all labs
  const availableSubTypes = useMemo(() => {
    if (!selectedItem) return [];
    const subTypeMap = new Map<string, string>();
    labs.forEach(lab => {
      lab.services?.forEach((s: any) => {
        if (s.name === selectedItem && s.subTypes) {
          s.subTypes.forEach((st: any) => {
            if (st.name && !subTypeMap.has(st.name)) {
              subTypeMap.set(st.name, st.price || '');
            }
          });
        }
      });
    });
    return Array.from(subTypeMap.entries()).map(([name, price]) => ({ name, price }));
  }, [labs, selectedItem]);

  // Reset subType when service changes
  useEffect(() => {
    form.setValue('subType', '');
  }, [selectedItem]);

  const handleCapture = (file: File) => {
    if (cameraType === 'selfie') {
        setSelfieFile(file);
        setSelfiePreview(URL.createObjectURL(file));
        form.setValue("receiverSelfie", file, { shouldValidate: true });
    } else if (cameraType === 'verification') {
        const newFiles = [...verificationFiles, file];
        setVerificationFiles(newFiles);
        setVerificationPreviews([...verificationPreviews, URL.createObjectURL(file)]);
        form.setValue("photo", newFiles, { shouldValidate: true });
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

  const triggerUpload = (type: 'selfie' | 'verification' | 'delivery' | 'bill') => {
    setUploadType(type);
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (uploadType === 'verification') {
        const fileArray = Array.from(files);
        const newFiles = [...verificationFiles, ...fileArray];
        const newPreviews = [...verificationPreviews, ...fileArray.map(f => URL.createObjectURL(f))];
        setVerificationFiles(newFiles);
        setVerificationPreviews(newPreviews);
        form.setValue("photo", newFiles, { shouldValidate: true });
      } else {
        const file = files[0];
        if (uploadType === 'selfie') {
          setSelfieFile(file);
          setSelfiePreview(URL.createObjectURL(file));
          form.setValue("receiverSelfie", file, { shouldValidate: true });
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

  const removeVerificationPhoto = (index: number) => {
    const newFiles = verificationFiles.filter((_, i) => i !== index);
    const newPreviews = verificationPreviews.filter((_, i) => i !== index);
    setVerificationFiles(newFiles);
    setVerificationPreviews(newPreviews);
    form.setValue("photo", newFiles, { shouldValidate: true });
  };

  const handleSentRecordSelect = (id: string) => {
    if (id === "none") {
        setSelectedSentId(null);
        form.reset({
            ...form.getValues(),
            item: "",
            labName: "",
            patientName: "",
            hasBill: false,
            billAmount: ""
        });
        return;
    }

    const record = sentRecords.find(r => r.id === id);
    if (record) {
        setSelectedSentId(id);
        form.setValue("item", record.item);
        form.setValue("labName", record.labName);
        form.setValue("patientName", record.patientName);
        
        setDocuments([]); // Reset documents when selecting a new record

        toast({
            title: "Record Linked",
            description: `Auto-filled details for ${record.patientName}`,
        });
    }
  };

  useEffect(() => {
    const id = searchParams.get("id");
    if (id && selectedSentId !== id && sentRecords.some(r => r.id === id)) {
        handleSentRecordSelect(id);
    }
  }, [searchParams, sentRecords, selectedSentId]);

  const onSubmit = async (data: ReceiveFormValues) => {
    let hasFileError = false;
    
    if (!selfieFile) {
        form.setError("receiverSelfie", { type: "manual", message: "Receiver selfie is required." });
        hasFileError = true;
    } else {
        form.clearErrors("receiverSelfie");
    }
    
    if (verificationFiles.length === 0) {
        form.setError("photo", { type: "manual", message: "At least one verification photo is required." });
        hasFileError = true;
    } else {
        form.clearErrors("photo");
    }
    
    if (hasFileError) {
        toast({ title: "Validation Error", description: "Please upload required photos.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("type", "receive");
      formData.append("receiverName", data.receiverName);
      formData.append("item", data.item);
      formData.append("deliveryPerson", data.deliveryPerson || "");
      formData.append("labName", data.labName);
      formData.append("patientName", data.patientName);
      
      if (selectedSentId) {
        formData.append("linkedRecordId", selectedSentId);
      }
      
      if (selfieFile) {
        formData.append("receiverSelfie", selfieFile);
      }
      
      verificationFiles.forEach((file) => formData.append("photo", file));
      
      if (deliveryFile) {
        formData.append("deliveryPersonPhoto", deliveryFile);
      }
      
      const docsToSave = documents.map(doc => ({
        type: doc.type,
        amount: doc.amount,
        hasFile: !!doc.file
      }));
      formData.append("documentsMeta", JSON.stringify(docsToSave));
      documents.forEach((doc, idx) => {
        if (doc.file) {
          formData.append(`documentFile_${idx}`, doc.file);
        }
      });
      
      if (data.appointmentStatus) {
        formData.append("appointmentStatus", data.appointmentStatus);
      }
      
      if (data.appointmentDate) {
        formData.append("appointmentDate", data.appointmentDate.toISOString());
      }
      
      if (data.remarks) formData.append("remarks", data.remarks);
      if (data.subType) formData.append("subType", data.subType);

      const result = await receiveSubmissionAction({}, formData);

      if (result?.message && !result?.errors) {
        toast({ title: "Success!", description: result.message });
        form.reset();
        setSelfieFile(null);
        setSelfiePreview(null);
        setVerificationFiles([]);
        setVerificationPreviews([]);
        setDeliveryFile(null);
        setDeliveryPreview(null);
        setBillFile(null);
        setBillPreview(null);
        setDeliveryFile(null);
        setSelectedSentId(null);
        
        if (currentDraftIdRef.current) {
            const saved = localStorage.getItem('receive_drafts');
            let currentDrafts = [];
            try { if (saved) currentDrafts = JSON.parse(saved); } catch (e) {}
            const newDrafts = currentDrafts.filter((d: any) => d.id !== currentDraftIdRef.current);
            localStorage.setItem('receive_drafts', JSON.stringify(newDrafts));
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
      } else if (result?.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
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

        {/* Staff Verification Section */}
        <div className="glass-card p-6 rounded-3xl space-y-6 border-l-4 border-l-primary">
            <h2 className="text-xl font-black flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                Staff Verification
            </h2>
            
            <FormField
              control={form.control}
              name="receiverName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Select Receiver</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-2xl bg-background/50 border-none shadow-inner">
                        <SelectValue placeholder="Who is receiving this?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      {users.map((u, idx) => (
                        <SelectItem key={u.id || idx} value={u.fullName} className="rounded-xl">
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
                <Label className="text-sm font-bold">Receiver Selfie</Label>
                <div className="relative aspect-square sm:aspect-video rounded-2xl bg-muted/30 overflow-hidden border-2 border-dashed border-primary/20 flex items-center justify-center">
                    {selfiePreview ? (
                        <Image src={selfiePreview} alt="Selfie" fill className="object-cover" />
                    ) : (
                        <div className="flex flex-row items-center justify-center gap-2 w-full h-full p-4">
                            <Button type="button" variant="ghost" className="flex-1 flex flex-col gap-2 h-auto py-4 px-2 text-muted-foreground hover:text-primary transition-colors rounded-2xl bg-background/50 border border-transparent hover:border-primary/20 shadow-sm" onClick={() => { setCameraType('selfie'); setIsCameraOpen(true); }}>
                                <Camera className="w-8 h-8 text-primary" />
                                <span className="font-bold text-xs uppercase">Camera</span>
                            </Button>
                            <span className="text-muted-foreground font-medium text-xs uppercase tracking-widest hidden sm:block">OR</span>
                            <Button type="button" variant="ghost" className="flex-1 flex flex-col gap-2 h-auto py-4 px-2 text-muted-foreground hover:text-primary transition-colors rounded-2xl bg-background/50 border border-transparent hover:border-primary/20 shadow-sm" onClick={() => triggerUpload('selfie')}>
                                <Upload className="w-8 h-8 text-blue-500" />
                                <span className="font-bold text-xs uppercase">Upload</span>
                            </Button>
                        </div>
                    )}
                    {selfiePreview && (
                        <button type="button" onClick={() => { setSelfiePreview(null); setSelfieFile(null); }} className="absolute top-2 right-2 w-7 h-7 bg-background/50 text-white rounded-full flex items-center justify-center backdrop-blur-md">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                {form.formState.errors.receiverSelfie && (
                    <p className="text-[10px] font-black text-destructive uppercase text-center mt-2 tracking-tight">
                        {form.formState.errors.receiverSelfie.message as string}
                    </p>
                )}
            </div>
        </div>

        {/* Linked Sent Record Selection */}
        <div className="glass-card p-6 rounded-3xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-black flex items-center gap-2">
                    <Archive className="w-5 h-5 text-primary" />
                    Sent Records
                </h2>
                <Badge variant="outline" className="bg-primary/10 text-primary border-none font-bold uppercase tracking-widest text-[10px]">Optional Link</Badge>
            </div>
            <div className="space-y-4">
                <Label className="text-sm font-bold text-muted-foreground">Is this linked to a previously sent item?</Label>
                <Select onValueChange={handleSentRecordSelect} value={selectedSentId || "none"}>
                    <SelectTrigger className="h-14 rounded-2xl bg-background/50 border-none shadow-inner">
                        <SelectValue placeholder="Search sent records..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl max-h-[300px]">
                        <SelectItem value="none" className="rounded-xl font-bold text-muted-foreground">-- No Linked Record --</SelectItem>
                        {sentRecords.map(record => (
                            <SelectItem key={record.id} value={record.id} className="rounded-xl">
                                <div className="flex flex-col gap-0.5 py-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold">{record.patientName}</span>
                                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded uppercase font-black">{record.item}</span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground italic">{record.labName} • {format(new Date(record.createdAt), 'PP')}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {selectedSentId && (
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-700 rounded-2xl border border-green-500/20 animate-in fade-in slide-in-from-top-2">
                        <Check className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-tight">Record linked successfully. Fields locked.</span>
                    </div>
                )}
            </div>
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

        {/* Verification Photos (Multiple) */}
        <div className="glass-card p-6 rounded-3xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-black flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    Item Verification
                </h2>
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">{verificationFiles.length} Captured</span>
                    <Button type="button" size="sm" variant="outline" className="rounded-xl h-8 gap-1 font-bold text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => triggerUpload('verification')}>
                        <Upload className="w-4 h-4" /> Upload
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {verificationPreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-border/10 group">
                        <Image src={preview} alt={`Preview ${index}`} fill className="object-cover" />
                        <button 
                            type="button" 
                            onClick={() => removeVerificationPhoto(index)}
                            className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                
                <Button
                    type="button"
                    variant="outline"
                    className="aspect-square rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 flex flex-col gap-2 h-auto"
                    onClick={() => { setCameraType('verification'); setIsCameraOpen(true); }}
                >
                    <div className="p-4 bg-background rounded-2xl shadow-sm">
                        <Camera className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Add Photo</span>
                </Button>
            </div>
            
            {form.formState.errors.photo && (
                <p className="text-[10px] font-black text-destructive uppercase text-center mt-2">
                    {form.formState.errors.photo.message as string}
                </p>
            )}
        </div>

        {/* Case Details */}
        <div className="glass-card p-6 rounded-3xl space-y-6">
            <h2 className="text-xl font-black flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-primary" />
                Case Details
            </h2>
            
            <LocalCombobox
              form={form}
              name="item"
              label="Received Item"
              options={allServices}
              placeholder="e.g., Crown, Bridge, Denture"
              disabled={!!selectedSentId}
            />

            {/* Sub-Type Selector */}
            {availableSubTypes.length > 0 && (
                <FormField
                    control={form.control}
                    name="subType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Sub Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""} disabled={!!selectedSentId}>
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

            <LabSelector 
                form={form} 
                name="labName" 
                label="Receiving Lab/Person" 
                labs={labs}
                selectedService={form.watch("item")}
                disabled={!!selectedSentId}
            />
            
            <LocalCombobox 
                form={form} 
                name="patientName" 
                label="Patient Name" 
                options={patients.map(p => p.name)}
                placeholder="Search or add new patient..."
                disabled={!!selectedSentId}
            />
        </div>

        {/* Delivery Info */}
        <div className="glass-card p-6 rounded-3xl space-y-6">
            <h2 className="text-xl font-black flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                Delivery Info
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="deliveryPerson"
                    render={({ field }) => (
                        <FormItem className="flex-1">
                            <FormLabel className="font-bold">Delivery Person (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="Courier, Staff, etc." {...field} className="h-12 rounded-xl bg-background/50" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="space-y-2">
                    <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Delivery Photo</FormLabel>
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
            </div>
        </div>

        {/* Appointment Section */}
        <div className="glass-card p-6 rounded-3xl space-y-6">
            <FormField
                control={form.control}
                name="appointmentStatus"
                render={({ field }) => (
                    <FormItem className="p-3 bg-background/50 rounded-lg">
                        <div className="space-y-0.5 mb-3">
                            <FormLabel className="font-bold text-base">Patient Appointment</FormLabel>
                            <p className="text-xs text-muted-foreground font-medium">Was an appointment given for this patient?</p>
                        </div>
                        <Select onValueChange={field.onChange} value={field.value || "Appointment not given"}>
                            <FormControl>
                                <SelectTrigger className="h-12 rounded-xl bg-background border-none shadow-sm">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="Appointment given">Appointment given</SelectItem>
                                <SelectItem value="Appointment not given">Appointment not given</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {appointmentStatus === 'Appointment given' && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-4">
                    {patientAppointments?.items && patientAppointments.items.length > 0 && (
                        <div className="space-y-2">
                            <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Select Existing Appointment</Label>
                            <Select 
                                onValueChange={(val) => {
                                    if (val) form.setValue('appointmentDate', new Date(val));
                                }}
                            >
                                <SelectTrigger className="h-12 rounded-xl bg-background/50">
                                    <SelectValue placeholder="Choose an appointment..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {patientAppointments.items.map((appt) => (
                                        <SelectItem key={appt.id} value={appt.startTime.toISOString()}>
                                            {format(new Date(appt.startTime), 'MMM d, yyyy - h:mm a')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <FormField
                        control={form.control}
                        name="appointmentDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Custom Date & Time</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="datetime-local" 
                                        {...field} 
                                        value={field.value ? new Date(field.value.getTime() - field.value.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} 
                                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)} 
                                        className="h-12 rounded-xl bg-background/50 font-bold" 
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}
        </div>

        {/* Include Documents */}
        <div className="glass-card p-6 rounded-3xl space-y-6">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h2 className="text-xl font-black flex items-center gap-2">
                        <FileEdit className="w-5 h-5 text-primary" />
                        Include Documents
                    </h2>
                    <p className="text-xs text-muted-foreground font-medium mt-1">Add Challans or Bills for this case</p>
                </div>
                <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setDocuments([...documents, { id: Date.now().toString(), type: 'Challan', amount: '' }])}
                    className="rounded-xl h-9 gap-2 font-bold"
                >
                    <Plus className="w-4 h-4" /> Add Bill/Challan
                </Button>
            </div>

            <div className="space-y-4">
                {documents.map((doc, idx) => (
                    <div key={doc.id} className="relative p-4 bg-background/50 rounded-xl border border-border shadow-sm flex flex-col gap-4">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setDocuments(documents.filter(d => d.id !== doc.id))}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md"
                        >
                            <X className="w-3 h-3" />
                        </Button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Document Type</Label>
                                <Select 
                                    value={doc.type} 
                                    onValueChange={(val: 'Challan'|'Bill') => {
                                        const newDocs = [...documents];
                                        newDocs[idx].type = val;
                                        setDocuments(newDocs);
                                    }}
                                >
                                    <SelectTrigger className="h-10 rounded-lg bg-background border-input shadow-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                        <SelectItem value="Challan">Challan</SelectItem>
                                        <SelectItem value="Bill">Bill</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 animate-in fade-in zoom-in-95">
                                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Amount (₹)</Label>
                                <Input 
                                    type="number" 
                                    placeholder="Enter amount" 
                                    value={doc.amount}
                                    onChange={(e) => {
                                        const newDocs = [...documents];
                                        newDocs[idx].amount = e.target.value;
                                        setDocuments(newDocs);
                                    }}
                                    className="h-10 rounded-lg bg-background font-bold" 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Document Photo</Label>
                            <div className="relative h-12 rounded-xl bg-background overflow-hidden border border-input flex flex-row items-center justify-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors px-2">
                                {doc.preview ? (
                                    <div className="absolute inset-0 w-full h-full" onClick={() => {
                                        // Trigger file input for this specific document
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/*';
                                        input.onchange = (e: any) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const newDocs = [...documents];
                                                newDocs[idx].file = file;
                                                newDocs[idx].preview = URL.createObjectURL(file);
                                                setDocuments(newDocs);
                                            }
                                        };
                                        input.click();
                                    }}>
                                        <Image src={doc.preview} alt="Document Preview" fill className="object-cover opacity-50" />
                                        <div className="absolute inset-0 flex items-center justify-center font-bold text-primary text-xs bg-background/50 backdrop-blur-sm">Photo Selected (Click to change)</div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground hover:text-blue-500 font-bold text-xs h-full" onClick={(e) => { 
                                            e.stopPropagation(); 
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.onchange = (e: any) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    const newDocs = [...documents];
                                                    newDocs[idx].file = file;
                                                    newDocs[idx].preview = URL.createObjectURL(file);
                                                    setDocuments(newDocs);
                                                }
                                            };
                                            input.click();
                                        }}>
                                            <Upload className="w-4 h-4 text-blue-500" /> Upload
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {documents.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed border-primary/20 rounded-xl bg-background/30 text-muted-foreground text-sm font-medium">
                        No documents included. Click Add Bill/Challan to include Challans or Bills.
                    </div>
                )}
            </div>
        </div>

        {Object.keys(form.formState.errors).length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 mt-6">
                <h3 className="font-semibold text-red-800">Form has errors:</h3>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-red-600">
                    {Object.entries(form.formState.errors).map(([key, error]) => (
                        <li key={key}>
                            <strong>{key}:</strong> {error?.message?.toString()}
                        </li>
                    ))}
                </ul>
            </div>
        )}

        <div className="flex flex-col gap-3 mt-8">
            <Button type="submit" disabled={isSubmitting} className="w-full h-16 rounded-3xl font-black text-xl gap-3 shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                <Archive className="w-6 h-6" />
                {isSubmitting ? "Processing Case..." : "Confirm Receipt"}
                <ChevronRight className="w-6 h-6 ml-auto" />
            </Button>
            <Button type="button" variant="ghost" onClick={clearCurrentDraft} className="w-full h-12 rounded-xl font-bold text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors">
                <Trash2 className="w-4 h-4 mr-2" /> Discard Form
            </Button>
        </div>
      </form>

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCapture}
      />
      
      {/* Hidden File Input */}
      <input 
          type="file" 
          accept="image/*" 
          multiple={uploadType === 'verification'} 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
      />
    </Form>
    </div>
  );
}
