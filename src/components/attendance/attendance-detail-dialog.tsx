'use client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { AttendanceSession } from '@/lib/types';
import Image from 'next/image';

interface AttendanceDetailDialogProps {
  date: string;
  session: AttendanceSession;
  children: React.ReactNode;
  modifiedBy?: string;
  modifiedAt?: string;
}

export function AttendanceDetailDialog({
  date,
  session,
  children,
  modifiedBy,
  modifiedAt,
}: AttendanceDetailDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Attendance Details</DialogTitle>
          <DialogDescription>
            Details for attendance on {date}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Punch In</h3>
            {session.clockIn ? (
              <div className="space-y-4">
                <p>
                  <strong>Time:</strong> {session.clockIn.time}
                </p>
                <div>
                  <p className="font-medium mb-2">Photo:</p>
                  <Image
                    src={session.clockIn.photo}
                    alt="Punch in capture"
                    width={300}
                    height={225}
                    className="rounded-md object-cover aspect-video"
                  />
                </div>
                {session.clockIn.remarks && (
                  <div className="mt-2">
                    <p className="font-medium">Remarks:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{session.clockIn.remarks}</p>
                  </div>
                )}
              </div>
            ) : (
              <p>No punch-in data available.</p>
            )}
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Punch Out</h3>
            {session.clockOut ? (
              <div className="space-y-4">
                <p>
                  <strong>Time:</strong> {session.clockOut.time}
                </p>
                <div>
                  <p className="font-medium mb-2">Photo:</p>
                  <Image
                    src={session.clockOut.photo}
                    alt="Punch out capture"
                    width={300}
                    height={225}
                    className="rounded-md object-cover aspect-video"
                  />
                </div>
                {session.clockOut.remarks && (
                  <div className="mt-2">
                    <p className="font-medium">Remarks:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{session.clockOut.remarks}</p>
                  </div>
                )}
              </div>
            ) : (
              <p>No punch-out data available.</p>
            )}
          </div>
        </div>
        {modifiedBy && modifiedAt && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Modified by <span className="font-medium">{modifiedBy}</span> on{' '}
              {new Date(modifiedAt).toLocaleString()}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
