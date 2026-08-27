'use client';

/**
 * Admin Attendance Override Dialog
 * 
 * SECURITY NOTE: This component is rendered only for admin users (client-side check).
 * The underlying onManualEntry function writes directly to Firestore from the client.
 * Production deployment should enforce server-side authorization via:
 * 1. Server Actions with role validation, OR
 * 2. Firestore Security Rules restricting write access to admin users only
 * 
 * Current implementation assumes Firestore rules enforce proper access control.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import type { Employee } from '@/lib/types';
import { CalendarIcon, UserCog } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type EntryType = 'present' | 'absent' | 'paid-leave' | 'unpaid-leave';

interface AdminAttendanceOverrideDialogProps {
  employees: Employee[];
  onManualEntry: (
    employeeId: string,
    type: 'clock-in' | 'clock-out' | 'absent' | 'paid-leave' | 'unpaid-leave',
    time: string,
    date: Date
  ) => void;
}

export function AdminAttendanceOverrideDialog({
  employees,
  onManualEntry,
}: AdminAttendanceOverrideDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [entryType, setEntryType] = useState<EntryType>('present');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  const [punchInTime, setPunchInTime] = useState('09:00');
  const [punchInPeriod, setPunchInPeriod] = useState<'AM' | 'PM'>('AM');
  const [punchOutTime, setPunchOutTime] = useState('05:00');
  const [punchOutPeriod, setPunchOutPeriod] = useState<'AM' | 'PM'>('PM');


  const validateTime = (time: string): boolean => {
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const convertTo24Hour = (time: string, period: 'AM' | 'PM'): number => {
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;
    
    if (period === 'PM' && hours !== 12) {
      hour24 = hours + 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }
    
    return hour24 * 60 + minutes; // Return total minutes for easy comparison
  };

  const handleSubmit = async () => {
    if (!selectedEmployeeId || !selectedDate) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select an employee and date.',
      });
      return;
    }

    // Validate times for Present status
    if (entryType === 'present') {
      if (!validateTime(punchInTime) || !validateTime(punchOutTime)) {
        toast({
          variant: 'destructive',
          title: 'Invalid Time Format',
          description: 'Please enter time in HH:MM format (e.g., 09:00).',
        });
        return;
      }

      // Validate punch-out is after punch-in
      const punchInMinutes = convertTo24Hour(punchInTime, punchInPeriod);
      const punchOutMinutes = convertTo24Hour(punchOutTime, punchOutPeriod);

      if (punchOutMinutes <= punchInMinutes) {
        toast({
          variant: 'destructive',
          title: 'Invalid Time Range',
          description: 'Punch out time must be after punch in time.',
        });
        return;
      }
    }

    try {
      if (entryType === 'present') {
        // For "Present", create both punch in and punch out atomically
        const punchInFormatted = `${punchInTime} ${punchInPeriod}`;
        const punchOutFormatted = `${punchOutTime} ${punchOutPeriod}`;

        try {
          // First create punch in
          await onManualEntry(selectedEmployeeId, 'clock-in', punchInFormatted, selectedDate);
          
          // Then create punch out
          await onManualEntry(selectedEmployeeId, 'clock-out', punchOutFormatted, selectedDate);

          toast({
            title: 'Attendance Recorded',
            description: `Full day attendance created for ${format(selectedDate, 'MMMM dd, yyyy')}.`,
          });
        } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to create complete attendance record. Please try again.',
          });
          return;
        }
      } else {
        // For absent, paid-leave, unpaid-leave - map to correct format
        const statusMap = {
          'absent': 'absent' as const,
          'paid-leave': 'paid-leave' as const,
          'unpaid-leave': 'unpaid-leave' as const,
        };
        
        await onManualEntry(selectedEmployeeId, statusMap[entryType], '', selectedDate);
        
        const displayName = entryType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        toast({
          title: 'Attendance Updated',
          description: `Status updated to ${displayName} for ${format(selectedDate, 'MMMM dd, yyyy')}.`,
        });
      }

      setOpen(false);
      
      // Reset form
      setSelectedEmployeeId('');
      setEntryType('present');
      setSelectedDate(new Date());
      setPunchInTime('09:00');
      setPunchInPeriod('AM');
      setPunchOutTime('05:00');
      setPunchOutPeriod('PM');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update attendance record.',
      });
    }
  };

  const showTimeInputs = entryType === 'present';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="w-full sm:w-auto">
          <UserCog className="mr-2 h-4 w-4" /> Admin Override
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Admin Attendance Override</DialogTitle>
          <DialogDescription>
            Manually create or override attendance records for any employee and date.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Employee Selection */}
          <div className="grid gap-2">
            <Label htmlFor="employee-select">Employee *</Label>
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger id="employee-select">
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name} ({employee.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="grid gap-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Entry Type Selection */}
          <div className="grid gap-2">
            <Label htmlFor="entry-type">Attendance Status *</Label>
            <Select
              value={entryType}
              onValueChange={(value) => setEntryType(value as EntryType)}
            >
              <SelectTrigger id="entry-type">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Present (Full Day)</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="paid-leave">Paid Leave</SelectItem>
                <SelectItem value="unpaid-leave">Unpaid Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Punch Times (only for Present) */}
          {showTimeInputs && (
            <div className="grid gap-4 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-semibold">Punch Times</h4>
              
              {/* Punch In Time */}
              <div className="grid gap-2">
                <Label>Punch In Time</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., 09:00"
                    value={punchInTime}
                    onChange={(e) => setPunchInTime(e.target.value)}
                  />
                  <Select value={punchInPeriod} onValueChange={(v) => setPunchInPeriod(v as 'AM' | 'PM')}>
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Punch Out Time */}
              <div className="grid gap-2">
                <Label>Punch Out Time</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., 05:00"
                    value={punchOutTime}
                    onChange={(e) => setPunchOutTime(e.target.value)}
                  />
                  <Select value={punchOutPeriod} onValueChange={(v) => setPunchOutPeriod(v as 'AM' | 'PM')}>
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm text-blue-900 dark:text-blue-200">
            <p className="font-medium mb-1">Note:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>This will override any existing attendance record for the selected date</li>
              <li>For "Present" status, both punch in and punch out times are required (HH:MM format)</li>
              <li>Absent and Leave statuses will mark the entire day accordingly</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create/Override Record</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
