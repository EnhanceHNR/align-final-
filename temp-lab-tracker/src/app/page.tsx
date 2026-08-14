"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Send, Save, FileText, Activity, Plus, History, Settings, Bell, Users, Calendar as CalendarIcon, Clock, AlertTriangle, Truck, IndianRupee, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import Image from "next/image";
import { placeholderImages } from "@/lib/placeholder-images";
import { useUser } from "@/firebase";
import { useRoles } from "@/hooks/use-roles";
import { useEffect, useState, useMemo } from "react";
import { fetchSubmissions, dismissAlertAction } from "@/app/actions";
import { Submission } from "@/lib/types";
import { format, addDays, isAfter, isBefore, startOfDay } from "date-fns";

export default function Home() {
  const { user } = useUser();
  const { isAdmin } = useRoles();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissingAlertId, setDismissingAlertId] = useState<string | null>(null);
  const [dismissNote, setDismissNote] = useState("");
  const [isDismissing, setIsDismissing] = useState(false);
  
  const dashboardImage = placeholderImages.find(p => p.id === 'dashboard-hero');

  const loadData = async () => {
    const data = await fetchSubmissions();
    setSubmissions(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDismissAlert = async () => {
    if (!dismissingAlertId || !dismissNote.trim()) return;
    setIsDismissing(true);
    const res = await dismissAlertAction(dismissingAlertId, dismissNote);
    if (res.success) {
      setSubmissions(prev => prev.map(s => s.id === dismissingAlertId ? { ...s, isAlertResolved: true } : s));
      setDismissingAlertId(null);
      setDismissNote("");
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
          overdueDeliveries.push(sub); // Overdue (Green color requested)
      } else if (isBefore(deliveryDueDate, addDays(today, 3))) {
          upcomingDeliveries.push(sub); // Expected (Orange color requested)
      }
    });

    overdueDeliveries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    upcomingDeliveries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // 4. Overdue Payments (Purple)
    const overduePayments = unresolvedData.filter(sub => 
      sub.documentType === 'Bill' && 
      sub.paymentStatus === 'Pending' &&
      isBefore(new Date(sub.createdAt), thirtyDaysAgo)
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return { missingAppointments, upcomingAppointments, overdueDeliveries, upcomingDeliveries, overduePayments };
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
                       alerts.overdueDeliveries.length > 0 || 
                       alerts.overduePayments.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Dialog open={!!dismissingAlertId} onOpenChange={(open) => !open && setDismissingAlertId(null)}>
        <DialogContent className="glass-card border-none sm:max-w-md rounded-3xl">
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

      {hasAnyAlerts && (
        <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-foreground/50 ml-2">Action Needed</h3>
            
            <Accordion type="single" collapsible className="w-full space-y-4">
                {alerts.missingAppointments.length > 0 && (
                <AccordionItem value="missing-appointments" className="border-none bg-card/30 rounded-3xl overflow-hidden glass-card">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-card/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-500/10 p-2 rounded-xl text-red-500">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-red-600">Appointment Not Given</span>
                            <Badge variant="secondary" className="ml-2 bg-red-500/20 text-red-700 hover:bg-red-500/20">{alerts.missingAppointments.length}</Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {alerts.missingAppointments.map((app, idx) => (
                                <div key={`miss-${idx}`} className="relative glass-card p-4 rounded-3xl border-l-4 border-l-red-500 group transition-colors">
                                    <Link href={`/records?id=${app.id}`} className="flex items-center justify-between h-full">
                                        <div className="flex flex-col gap-1 pr-8">
                                            <p className="font-bold text-foreground">{app.patientName}</p>
                                            <p className="text-xs text-muted-foreground">Received {format(new Date(app.createdAt), 'MMM d')} - {app.item}</p>
                                        </div>
                                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-none font-black text-[10px] uppercase shrink-0">Needs Action</Badge>
                                    </Link>
                                    <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-500" onClick={(e) => { e.preventDefault(); setDismissingAlertId(app.id); }}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                )}

                {alerts.overdueDeliveries.length > 0 && (
                <AccordionItem value="overdue-deliveries" className="border-none bg-card/30 rounded-3xl overflow-hidden glass-card">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-card/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-500/10 p-2 rounded-xl text-green-500">
                                <Clock className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-green-600">Overdue Delivery</span>
                            <Badge variant="secondary" className="ml-2 bg-green-500/20 text-green-700 hover:bg-green-500/20">{alerts.overdueDeliveries.length}</Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {alerts.overdueDeliveries.map((alert, idx) => (
                                <div key={`over-${idx}`} className="relative glass-card p-4 rounded-3xl border-l-4 border-l-green-500 group transition-colors">
                                    <Link href={`/records?id=${alert.id}`} className="flex items-center justify-between h-full">
                                        <div className="flex flex-col gap-1 pr-8">
                                            <p className="font-bold text-foreground">{alert.patientName}</p>
                                            <p className="text-xs text-muted-foreground">{alert.item} from {alert.labName}</p>
                                        </div>
                                        <Badge variant="outline" className="bg-green-500/10 text-green-700 border-none font-black text-[10px] uppercase shrink-0">{getExpectedDateText(alert)}</Badge>
                                    </Link>
                                    <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-500/10 hover:text-green-500" onClick={(e) => { e.preventDefault(); setDismissingAlertId(alert.id); }}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                )}

                {alerts.upcomingDeliveries.length > 0 && (
                <AccordionItem value="expected-deliveries" className="border-none bg-card/30 rounded-3xl overflow-hidden glass-card">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-card/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-500/10 p-2 rounded-xl text-orange-500">
                                <Truck className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-orange-600">Expected Delivery</span>
                            <Badge variant="secondary" className="ml-2 bg-orange-500/20 text-orange-700 hover:bg-orange-500/20">{alerts.upcomingDeliveries.length}</Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {alerts.upcomingDeliveries.map((alert, idx) => (
                                <div key={`exp-${idx}`} className="relative glass-card p-4 rounded-3xl border-l-4 border-l-orange-500 group transition-colors">
                                    <Link href={`/records?id=${alert.id}`} className="flex items-center justify-between h-full">
                                        <div className="flex flex-col gap-1 pr-8">
                                            <p className="font-bold text-foreground">{alert.patientName}</p>
                                            <p className="text-xs text-muted-foreground">{alert.item} from {alert.labName}</p>
                                        </div>
                                        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-none font-black text-[10px] uppercase shrink-0">{getExpectedDateText(alert)}</Badge>
                                    </Link>
                                    <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-500/10 hover:text-orange-500" onClick={(e) => { e.preventDefault(); setDismissingAlertId(alert.id); }}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                )}

                {alerts.upcomingAppointments.length > 0 && (
                <AccordionItem value="upcoming-appointments" className="border-none bg-card/30 rounded-3xl overflow-hidden glass-card">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-card/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-500/10 p-2 rounded-xl text-blue-500">
                                <CalendarIcon className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-blue-600">Upcoming Appointments</span>
                            <Badge variant="secondary" className="ml-2 bg-blue-500/20 text-blue-700 hover:bg-blue-500/20">{alerts.upcomingAppointments.length}</Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {alerts.upcomingAppointments.map((app, idx) => (
                                <div key={`upc-${idx}`} className="relative glass-card p-4 rounded-3xl border-l-4 border-l-blue-500 group transition-colors">
                                    <Link href={`/records?id=${app.id}`} className="flex items-center justify-between h-full">
                                        <div className="flex flex-col gap-1 pr-8">
                                            <p className="font-bold text-foreground">{app.patientName}</p>
                                            <p className="text-xs text-muted-foreground">{app.item}</p>
                                        </div>
                                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-none font-bold text-[11px] shrink-0">
                                            {format(new Date(app.appointmentDate!), 'MMM d, h:mm a')}
                                        </Badge>
                                    </Link>
                                    <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-500/10 hover:text-blue-500" onClick={(e) => { e.preventDefault(); setDismissingAlertId(app.id); }}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                )}

                {alerts.overduePayments.length > 0 && (
                <AccordionItem value="overdue-payments" className="border-none bg-card/30 rounded-3xl overflow-hidden glass-card">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-card/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-500/10 p-2 rounded-xl text-purple-500">
                                <IndianRupee className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-purple-600">Overdue Payments</span>
                            <Badge variant="secondary" className="ml-2 bg-purple-500/20 text-purple-700 hover:bg-purple-500/20">{alerts.overduePayments.length}</Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {alerts.overduePayments.map((payment, idx) => (
                                <div key={`pay-${idx}`} className="relative glass-card p-4 rounded-3xl border-l-4 border-l-purple-500 group transition-colors">
                                    <Link href={`/bills`} className="flex items-center justify-between h-full">
                                        <div className="flex flex-col gap-1 pr-8">
                                            <p className="font-bold text-foreground">{payment.labName}</p>
                                            <p className="text-xs text-muted-foreground">Billed {format(new Date(payment.createdAt), 'MMM d')} - {payment.item}</p>
                                        </div>
                                        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-none font-black text-[10px] uppercase shrink-0">₹{payment.billAmount}</Badge>
                                    </Link>
                                    <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-500/10 hover:text-purple-500" onClick={(e) => { e.preventDefault(); setDismissingAlertId(payment.id); }}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                )}
            </Accordion>
        </div>
      )}



      {/* Stats/Status Row */}
      <div className="flex items-center justify-between bg-card/50 border border-border/50 p-4 rounded-2xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className="w-5 h-5 text-primary" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse border-2 border-background" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">System Status</p>
            <p className="text-sm font-bold text-foreground">Cloud Sync Active</p>
          </div>
        </div>
        <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Session</p>
            <p className="text-sm font-bold text-primary">{user?.email?.split('@')[0] || 'Guest'}</p>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/send" className="group">
          <Card className="h-full glass-card border-none hover:bg-primary/5 transition-all duration-300">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary/20 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                  <Send className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Send Item</h2>
                  <p className="text-xs text-muted-foreground font-medium">Dispatch case to lab</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/receive" className="group">
          <Card className="h-full glass-card border-none hover:bg-primary/5 transition-all duration-300">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary/20 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                  <Save className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Receive Item</h2>
                  <p className="text-xs text-muted-foreground font-medium">Log incoming case</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Admin & Secondary Actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {isAdmin && (
          <>
          <Link href="/admin/users" className="col-span-2 md:col-span-1">
            <Card className="h-full glass-card border-none hover:bg-primary/10 transition-all border-l-4 border-l-primary shadow-xl group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/20 p-4 rounded-2xl group-hover:rotate-12 transition-transform">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight">Manage Team</h2>
                    <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Admin Control</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/approvals" className="col-span-2 md:col-span-1">
            <Card className="h-full glass-card border-none hover:bg-primary/10 transition-all border-l-4 border-l-primary shadow-xl group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/20 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight">Approvals</h2>
                    <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Pending Orders</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
              </CardContent>
            </Card>
          </Link>
          </>
        )}
        
        <Link href="/records" className={isAdmin ? "col-span-2 md:col-span-1" : "col-span-2 md:col-span-2 lg:col-span-1"}>
            <Button variant="outline" className="w-full h-24 rounded-3xl border-none glass-card hover:bg-white/10 flex flex-col gap-2 font-bold text-lg p-0">
                <div className="flex flex-col items-center justify-center h-full w-full">
                    <History className="w-6 h-6 text-primary" />
                    Activity Log
                </div>
            </Button>
        </Link>
        <Button variant="outline" className="h-24 rounded-3xl border-none glass-card hover:bg-white/10 flex flex-col gap-2 font-bold opacity-50 cursor-not-allowed">
            <Settings className="w-6 h-6" />
            Settings
        </Button>
      </div>

      <footer className="pt-8 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
          Professional Laboratory Logistics Framework v2.0
        </p>
      </footer>
    </div>
  );
}

