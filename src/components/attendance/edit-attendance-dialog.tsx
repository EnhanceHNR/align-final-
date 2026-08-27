'use client';
import { useState, useEffect, useContext } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Attendance } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, parse } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { AppContext } from '@/context/app-context';

interface EditAttendanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  attendanceRecord: Attendance;
  sessionIndex?: number;
  onUpdate: (
    attendanceId: string,
    sessionIndex: number,
    punchInTime: string,
    punchOutTime: string | null,
    lateExcused?: boolean,
    lateExcusedReason?: string,
    remarks?: string
  ) => void;
}

export function EditAttendanceDialog({
  isOpen,
  onClose,
  attendanceRecord,
  sessionIndex: initialSessionIndex,
  onUpdate,
}: EditAttendanceDialogProps) {
  const { toast } = useToast();
  const { currentUser } = useContext(AppContext);

  const [selectedSessionIndex, setSelectedSessionIndex] = useState(initialSessionIndex || 0);
  const session = attendanceRecord.sessions?.[selectedSessionIndex];

  const [punchInTime, setPunchInTime] = useState('');
  const [punchInPeriod, setPunchInPeriod] = useState<'AM' | 'PM'>('AM');
  const [punchOutTime, setPunchOutTime] = useState('');
  const [punchOutPeriod, setPunchOutPeriod] = useState<'PM' | 'AM'>('PM');
  
  const [lateExcused, setLateExcused] = useState(attendanceRecord.lateExcused || false);
  const [lateExcusedReason, setLateExcusedReason] = useState(attendanceRecord.lateExcusedReason || '');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (initialSessionIndex !== undefined) {
      setSelectedSessionIndex(initialSessionIndex);
    }
  }, [initialSessionIndex]);

  useEffect(() => {
    if (session) {
      if (session.clockIn?.time) {
        try {
            const parsedTime = parse(session.clockIn.time, 'p', new Date());
            setPunchInTime(format(parsedTime, 'hh:mm'));
            setPunchInPeriod(format(parsedTime, 'a').toUpperCase() as 'AM' | 'PM');
        } catch(e) {
            setPunchInTime('');
        }
      } else {
        setPunchInTime('');
      }

      if (session.clockOut?.time) {
        try {
            const parsedTime = parse(session.clockOut.time, 'p', new Date());
            setPunchOutTime(format(parsedTime, 'hh:mm'));
            setPunchOutPeriod(format(parsedTime, 'a').toUpperCase() as 'AM' | 'PM');
        } catch (e) {
            setPunchOutTime('');
        }
      } else {
        setPunchOutTime('');
      }
      if (session.remarks) {
        setRemarks(session.remarks);
      } else {
        setRemarks('');
      }
    } else {
      setPunchInTime('');
      setPunchOutTime('');
      setRemarks('');
    }
  }, [session]);

  const handleSubmit = async () => {
    if (!attendanceRecord.id) {
      toast({ variant: 'destructive', title: 'Error', description: 'Record ID is missing.' });
      return;
    }

    if (!punchInTime) {
      toast({
        variant: 'destructive',
        title: 'Missing Punch In Time',
        description: 'Please provide a punch-in time.',
      });
      return;
    }

    // Combine time and period for storage
    const formattedPunchIn = `${punchInTime} ${punchInPeriod}`;
    const formattedPunchOut = punchOutTime ? `${punchOutTime} ${punchOutPeriod}` : null;

    // Validate late waiver reason if checkbox is checked
    if (lateExcused && !lateExcusedReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Reason Required',
        description: 'Please provide a reason for waiving the late deduction.',
      });
      return;
    }

    await onUpdate(
      attendanceRecord.id, 
      selectedSessionIndex, 
      formattedPunchIn, 
      formattedPunchOut,
      lateExcused,
      lateExcusedReason,
      remarks
    );
    onClose();
  };

  const sessions = attendanceRecord.sessions || [];
  const hasMultipleSessions = sessions.length > 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Attendance</DialogTitle>
          <DialogDescription>
            Modify punch times for {attendanceRecord.date}. Use hh:mm format.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {hasMultipleSessions && (
            <div className="grid gap-2">
              <Label>Select Session to Edit</Label>
              <Select 
                value={selectedSessionIndex.toString()} 
                onValueChange={(v) => setSelectedSessionIndex(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((_, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      Session {index + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-2">
            <Label>Punch In Time</Label>
            <div className="flex gap-2">
              <Input
                id="punch-in-time"
                placeholder="e.g., 09:30"
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
          <div className="grid gap-2">
            <Label>Punch Out Time</Label>
            <div className="flex gap-2">
              <Input
                id="punch-out-time"
                placeholder="e.g., 05:30"
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
          
          <div className="grid gap-2">
            <Label htmlFor="session-remarks">Session Remarks (Optional)</Label>
            <Textarea
              id="session-remarks"
              placeholder="e.g., Forgot to punch in earlier"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
            />
          </div>
          
          {/* Late Waiver Section - Only for Admins when status is Late or Double Late */}
          {(currentUser?.employeeType === 'Admin' || currentUser?.employeeType === 'Super Admin') && 
           (attendanceRecord.status === 'Late' || attendanceRecord.status === 'Double Late') && (
            <div className="grid gap-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="late-excused"
                  checked={lateExcused}
                  onCheckedChange={(checked) => setLateExcused(checked as boolean)}
                />
                <Label
                  htmlFor="late-excused"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Excuse Late Deduction (Waive salary penalty)
                </Label>
              </div>
              
              {lateExcused && (
                <div className="grid gap-2">
                  <Label htmlFor="late-reason">Reason for Waiving Late Deduction</Label>
                  <Textarea
                    id="late-reason"
                    placeholder="e.g., Traffic jam, Medical emergency, etc."
                    value={lateExcusedReason}
                    onChange={(e) => setLateExcusedReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
