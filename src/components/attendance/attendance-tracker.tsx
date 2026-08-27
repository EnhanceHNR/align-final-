
'use client';
import { useState, useEffect, useContext } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Download, FileBarChart2, View, UserPlus, Pencil } from 'lucide-react';
import {
  generateAttendanceReport,
  type AttendanceReportOutput,
} from '@/ai/flows/attendance-report-generator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { ClockInOutDialog } from '@/components/attendance/clock-in-out-dialog';
import { Button } from '@/components/ui/button';
import { AttendanceDetailDialog } from '@/components/attendance/attendance-detail-dialog';
import { AppContext } from '@/context/app-context';
import { ManualAttendanceDialog } from '@/components/attendance/manual-attendance-dialog';
import { MissedPunchDialog } from '@/components/attendance/missed-punch-dialog';
import { AdminAttendanceOverrideDialog } from '@/components/attendance/admin-attendance-override-dialog';
import type { Attendance } from '@/lib/types';
import { Calendar as CalendarIcon, Search, Edit2, Camera, MapPin, X } from 'lucide-react';
import { EditAttendanceDialog } from '@/components/attendance/edit-attendance-dialog';
import EmployeeAttendanceCalendar from '@/components/employees/employee-attendance-calendar';
import { exportToCSV, getCurrentDateString } from '@/lib/csv-export';
import { calculateSalaryFromRules } from '@/lib/salary-rules';
import { useToast } from '@/hooks/use-toast';

export default function AttendanceTracker() {
  const [report, setReport] = useState<AttendanceReportOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [recordToEdit, setRecordToEdit] = useState<Attendance | null>(null);

  const {
    currentUser,
    employees,
    attendance,
    leaves,
    holidays,
    isClockedIn,
    handleClockIn,
    handleClockOut,
    handleManualEntry,
    lastCapture,
    handleUpdateAttendance,
    isResigned,
  } = useContext(AppContext);
  
  const { toast } = useToast();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(currentUser?.id);

  useEffect(() => {
    if (currentUser && !selectedEmployeeId) {
      setSelectedEmployeeId(currentUser.id);
    }
  }, [currentUser, selectedEmployeeId]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedEmployeeId) return;
    setIsLoading(true);
    setReport(null);
    const result = await generateAttendanceReport({
      employeeId: selectedEmployeeId,
      startDate: '2024-08-01',
      endDate: '2024-08-31',
    });
    setReport(result);
    setIsLoading(false);
  };

  const [exportEmployeeId, setExportEmployeeId] = useState<string>('');
  const [exportMonth, setExportMonth] = useState<string>('');

  const handleExportAttendance = () => {
    try {
      const attendanceToExport = isAdmin 
        ? attendance 
        : attendance.filter((a) => a.employeeId === currentUser?.id);

      if (attendanceToExport.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No Data',
          description: 'No attendance records available to export.',
        });
        return;
      }

      const exportData: any[] = [];
      
      attendanceToExport.forEach((record) => {
        const employeeName = employees.find((e) => e.id === record.employeeId)?.name || 'Unknown';
        const employeeData = employees.find((e) => e.id === record.employeeId);
        
        let dailyTotalHours = '-';
        let incompleteHoursStr = '-';
        let extraHoursStr = '-';
        let incompleteAmountStr = '-';
        let extraAmountStr = '-';

        if (employeeData && record.sessions && record.sessions.length > 0) {
           const singleDayCalc = calculateSalaryFromRules({
               employee: employeeData,
               attendance: [record],
               leaves: [],
               holidays: [],
               configTimeline: [],
               startDate: new Date(record.date),
               endDate: new Date(record.date)
           });
           
           if (singleDayCalc) {
               dailyTotalHours = singleDayCalc.details.totalWorkedHours.toFixed(2);
               // Incomplete Hours
               if (singleDayCalc.incompleteHours > 0) {
                   incompleteHoursStr = singleDayCalc.incompleteHours.toFixed(2);
                   incompleteAmountStr = singleDayCalc.incompleteHoursDeduction.toFixed(2);
               } else {
                   incompleteHoursStr = '0.00';
                   incompleteAmountStr = '0.00';
               }
               // Extra Hours
               if (singleDayCalc.extraHours > 0) {
                   extraHoursStr = singleDayCalc.extraHours.toFixed(2);
                   extraAmountStr = singleDayCalc.extraHoursCredit.toFixed(2);
               } else {
                   extraHoursStr = '0.00';
                   extraAmountStr = '0.00';
               }
           }
        }
        
        if (record.sessions && record.sessions.length > 0) {
          record.sessions.forEach((session) => {
            const clockInRemark = session.clockIn?.remarks ? `In: ${session.clockIn.remarks}` : '';
            const clockOutRemark = session.clockOut?.remarks ? `Out: ${session.clockOut.remarks}` : '';
            const sessionRemark = session.remarks ? `Session: ${session.remarks}` : '';
            const allRemarks = [clockInRemark, clockOutRemark, sessionRemark].filter(Boolean).join(' | ') || '-';

            exportData.push({
              'Employee Name': employeeName,
              'Date': record.date,
              'Status': record.isLateException ? `${record.status} (Exception)` : record.status,
              'Late Minutes': record.lateMinutes || '-',
              'Exception Reason': record.lateExceptionReason || '-',
              'Punch In Time': session.clockIn.time,
              'Punch Out Time': session.clockOut?.time || '-',
              'Duration': session.duration,
              'Incomplete Hrs': incompleteHoursStr,
              'Incomplete Amt (Deduction)': incompleteAmountStr,
              'Extra Hrs': extraHoursStr,
              'Extra Amt (Credit)': extraAmountStr,
              'Remarks': allRemarks,
              'Daily Total Hours': dailyTotalHours,
            });
          });
        } else {
          exportData.push({
            'Employee Name': employeeName,
            'Date': record.date,
            'Status': record.status,
            'Late Minutes': '-',
            'Exception Reason': '-',
            'Punch In Time': '-',
            'Punch Out Time': '-',
            'Duration': '-',
            'Incomplete Hrs': '-',
            'Incomplete Amt (Deduction)': '-',
            'Extra Hrs': '-',
            'Extra Amt (Credit)': '-',
            'Remarks': '-',
            'Daily Total Hours': '-',
          });
        }
      });

      exportToCSV({
        data: exportData,
        filename: `attendance_${getCurrentDateString()}.csv`,
      });

      toast({
        title: 'Export Successful',
        description: `Exported ${exportData.length} attendance record${exportData.length !== 1 ? 's' : ''} to CSV.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'An error occurred while exporting attendance records.',
      });
    }
  };

  const handleFilteredExport = () => {
    if (!exportEmployeeId || !exportMonth) {
      toast({
        variant: 'destructive',
        title: 'Missing Selection',
        description: 'Please select both employee and month.',
      });
      return;
    }

    try {
      const [year, month] = exportMonth.split('-');
      const filteredAttendance = attendance.filter((a) => {
        const recordDate = new Date(a.date);
        const recordYear = recordDate.getFullYear().toString();
        const recordMonth = (recordDate.getMonth() + 1).toString().padStart(2, '0');
        return a.employeeId === exportEmployeeId && recordYear === year && recordMonth === month;
      });

      if (filteredAttendance.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No Data',
          description: 'No attendance records found for the selected employee and month.',
        });
        return;
      }

      const exportData: any[] = [];
      const employeeName = employees.find((e) => e.id === exportEmployeeId)?.name || 'Unknown';
      
      filteredAttendance.forEach((record) => {
        // Calculate daily stats using salary rules
        const employeeName = employees.find((e) => e.id === exportEmployeeId)?.name || 'Unknown';
        const employeeData = employees.find((e) => e.id === exportEmployeeId);
        
        let dailyTotalHours = '-';
        let incompleteHoursStr = '-';
        let extraHoursStr = '-';
        let incompleteAmountStr = '-';
        let extraAmountStr = '-';
        
        if (employeeData && record.sessions && record.sessions.length > 0) {
           // We can run a single day calculation to get the exact hours/amounts just for this day
           const singleDayCalc = calculateSalaryFromRules({
               employee: employeeData,
               attendance: [record],
               leaves: [],
               holidays: [],
               configTimeline: [],
               startDate: new Date(record.date),
               endDate: new Date(record.date)
           });
           
           if (singleDayCalc) {
               dailyTotalHours = singleDayCalc.details.totalWorkedHours.toFixed(2);
               // Incomplete Hours
               if (singleDayCalc.incompleteHours > 0) {
                   incompleteHoursStr = singleDayCalc.incompleteHours.toFixed(2);
                   incompleteAmountStr = singleDayCalc.incompleteHoursDeduction.toFixed(2);
               } else {
                   incompleteHoursStr = '0.00';
                   incompleteAmountStr = '0.00';
               }
               // Extra Hours
               if (singleDayCalc.extraHours > 0) {
                   extraHoursStr = singleDayCalc.extraHours.toFixed(2);
                   extraAmountStr = singleDayCalc.extraHoursCredit.toFixed(2);
               } else {
                   extraHoursStr = '0.00';
                   extraAmountStr = '0.00';
               }
           }
        }
      
        if (record.sessions && record.sessions.length > 0) {
          record.sessions.forEach((session) => {
            const clockInRemark = session.clockIn?.remarks ? `In: ${session.clockIn.remarks}` : '';
            const clockOutRemark = session.clockOut?.remarks ? `Out: ${session.clockOut.remarks}` : '';
            const sessionRemark = session.remarks ? `Session: ${session.remarks}` : '';
            const allRemarks = [clockInRemark, clockOutRemark, sessionRemark].filter(Boolean).join(' | ') || '-';

            exportData.push({
              'Employee Name': employeeName,
              'Date': record.date,
              'Status': record.isLateException ? `${record.status} (Exception)` : record.status,
              'Late Minutes': record.lateMinutes || '-',
              'Exception Reason': record.lateExceptionReason || '-',
              'Punch In Time': session.clockIn.time,
              'Punch Out Time': session.clockOut?.time || '-',
              'Duration': session.duration,
              'Incomplete Hrs': incompleteHoursStr,
              'Incomplete Amt (Deduction)': incompleteAmountStr,
              'Extra Hrs': extraHoursStr,
              'Extra Amt (Credit)': extraAmountStr,
              'Remarks': allRemarks,
            });
          });
        } else {
          exportData.push({
            'Employee Name': employeeName,
            'Date': record.date,
            'Status': record.status,
            'Late Minutes': '-',
            'Exception Reason': '-',
            'Punch In Time': '-',
            'Punch Out Time': '-',
            'Duration': '-',
            'Incomplete Hrs': '-',
            'Incomplete Amt (Deduction)': '-',
            'Extra Hrs': '-',
            'Extra Amt (Credit)': '-',
            'Remarks': '-',
          });
        }
      });

      exportToCSV({
        data: exportData,
        filename: `attendance_${employeeName.replace(/\s+/g, '_')}_${exportMonth}.csv`,
      });

      toast({
        title: 'Export Successful',
        description: `Exported ${exportData.length} attendance record${exportData.length !== 1 ? 's' : ''} for ${employeeName} (${exportMonth}).`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'An error occurred while exporting attendance records.',
      });
    }
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'Present':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Late':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'Absent':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Holiday':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'secondary';
    }
  };

  const userAttendanceHistory = attendance.filter(
    (a) => a.employeeId === selectedEmployeeId
  );
  
  const isAdmin = currentUser?.employeeType === 'Admin' || currentUser?.employeeType === 'Super Admin';
  const isViewingSelf = currentUser?.id === selectedEmployeeId;
  const selectedEmployeeName = employees.find(e => e.id === selectedEmployeeId)?.name || "employee";

  return (
    <>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {isViewingSelf && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Punch In/Out</CardTitle>
                <CardDescription className="text-sm">
                  Mark your attendance for today. Photo will be captured.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="rounded-lg border p-3 sm:p-4 text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">Current Time</p>
                  <p className="font-headline text-3xl sm:text-4xl font-bold">
                    {currentTime
                      ? currentTime.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '--:--'}
                  </p>
                </div>

                <ClockInOutDialog
                  isClockedIn={isClockedIn}
                  onClockIn={handleClockIn}
                  onClockOut={handleClockOut}
                  isResigned={isResigned}
                />
                
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <MissedPunchDialog />
                </div>

                {lastCapture && (
                  <div className="flex items-center gap-4 rounded-lg border p-2">
                    <Image
                      src={lastCapture.photo}
                      alt="Last capture"
                      width={64}
                      height={48}
                      className="rounded-md object-cover aspect-video"
                      data-ai-hint="person selfie"
                    />
                    <div>
                      <p className="font-semibold">
                        Last Punched {lastCapture.status}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        at {lastCapture.time}
                      </p>
                    </div>
                  </div>
                )}
                <p className="text-center text-sm text-muted-foreground">
                  {isClockedIn
                    ? `Punched In at ${lastCapture?.time}`
                    : 'You are currently punched out.'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        <div className={isViewingSelf ? 'lg:col-span-2' : 'lg:col-span-3'}>
          {isAdmin && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Export Filtered Attendance</CardTitle>
                <CardDescription className="text-sm">Select employee and month to download specific attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="export-employee">Employee</Label>
                    <Select value={exportEmployeeId} onValueChange={setExportEmployeeId}>
                      <SelectTrigger id="export-employee">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="export-month">Month</Label>
                    <input
                      id="export-month"
                      type="month"
                      value={exportMonth}
                      onChange={(e) => setExportMonth(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleFilteredExport} disabled={!exportEmployeeId || !exportMonth}>
                      <Download className="mr-2 h-4 w-4" /> Download CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <Tabs defaultValue="calendar">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
              <TabsList>
                <TabsTrigger value="history" className="text-sm">History</TabsTrigger>
                <TabsTrigger value="calendar" className="text-sm">Calendar</TabsTrigger>
                <TabsTrigger value="report" className="text-sm">AI Report</TabsTrigger>
              </TabsList>
              <Button 
                variant="outline" 
                onClick={handleExportAttendance}
                disabled={attendance.length === 0}
                className="w-full sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" /> <span className="text-sm sm:text-base">Export All</span>
              </Button>
            </div>
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Attendance History</CardTitle>
                  {isAdmin ? (
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="employee-select" className="text-sm">Select Employee</Label>
                      <Select
                        value={selectedEmployeeId}
                        onValueChange={setSelectedEmployeeId}
                      >
                        <SelectTrigger id="employee-select" className="w-full sm:w-full md:w-72 text-sm">
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <CardDescription>
                      Your personal attendance record.
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="table-container overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Punch In</TableHead>
                        <TableHead>Punch Out</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userAttendanceHistory.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center text-muted-foreground"
                          >
                            No attendance records found for this employee.
                          </TableCell>
                        </TableRow>
                      )}
                      {userAttendanceHistory.map((record) =>
                        record.sessions && record.sessions.length > 0 ? (
                          record.sessions.map((session, index) => (
                            <TableRow key={`${record.id}-${index}`}>
                              <TableCell>
                                {index === 0 ? record.date : ''}
                              </TableCell>
                              <TableCell>{session.clockIn.time}</TableCell>
                              <TableCell>
                                {session.clockOut?.time ?? '-'}
                              </TableCell>
                              <TableCell>{session.duration}</TableCell>
                              <TableCell>
                                {index === 0 && (
                                  <div className="flex flex-col gap-1">
                                    <Badge className={getBadgeVariant(record.status)}>
                                      {record.status}
                                    </Badge>
                                    {record.isLateException && (
                                      <Badge variant="destructive" className="w-fit text-[10px]">
                                        Late Exception
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="flex items-center gap-1">
                                <AttendanceDetailDialog
                                  date={record.date}
                                  session={session}
                                  modifiedBy={record.modifiedBy}
                                  modifiedAt={record.modifiedAt}
                                >
                                  <Button variant="ghost" size="sm">
                                    <View className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                </AttendanceDetailDialog>
                                {isAdmin && (
                                  <Button variant="ghost" size="sm" onClick={() => setRecordToEdit(record)} className="text-blue-600 hover:text-blue-700">
                                    <Pencil className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow key={record.id}>
                            <TableCell>{record.date}</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>
                              <Badge className={getBadgeVariant(record.status)}>
                                {record.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                               {isAdmin && (
                                  <Button variant="ghost" size="sm" onClick={() => setRecordToEdit(record)} className="text-blue-600 hover:text-blue-700">
                                    <Pencil className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                )}
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="calendar">
              {selectedEmployeeId ? (
                 <EmployeeAttendanceCalendar 
                   employeeId={selectedEmployeeId} 
                   leaves={leaves} 
                   holidays={holidays} 
                 />
              ) : (
                <div className="text-center p-8 text-muted-foreground">Select an employee to view calendar</div>
              )}
            </TabsContent>
            <TabsContent value="report">
              <Card>
                <CardHeader>
                  <CardTitle>AI-Generated Attendance Report</CardTitle>
                  <CardDescription>
                    Generate a summary of attendance for {selectedEmployeeName}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={handleGenerateReport}
                    disabled={isLoading || !selectedEmployeeId}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileBarChart2 className="mr-2" />
                    )}
                    Generate Report for August
                  </Button>

                  {report && (
                    <Alert>
                      <FileBarChart2 className="h-4 w-4" />
                      <AlertTitle>Attendance Summary</AlertTitle>
                      <AlertDescription>{report.report}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      {recordToEdit && (
        <EditAttendanceDialog
          isOpen={!!recordToEdit}
          onClose={() => setRecordToEdit(null)}
          attendanceRecord={recordToEdit}
          onUpdate={(id, sessionIndex, punchIn, punchOut, excused, reason) => 
            handleUpdateAttendance(id, sessionIndex, punchIn, punchOut, excused, reason)
          }
        />
      )}
    </>
  );
}
