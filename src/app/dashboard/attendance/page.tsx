"use client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from 'date-fns';

import React, { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Clock, Loader2, MapPin, Download, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";

import { Badge } from "~/components/ui/badge";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClockInOutDialog } from "@/components/attendance/clock-in-out-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function safeFormat(dateVal: any, formatStr: string) {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? 'Invalid Time' : format(d, formatStr);
}


export default function AttendancePage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: profile, isLoading: isLoadingProfile } = api.employee.getProfile.useQuery(
    { userId: session?.user?.id },
    { enabled: !!session?.user?.id }
  );

  const { data: employeeDetails } = api.employee.getEmployeeDetails.useQuery(
    { employeeProfileId: profile?.id as string },
    { enabled: !!profile?.id }
  );

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const currentMonthAttendances = employeeDetails?.attendances?.filter((a: any) => isSameMonth(new Date(a.date), currentMonth)) || [];

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)));


  const { data: todayAttendance, refetch: refetchAttendance, isLoading: isLoadingAttendance } = api.attendance.getToday.useQuery(
    { employeeProfileId: profile?.id as string },
    { enabled: !!profile?.id }
  );

  const clockInMutation = api.attendance.clockIn.useMutation({
    onSuccess: () => {
      toast({ title: "Clocked in successfully" });
      refetchAttendance();
    },
    onError: (error) => {
      toast({ title: "Failed to clock in", description: error.message, variant: "destructive" });
    }
  });

  const clockOutMutation = api.attendance.clockOut.useMutation({
    onSuccess: () => {
      toast({ title: "Clocked out successfully" });
      refetchAttendance();
    },
    onError: (error) => {
      toast({ title: "Failed to clock out", description: error.message, variant: "destructive" });
    }
  });

  const handleClockIn = () => {
    if (!profile) return;
    clockInMutation.mutate({
      employeeProfileId: profile.id,
      lat: 0,
      lng: 0,
    });
  };

  const handleClockOut = () => {
    if (!todayAttendance || todayAttendance.sessions.length === 0) return;
    const currentSession = todayAttendance.sessions[todayAttendance.sessions.length - 1];
    clockOutMutation.mutate({
      sessionId: currentSession.id,
      lat: 0,
      lng: 0,
    });
  };

  if (isLoadingProfile || isLoadingAttendance) {
    return <div className="flex h-full items-center justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  if (!profile) {
    return (
      <div className="p-8">
        <PageHeader title="Attendance" />
        <Card className="mt-6 border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6 text-destructive">
            Your user account is not linked to an Employee Profile. Please contact the administrator.
          </CardContent>
        </Card>
      </div>
    );
  }

  const isClockedIn = todayAttendance?.sessions.some(s => !s.clockOutTime) ?? false;

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 h-full max-w-full overflow-x-hidden">
      <PageHeader title="Attendance" />
      
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Punch In/Out</CardTitle>
              <CardDescription className="text-sm">
                Mark your attendance for today.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="rounded-lg border p-3 sm:p-4 text-center">
                <p className="text-xs sm:text-sm text-muted-foreground">Current Time</p>
                <p className="text-3xl sm:text-4xl font-bold tracking-tight">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <ClockInOutDialog 
        isClockedIn={isClockedIn} 
        onClockIn={handleClockIn} 
        onClockOut={handleClockOut} 
     />
                
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">Late Arrival</Button>
                  <Button variant="outline" className="flex-1">Early Punch Out</Button>
                </div>
              </div>

              {todayAttendance && todayAttendance.sessions.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-semibold mb-2">Today's Sessions</h4>
                  <div className="space-y-2">
                    {todayAttendance.sessions.map((session, i) => (
                      <div key={session.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-slate-50 dark:bg-slate-900 border">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Session {i + 1}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 font-medium">
                            {safeFormat(session.clockInTime, 'HH:mm')}
                          </span>
                          <span className="text-muted-foreground">-</span>
                          <span className={session.clockOutTime ? "text-amber-600 font-medium" : "text-muted-foreground italic"}>
                            {session.clockOutTime ? safeFormat(session.clockOutTime, 'HH:mm') : "Ongoing"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="history">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
              <TabsList>
                <TabsTrigger value="history" className="text-sm">History</TabsTrigger>
                <TabsTrigger value="calendar" className="text-sm">Calendar</TabsTrigger>
                <TabsTrigger value="report" className="text-sm">AI Report</TabsTrigger>
              </TabsList>
              <Button variant="outline" className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> <span className="text-sm sm:text-base">Export All</span>
              </Button>
            </div>
            
            <TabsContent value="history" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Attendance History</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Punch In</TableHead>
                        <TableHead>Punch Out</TableHead>
                        <TableHead>Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todayAttendance ? (
                        <TableRow>
                           <TableCell className="font-medium">{safeFormat(todayAttendance.date, 'MMM dd, yyyy')}</TableCell>
                           <TableCell><Badge className="bg-emerald-500 hover:bg-emerald-600">{todayAttendance.status}</Badge></TableCell>
                           <TableCell>
                              {todayAttendance.sessions[0] ? safeFormat(todayAttendance.sessions[0].clockInTime, 'HH:mm') : '-'}
                           </TableCell>
                           <TableCell>
                              {todayAttendance.sessions[todayAttendance.sessions.length - 1]?.clockOutTime 
                                ? safeFormat(todayAttendance.sessions[todayAttendance.sessions.length - 1].clockOutTime!, 'HH:mm') 
                                : '-'}
                           </TableCell>
                           <TableCell>-</TableCell>
                        </TableRow>
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            No attendance history found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="calendar" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Calendar</CardTitle>
                  <CardDescription>View your attendance patterns over the month.</CardDescription>
                </CardHeader>
                
                <CardContent className="pt-6">
                  <div className="flex justify-center">
                    <div className="w-full max-w-sm">
                      <div className="flex items-center justify-between p-4">
                        <Button variant="ghost" size="icon" onClick={handlePrevMonth}><ChevronLeft className="h-5 w-5" /></Button>
                        <h3 className="font-semibold text-lg">{format(currentMonth, 'MMMM yyyy')}</h3>
                        <Button variant="ghost" size="icon" onClick={handleNextMonth}><ChevronRight className="h-5 w-5" /></Button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 px-2 text-center mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                          <div key={day} className="text-xs font-medium text-muted-foreground">{day}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-2 px-2">
                        {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                          <div key={`empty-${i}`} className="h-8 w-8"></div>
                        ))}
                        {daysInMonth.map(day => {
                          let bgColor = "bg-transparent hover:bg-slate-100";
                          let textColor = "text-slate-700";
                          
                          const attendanceRecord = currentMonthAttendances.find((a: any) => isSameDay(new Date(a.date), day));
                          
                          if (attendanceRecord) {
                              if (attendanceRecord.status === "Present") {
                                 bgColor = "bg-emerald-100";
                                 textColor = "text-emerald-700";
                              } else if (attendanceRecord.status === "Absent") {
                                 bgColor = "bg-red-200";
                                 textColor = "text-red-700";
                              } else if (attendanceRecord.status === "Late" || attendanceRecord.status === "Double Late") {
                                 bgColor = "bg-amber-700";
                                 textColor = "text-white";
                              } else if (attendanceRecord.status === "Grace Period") {
                                 bgColor = "bg-yellow-400";
                                 textColor = "text-yellow-900";
                              } else if (attendanceRecord.status.includes("Leave")) {
                                 bgColor = "bg-amber-100";
                                 textColor = "text-amber-700";
                              } else if (attendanceRecord.status === "Holiday" || attendanceRecord.status === "Weekend") {
                                 bgColor = "bg-slate-100";
                                 textColor = "text-slate-400";
                              }
                          }

                          return (
                            <div key={day.toISOString()} className="flex justify-center items-center">
                              <div 
                                 onClick={() => setSelectedDate(day)}
                                 className={`h-8 w-8 flex items-center justify-center rounded-sm text-sm cursor-pointer hover:ring-2 hover:ring-slate-300 transition-all ${bgColor} ${textColor} ${isToday(day) ? 'ring-2 ring-slate-400' : ''}`}>
                                {day.getDate()}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {/* Selected Date Details */}
                  {selectedDate && (
                    <div className="mt-6 border-t pt-6">
                        <h4 className="font-semibold mb-2">Details for {format(selectedDate, 'MMMM dd, yyyy')}</h4>
                        {(() => {
                          const att = currentMonthAttendances.find((a: any) => isSameDay(new Date(a.date), selectedDate));
                          if (!att) return <p className="text-sm text-muted-foreground">No attendance record for this date.</p>;
                          
                          return (
                            <div className="space-y-4">
                              <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-slate-100">
                                Status: <span className="font-bold">{att.status}</span>
                              </div>
                              
                              {att.sessions && att.sessions.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {att.sessions.map((session: any, idx: number) => (
                                    <div key={session.id} className="border rounded-lg p-4 bg-slate-50 space-y-3">
                                      <h5 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Session {idx + 1}</h5>
                                      <div className="flex justify-between text-sm">
                                        <div>
                                          <p className="text-muted-foreground">Punch In</p>
                                          <p className="font-medium">{session.clockInTime ? safeFormat(session.clockInTime, 'hh:mm a') : 'N/A'}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-muted-foreground">Punch Out</p>
                                          <p className="font-medium">{session.clockOutTime ? safeFormat(session.clockOutTime, 'hh:mm a') : 'N/A'}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex gap-2 mt-2">
                                        {session.clockInPhoto && (
                                          <div className="flex-1">
                                            <p className="text-[10px] text-muted-foreground mb-1 uppercase font-semibold">In Photo</p>
                                            <img src={session.clockInPhoto} alt="Clock In" className="w-full h-20 object-cover rounded border border-slate-200" />
                                          </div>
                                        )}
                                        {session.clockOutPhoto && (
                                          <div className="flex-1">
                                            <p className="text-[10px] text-muted-foreground mb-1 uppercase font-semibold">Out Photo</p>
                                            <img src={session.clockOutPhoto} alt="Clock Out" className="w-full h-20 object-cover rounded border border-slate-200" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No punch details recorded.</p>
                              )}
                            </div>
                          );
                        })()}
                    </div>
                  )}
                </CardContent>

              </Card>
            </TabsContent>

            <TabsContent value="report" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>AI-Generated Attendance Report</CardTitle>
                  <CardDescription>Generate a summary of your attendance.</CardDescription>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center border-dashed border-2 m-6 rounded-xl text-muted-foreground">
                  AI Report generation will be integrated soon.
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}