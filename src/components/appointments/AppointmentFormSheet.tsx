"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { api } from "~/trpc/react";

type AppointmentFormProps = {
    patientId?: string; // CHANGED: optional now
    initialData?: {
        id: string;
        startTime: Date;
        endTime?: Date;
        reason?: string | null;
        patientId?: string;
        chairId?: string | null;
    };
    onSuccess?: () => void;
};

export default function AppointmentFormSheet({
                                                 patientId,
                                                 initialData,
                                                 onSuccess,
                                             }: AppointmentFormProps) {
    const [isOpen, setIsOpen] = useState(false);

    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [reason, setReason] = useState("");

    const [selectedPatientId, setSelectedPatientId] = useState(
        patientId ?? ""
    );

    const [selectedChairId, setSelectedChairId] = useState(
        initialData?.chairId ?? "unassigned"
    );

    const [availabilityError, setAvailabilityError] = useState<string | null>(null);

    const utils = api.useUtils();

    const isUpdateMode = !!initialData;
    const showPatientSelect = !patientId && !initialData?.patientId;

    // Patients list for dropdown
    const { data: patientsData } = api.patients.list.useQuery({
        page: 1,
        perPage: 100,
    });

    const { data: chairs } = api.chairs.list.useQuery();

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                const d = new Date(initialData.startTime);
                setDate(d.toISOString().split("T")[0]);
                setTime(d.toTimeString().slice(0, 5));

                if (initialData.endTime) {
                    setEndTime(new Date(initialData.endTime).toTimeString().slice(0, 5));
                }

                setReason(initialData.reason ?? "");
                setSelectedPatientId(initialData.patientId ?? "");
                setSelectedChairId(initialData.chairId ?? "unassigned");
            } else {
                setDate("");
                setTime("");
                setEndTime("");
                setReason("");
                setSelectedChairId("unassigned");
                setAvailabilityError(null);
            }
        }
    }, [isOpen, initialData]);

    const checkAvailability = api.appointment.checkAvailability.useMutation();

    const createAppointment = api.appointment.create.useMutation({
        onSuccess: async () => {
            setIsOpen(false);
            await utils.appointment.getCalendarEvents.invalidate();
            await utils.appointment.getDashboardStats.invalidate();
            onSuccess?.();
        },
        onError: (error) => setAvailabilityError(error.message),
    });

    const updateAppointment = api.appointment.update.useMutation({
        onSuccess: async () => {
            setIsOpen(false);
            await utils.appointment.getCalendarEvents.invalidate();
            await utils.appointment.getDashboardStats.invalidate();
            onSuccess?.();
        },
        onError: (error) => setAvailabilityError(error.message),
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAvailabilityError(null);

        if (!date || !time) {
            setAvailabilityError("Please select date and time.");
            return;
        }

        if (!selectedPatientId && !isUpdateMode) {
            setAvailabilityError("Please select a patient.");
            return;
        }

        const startDateTime = new Date(`${date}T${time}`);
        const endDateTime = endTime
            ? new Date(`${date}T${endTime}`)
            : new Date(startDateTime.getTime() + 30 * 60 * 1000);

        const availability = await checkAvailability.mutateAsync({
            startTime: startDateTime,
            endTime: endDateTime,
            excludeId: initialData?.id,
            chairId: selectedChairId === "unassigned" ? null : selectedChairId,
        });

        if (!availability.available) {
            setAvailabilityError("The time slot is booked for this chair.");
            return;
        }

        if (isUpdateMode && initialData) {
            updateAppointment.mutate({
                id: initialData.id,
                startTime: startDateTime,
                endTime: endDateTime,
                chairId: selectedChairId === "unassigned" ? null : selectedChairId,
                reason,
            });
        } else {
            createAppointment.mutate({
                patientId: selectedPatientId,
                chairId: selectedChairId === "unassigned" ? null : selectedChairId,
                startTime: startDateTime,
                endTime: endDateTime,
                reason,
            });
        }
    };

    const isPending =
        createAppointment.isPending ||
        updateAppointment.isPending ||
        checkAvailability.isPending;

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button className="bg-orange-600 text-white rounded-xl">
                    📅 {isUpdateMode ? "Edit appointment" : "Add appointment"}
                </Button>
            </SheetTrigger>

            <SheetContent className="w-[650px]">
                <SheetHeader>
                    <SheetTitle>
                        {isUpdateMode ? "Update appointment" : "New appointment"}
                    </SheetTitle>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">

                    {/* PATIENT SELECT */}
                    {showPatientSelect && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Patient
                            </label>

                            <Select
                                value={selectedPatientId}
                                onValueChange={setSelectedPatientId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a patient" />
                                </SelectTrigger>

                                <SelectContent>
                                    {patientsData?.patients.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.fullName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* CHAIR SELECT */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Chair / Doctor</label>
                        <Select
                            value={selectedChairId}
                            onValueChange={setSelectedChairId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a chair" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {chairs?.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* DATE + TIME (FIXED ALIGNMENT) */}
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium">Date</label>
                            <Input type="date" value={date}
                                   onChange={(e) => setDate(e.target.value)} />
                        </div>

                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium">Start</label>
                            <Input type="time" value={time}
                                   onChange={(e) => setTime(e.target.value)} />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium">
                                End (optional)
                            </label>
                            <Input type="time" value={endTime}
                                   onChange={(e) => setEndTime(e.target.value)} />
                        </div>

                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium">
                                Reason
                            </label>
                            <Input value={reason}
                                   onChange={(e) => setReason(e.target.value)} />
                        </div>
                    </div>

                    {availabilityError && (
                        <p className="text-red-500 text-sm">
                            {availabilityError}
                        </p>
                    )}

                    <Button
                        disabled={isPending}
                        className="bg-orange-600 text-white"
                    >
                        {isPending ? "Processing..." : "Save"}
                    </Button>
                </form>
            </SheetContent>
        </Sheet>
    );
}