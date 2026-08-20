"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { api } from "~/trpc/react";
import ToothChart from "./ToothChart";

type AppointmentFormProps = {
    patientId?: string; // CHANGED: optional now
    initialData?: {
        id: string;
        startTime: Date;
        endTime?: Date;
        reason?: string | null;
        doctorId?: string | null;
        procedureId?: string | null;
        teeth?: string | null;
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
    const [doctorId, setDoctorId] = useState("");
    const [procedureId, setProcedureId] = useState("");
    const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);


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
    const { data: doctors } = api.doctors.list.useQuery();
    const { data: procedures } = api.procedures.list.useQuery();


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
                setDoctorId("");
                setProcedureId("");
                setSelectedTeeth([]);
            setDoctorId("");
            setProcedureId("");
            setSelectedTeeth([]);
                setSelectedChairId("unassigned");
                setAvailabilityError(null);
            }
        }
    }, [isOpen, initialData]);

    const checkAvailability = api.appointment.checkAvailability.useMutation();

    const parseError = (errMessage: string) => {
        if (errMessage.includes("already booked")) {
            return "This time slot is already booked for the selected chair. Please choose another time.";
        }
        if (errMessage.includes("overlaps with another")) {
            return "This appointment overlaps with another appointment on this chair.";
        }
        if (errMessage.includes("after start time")) {
            return "End time must be after start time.";
        }
        return errMessage.split('__TURBOPACK')[0] || "An error occurred while saving the appointment.";
    };

    const createAppointment = api.appointment.create.useMutation({
        onSuccess: async () => {
            setIsOpen(false);
            await utils.appointment.getCalendarEvents.invalidate();
            await utils.appointment.getDashboardStats.invalidate();
            onSuccess?.();
            setPatientId("");
            setChairId("");
            setDate(undefined);
            setTime("");
            setReason("");
                setDoctorId("");
                setProcedureId("");
                setSelectedTeeth([]);
            setDoctorId("");
            setProcedureId("");
            setSelectedTeeth([]);
        },
        onError: (error) => setAvailabilityError(parseError(error.message)),
    });



    
    const updateAppointment = api.appointment.update.useMutation({
        onSuccess: async () => {
            setIsOpen(false);
            await utils.appointment.getCalendarEvents.invalidate();
            await utils.appointment.getDashboardStats.invalidate();
            onSuccess?.();
        },
        onError: (error) => setAvailabilityError(parseError(error.message)),
    });

    const handleToggleTooth = (toothId: string) => {
        setSelectedTeeth(prev => 
            prev.includes(toothId) 
                ? prev.filter(id => id !== toothId)
                : [...prev, toothId]
        );
    };

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
                    doctorId: doctorId || null,
                    procedureId: procedureId || null,
                    teeth: selectedTeeth.length > 0 ? JSON.stringify(selectedTeeth) : null,
                });
        } else {
            createAppointment.mutate({
                patientId: selectedPatientId,
                chairId: selectedChairId === "unassigned" ? null : selectedChairId,
                startTime: startDateTime,
                endTime: endDateTime,
                reason,
                    doctorId: doctorId || null,
                    procedureId: procedureId || null,
                    teeth: selectedTeeth.length > 0 ? JSON.stringify(selectedTeeth) : null,
                });
        }
    };

    const isPending =
        createAppointment.isPending ||
        updateAppointment.isPending ||
        checkAvailability.isPending;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-orange-600 text-white rounded-xl">
                    📅 {isUpdateMode ? "Edit appointment" : "Add appointment"}
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isUpdateMode ? "Update appointment" : "New appointment"}
                    </DialogTitle>
                </DialogHeader>

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
                        <label className="text-sm font-medium">Chair</label>
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

                    {/* DOCTOR SELECT */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Doctor</label>
                        <Select
                            value={doctorId || "none"}
                            onValueChange={(v) => setDoctorId(v === "none" ? "" : v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Unassigned</SelectItem>
                                {doctors?.map((doc) => (
                                    <SelectItem key={doc.id} value={doc.id}>
                                        {doc.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* PROCEDURE SELECT */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Procedure</label>
                        <Select
                            value={procedureId || "none"}
                            onValueChange={(v) => setProcedureId(v === "none" ? "" : v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="None selected" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {procedures?.map((proc) => (
                                    <SelectItem key={proc.id} value={proc.id}>
                                        {proc.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* TOOTH CHART */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Selected Teeth</label>
                        <ToothChart selectedTeeth={selectedTeeth} onToggleTooth={handleToggleTooth} />
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
            </DialogContent>
        </Dialog>
    );
}