"use client";
 
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { api } from "~/trpc/react";
import AppointmentFormSheet from "@/components/appointments/AppointmentFormSheet";
 
const STATUS_STYLES: Record<string, string> = {
    SCHEDULED:   "bg-blue-50 text-blue-700 border-blue-200",
    WAITING:     "bg-yellow-50 text-yellow-700 border-yellow-200",
    IN_PROGRESS: "bg-orange-50 text-orange-700 border-orange-200",
    COMPLETED:   "bg-green-50 text-green-700 border-green-200",
    CANCELLED:   "bg-gray-50 text-gray-400 border-gray-200 opacity-60",
};
 
const STATUS_LABELS: Record<string, string> = {
    SCHEDULED:   "Scheduled",
    WAITING:     "Waiting",
    IN_PROGRESS: "In progress",
    COMPLETED:   "Completed",
    CANCELLED:   "Cancelled",
};
 
const workingHours = Array.from({ length: 11 }, (_, i) => {
    const hour = 8 + i;
    return `${hour.toString().padStart(2, "0")}:00`;
});
 
function formatBosnianDate(date: Date) {
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ];
    return `${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}.`;
}
 
function formatTime(date: Date) {
    return date.toTimeString().slice(0, 5);
}
 
function getWeekStart(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}
 
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
 
export default function AppointmentsCalendarPage() {
    const { data: orgProfile } = api.organization.getProfile.useQuery();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView]               = useState<"day" | "week">("day");
 
    const utils = api.useUtils();
 
    const { data: events, isLoading: eventsLoading } = api.appointment.getCalendarEvents.useQuery({
        date: currentDate,
        view,
    });

    const { data: chairs, isLoading: chairsLoading } = api.chairs.list.useQuery();

    const isLoading = eventsLoading || chairsLoading;
 
    const updateStatus = api.appointment.update.useMutation({
        onSuccess: () => {
            void utils.appointment.getCalendarEvents.invalidate();
            void utils.appointment.getDashboardStats.invalidate();
        },
    });
 
 
    const handlePrev = () => {
        const d = new Date(currentDate);
        view === "day" ? d.setDate(d.getDate() - 1) : d.setDate(d.getDate() - 7);
        setCurrentDate(d);
    };
 
    const handleNext = () => {
        const d = new Date(currentDate);
        view === "day" ? d.setDate(d.getDate() + 1) : d.setDate(d.getDate() + 7);
        setCurrentDate(d);
    };
 
    const handleToday = () => setCurrentDate(new Date());
 
 
    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(getWeekStart(currentDate));
        d.setDate(d.getDate() + i);
        return d;
    });
 
    const headerLabel = view === "day"
        ? formatBosnianDate(currentDate)
        : `${formatBosnianDate(weekDates[0]!)} — ${formatBosnianDate(weekDates[6]!)}`;
 
    return (
        <div className="flex h-full flex-col p-3 sm:p-6 space-y-4 sm:space-y-6">
 
            {/* HEADER */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 flex-shrink-0" />
                        Calendar and Appointments
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Working hours: {orgProfile?.workingHoursStart || "08:00"} — {orgProfile?.workingHoursEnd || "18:00"}</p>
                </div>
 
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Day / Week toggle */}
                    <div className="flex rounded-xl border border-gray-200 overflow-hidden shrink-0">
                        <button
                            onClick={() => setView("day")}
                            className={`px-3 sm:px-4 py-2 text-sm font-medium transition ${
                                view === "day"
                                    ? "bg-orange-600 text-white"
                                    : "bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                            Day
                        </button>
                        <button
                            onClick={() => setView("week")}
                            className={`px-3 sm:px-4 py-2 text-sm font-medium transition ${
                                view === "week"
                                    ? "bg-orange-600 text-white"
                                    : "bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                            Week
                        </button>
                    </div>
 
                    {/* Date navigacija */}
                    <div className="flex items-center gap-1 sm:gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200 w-full sm:w-auto justify-between sm:justify-start">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md shrink-0" onClick={handlePrev}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-medium px-1 sm:px-2 min-w-[140px] sm:min-w-[160px] text-center text-slate-700 select-none truncate">
                            {headerLabel}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md shrink-0" onClick={handleNext}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                    
                    <Button
                        variant="outline"
                        onClick={handleToday}
                        className="rounded-xl text-sm"
                    >
                        Today
                    </Button>
 
                    <AppointmentFormSheet patientId="" />
                </div>
            </div>
 
            {/* Grid za kalendar */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-auto">
 
                {isLoading && (
                    <p className="text-center py-12 text-gray-400">Loading appointments...</p>
                )}
 
                {!isLoading && view === "day" && (
                        <div className="flex flex-1 min-w-0 overflow-x-auto gap-4 snap-x">
                            {/* Time labels column */}
                            <div className="hidden md:flex flex-col space-y-[48px] text-sm text-gray-400 font-medium pt-[44px] border-r border-gray-100 pr-4 shrink-0 sticky left-0 bg-white z-20">
                                {workingHours.map((t) => (
                                    <div key={t} className="h-4 flex items-start justify-end">{t}</div>
                                ))}
                            </div>

                            {/* Chair columns */}
                            {[{ id: null, name: "Unassigned" }, ...(chairs || [])].map((chair, index) => {
                                const chairEvents = events?.filter(e => 
                                    (e as any).chairId === chair.id
                                ) || [];

                                // If unassigned has no events, don't show it if there are other chairs
                                if (chair.id === null && chairEvents.length === 0 && (chairs?.length || 0) > 0) return null;

                                return (
                                    <div key={chair.id || 'unassigned'} className="flex-1 min-w-[280px] snap-center relative border-r border-gray-100 last:border-0 pr-4">
                                        <div className="sticky top-0 bg-white z-10 pb-4 pt-2 font-bold text-center border-b border-gray-100 mb-2 truncate">
                                            {chair.name}
                                        </div>
                                        
                                        <div className="relative min-h-[800px]">
                                            <div className="absolute inset-0 flex flex-col space-y-[52px] opacity-10 pointer-events-none">
                                                {workingHours.map((_, i) => (
                                                    <div key={i} className="border-t border-gray-400 w-full" />
                                                ))}
                                            </div>
                
                                            <div className="relative z-10 flex flex-col gap-3 mt-2">
                                                {chairEvents.length === 0 && (
                                                    <p className="text-center py-12 text-gray-400 text-sm">
                                                        No appointments
                                                    </p>
                                                )}
                                                {chairEvents.map((event) => (
                                                    <AppointmentCard
                                                        key={event.id}
                                                        event={event}
                                                        onStatusChange={(status) =>
                                                            updateStatus.mutate({ id: event.id, status })
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                )}
 
                {!isLoading && view === "week" && (
                    <div className="grid grid-cols-8 gap-2">
                        <div className="flex flex-col space-y-[52px] text-xs text-gray-400 font-medium pt-10 pr-2 border-r border-gray-100">
                            {workingHours.map((t) => (
                                <div key={t} className="h-4 text-right">{t}</div>
                            ))}
                        </div>
 
                        {weekDates.map((dayDate, i) => {
                            const isToday = dayDate.toDateString() === new Date().toDateString();
                            const dayEvents = events?.filter((e) =>
                                new Date(e.startTime).toDateString() === dayDate.toDateString()
                            ) ?? [];
 
                            return (
                                <div key={i} className="flex flex-col">
                                    <div className={`text-center text-xs font-bold pb-2 mb-2 border-b ${
                                        isToday ? "text-orange-600" : "text-gray-500"
                                    }`}>
                                        <div>{weekDays[i]}</div>
                                        <div className={`text-lg font-black ${isToday ? "text-orange-600" : "text-gray-800"}`}>
                                            {dayDate.getDate()}
                                        </div>
                                    </div>
                                    {/* Events */}
                                    <div className="flex flex-col gap-1">
                                        {dayEvents.map((event) => (
                                            <div
                                                key={event.id}
                                                className={`p-2 rounded-lg border text-xs ${STATUS_STYLES[event.status] ?? ""}`}
                                            >
                                                <div className="font-bold truncate">{event.patient.fullName}</div>
                                                <div className="opacity-75">{formatTime(new Date(event.startTime))}</div>
                                            </div>
                                        ))}
                                        {dayEvents.length === 0 && (
                                            <div className="text-center text-xs text-gray-300 pt-4">—</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
 
            {/* Legenda statusa */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 px-2">
                {Object.entries(STATUS_LABELS).map(([status, label]) => (
                    <div key={status} className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[status]}`}>
                            {label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
 
type AppointmentEvent = {
    id:        string;
    startTime: Date;
    endTime:   Date;
    status:    string;
    reason?:   string | null;
    patient:   { id: string; fullName: string; phone?: string | null };
};
 
function AppointmentCard({
    event,
    onStatusChange,
}: {
    event: AppointmentEvent;
    onStatusChange: (status: "SCHEDULED" | "WAITING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED") => void;
}) {
    return (
        <div className={`p-4 rounded-xl border transition hover:shadow-md ${STATUS_STYLES[event.status] ?? ""}`}>
            <div className="flex justify-between items-start gap-4">
                <div>
                    <h3 className="font-bold text-slate-800">{event.patient.fullName}</h3>
                    {event.reason && (
                        <p className="text-sm opacity-75 mt-0.5">{event.reason}</p>
                    )}
                    {event.patient.phone && (
                        <p className="text-xs opacity-60 mt-1">{event.patient.phone}</p>
                    )}
                </div>
                <div className="text-right shrink-0">
                    <span className="text-sm font-semibold bg-white/60 px-2 py-1 rounded-lg">
                        {formatTime(new Date(event.startTime))} — {formatTime(new Date(event.endTime))}
                    </span>
                    <div className="mt-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[event.status]}`}>
                            {STATUS_LABELS[event.status]}
                        </span>
                    </div>
                </div>
            </div>
 
            {event.status !== "COMPLETED" && event.status !== "CANCELLED" && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-current/10">
                    {event.status === "SCHEDULED" && (
                        <button
                            onClick={() => onStatusChange("WAITING")}
                            className="text-xs px-3 py-1 rounded-lg bg-white/60 hover:bg-white/90 font-medium transition"
                        >
                            → Waiting
                        </button>
                    )}
                    {event.status === "WAITING" && (
                        <button
                            onClick={() => onStatusChange("IN_PROGRESS")}
                            className="text-xs px-3 py-1 rounded-lg bg-white/60 hover:bg-white/90 font-medium transition"
                        >
                            → In progress
                        </button>
                    )}
                    {event.status === "IN_PROGRESS" && (
                        <button
                            onClick={() => onStatusChange("COMPLETED")}
                            className="text-xs px-3 py-1 rounded-lg bg-white/60 hover:bg-white/90 font-medium transition"
                        >
                            ✓ Complete
                        </button>
                    )}
                    <button
                        onClick={() => onStatusChange("CANCELLED")}
                        className="text-xs px-3 py-1 rounded-lg bg-white/60 hover:bg-red-100 text-red-600 font-medium transition"
                    >
                        × Cancel
                    </button>
                </div>
            )}
        </div>
    );
}