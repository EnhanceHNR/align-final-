import { fetchSubmissions } from "@/app/dashboard/lab/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, ArrowRight, UserCheck, Clock } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format, isAfter, isBefore, addDays, startOfDay } from "date-fns";

export const dynamic = 'force-dynamic';

export default async function LabAppointmentsPage() {
  try {
    const submissions = await fetchSubmissions();
    const appointments = submissions
      .filter(sub => sub.appointmentStatus === 'Appointment given' && sub.appointmentDate)
      .sort((a, b) => new Date(a.appointmentDate!).getTime() - new Date(b.appointmentDate!).getTime());

    return (
      <div className="container mx-auto p-4 md:p-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Card className="glass-card border-none shadow-2xl overflow-hidden mb-8">
            <CardHeader className="bg-white/50 dark:bg-white/5 border-b border-border/10 p-6 md:p-8">
                <div className="flex items-center gap-5">
                    <div className="bg-primary/10 p-3 rounded-2xl">
                        <CalendarIcon className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-3xl font-bold tracking-tight">Pending Appointments</CardTitle>
                        <CardDescription className="text-base">All cases with upcoming appointments</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 md:p-8 bg-muted/10">
                {appointments.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground font-medium">No pending appointments found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {appointments.map((app, idx) => {
                            const isUpcoming = isAfter(new Date(app.appointmentDate!), startOfDay(new Date())) && isBefore(new Date(app.appointmentDate!), addDays(startOfDay(new Date()), 4));
                            const isPast = isBefore(new Date(app.appointmentDate!), startOfDay(new Date()));
                            
                            return (
                                <Link href="/dashboard/lab/records" key={idx} className="block group">
                                    <div className={`p-5 rounded-3xl border-l-4 ${isUpcoming ? 'border-l-orange-500 bg-orange-500/5 hover:bg-orange-500/10' : isPast ? 'border-l-destructive bg-destructive/5 hover:bg-destructive/10' : 'border-l-blue-500 bg-blue-500/5 hover:bg-blue-500/10'} flex items-start justify-between transition-colors h-full`}>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={`${isUpcoming ? 'bg-orange-500/10 text-orange-600 border-none' : isPast ? 'bg-destructive/10 text-destructive border-none' : 'bg-blue-500/10 text-blue-600 border-none'}`}>
                                                    {format(new Date(app.appointmentDate!), 'MMM d, yyyy')}
                                                </Badge>
                                                {isUpcoming && <span className="text-[10px] font-black uppercase text-orange-500 animate-pulse">Soon</span>}
                                                {isPast && <span className="text-[10px] font-black uppercase text-destructive">Past Due</span>}
                                            </div>
                                            <div className="space-y-1 mt-2">
                                                <h3 className="font-bold text-foreground text-lg">{app.patientName}</h3>
                                                <p className="text-sm text-muted-foreground font-medium flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {app.item}
                                                </p>
                                            </div>
                                            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                                                <UserCheck className="w-4 h-4 text-primary" /> {app.labName}
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity text-primary mt-2" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    );
  } catch (error: any) {
    return (
      <div className="p-10 bg-red-100 text-red-900 border border-red-500 rounded-xl m-10">
        <h2 className="text-xl font-bold">Appointments Page Error</h2>
        <pre className="whitespace-pre-wrap mt-4">{error.stack || error.message || String(error)}</pre>
      </div>
    );
  }
}
