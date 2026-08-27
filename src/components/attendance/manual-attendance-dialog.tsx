'use client';
import { useState, useEffect, useRef } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import type { Employee } from '@/lib/types';
import { UserPlus, Loader2, Camera, Upload } from 'lucide-react';
import { format, parse } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import type { ClockEvent } from '@/lib/types';

type EntryType = 'clock-in' | 'clock-out' | 'complete-session' | 'absent' | 'paid-leave' | 'unpaid-leave';

interface ManualAttendanceDialogProps {
  employees: Employee[];
  onManualEntry: (
    employeeId: string,
    type: EntryType,
    time: string,
    date: Date,
    capture?: ClockEvent
  ) => void;
  onAddCompleteSession?: (
    employeeId: string,
    punchInTime: string,
    punchOutTime: string,
    date: Date,
    punchInCapture?: ClockEvent,
    punchOutCapture?: ClockEvent
  ) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultDate?: Date;
  defaultEmployeeId?: string;
}

export function ManualAttendanceDialog({
  employees,
  onManualEntry,
  onAddCompleteSession,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  defaultDate,
  defaultEmployeeId,
}: ManualAttendanceDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { toast } = useToast();

  const isControlled =
    controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [entryType, setEntryType] = useState<EntryType>('clock-in');
  
  const now = new Date();
  const [time, setTime] = useState(format(now, 'hh:mm'));
  const [period, setPeriod] = useState<'AM' | 'PM'>(format(now, 'a') as 'AM' | 'PM');
  const [punchOutTime, setPunchOutTime] = useState(format(now, 'hh:mm'));
  const [punchOutPeriod, setPunchOutPeriod] = useState<'AM' | 'PM'>('PM');
  const [remarks, setRemarks] = useState('');

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedPunchInImage, setUploadedPunchInImage] = useState<string | null>(null);
  const punchInFileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedPunchOutImage, setUploadedPunchOutImage] = useState<string | null>(null);
  const punchOutFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (entryType === 'clock-in' || entryType === 'clock-out') {
        setUploadedImage(null);
      } else if (entryType === 'complete-session') {
        setUploadedPunchInImage(null);
        setUploadedPunchOutImage(null);
      }
    }
  }, [open, entryType]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload an image file.'});
        return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePunchInFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload an image file.'});
        return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
        setUploadedPunchInImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    if (punchInFileInputRef.current) {
      punchInFileInputRef.current.value = '';
    }
  };

  const handlePunchOutFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload an image file.'});
        return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
        setUploadedPunchOutImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    if (punchOutFileInputRef.current) {
      punchOutFileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (defaultEmployeeId && open) {
      setSelectedEmployeeId(defaultEmployeeId);
    }
  }, [defaultEmployeeId, open]);

  const handleSubmit = () => {
    if (!selectedEmployeeId) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select an employee.',
      });
      return;
    }

    const date = defaultDate ? new Date(defaultDate) : new Date();

    if (entryType === 'complete-session') {
      if (!onAddCompleteSession) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Complete session functionality is not available.',
        });
        return;
      }

      if (!time || !punchOutTime) {
        toast({
          variant: 'destructive',
          title: 'Missing Information',
          description: 'Please provide both punch in and punch out times.',
        });
        return;
      }

      if (!uploadedPunchInImage || !uploadedPunchOutImage) {
        toast({
          variant: 'destructive',
          title: 'Photos Required',
          description: 'Please upload timestamp photos for both Punch In and Punch Out.',
        });
        return;
      }

      const formattedPunchIn = `${time} ${period}`;
      const formattedPunchOut = `${punchOutTime} ${punchOutPeriod}`;

      const eventTime = new Date();
      
      const punchInCapture: ClockEvent = {
        time: formattedPunchIn,
        timestamp: eventTime.toISOString(),
        photo: uploadedPunchInImage,
        location: null,
        isManual: true,
        ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
      };

      const punchOutCapture: ClockEvent = {
        time: formattedPunchOut,
        timestamp: eventTime.toISOString(),
        photo: uploadedPunchOutImage,
        location: null,
        isManual: true,
      };

      onAddCompleteSession(selectedEmployeeId, formattedPunchIn, formattedPunchOut, date, punchInCapture, punchOutCapture);
      toast({
        title: 'Session Added',
        description: `Complete session has been added successfully.`,
      });
      setOpen(false);
      return;
    }

    const isTimeRequired = entryType === 'clock-in' || entryType === 'clock-out';
    if (isTimeRequired) {
      if (!time) {
        toast({
          variant: 'destructive',
          title: 'Missing Information',
          description: 'Please specify the time.',
        });
        return;
      }
      if (!uploadedImage) {
        toast({
          variant: 'destructive',
          title: 'Photo Required',
          description: 'Please upload the timestamp photo.',
        });
        return;
      }
    }

    const formattedTime = isTimeRequired ? `${time} ${period}` : '';
    
    // Capture photo if this is a clock-in or clock-out
    let capture: ClockEvent | undefined;
    
    if (entryType === 'clock-in' || entryType === 'clock-out') {
      let imageDataUrl = uploadedImage;

      if (imageDataUrl) {
          const eventTime = new Date();
          // We override the time field below anyway since manual time might be entirely different 
          // but we capture the real timestamp of the submission
          capture = {
            time: formattedTime,
            timestamp: eventTime.toISOString(),
            photo: imageDataUrl,
            location: null,
            ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
            isManual: true,
          };
      }
    }

    onManualEntry(selectedEmployeeId, entryType, formattedTime, date, capture);
    toast({
      title: 'Manual Entry Successful',
      description: `The attendance record has been updated.`,
    });
    setOpen(false);
  };
  
  const showTimeInput = entryType === 'clock-in' || entryType === 'clock-out';
  const showCompleteSessionInputs = entryType === 'complete-session';

  const dialogContent = (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Manual Attendance Entry</DialogTitle>
        <DialogDescription>
          Manually record or update an attendance status for an employee.{' '}
          {defaultDate && `Date: ${format(defaultDate, 'MMMM dd, yyyy')}`}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="employee-select">Employee</Label>
          <Select
            value={selectedEmployeeId}
            onValueChange={setSelectedEmployeeId}
            disabled={!!defaultEmployeeId}
          >
            <SelectTrigger id="employee-select">
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
        <div className="grid gap-2">
          <Label htmlFor="entry-type">Action</Label>
          <Select
            value={entryType}
            onValueChange={(value) => setEntryType(value as EntryType)}
          >
            <SelectTrigger id="entry-type">
              <SelectValue placeholder="Select entry type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clock-in">Punch In</SelectItem>
              <SelectItem value="clock-out">Punch Out</SelectItem>
              <SelectItem value="complete-session">Add Complete Session</SelectItem>
              <SelectItem value="absent">Mark as Absent</SelectItem>
              <SelectItem value="paid-leave">Mark as Paid Leave</SelectItem>
              <SelectItem value="unpaid-leave">Mark as Unpaid Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {showTimeInput && (
          <div className="grid gap-2">
            <Label>Time</Label>
            <div className="flex gap-2">
                <Input
                  id="time-input"
                  placeholder="e.g., 09:30"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
                <Select value={period} onValueChange={(v) => setPeriod(v as 'AM' | 'PM')}>
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
        )}
        {showCompleteSessionInputs && (
          <>
            <div className="grid gap-2">
              <Label>Punch In Time</Label>
              <div className="flex gap-2">
                <Input
                  id="punch-in-time"
                  placeholder="e.g., 09:00"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
                <Select value={period} onValueChange={(v) => setPeriod(v as 'AM' | 'PM')}>
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
            <div className="grid gap-2 mt-2">
              <Label>Punch In Photo Verification</Label>
              {uploadedPunchInImage ? (
                <div className="relative border rounded-md overflow-hidden bg-muted aspect-video w-full max-w-sm flex items-center justify-center">
                  <img src={uploadedPunchInImage} alt="Uploaded Punch In" className="max-w-full max-h-full object-contain" />
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setUploadedPunchInImage(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="relative border rounded-md border-dashed border-muted-foreground/25 bg-muted/50 aspect-video w-full max-w-sm flex flex-col items-center justify-center gap-2">
                  <Camera className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No punch in photo uploaded</p>
                </div>
              )}
              
              <div className="flex gap-2 w-full max-w-sm justify-center mt-2">
                {!uploadedPunchInImage && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={punchInFileInputRef}
                      onChange={handlePunchInFileUpload}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => punchInFileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" /> Upload Punch In Photo
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-2 mt-4">
              <Label>Punch Out Time</Label>
              <div className="flex gap-2">
                <Input
                  id="punch-out-time"
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

            <div className="grid gap-2 mt-2">
              <Label>Punch Out Photo Verification</Label>
              {uploadedPunchOutImage ? (
                <div className="relative border rounded-md overflow-hidden bg-muted aspect-video w-full max-w-sm flex items-center justify-center">
                  <img src={uploadedPunchOutImage} alt="Uploaded Punch Out" className="max-w-full max-h-full object-contain" />
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setUploadedPunchOutImage(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="relative border rounded-md border-dashed border-muted-foreground/25 bg-muted/50 aspect-video w-full max-w-sm flex flex-col items-center justify-center gap-2">
                  <Camera className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No punch out photo uploaded</p>
                </div>
              )}
              
              <div className="flex gap-2 w-full max-w-sm justify-center mt-2">
                {!uploadedPunchOutImage && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={punchOutFileInputRef}
                      onChange={handlePunchOutFileUpload}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => punchOutFileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" /> Upload Punch Out Photo
                    </Button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
        {(showTimeInput) && (
          <>
            <div className="grid gap-2 mt-2">
              <Label>Photo Verification</Label>
              {uploadedImage ? (
                <div className="relative border rounded-md overflow-hidden bg-muted aspect-video w-full max-w-sm flex items-center justify-center">
                  <img src={uploadedImage} alt="Uploaded" className="max-w-full max-h-full object-contain" />
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setUploadedImage(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="relative border rounded-md border-dashed border-muted-foreground/25 bg-muted/50 aspect-video w-full max-w-sm flex flex-col items-center justify-center gap-2">
                  <Camera className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No photo uploaded</p>
                </div>
              )}
              
              <div className="flex gap-2 w-full max-w-sm justify-center mt-2">
                {!uploadedImage && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" /> Upload Photo Manually
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="manual-remarks">Remarks / Reason</Label>
              <Input
                id="manual-remarks"
                placeholder="Reason for manual punch..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </>
        )}
      </div>
      <DialogFooter>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Submit Entry</Button>
      </DialogFooter>
    </DialogContent>
  );

  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <UserPlus className="mr-2" /> Manual Entry
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
