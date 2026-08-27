'use client';

import { useState, useContext } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AppContext } from '@/context/app-context';
import { Loader2, Clock } from 'lucide-react';

export function LateArrivalDialog() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expectedTime, setExpectedTime] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();
  const { currentUser, addLateRequest } = useContext(AppContext);

  const handleSubmit = async () => {
    if (!currentUser) return;
    if (!expectedTime) {
      toast({ variant: 'destructive', title: 'Time Required', description: 'Please provide your expected arrival time.' });
      return;
    }
    if (!reason.trim()) {
      toast({ variant: 'destructive', title: 'Reason Required', description: 'Please provide a reason for the late arrival.' });
      return;
    }

    setIsLoading(true);
    try {
      await addLateRequest({
        date,
        expectedTime,
        reason: reason.trim(),
      });

      setOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit request.' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setExpectedTime('');
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Clock className="mr-2 h-4 w-4" /> Request Late Arrival
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Late Arrival Permission</DialogTitle>
          <DialogDescription>
            Request permission to arrive late. If approved, the late penalty will be waived.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">Date</Label>
            <Input
              id="date"
              type="date"
              className="col-span-3"
              value={date}
              min={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="time" className="text-right">Expected Time</Label>
            <Input
              id="time"
              type="time"
              className="col-span-3"
              value={expectedTime}
              onChange={(e) => setExpectedTime(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reason" className="text-right">Reason</Label>
            <Input
              id="reason"
              className="col-span-3"
              placeholder="e.g. Doctor's appointment, Family emergency"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
