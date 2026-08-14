"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Truck, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { fetchSubmissions, updateSubmissionRemarksAction } from "@/app/dashboard/lab/actions";
import { Submission } from "@/lib/types";
import { format, addDays, isAfter, isBefore, startOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export function LabAlerts() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissingAlertId, setDismissingAlertId] = useState<string | null>(null);
  const [dismissNote, setDismissNote] = useState("");
  const [isDismissing, setIsDismissing] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    try {
      const data = await fetchSubmissions();
      setSubmissions(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDismissAlert = async () => {
    if (!dismissingAlertId || !dismissNote.trim()) return;
    setIsDismissing(true);
    try {
      // Find existing remarks
      const sub = submissions.find(s => s.id === dismissingAlertId);
      const newRemark = `[Alert Resolved]: ${dismissNote}`;
      const updatedRemarks = sub?.remarks ? `${sub.remarks}\n\n${newRemark}` : newRemark;
      
      const res = await updateSubmissionRemarksAction(dismissingAlertId, updatedRemarks);
      if (res.success) {
        setSubmissions(prev => prev.map(s => s.id === dismissingAlertId ? { ...s, isAlertResolved: true, remarks: updatedRemarks } : s));
        setDismissingAlertId(null);
        setDismissNote("");
        toast({ title: "Alert dismissed successfully" });
      } else {
        toast({ title: "Failed to dismiss alert", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error dismissing alert", variant: "destructive" });
    }
    setIsDismissing(false);
  };

  const alerts = useMemo(() => {
    const today = startOfDay(new Date());
    const thirtyDaysAgo = addDays(today, -30);
    const unresolvedData = submissions.filter(sub => !sub.isAlertResolved);

    // 1. Appointment Not Given (Red)
    const missingAppointments = unresolvedData.filter(sub => 
      sub.type === 'receive' && 
      (!sub.appointmentStatus || sub.appointmentStatus === 'Appointment not given') &&
      isAfter(new Date(sub.createdAt), thirtyDaysAgo)
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 2. Upcoming Appointments (Blue)
    const upcomingAppointments = unresolvedData.filter(sub => 
      sub.appointmentStatus === 'Appointment given' && 
      sub.appointmentDate && 
      isAfter(new Date(sub.appointmentDate), today) &&
      isBefore(new Date(sub.appointmentDate), addDays(today, 4))
    ).sort((a, b) => new Date(a.appointmentDate!).getTime() - new Date(b.appointmentDate!).getTime());

    // 3. Delivery Alerts
    const receivedIds = new Set(
      unresolvedData.filter(s => s.type === 'receive' && s.linkedRecordId).map(s => s.linkedRecordId)
    );
    const activeSends = unresolvedData.filter(sub => sub.type === 'send' && sub.tat && !receivedIds.has(sub.id));
    
    const overdueDeliveries: Submission[] = [];
    const upcomingDeliveries: Submission[] = [];

    activeSends.forEach(sub => {
      const tatDays = parseInt(sub.tat!.split(' ')[0]);
      if (isNaN(tatDays)) return;
      const deliveryDueDate = addDays(new Date(sub.createdAt), tatDays);
      
      if (isBefore(deliveryDueDate, addDays(today, 1))) {
          overdueDeliveries.push(sub); // Overdue
      } else if (isBefore(deliveryDueDate, addDays(today, 3))) {
          upcomingDeliveries.push(sub); // Expected
      }
    });

    overdueDeliveries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    upcomingDeliveries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return { missingAppointments, upcomingAppointments, overdueDeliveries, upcomingDeliveries };
  }, [submissions]);

  const getExpectedDateText = (sub: Submission) => {
    if (!sub.tat) return null;
    const tatDays = parseInt(sub.tat.split(' ')[0]);
    if (isNaN(tatDays)) return null;
    const expected = addDays(new Date(sub.createdAt), tatDays);
    return format(expected, 'MMM d');
  };

  const hasAnyAlerts = alerts.missingAppointments.length > 0 || 
                       alerts.upcomingAppointments.length > 0 || 
                       alerts.upcomingDeliveries.length > 0 || 
                       alerts.overdueDeliveries.length > 0;

  if (loading) {
      return <div className="space-y-4 mb-8 animate-pulse bg-gray-100 rounded-3xl h-[100px] w-full" />;
  }

  return (
    <div className="space-y-4 mb-8">
      <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-foreground/50 ml-2">Action Needed (Lab)</h3>
      {!hasAnyAlerts ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-muted-foreground italic text-sm">
              All clear! No action needed right now.
          </div>
      ) : (
      <>
      <Dialog open={!!dismissingAlertId} onOpenChange={(open) => !open && setDismissingAlertId(null)}>
        <DialogContent className="glass-card sm:max-w-md rounded-3xl">
            <DialogHeader>
                <DialogTitle>Update Case Notes</DialogTitle>
                <DialogDescription>
                    Please provide an update or remark before dismissing this alert. This will be saved in the case history.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Textarea 
                    value={dismissNote}
                    onChange={(e) => setDismissNote(e.target.value)}
                    placeholder="Enter your update here..."
                    className="min-h-[100px] resize-none bg-background/50 rounded-xl"
                />
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setDismissingAlertId(null)} disabled={isDismissing} className="rounded-xl">Cancel</Button>
                <Button onClick={handleDismissAlert} disabled={!dismissNote.trim() || isDismissing} className="rounded-xl bg-primary text-primary-foreground">
                    {isDismissing ? "Saving..." : "Save & Dismiss"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-foreground/50 ml-2">Action Needed (Lab)</h3>
      
      <Accordion type="multiple" defaultValue={["missing-appointments", "overdue-deliveries", "expected-deliveries"]} className="w-full space-y-4">
          {alerts.missingAppointments.length > 0 && (
          <AccordionItem value="missing-appointments" className="border-none bg-white rounded-2xl shadow-sm overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-red-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                      <div className="bg-red-50 p-2 rounded-xl text-red-500">
                          <AlertTriangle className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-red-600">Appointment Not Given</span>
                      <Badge variant="secondary" className="ml-2 bg-red-100 text-red-700 hover:bg-red-200">{alerts.missingAppointments.length}</Badge>
                  </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {alerts.missingAppointments.map((app, idx) => (
                          <div key={`miss-${idx}`} className="relative bg-gray-50/50 border border-gray-100 p-4 rounded-xl border-l-4 border-l-red-500 group transition-colors hover:bg-gray-50">
                              <Link href={`/dashboard/lab/records?id=${app.id}`} className="flex items-center justify-between h-full">
                                  <div className="flex flex-col gap-1 pr-8">
                                      <p className="font-bold text-slate-800">{app.patientName}</p>
                                      <p className="text-xs text-slate-500">Received {format(new Date(app.createdAt), 'MMM d')} - {app.item}</p>
                                  </div>
                                  <Badge variant="outline" className="bg-red-50 text-red-600 border-none font-black text-[10px] uppercase shrink-0">Needs Action</Badge>
                              </Link>
                              <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-600" onClick={(e) => { e.preventDefault(); setDismissingAlertId(app.id); }}>
                                  <X className="w-4 h-4" />
                              </Button>
                          </div>
                      ))}
                  </div>
              </AccordionContent>
          </AccordionItem>
          )}

          {alerts.overdueDeliveries.length > 0 && (
          <AccordionItem value="overdue-deliveries" className="border-none bg-white rounded-2xl shadow-sm overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-green-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                      <div className="bg-green-50 p-2 rounded-xl text-green-500">
                          <Clock className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-green-600">Overdue Delivery</span>
                      <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 hover:bg-green-200">{alerts.overdueDeliveries.length}</Badge>
                  </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {alerts.overdueDeliveries.map((alert, idx) => (
                          <div key={`over-${idx}`} className="relative bg-gray-50/50 border border-gray-100 p-4 rounded-xl border-l-4 border-l-green-500 group transition-colors hover:bg-gray-50">
                              <Link href={`/dashboard/lab/records?id=${alert.id}`} className="flex items-center justify-between h-full">
                                  <div className="flex flex-col gap-1 pr-8">
                                      <p className="font-bold text-slate-800">{alert.patientName}</p>
                                      <p className="text-xs text-slate-500">{alert.item} from {alert.labName}</p>
                                  </div>
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-none font-black text-[10px] uppercase shrink-0">{getExpectedDateText(alert)}</Badge>
                              </Link>
                              <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-100 hover:text-green-600" onClick={(e) => { e.preventDefault(); setDismissingAlertId(alert.id); }}>
                                  <X className="w-4 h-4" />
                              </Button>
                          </div>
                      ))}
                  </div>
              </AccordionContent>
          </AccordionItem>
          )}

          {alerts.upcomingDeliveries.length > 0 && (
          <AccordionItem value="expected-deliveries" className="border-none bg-white rounded-2xl shadow-sm overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-orange-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                      <div className="bg-orange-50 p-2 rounded-xl text-orange-500">
                          <Truck className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-orange-600">Expected Delivery</span>
                      <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700 hover:bg-orange-200">{alerts.upcomingDeliveries.length}</Badge>
                  </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {alerts.upcomingDeliveries.map((alert, idx) => (
                          <div key={`exp-${idx}`} className="relative bg-gray-50/50 border border-gray-100 p-4 rounded-xl border-l-4 border-l-orange-500 group transition-colors hover:bg-gray-50">
                              <Link href={`/dashboard/lab/records?id=${alert.id}`} className="flex items-center justify-between h-full">
                                  <div className="flex flex-col gap-1 pr-8">
                                      <p className="font-bold text-slate-800">{alert.patientName}</p>
                                      <p className="text-xs text-slate-500">{alert.item} from {alert.labName}</p>
                                  </div>
                                  <Badge variant="outline" className="bg-orange-50 text-orange-600 border-none font-black text-[10px] uppercase shrink-0">{getExpectedDateText(alert)}</Badge>
                              </Link>
                              <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-100 hover:text-orange-600" onClick={(e) => { e.preventDefault(); setDismissingAlertId(alert.id); }}>
                                  <X className="w-4 h-4" />
                              </Button>
                          </div>
                      ))}
                  </div>
              </AccordionContent>
          </AccordionItem>
          )}
      </Accordion>
      </>
      )}
    </div>
  );
}
