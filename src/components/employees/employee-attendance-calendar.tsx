'use client';
import { useState, useContext, useEffect, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import type { Attendance, Holiday, Leave } from '@/lib/types';
import { parseISO, format, eachDayOfInterval, isSameDay, subDays, isWithinInterval, differenceInHours, differenceInMinutes, parse } from 'date-fns';
import { calculateAttendanceStatus } from '@/lib/attendance-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Pencil, Download, CalendarIcon } from 'lucide-react';
import { ManualAttendanceDialog } from '@/components/attendance/manual-attendance-dialog';
import { AppContext } from '@/context/app-context';
import { EditAttendanceDialog } from '@/components/attendance/edit-attendance-dialog';
import { MultiSessionManager } from '@/components/attendance/multi-session-manager';
import { useParams } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { exportToCSV } from '@/lib/csv-export';
import { generateAttendancePDF } from '@/lib/pdf-generator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EmployeeAttendanceCalendarProps {
  leaves: Leave[];
  holidays: Holiday[];
  employeeId?: string;
}

export default function EmployeeAttendanceCalendar({
  leaves,
  holidays,
  employeeId: propEmployeeId,
}: EmployeeAttendanceCalendarProps) {
  const params = useParams();
  const employeeId = (propEmployeeId || params.id) as string;
  const { employees, handleManualEntry, attendance, currentUser, updateSession, addSession, deleteSession } = useContext(AppContext);
  const { toast } = useToast();
  
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<Attendance | null>(null);
  const [sessionToEdit, setSessionToEdit] = useState<{ attendance: Attendance; sessionIndex: number } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  
  const employeeAttendance = useMemo(() => {
    return attendance.filter(a => a.employeeId === employeeId);
  }, [attendance, employeeId]);
  
  const employeeLeaves = useMemo(() => {
    return leaves.filter(l => l.employeeId === employeeId);
  }, [leaves, employeeId]);


  const combinedAttendance = useMemo(() => {
    const attendanceMap = new Map(employeeAttendance.map((a) => [a.date, a]));

    employeeLeaves.forEach((leave) => {
      const leaveDays = eachDayOfInterval({
        start: parseISO(leave.startDate),
        end: parseISO(leave.endDate),
      });

      leaveDays.forEach((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        if (leave.status !== 'Approved' && !attendanceMap.has(dateStr)) {
           attendanceMap.set(dateStr, {
             employeeId: leave.employeeId, 
             date: dateStr, 
             sessions: [],
             status: 'Absent',
           } as Attendance);
        }
      });
    });

    return Array.from(attendanceMap.values());
  }, [employeeAttendance, employeeLeaves]);


  useEffect(() => {
    if (combinedAttendance.length > 0) {
      const mostRecentRecord = combinedAttendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      setSelectedDate(parseISO(mostRecentRecord.date));
    }
  }, [combinedAttendance]);

  const approvedLeaveDays = useMemo(() => {
    const leaveDays = employeeLeaves
      .filter((l) => l.status === 'Approved')
      .flatMap((l) =>
        eachDayOfInterval({
          start: parseISO(l.startDate),
          end: parseISO(l.endDate),
        })
      );
    
    // Apply sandwich leave rule: if leave on day before and after weekend, convert weekend to paid leave
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return leaveDays;
    
    const weeklyOffs = employee.weeklyOffs || [];
    const sandwichLeaveDays: Date[] = [];
    
    // Sort leave days to process them in order
    const sortedLeaveDays = [...leaveDays].sort((a, b) => a.getTime() - b.getTime());
    
    // Check each leave day to see if there's a weekend gap followed by another leave
    for (let i = 0; i < sortedLeaveDays.length - 1; i++) {
      const currentLeaveDay = sortedLeaveDays[i];
      const nextLeaveDay = sortedLeaveDays[i + 1];
      
      // Calculate the gap in days between current and next leave
      const daysDifference = (nextLeaveDay.getTime() - currentLeaveDay.getTime()) / (24 * 60 * 60 * 1000);
      
      // Only process if there are days between the two leave days (not consecutive)
      if (daysDifference <= 1) {
        continue; // Skip consecutive or same-day leave entries
      }
      
      // Get all days between current and next leave day
      const daysBetween = eachDayOfInterval({
        start: new Date(currentLeaveDay.getTime() + 24 * 60 * 60 * 1000), // Start from day after current leave
        end: new Date(nextLeaveDay.getTime() - 24 * 60 * 60 * 1000), // End at day before next leave
      });
      
      // Check if all days between are weekends
      if (daysBetween.length > 0) {
        const allWeekends = daysBetween.every(day => 
          weeklyOffs.includes(format(day, 'EEEE'))
        );
        
        // If all days between are weekends, add them as sandwich leave days
        if (allWeekends) {
          sandwichLeaveDays.push(...daysBetween);
        }
      }
    }
    
    return [...leaveDays, ...sandwichLeaveDays];
  }, [employeeLeaves, employees, employeeId]);

  const getEvaluatedStatus = (record: Attendance) => {
    if (record.status !== 'Present' && record.status !== 'Late' && record.status !== 'Double Late') return record.status;
    if (!record.sessions || record.sessions.length === 0) return record.status;
    
    const employee = employees.find(e => e.id === employeeId);
    if (!employee || !employee.shift?.[0]) return record.status;
    
    const firstSession = record.sessions[0];
    if (!firstSession.clockIn) return record.status;
    
    try {
      const clockInTime = new Date(firstSession.clockIn.timestamp || firstSession.clockIn.time);
      const baseDate = parseISO(record.date);
      const shiftStart = parse(employee.shift[0].startTime, 'HH:mm', baseDate);
      
      return calculateAttendanceStatus(
        clockInTime,
        shiftStart,
        employee.bufferTime ?? 15,
        employee.doubleLateThresholdMinutes ?? 30
      );
    } catch (e) {
      return record.status;
    }
  };

  const statusModifiers = {
    Present: combinedAttendance.filter((a) => getEvaluatedStatus(a) === 'Present').map((a) => parseISO(a.date)),
    Late: combinedAttendance.filter((a) => getEvaluatedStatus(a) === 'Late').map((a) => parseISO(a.date)),
    DoubleLate: combinedAttendance.filter((a) => getEvaluatedStatus(a) === 'Double Late').map((a) => parseISO(a.date)),
    Absent: combinedAttendance.filter((a) => a.status === 'Absent').map((a) => parseISO(a.date)),
    Holiday: holidays.map((h) => parseISO(h.date)),
    Weekend: combinedAttendance.filter((a) => a.status === 'Weekend').map((a) => parseISO(a.date)),
    Leave: approvedLeaveDays.filter(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const attendance = combinedAttendance.find(a => a.date === dateStr);
      const hasPunches = attendance?.sessions && attendance.sessions.length > 0;
      return !hasPunches;
    }),
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'Present': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Late': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'Double Late': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Absent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Holiday': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Leave': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'secondary';
    }
  };

  const selectedDayAttendance = selectedDate ? combinedAttendance.find((a) => a.date === format(selectedDate, 'yyyy-MM-dd')) : null;
  const isApprovedLeave = selectedDate ? approvedLeaveDays.some(day => isSameDay(day, selectedDate)) : false;
  
  const getDayStatus = () => {
    if (!selectedDate) return null;
    const hasPunches = selectedDayAttendance?.sessions && selectedDayAttendance.sessions.length > 0;
    if (hasPunches) {
      const status = getEvaluatedStatus(selectedDayAttendance);
      return { status, variant: getBadgeVariant(status) };
    }
    if (isApprovedLeave) return { status: 'Leave', variant: getBadgeVariant('Leave') };
    if (selectedDayAttendance) {
      const status = getEvaluatedStatus(selectedDayAttendance);
      return { status, variant: getBadgeVariant(status) };
    }
    return null;
  }

  const dayStatus = getDayStatus();
  const isAdmin = currentUser?.employeeType === 'Admin' || currentUser?.employeeType === 'Super Admin';
  const isSuperAdmin = currentUser?.employeeType === 'Super Admin';
  const targetEmployee = employees.find(e => e.id === employeeId);
  const canOverride = isAdmin && (isSuperAdmin || targetEmployee?.employeeType === 'Employee');
  
  const handleEditClick = () => {
    if (selectedDayAttendance) {
      setRecordToEdit(selectedDayAttendance);
    }
  };

  const handleEditSession = (sessionIndex: number) => {
    if (selectedDayAttendance) {
      setSessionToEdit({ attendance: selectedDayAttendance, sessionIndex });
    }
  };

  const handleDeleteSession = async (sessionIndex: number) => {
    if (selectedDayAttendance?.id) {
      await deleteSession(selectedDayAttendance.id, sessionIndex);
    }
  };

  const handleAddSession = async () => {
    if (selectedDayAttendance?.id) {
      // Open manual entry dialog in "Add Complete Session" mode
      setIsManualEntryOpen(true);
    }
  };

  const handleAddCompleteSession = async (
    employeeId: string,
    punchInTime: string,
    punchOutTime: string,
    date: Date,
    punchInCapture?: { photo: string; remarks?: string },
    punchOutCapture?: { photo: string; remarks?: string }
  ) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingAttendance = attendance.find(
      a => a.employeeId === employeeId && a.date === dateStr
    );
    
    if (existingAttendance?.id) {
      // Add session to existing attendance
      await addSession(
        existingAttendance.id, 
        punchInTime, 
        punchOutTime, 
        punchInCapture?.photo, 
        punchOutCapture?.photo,
        punchInCapture?.remarks
      );
    } else {
      // Create new attendance with complete session
      await handleManualEntry(employeeId, 'clock-in', punchInTime, date, punchInCapture as any);
      await handleManualEntry(employeeId, 'clock-out', punchOutTime, date, punchOutCapture as any);
    }
  };

  const getExportData = () => {
    if (!dateFrom || !dateTo) return null;
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return null;

    const allDates = eachDayOfInterval({ start: dateFrom, end: dateTo });

    return allDates.map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayOfWeek = format(date, 'EEEE');
      
      const attendanceRecord = combinedAttendance.find(a => a.date === dateStr);
      const isLeave = approvedLeaveDays.some(day => isSameDay(day, date));
      const holiday = holidays.find(h => h.date === dateStr);
      const leave = employeeLeaves.find(l => 
        l.status === 'Approved' && 
        isWithinInterval(date, { start: parseISO(l.startDate), end: parseISO(l.endDate) })
      );

      const isWeekOff = Array.isArray(employee.weeklyOffs) && employee.weeklyOffs.includes(dayOfWeek);

      let status = isWeekOff ? 'Week Off' : 'Absent';
      let leaveType = '';
      let holidayName = '';

      const hasPunches = attendanceRecord && attendanceRecord.sessions && attendanceRecord.sessions.length > 0;

      if (hasPunches) {
        status = getEvaluatedStatus(attendanceRecord);
        if (holiday) holidayName = holiday.name;
        if (isLeave && leave) leaveType = leave.type;
      } else if (holiday) {
        status = 'Public Holiday';
        holidayName = holiday.name;
      } else if (isLeave && leave) {
        status = 'Leave';
        leaveType = leave.type;
      } else if (attendanceRecord) {
        status = getEvaluatedStatus(attendanceRecord);
      }

      if (attendanceRecord && attendanceRecord.sessions && attendanceRecord.sessions.length > 0) {
        let totalMinutes = 0;
        let multiPunchInfo = '';
        const allRemarks: string[] = [];

        attendanceRecord.sessions.forEach((session, idx) => {
          if (session.clockIn && session.clockOut) {
            const clockInDate = new Date(session.clockIn.timestamp || session.clockIn.time);
            const clockOutDate = new Date(session.clockOut.timestamp || session.clockOut.time);
            totalMinutes += differenceInMinutes(clockOutDate, clockInDate);
          }
          if (attendanceRecord.sessions.length > 1) {
            multiPunchInfo += `Session ${idx + 1}: ${session.clockIn?.time || '-'} to ${session.clockOut?.time || '-'}, `;
          }

          if (session.clockIn?.remarks) allRemarks.push(`In: ${session.clockIn.remarks}`);
          if (session.clockOut?.remarks) allRemarks.push(`Out: ${session.clockOut.remarks}`);
          if (session.remarks) allRemarks.push(`Session: ${session.remarks}`);
        });

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const dailyTotalHours = `${hours}h ${minutes}m`;

        const firstPunchIn = attendanceRecord.sessions[0].clockIn.time;
        const lastPunchOut = attendanceRecord.sessions[attendanceRecord.sessions.length - 1].clockOut?.time || '-';

        return {
          'Date': format(date, 'MMM dd, yyyy'),
          'Day of Week': dayOfWeek,
          'Status': status,
          'Punch In Time': firstPunchIn,
          'Punch Out Time': lastPunchOut,
          'Daily Total Hours': dailyTotalHours,
          'Leave Type': leaveType || '-',
          'Holiday Name': holidayName || '-',
          'Remarks': allRemarks.join(' | ') || '-',
          'Multi Punch Info': multiPunchInfo ? multiPunchInfo.slice(0, -2) : '-',
        };
      }

      return {
        'Date': format(date, 'MMM dd, yyyy'),
        'Day of Week': dayOfWeek,
        'Status': status,
        'Punch In Time': '-',
        'Punch Out Time': '-',
        'Daily Total Hours': '-',
        'Leave Type': leaveType || '-',
        'Holiday Name': holidayName || '-',
        'Remarks': '-',
        'Multi Punch Info': '-',
      };
    });
  };

  const handleDownloadAttendance = () => {
    try {
      if (!dateFrom || !dateTo) {
        toast({
          variant: 'destructive',
          title: 'Invalid Date Range',
          description: 'Please select both from and to dates.',
        });
        return;
      }

      if (dateFrom > dateTo) {
        toast({
          variant: 'destructive',
          title: 'Invalid Date Range',
          description: 'From date must be before or equal to To date.',
        });
        return;
      }

      const exportData = getExportData();
      if (!exportData) return;
      
      const employee = employees.find(e => e.id === employeeId);
      const employeeName = employee?.name || 'Unknown';

      const fromDateStr = format(dateFrom, 'yyyy-MM-dd');
      const toDateStr = format(dateTo, 'yyyy-MM-dd');
      const filename = `${employeeName.replace(/\s+/g, '_')}_attendance_${fromDateStr}_${toDateStr}.csv`;

      exportToCSV({
        data: exportData,
        filename,
      });

      toast({
        title: 'Export Successful',
        description: `Exported ${exportData.length} attendance records to CSV.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'An error occurred while exporting attendance data.',
      });
    }
  };

  const handleDownloadAttendancePDF = () => {
    try {
      if (!dateFrom || !dateTo) {
        toast({
          variant: 'destructive',
          title: 'Missing Dates',
          description: 'Please select both From and To dates.',
        });
        return;
      }

      if (dateFrom > dateTo) {
        toast({
          variant: 'destructive',
          title: 'Invalid Date Range',
          description: 'From date must be before or equal to To date.',
        });
        return;
      }

      const employee = employees.find(e => e.id === employeeId);
      if (!employee) return;

      const exportData = getExportData();
      if (!exportData) return;

      generateAttendancePDF(employee, exportData, dateFrom, dateTo);

      toast({
        title: 'Export Successful',
        description: `Downloaded PDF for ${exportData.length} attendance record(s).`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'An error occurred while exporting attendance PDF.',
      });
    }
  };


  return (
    <>
    <div className="flex flex-col gap-6">
      {canOverride && (
        <Card>
          <CardHeader>
            <CardTitle>Download Attendance Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">From Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "MMM dd, yyyy") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">To Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "MMM dd, yyyy") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <Button onClick={handleDownloadAttendance} className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button onClick={handleDownloadAttendancePDF} variant="secondary" className="gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="flex flex-col items-center gap-4 w-full overflow-x-hidden">
        <div className="w-full max-w-[calc(100vw-2rem)] flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border mx-auto"
            modifiers={statusModifiers}
            modifiersClassNames={{
              Present: 'rdp-day_Present',
              Late: 'rdp-day_Late',
              DoubleLate: 'rdp-day_Absent', // Using Absent style (red) for Double Late dots
              Absent: 'rdp-day_Absent',
              Holiday: 'rdp-day_Holiday',
              Weekend: 'rdp-day_Weekend',
              Leave: 'rdp-day_Holiday',
            }}
          />
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full rdp-day_Present"></div><span className="text-sm">Present</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full rdp-day_Late"></div><span className="text-sm">Late</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full rdp-day_Absent"></div><span className="text-sm">Absent</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full rdp-day_Holiday"></div><span className="text-sm">Holiday/Leave</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border"></div><span className="text-sm">Weekend</span></div>
        </div>
      </div>

      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>Details for {format(selectedDate, 'MMMM dd, yyyy')}</CardTitle>
          </CardHeader>
          <CardContent>
            {dayStatus ? (
              <div>
                <div className="mb-4">
                  <Badge className={dayStatus.variant}>{dayStatus.status}</Badge>
                </div>
                {selectedDayAttendance ? (
                  <MultiSessionManager
                    attendance={selectedDayAttendance}
                    onEditSession={handleEditSession}
                    onDeleteSession={handleDeleteSession}
                    onAddSession={handleAddSession}
                    isAdmin={isAdmin}
                  />
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">No punch details for this day.</p>
                    {canOverride && (
                      <Button onClick={() => setIsManualEntryOpen(true)}>
                        <PlusCircle className="mr-2" /> Add Manual Entry
                      </Button>
                    )}
                  </>
                )}
                {canOverride && selectedDayAttendance && (
                  <div className="mt-4">
                    <Button variant="outline" onClick={() => setIsManualEntryOpen(true)}>
                      <PlusCircle className="mr-2" /> Manual Override
                    </Button>
                  </div>
                )}
              </div>
            ) : (
               <div className="text-center space-y-4">
                 <p className="text-sm text-muted-foreground">No attendance record for this date.</p>
                 {canOverride && <Button onClick={() => setIsManualEntryOpen(true)}><PlusCircle className="mr-2" /> Add Manual Entry</Button>}
               </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
     {isManualEntryOpen && selectedDate && employeeId && (
        <ManualAttendanceDialog
            employees={employees}
            onManualEntry={handleManualEntry}
            onAddCompleteSession={handleAddCompleteSession}
            open={isManualEntryOpen}
            onOpenChange={setIsManualEntryOpen}
            defaultDate={selectedDate}
            defaultEmployeeId={employeeId as string}
        />
     )}
     {recordToEdit && (
        <EditAttendanceDialog
          isOpen={!!recordToEdit}
          onClose={() => setRecordToEdit(null)}
          attendanceRecord={recordToEdit}
          onUpdate={updateSession}
        />
      )}
      {sessionToEdit && (
        <EditAttendanceDialog
          isOpen={!!sessionToEdit}
          onClose={() => setSessionToEdit(null)}
          attendanceRecord={sessionToEdit.attendance}
          sessionIndex={sessionToEdit.sessionIndex}
          onUpdate={updateSession}
        />
      )}
    </>
  );
}
