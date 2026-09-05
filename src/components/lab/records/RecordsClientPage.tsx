"use client";
import { useSession } from "next-auth/react";

import { useState, useMemo, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';
import { 
    Search, 
    Image as ImageIcon, 
    FileDown, 
    ChevronRight, 
    ExternalLink, 
    User, 
    Truck, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    Calendar as CalendarIcon, 
    FlaskConical, 
    MessageSquare,
    Package,
    UserCheck,
    Trash2,
    Loader2,
    Pencil,
    Link as LinkIcon,
    Archive,
    Share2,
    Plus
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Image from 'next/image';
import { Submission, Lab } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { updateSubmissionRemarksAction, deleteSubmissionAction, editSubmissionAction } from '@/app/dashboard/lab/actions';
import { CameraModal } from '../CameraModal';
import { useToast } from '@/hooks/use-toast';
import { cn, isVideoUrl } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportTrailPDF } from '@/lib/pdfGenerator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function RecordsClientPage({ submissions, labs = [], initialOpenId }: { submissions: Submission[], labs?: Lab[], initialOpenId?: string }) {
    const { toast } = useToast();
    const { data: session } = useSession();
    // Same admin gate used across the lab module (LabManager/TemplateManager):
    // MASTER, the platform Owner, or an ADMIN granted the "lab" module.
    // Plain STAFF get read-only access -- no delete, no editing remarks.
    const isAdmin =
        session?.user?.role === "MASTER" ||
        (session?.user as any)?.isSuperAdmin ||
        (session?.user?.role === "ADMIN" && ((session?.user as any)?.allowedModules || []).includes("lab"));
    const isRoleLoading = false;
    const [openDialogId, setOpenDialogId] = useState<string | null>(null);
    const [shareDialog, setShareDialog] = useState<{sub: Submission, type: 'internal' | 'external'} | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [filterLab, setFilterLab] = useState("all");
    const [filterPatient, setFilterPatient] = useState("all");
    const [filterService, setFilterService] = useState("all");
    const [filterStaff, setFilterStaff] = useState("all");
    
    const [editingRemarks, setEditingRemarks] = useState<{id: string, text: string} | null>(null);
    const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Submission>>({});
    const [editNewPhotos, setEditNewPhotos] = useState<File[]>([]);
    const [editNewPhotoPreviews, setEditNewPhotoPreviews] = useState<string[]>([]);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [isUpdatingRemarks, setIsUpdatingRemarks] = useState(false);
    const [expandedHistoryIds, setExpandedHistoryIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);

    const uniqueLabs = useMemo(() => Array.from(new Set(submissions.map(s => s.labName))).filter(Boolean).sort(), [submissions]);
    const uniquePatients = useMemo(() => Array.from(new Set(submissions.map(s => s.patientName))).filter(Boolean).sort(), [submissions]);
    const uniqueServices = useMemo(() => Array.from(new Set(submissions.map(s => s.item))).filter(Boolean).sort(), [submissions]);
    const uniqueStaff = useMemo(() => {
        const staff = submissions.map(s => s.type === 'send' ? s.senderName : s.receiverName).filter(Boolean);
        return Array.from(new Set(staff)).sort();
    }, [submissions]);

    const filteredSubmissions = useMemo(() => {
        // Map of id -> submission
        const subMap = new Map<string, Submission>();
        // To handle the case where multiple children might point to the same parent (which shouldn't happen but just in case), 
        // we'll keep the first one or we can use a Set. We assume a 1-to-1 chain for a trail.
        const childrenMap = new Map<string, string>(); // parentId -> childId
        
        submissions.forEach(s => {
            subMap.set(s.id, s);
            if (s.linkedRecordId) {
                childrenMap.set(s.linkedRecordId, s.id);
            }
        });

        // Roots are submissions that NO other submission points to them as a child?
        // Wait. A root is a submission that does NOT have a linkedRecordId, 
        // OR its linkedRecordId points to a submission that doesn't exist anymore.
        const roots = submissions.filter(s => !s.linkedRecordId || !subMap.has(s.linkedRecordId));
        
        const groupedSubmissions = roots.map(root => {
            const trail = [root];
            let currentId = root.id;
            
            while (childrenMap.has(currentId)) {
                const childId = childrenMap.get(currentId)!;
                const child = subMap.get(childId);
                if (child) {
                    trail.push(child);
                    currentId = child.id;
                } else {
                    break;
                }
            }
            
            // The record representing the row will be the LATEST submission in the trail
            // so that its type/status/date reflects the current state of the case.
            const latest = trail[trail.length - 1];
            
            return {
                ...latest, // Use the latest record's data for the row
                trail,     // Attach the full trail for the modal
                isReturned: trail.length > 1 && latest.type === 'receive',
                linkedReceiveRecord: latest.type === 'receive' ? latest : undefined
            };
        });

        return groupedSubmissions.filter(sub => {
            if (filterType !== 'all' && sub.type !== filterType) return false;
            if (filterLab !== 'all' && sub.labName !== filterLab) return false;
            if (filterPatient !== 'all' && sub.patientName !== filterPatient) return false;
            if (filterService !== 'all' && sub.item !== filterService) return false;
            if (filterStaff !== 'all') {
                const staffName = sub.type === 'send' ? sub.senderName : sub.receiverName;
                if (staffName !== filterStaff) return false;
            }

            const query = searchQuery.toLowerCase();
            if (!query) return true;

            const lab = labs.find(l => l.name === sub.labName);
            const service = lab?.services?.find(s => s.name === sub.item);
            const keywordsStr = service?.keywords?.join(' ').toLowerCase() || '';

            return (sub.patientName || "").toLowerCase().includes(query) ||
                   (sub.labName || "").toLowerCase().includes(query) ||
                   (sub.item || "").toLowerCase().includes(query) ||
                   (sub.senderName || "").toLowerCase().includes(query) ||
                   (sub.receiverName || "").toLowerCase().includes(query) ||
                   keywordsStr.includes(query);
        });
    }, [submissions, searchQuery, filterType, filterLab, filterPatient, filterService, filterStaff, labs]);

    const handleUpdateRemarks = async (id: string) => {
        if (!editingRemarks) return;
        setIsUpdatingRemarks(true);
        try {
            await updateSubmissionRemarksAction(id, editingRemarks.text);
            toast({ title: "Updated", description: "Remarks updated successfully." });
            setEditingRemarks(null);
            // In a real app, we'd trigger a re-fetch or update local state
            // For now, we rely on the user refreshing or the next fetch
            window.location.reload();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsUpdatingRemarks(false);
        }
    };

    const handleStartEdit = (sub: Submission) => {
        setEditingSubmissionId(sub.id);
        setEditData({
            patientName: sub.patientName,
            labName: sub.labName,
            item: sub.item,
            remarks: sub.remarks,
            photoUrls: typeof sub.photoUrls === "string" ? JSON.parse(sub.photoUrls) : sub.photoUrls || []
        });
        setEditNewPhotos([]);
        setEditNewPhotoPreviews([]);
    };

    const handleSaveEdit = () => {
        setIsCameraOpen(true);
    };

    // Existing gallery photo the editor chose to remove -- just drops it
    // from the list that gets saved, nothing is deleted from storage.
    const removeExistingEditPhoto = (index: number) => {
        setEditData((prev: any) => ({
            ...prev,
            photoUrls: (prev.photoUrls || []).filter((_: string, i: number) => i !== index)
        }));
    };

    const handleAddEditPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const fileArray = Array.from(files);
            setEditNewPhotos(prev => [...prev, ...fileArray]);
            setEditNewPhotoPreviews(prev => [...prev, ...fileArray.map(f => URL.createObjectURL(f))]);
        }
        if (e.target) e.target.value = '';
    };

    const removeNewEditPhoto = (index: number) => {
        setEditNewPhotos(prev => prev.filter((_, i) => i !== index));
        setEditNewPhotoPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const performSaveEdit = async (selfieFile: File) => {
        if (!editingSubmissionId) return;
        setIsSavingEdit(true);
        try {
            const formData = new FormData();
            formData.append('id', editingSubmissionId);
            formData.append('editorName', isAdmin ? 'Admin' : 'Staff');
            formData.append('editorSelfie', selfieFile);
            formData.append('changes', 'Updated submission details from records page.');
            formData.append('updates', JSON.stringify(editData));
            editNewPhotos.forEach(file => {
                formData.append('newPhotos', file);
            });
            const res = await editSubmissionAction(formData);
            if (!res.success) throw new Error(res.error);
            toast({ title: "Updated", description: "Submission edited successfully." });
            setEditingSubmissionId(null);
            window.location.reload();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSavingEdit(false);
            setIsCameraOpen(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this record? This cannot be undone.")) return;
        setIsDeleting(id);
        try {
            await deleteSubmissionAction(id);
            toast({ title: "Deleted", description: "Record removed successfully." });
            window.location.reload();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsDeleting(null);
        }
    };

    const handleExportCSV = () => {
        const exportData = filteredSubmissions.map(sub => ({
            Type: sub.type.toUpperCase(),
            Date: format(new Date(sub.createdAt), 'yyyy-MM-dd'),
            Time: format(new Date(sub.createdAt), 'p'),
            Patient: sub.patientName,
            Lab: sub.labName,
            Item: sub.item,
            Staff: sub.type === 'send' ? sub.senderName : sub.receiverName,
            Delivery_Person: sub.deliveryPerson || 'N/A',
            Price: sub.servicePrice || 'N/A',
            TAT_Days: sub.tat || 'N/A',
            Status: sub.appointmentStatus || 'N/A',
            Remarks: sub.remarks || ''
        }));

        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `history_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text("Clinical History Report", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), 'PPpp')}`, 14, 30);

        const tableData = filteredSubmissions.map(sub => [
            sub.type.toUpperCase(),
            format(new Date(sub.createdAt), 'MMM d, yyyy'),
            sub.patientName,
            sub.labName,
            sub.item,
            sub.type === 'send' ? sub.senderName : sub.receiverName,
            sub.deliveryPerson || '-'
        ]);

        autoTable(doc, {
            startY: 40,
            head: [['Type', 'Date', 'Patient', 'Lab', 'Item', 'Staff', 'Delivery']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillStyle: 'fill', fillColor: [59, 130, 246] }, // Primary Blue
        });

        doc.save(`history_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    const handleExportSinglePDF = async (trail: Submission[], type: 'internal' | 'external') => {
        setIsGeneratingPdf(trail[0].id);
        try {
            await exportTrailPDF(trail, type);
            toast({ title: "Success", description: "PDF generated successfully." });
        } catch (error: any) {
            toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" });
        } finally {
            setIsGeneratingPdf(null);
        }
    };

    const handleShareOrder = (sub: Submission, type: 'internal' | 'external') => {
        setShareDialog({ sub, type });
    };

    const handleWhatsAppShare = (sub: Submission, type: 'internal' | 'external') => {
        const shareUrl = `${window.location.origin}/shared/${sub.id}?type=${type}`;
        const dateStr = format(new Date(sub.createdAt), 'MMM d, yyyy h:mm a');
        const message = `Patient: ${sub.patientName}\nLab: ${sub.labName}\nDate: ${dateStr}\nProcedure: ${sub.item}\n\nLink: ${shareUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    useEffect(() => {
        if (initialOpenId && filteredSubmissions.length > 0) {
            const targetGroup = filteredSubmissions.find(sub => sub.id === initialOpenId || sub.trail?.some(t => t.id === initialOpenId));
            if (targetGroup) {
                setOpenDialogId(targetGroup.id);
                // Clear the param from URL to prevent reopening on subsequent renders if not desired, 
                // but since it's initial we can just leave it or handle it.
            }
        }
    }, [initialOpenId, filteredSubmissions]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search patient, lab, item, staff, or keyword..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/20"
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="rounded-2xl h-11 px-6 font-bold gap-2">
                                <FileDown className="w-4 h-4 text-red-500" />
                                Export Data
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="rounded-xl glass-card border-none shadow-2xl">
                            <DropdownMenuItem onClick={handleExportPDF} className="rounded-lg cursor-pointer font-bold">
                                Download PDF Report
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportCSV} className="rounded-lg cursor-pointer font-bold text-emerald-600">
                                Download CSV Spreadsheet
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap gap-3">
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[140px] rounded-xl bg-muted/30 border-none">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="send">Sent</SelectItem>
                            <SelectItem value="receive">Received</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filterLab} onValueChange={setFilterLab}>
                        <SelectTrigger className="w-[180px] rounded-xl bg-muted/30 border-none">
                            <SelectValue placeholder="Lab" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl max-h-[300px]">
                            <SelectItem value="all">All Labs</SelectItem>
                            {uniqueLabs.map(lab => (
                                <SelectItem key={lab} value={lab}>{lab}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterPatient} onValueChange={setFilterPatient}>
                        <SelectTrigger className="w-[180px] rounded-xl bg-muted/30 border-none">
                            <SelectValue placeholder="Patient" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl max-h-[300px]">
                            <SelectItem value="all">All Patients</SelectItem>
                            {uniquePatients.map(patient => (
                                <SelectItem key={patient} value={patient}>{patient}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterService} onValueChange={setFilterService}>
                        <SelectTrigger className="w-[180px] rounded-xl bg-muted/30 border-none">
                            <SelectValue placeholder="Service" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl max-h-[300px]">
                            <SelectItem value="all">All Services</SelectItem>
                            {uniqueServices.map(service => (
                                <SelectItem key={service} value={service}>{service}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterStaff} onValueChange={setFilterStaff}>
                        <SelectTrigger className="w-[180px] rounded-xl bg-muted/30 border-none">
                            <SelectValue placeholder="Staff" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl max-h-[300px]">
                            <SelectItem value="all">All Staff</SelectItem>
                            {uniqueStaff.map(staff => (
                                <SelectItem key={staff} value={staff}>{staff}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    {(filterType !== 'all' || filterLab !== 'all' || filterPatient !== 'all' || filterService !== 'all' || filterStaff !== 'all' || searchQuery !== '') && (
                        <Button variant="ghost" onClick={() => {
                            setFilterType('all');
                            setFilterLab('all');
                            setFilterPatient('all');
                            setFilterService('all');
                            setFilterStaff('all');
                            setSearchQuery('');
                        }} className="rounded-xl text-muted-foreground hover:text-destructive">
                            Clear Filters
                        </Button>
                    )}
                </div>
            </div>

            <div className="glass-card rounded-[2rem] border-none shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50 border-none">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="font-black text-[10px] uppercase tracking-widest pl-6">Type & Status</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest">Case Details</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest">Staff / Delivery</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest">Date & Time</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSubmissions.length > 0 ? filteredSubmissions.map((sub) => (
                                <TableRow key={sub.id} className="group hover:bg-muted/20 border-border/10 transition-all duration-300">
                                    <TableCell className="pl-6 py-5">
                                        <div className="flex flex-col gap-2">
                                            <Badge 
                                                variant="outline" 
                                                className={cn(
                                                    "w-fit font-black uppercase text-[10px] tracking-tighter px-2 py-0.5 border-none",
                                                    sub.type === 'send' 
                                                        ? 'bg-blue-500/10 text-blue-600' 
                                                        : (sub.trail && sub.trail.length > 2 ? 'bg-purple-500/10 text-purple-600' : 'bg-emerald-500/10 text-emerald-600')
                                                )}
                                            >
                                                {sub.trail && sub.trail.length > 2 
                                                    ? `Trail: ${sub.trail.length} Steps` 
                                                    : (sub.trail && sub.trail.length === 2 ? 'Sent & Received' : (sub.type === 'send' ? 'Sent' : 'Received'))}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-bold text-sm text-foreground">{sub.patientName}</span>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="font-black text-primary uppercase text-[10px]">{sub.item}</span>
                                                {sub.subType && sub.subType !== 'none' && (
                                                    <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">{sub.subType}</span>
                                                )}
                                                <span>•</span>
                                                <span className="font-medium italic">{sub.labName}</span>
                                            </div>
                                            {(sub.servicePrice || sub.tat) && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    {sub.servicePrice && <span className="text-[10px] font-bold text-emerald-600">₹{sub.servicePrice}</span>}
                                                    {sub.tat && <span className="text-[10px] bg-muted px-1 rounded font-medium">TAT: {sub.tat}</span>}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-xs font-medium">
                                                <UserCheck className="w-3 h-3 text-primary/60" />
                                                <span>{sub.type === 'send' ? sub.senderName : sub.receiverName}</span>
                                            </div>
                                            {sub.deliveryPerson && (
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic">
                                                    <Truck className="w-3 h-3 opacity-40" />
                                                    <span>{sub.deliveryPerson}</span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold">{format(new Date(sub.createdAt), 'MMM d, yyyy')}</span>
                                            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {format(new Date(sub.createdAt), 'p')}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-right pr-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <Dialog open={openDialogId === sub.id} onOpenChange={(isOpen) => setOpenDialogId(isOpen ? sub.id : null)}>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary transition-all">
                                                        <ImageIcon className="h-5 w-5" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-4xl glass-card shadow-2xl border-none p-0 overflow-hidden rounded-[2.5rem]">
                                                    <DialogHeader className="p-8 bg-muted/20 border-b border-border/5">
                                                        <div className="flex items-center justify-between w-full">
                                                            <div className="space-y-1">
                                                                <DialogTitle className="text-2xl font-black flex items-center gap-3">
                                                                    <div className={cn(
                                                                        "p-2 rounded-xl",
                                                                        sub.type === 'send' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'
                                                                    )}>
                                                                        {sub.type === 'send' ? <ChevronRight className="w-6 h-6" /> : <Archive className="w-6 h-6" />}
                                                                    </div>
                                                                    Submission Review
                                                                </DialogTitle>
                                                                <p className="text-sm text-muted-foreground font-medium pl-11">
                                                                    {sub.patientName} • {sub.item} • {format(new Date(sub.createdAt), 'PPPP')}
                                                                </p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {(() => {
                                                                    const allEditLogs = (sub.trail || [sub]).flatMap(t => t.editLogs || []);
                                                                    if (allEditLogs.length === 0) return null;
                                                                    return (
                                                                        <Popover>
                                                                            <PopoverTrigger asChild>
                                                                                <Button variant="outline" className="rounded-xl gap-2 font-bold shadow-sm bg-primary/5 border-primary/20 text-primary hover:bg-primary/10">
                                                                                    <Clock className="w-4 h-4" />
                                                                                    View Edit History ({allEditLogs.length})
                                                                                </Button>
                                                                            </PopoverTrigger>
                                                                            <PopoverContent align="end" className="w-[400px] rounded-2xl shadow-xl p-0 overflow-hidden" sideOffset={8}>
                                                                                <div className="bg-muted/30 p-4 border-b border-border/10">
                                                                                    <h4 className="font-black text-sm uppercase tracking-wider text-primary flex items-center gap-2"><Clock className="w-4 h-4"/> Audit Trail</h4>
                                                                                    <p className="text-xs text-muted-foreground mt-1">History of all edits to this case.</p>
                                                                                </div>
                                                                                <div className="max-h-[400px] overflow-y-auto p-4 space-y-4">
                                                                                    {allEditLogs.map((log, i) => (
                                                                                        <div key={i} className="flex gap-4 p-3 rounded-xl bg-muted/30 border border-border/5 relative">
                                                                                            {log.editorSelfieUrl && (
                                                                                                <img src={log.editorSelfieUrl} alt="Editor" className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-background" />
                                                                                            )}
                                                                                            <div className="flex-1 space-y-1">
                                                                                                <div className="flex items-center justify-between">
                                                                                                    <span className="font-bold text-sm text-foreground">{log.editorName}</span>
                                                                                                    <span className="text-[10px] font-medium text-muted-foreground">{format(new Date(log.timestamp), 'PP p')}</span>
                                                                                                </div>
                                                                                                <p className="text-xs font-medium text-muted-foreground">{log.changes}</p>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </PopoverContent>
                                                                        </Popover>
                                                                    );
                                                                })()}
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button 
                                                                            disabled={isGeneratingPdf === sub.id}
                                                                            variant="outline" 
                                                                            className="rounded-xl gap-2 font-bold shadow-sm"
                                                                        >
                                                                            {isGeneratingPdf === sub.id ? (
                                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                            ) : (
                                                                                <FileDown className="w-4 h-4 text-primary" />
                                                                            )}
                                                                            Export PDF
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="rounded-xl">
                                                                        <DropdownMenuItem onClick={() => handleExportSinglePDF(sub.trail || [sub], 'internal')} className="cursor-pointer">
                                                                            Export (Internal)
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => handleExportSinglePDF(sub.trail || [sub], 'external')} className="cursor-pointer">
                                                                            Export (External)
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>

                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="outline" className="rounded-xl gap-2 font-bold shadow-sm">
                                                                            <Share2 className="w-4 h-4 text-primary" />
                                                                            Share
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="rounded-xl">
                                                                        <DropdownMenuItem onClick={() => handleShareOrder(sub, 'internal')} className="cursor-pointer gap-2">
                                                                            <LinkIcon className="w-4 h-4" /> Share (Internal)
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => handleShareOrder(sub, 'external')} className="cursor-pointer gap-2">
                                                                            <LinkIcon className="w-4 h-4" /> Share (External)
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => handleWhatsAppShare(sub, 'internal')} className="cursor-pointer gap-2 text-green-600">
                                                                            <MessageSquare className="w-4 h-4" /> WhatsApp (Internal)
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => handleWhatsAppShare(sub, 'external')} className="cursor-pointer gap-2 text-green-600">
                                                                            <MessageSquare className="w-4 h-4" /> WhatsApp (External)
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        </div>
                                                    </DialogHeader>

                                                    <div className="p-8 overflow-y-auto max-h-[75vh] space-y-10 custom-scrollbar bg-muted/5">
                                                        {(sub.trail || [sub]).map((trailItem, index) => (
                                                            <div key={trailItem.id} className="relative">
                                                                {/* Timeline Connector */}
                                                                {index !== (sub.trail || [sub]).length - 1 && (
                                                                    <div className="absolute left-6 top-24 bottom-[-40px] w-0.5 bg-border z-0"></div>
                                                                )}
                                                                
                                                                <div className="bg-background rounded-3xl border border-border/40 shadow-sm p-6 relative z-10">
                                                                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border/10">
                                                                        <div className={cn(
                                                                            "p-3 rounded-2xl flex items-center justify-center",
                                                                            trailItem.type === 'send' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'
                                                                        )}>
                                                                            {trailItem.type === 'send' ? <ChevronRight className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
                                                                        </div>
                                                                        <div>
                                                                            <h3 className="text-lg font-black">{trailItem.type === 'send' ? 'Sent Item' : 'Received Item'}</h3>
                                                                            <p className="text-sm text-muted-foreground font-medium">
                                                                                {format(new Date(trailItem.createdAt), 'PPP')} at {format(new Date(trailItem.createdAt), 'p')}
                                                                            </p>
                                                                        </div>
                                                                        
                                                                        <div className="ml-auto flex gap-2">
                                                                            {editingSubmissionId === trailItem.id ? (
                                                                                <>
                                                                                    <Button size="sm" onClick={handleSaveEdit} disabled={isSavingEdit}>
                                                                                        {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} Save
                                                                                    </Button>
                                                                                    <Button variant="ghost" size="sm" onClick={() => setEditingSubmissionId(null)}>Cancel</Button>
                                                                                </>
                                                                            ) : (
                                                                                <Button variant="outline" size="sm" onClick={() => handleStartEdit(trailItem)}>
                                                                                    <Pencil className="w-4 h-4 mr-2" /> Edit
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                                        {/* Details Card */}
                                                                        <div className="space-y-6">
                                                                            <div className="space-y-4">
                                                                                <h3 className="text-xs font-black uppercase tracking-widest text-primary">Transaction Info</h3>
                                                                                {editingSubmissionId === trailItem.id ? (
                                                                                    <div className="space-y-4">
                                                                                        <div>
                                                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Patient Name</label>
                                                                                            <Input value={editData.patientName || ''} onChange={e => setEditData({...editData, patientName: e.target.value})} className="mt-1" />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Lab/Partner Name</label>
                                                                                            <Input value={editData.labName || ''} onChange={e => setEditData({...editData, labName: e.target.value})} className="mt-1" />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Item/Service</label>
                                                                                            <Input value={editData.item || ''} onChange={e => setEditData({...editData, item: e.target.value})} className="mt-1" />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Remarks</label>
                                                                                            <Textarea value={editData.remarks || ''} onChange={e => setEditData({...editData, remarks: e.target.value})} className="mt-1 min-h-[80px]" />
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                <div className="grid grid-cols-2 gap-4">
                                                                                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/5 space-y-1">
                                                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Performed By</span>
                                                                                        <p className="text-sm font-black">{trailItem.type === 'send' ? trailItem.senderName : trailItem.receiverName}</p>
                                                                                    </div>
                                                                                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/5 space-y-1">
                                                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Logistics</span>
                                                                                        <p className="text-sm font-black">{trailItem.deliveryPerson || 'N/A'}</p>
                                                                                    </div>
                                                                                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/5 space-y-1">
                                                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Lab/Partner</span>
                                                                                        <p className="text-sm font-black">{trailItem.labName}</p>
                                                                                    </div>
                                                                                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/5 space-y-1">
                                                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Status</span>
                                                                                        <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase">{trailItem.appointmentStatus || 'Pending'}</Badge>
                                                                                    </div>
                                                                                </div>
                                                                                )}
                                                                            </div>

                                                                            {/* Remarks Section */}
                                                                            <div className="space-y-4">
                                                                                <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                                                                    <MessageSquare className="w-4 h-4" /> Remarks & Notes
                                                                                </h3>
                                                                                {editingRemarks?.id === trailItem.id ? (
                                                                                    <div className="space-y-3 p-4 rounded-2xl bg-primary/5 border border-primary/10 animate-in fade-in zoom-in-95">
                                                                                        <Textarea 
                                                                                            value={editingRemarks.text}
                                                                                            onChange={(e) => setEditingRemarks({...editingRemarks, text: e.target.value})}
                                                                                            placeholder="Add delay reasons, quality notes, etc."
                                                                                            className="bg-background/80 rounded-xl min-h-[100px] text-sm"
                                                                                        />
                                                                                        <div className="flex gap-2">
                                                                                            <Button 
                                                                                                size="sm" 
                                                                                                onClick={() => handleUpdateRemarks(trailItem.id)}
                                                                                                disabled={isUpdatingRemarks}
                                                                                                className="rounded-lg h-9 px-4 font-bold"
                                                                                            >
                                                                                                {isUpdatingRemarks ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Notes'}
                                                                                            </Button>
                                                                                            <Button 
                                                                                                variant="ghost" 
                                                                                                size="sm" 
                                                                                                onClick={() => setEditingRemarks(null)}
                                                                                                className="rounded-lg h-9 px-4 font-bold"
                                                                                            >
                                                                                                Cancel
                                                                                            </Button>
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="group/remarks p-4 rounded-2xl bg-muted/30 border border-border/5 min-h-[60px] relative">
                                                                                        <p className={cn(
                                                                                            "text-sm font-medium",
                                                                                            !trailItem.remarks && "text-muted-foreground italic"
                                                                                        )}>
                                                                                            {trailItem.remarks || "No remarks added yet."}
                                                                                        </p>
                                                                                        {isAdmin && (
                                                                                            <Button 
                                                                                                variant="ghost" 
                                                                                                size="icon"
                                                                                                onClick={() => setEditingRemarks({id: trailItem.id, text: trailItem.remarks || ""})}
                                                                                                className="absolute top-2 right-2 opacity-0 group-hover/remarks:opacity-100 transition-opacity rounded-full h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                                                                            >
                                                                                                <Pencil className="w-3.5 h-3.5" />
                                                                                            </Button>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>


                                                                        
                                                                        {/* Photos Section */}
                                                                        <div className="space-y-6">
                                                                            {/* Sender Selfie / Primary Photo */}
                                                                            {(trailItem.senderSelfieUrl || trailItem.photoUrl) && (
                                                                                <div className="space-y-4">
                                                                                    <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                                                                        <UserCheck className="w-4 h-4" /> {trailItem.type === 'send' ? 'Sender Selfie' : 'Verification Photo'}
                                                                                    </h3>
                                                                                    <div className="relative aspect-[4/3] rounded-3xl overflow-hidden group/img shadow-xl border border-border/10">
                                                                                        <img 
                                                                                            src={trailItem.senderSelfieUrl || trailItem.photoUrl || ""} 
                                                                                            alt="Verification" 
                                                                                            className="absolute inset-0 w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700" 
                                                                                        />
                                                                                        <a href={trailItem.senderSelfieUrl || trailItem.photoUrl || ""} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-[2px]">
                                                                                            <ExternalLink className="w-8 h-8 text-white" />
                                                                                        </a>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* Product Gallery */}
                                                                            <div className="space-y-4">
                                                                                <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                                                                    <Package className="w-4 h-4" /> Case Gallery
                                                                                </h3>
                                                                                {editingSubmissionId === trailItem.id ? (
                                                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                                                        {(editData.photoUrls || []).map((url: string, i: number) => (
                                                                                            <div key={`existing-${i}`} className={`relative rounded-2xl overflow-hidden group/img shadow-lg border border-border/10 bg-black/5 ${isVideoUrl(url) ? 'col-span-2 md:col-span-3 aspect-video' : 'aspect-square'}`}>
                                                                                                {isVideoUrl(url) ? (
                                                                                                    <video src={url} className="absolute inset-0 w-full h-full object-contain bg-black/90 rounded-2xl" controls playsInline />
                                                                                                ) : (
                                                                                                    <img src={url} alt={`Gallery ${i}`} className="absolute inset-0 w-full h-full object-cover" />
                                                                                                )}
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => removeExistingEditPhoto(i)}
                                                                                                    className="absolute top-2 right-2 bg-black/60 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors"
                                                                                                >
                                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                                </button>
                                                                                            </div>
                                                                                        ))}
                                                                                        {editNewPhotoPreviews.map((url, i) => (
                                                                                            <div key={`new-${i}`} className="relative rounded-2xl overflow-hidden group/img shadow-lg border border-primary/30 bg-black/5 aspect-square">
                                                                                                <img src={url} alt={`New ${i}`} className="absolute inset-0 w-full h-full object-cover" />
                                                                                                <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">New</span>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => removeNewEditPhoto(i)}
                                                                                                    className="absolute top-2 right-2 bg-black/60 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors"
                                                                                                >
                                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                                </button>
                                                                                            </div>
                                                                                        ))}
                                                                                        <label className="relative aspect-square rounded-2xl border-2 border-dashed border-border/40 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-colors">
                                                                                            <Plus className="w-6 h-6" />
                                                                                            <span className="text-[10px] font-bold uppercase">Add Photo</span>
                                                                                            <input type="file" accept="image/*" multiple className="hidden" onChange={handleAddEditPhotos} />
                                                                                        </label>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                                                        {(typeof trailItem.photoUrls === "string" ? JSON.parse(trailItem.photoUrls) : trailItem.photoUrls || []).map((url: string, i: number) => (
                                                                                            <div key={i} className={`relative rounded-2xl overflow-hidden group/img shadow-lg border border-border/10 bg-black/5 ${isVideoUrl(url) ? 'col-span-2 md:col-span-3 aspect-video' : 'aspect-square'}`}>
                                                                                                {isVideoUrl(url) ? (
                                                                                                    <video src={url} className="absolute inset-0 w-full h-full object-contain bg-black/90 rounded-2xl" controls playsInline />
                                                                                                ) : (
                                                                                                    <>
                                                                                                        <img src={url} alt={`Gallery ${i}`} className="absolute inset-0 w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700" />
                                                                                                        <a href={url} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-[2px]">
                                                                                                            <ExternalLink className="w-6 h-6 text-white" />
                                                                                                        </a>
                                                                                                    </>
                                                                                                )}
                                                                                            </div>
                                                                                        ))}
                                                                                        {(!(typeof trailItem.photoUrls === "string" ? JSON.parse(trailItem.photoUrls) : trailItem.photoUrls || [])?.length) && (
                                                                                            <div className="col-span-2 text-xs text-muted-foreground italic py-4">No images uploaded</div>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {/* Delivery Photo */}
                                                                            {trailItem.deliveryPersonPhotoUrl && (
                                                                                <div className="space-y-4">
                                                                                    <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                                                                        <Truck className="w-4 h-4" /> Delivery Verification
                                                                                    </h3>
                                                                                    <div className="relative aspect-video rounded-3xl overflow-hidden group/img shadow-xl border border-border/10">
                                                                                        <img src={trailItem.deliveryPersonPhotoUrl} alt="Delivery" className="absolute inset-0 w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700" />
                                                                                        <a href={trailItem.deliveryPersonPhotoUrl} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-[2px]">
                                                                                            <ExternalLink className="w-6 h-6 text-white" />
                                                                                        </a>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* Documents Gallery */}
                                                                            {trailItem.documents && trailItem.documents.length > 0 && (
                                                                                <div className="space-y-4">
                                                                                    <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                                                                        <FileDown className="w-4 h-4" /> Attached Documents
                                                                                    </h3>
                                                                                    <div className="grid grid-cols-2 gap-4">
                                                                                        {trailItem.documents.map((doc, i) => (
                                                                                            <div key={i} className="relative rounded-2xl overflow-hidden group/img shadow-lg border border-border/10 aspect-square">
                                                                                                <img src={doc.photoUrl} alt={`Document ${i}`} className="absolute inset-0 w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700" />
                                                                                                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                                                                                    <p className="text-white font-bold text-sm">{doc.type}</p>
                                                                                                    {doc.amount && <p className="text-primary font-black text-xs">₹{doc.amount}</p>}
                                                                                                </div>
                                                                                                <a href={doc.photoUrl} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-[2px]">
                                                                                                    <ExternalLink className="w-6 h-6 text-white" />
                                                                                                </a>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </DialogContent>
                                            </Dialog>

                                            {isAdmin && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleDelete(sub.id)}
                                                    disabled={isDeleting === sub.id}
                                                    className="rounded-full h-9 w-9 text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    {isDeleting === sub.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-40 text-center text-muted-foreground font-medium">

                                        No records found matching your search.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
            
            <AlertDialog open={!!isDeleting} onOpenChange={(open) => !open && setIsDeleting(null)}>
                <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the record.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => isDeleting && handleDelete(isDeleting)} className="rounded-xl bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={!!shareDialog} onOpenChange={(open) => !open && setShareDialog(null)}>
                <DialogContent className="max-w-md rounded-[2rem] p-6 glass-card border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">Share Record</DialogTitle>
                    </DialogHeader>
                    {shareDialog && (
                        <div className="space-y-4 mt-4">
                            <p className="text-sm text-muted-foreground">Choose what information to copy to your clipboard.</p>
                            
                            <Button 
                                className="w-full h-14 rounded-2xl justify-start px-6 gap-4 border border-border/50 bg-background/50 hover:bg-muted" 
                                variant="ghost"
                                onClick={() => {
                                    const shareUrl = `${window.location.origin}/shared/${shareDialog.sub.id}?type=${shareDialog.type}`;
                                    const dateStr = format(new Date(shareDialog.sub.createdAt), 'MMM d, yyyy h:mm a');
                                    const message = `Patient: ${shareDialog.sub.patientName}\nLab: ${shareDialog.sub.labName}\nDate: ${dateStr}\nProcedure: ${shareDialog.sub.item}\n\nLink: ${shareUrl}`;
                                    navigator.clipboard.writeText(message).then(() => {
                                        toast({ title: "Copied!", description: "Full details copied to clipboard." });
                                        setShareDialog(null);
                                    });
                                }}
                            >
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><Share2 className="w-4 h-4" /></div>
                                <div className="text-left flex flex-col">
                                    <span className="font-bold">Copy Full Details</span>
                                    <span className="text-xs text-muted-foreground">Includes patient info and link</span>
                                </div>
                            </Button>

                            <Button 
                                className="w-full h-14 rounded-2xl justify-start px-6 gap-4 border border-border/50 bg-background/50 hover:bg-muted" 
                                variant="ghost"
                                onClick={() => {
                                    const shareUrl = `${window.location.origin}/shared/${shareDialog.sub.id}?type=${shareDialog.type}`;
                                    navigator.clipboard.writeText(shareUrl).then(() => {
                                        toast({ title: "Copied!", description: "Only the link was copied." });
                                        setShareDialog(null);
                                    });
                                }}
                            >
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-full"><LinkIcon className="w-4 h-4" /></div>
                                <div className="text-left flex flex-col">
                                    <span className="font-bold">Copy Link Only</span>
                                    <span className="text-xs text-muted-foreground">Just the raw URL</span>
                                </div>
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            <CameraModal 
                isOpen={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                onCapture={(file) => performSaveEdit(file)}
            />
        </div>
    );
}
