'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus } from 'lucide-react';
import type { AttendanceSession, Attendance } from '@/lib/types';
import { AttendanceDetailDialog } from './attendance-detail-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MultiSessionManagerProps {
  attendance: Attendance;
  onEditSession: (sessionIndex: number) => void;
  onDeleteSession: (sessionIndex: number) => void;
  onAddSession: () => void;
  isAdmin: boolean;
}

export function MultiSessionManager({
  attendance,
  onEditSession,
  onDeleteSession,
  onAddSession,
  isAdmin,
}: MultiSessionManagerProps) {
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);
  const sessions = attendance.sessions || [];

  const handleDeleteConfirm = () => {
    if (sessionToDelete !== null) {
      onDeleteSession(sessionToDelete);
      setSessionToDelete(null);
    }
  };

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">No sessions recorded for this day.</p>
          {isAdmin && (
            <Button onClick={onAddSession} size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Session
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Attendance Sessions</CardTitle>
          {isAdmin && (
            <Button onClick={onAddSession} size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Add Session
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.map((session, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <Badge variant="outline">Session {index + 1}</Badge>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{session.clockIn.time}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">
                      {session.clockOut?.time || 'Not punched out'}
                    </span>
                  </div>
                  {session.duration && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Duration: {session.duration}
                    </p>
                  )}
                  {(session.clockIn?.remarks || session.clockOut?.remarks || session.remarks) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Remarks: {[session.clockIn?.remarks ? `In: ${session.clockIn.remarks}` : '', session.clockOut?.remarks ? `Out: ${session.clockOut.remarks}` : '', session.remarks ? `Session: ${session.remarks}` : ''].filter(Boolean).join(" | ")}
                    </p>
                  )}
                </div>
                <AttendanceDetailDialog
                  date={attendance.date}
                  session={session}
                  modifiedBy={attendance.modifiedBy}
                  modifiedAt={attendance.modifiedAt}
                >
                  <Button variant="ghost" size="sm">
                    View Details
                  </Button>
                </AttendanceDetailDialog>
              </div>
              {isAdmin && (
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditSession(index)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSessionToDelete(index)}
                    disabled={sessions.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={sessionToDelete !== null} onOpenChange={() => setSessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete Session {sessionToDelete !== null ? sessionToDelete + 1 : ''}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
