import { fetchSubmissionByIdAction } from "@/app/actions";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Submission } from "@/lib/types";
import { ChevronRight, Archive, CalendarIcon, User, Package, FlaskConical, Truck, MessageSquare, AlertCircle } from "lucide-react";
import { isVideoUrl } from "@/lib/utils";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: 'Shared Submission Record | LabTrack',
  description: 'View submission details',
};

export default async function SharedRecordPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { id } = params;
  const isExternal = searchParams.type === 'external';

  const result = await fetchSubmissionTrailAction(id);
  if (!result.success || !result.data || result.data.length === 0) {
    notFound();
  }

  const trail = result.data as Submission[];

  return (
    <div className="min-h-screen bg-background/50 py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-10 custom-scrollbar">
      {trail.map((sub, index) => (
      <div key={sub.id} className="relative w-full max-w-4xl bg-background rounded-[2.5rem] shadow-2xl border border-border/40 overflow-hidden">
        
        {/* Connection Line (if not first) */}
        {index > 0 && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-1 h-10 bg-primary/20 z-10" />
        )}

        {/* Header */}
        <div className="p-8 bg-muted/20 border-b border-border/5">
            <div className="space-y-1">
                <h1 className="text-2xl font-black flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-xl",
                        sub.type === 'send' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'
                    )}>
                        {sub.type === 'send' ? <ChevronRight className="w-6 h-6" /> : <Archive className="w-6 h-6" />}
                    </div>
                    {sub.type === 'send' ? 'Sent Record' : 'Received Record'}
                </h1>
                <p className="text-sm text-muted-foreground font-medium pl-11">
                    {sub.patientName} • {sub.item} • {format(new Date(sub.createdAt), 'PPPP')}
                </p>
                {isExternal && (
                    <p className="text-xs text-muted-foreground italic pl-11 mt-2">
                        External View (Internal verification photos hidden)
                    </p>
                )}
            </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-10 custom-scrollbar">
            
            {/* Transaction Info Grid */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Transaction Info</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted/30 p-4 rounded-2xl">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><User className="w-3 h-3"/> Patient</p>
                        <p className="text-sm font-bold">{sub.patientName || 'N/A'}</p>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-2xl">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Package className="w-3 h-3"/> Item</p>
                        <p className="text-sm font-bold">{sub.item || 'N/A'}</p>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-2xl">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><FlaskConical className="w-3 h-3"/> Lab/Partner</p>
                        <p className="text-sm font-bold">{sub.labName || 'N/A'}</p>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-2xl">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Status</p>
                        <Badge variant="secondary" className={cn(
                            "bg-blue-100 text-blue-700",
                            sub.appointmentStatus === 'Completed' ? 'bg-emerald-100 text-emerald-700' : ''
                        )}>{sub.appointmentStatus || 'Pending'}</Badge>
                    </div>
                </div>
            </div>

            {/* Remarks */}
            {sub.remarks && (
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> Remarks & Notes
                    </h3>
                    <div className="bg-muted/20 p-5 rounded-2xl border border-border/50 text-sm whitespace-pre-wrap">
                        {sub.remarks}
                    </div>
                </div>
            )}

            {/* Photos */}
            <div className="space-y-6">
                {!isExternal && (sub.senderSelfieUrl || sub.photoUrl) && (
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                            <User className="w-4 h-4" /> {sub.type === 'send' ? 'Sender Selfie' : 'Verification Photo'}
                        </h3>
                        <div className="relative aspect-video w-full max-w-sm rounded-2xl overflow-hidden shadow-lg border border-border/20 group">
                            <Image src={sub.senderSelfieUrl || sub.photoUrl!} alt="Verification" fill className="object-cover" />
                        </div>
                    </div>
                )}

                {sub.photoUrls && sub.photoUrls.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                            <Package className="w-4 h-4" /> Case Gallery
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {sub.photoUrls.map((url, i) => (
                                <div key={i} className={`relative rounded-2xl overflow-hidden shadow-md border border-border/20 group bg-black/5 ${isVideoUrl(url) ? 'col-span-2 md:col-span-4 aspect-video' : 'aspect-square'}`}>
                                    {isVideoUrl(url) ? (
                                        <video src={url} className="absolute inset-0 w-full h-full object-contain bg-black/90 rounded-2xl" controls playsInline />
                                    ) : (
                                        <Image src={url} alt={`Gallery item ${i + 1}`} fill className="object-cover" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!isExternal && sub.deliveryPersonPhotoUrl && (
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                            <Truck className="w-4 h-4" /> Delivery Verification
                        </h3>
                        <div className="relative aspect-video w-full max-w-sm rounded-2xl overflow-hidden shadow-lg border border-border/20 group">
                            <Image src={sub.deliveryPersonPhotoUrl} alt="Delivery Person" fill className="object-cover" />
                        </div>
                    </div>
                )}
            </div>

        </div>
      </div>
      ))}
    </div>
  );
}
