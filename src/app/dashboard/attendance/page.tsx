import AttendanceTracker from '@/components/attendance/attendance-tracker';

export default function AttendancePage() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 md:gap-8">
      <div>
        <h1 className="font-headline text-2xl sm:text-3xl font-bold">Attendance</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Track your work hours and view your attendance history.
        </p>
      </div>
      <AttendanceTracker />
    </div>
  );
}
