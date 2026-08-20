"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useState } from "react";


import { api } from "~/trpc/react";
import AppointmentFormSheet from "@/components/appointments/AppointmentFormSheet";

function formatDate(date: Date | string): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
}

function formatDateTime(date: Date | string): string {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${formatDate(d)} u ${hours}:${minutes}`;
}

const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
    SCHEDULED: "Scheduled",
    WAITING: "Waiting",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
};

const TREATMENT_STATUS_LABELS: Record<string, string> = {
    PLANNED: "Planned",
    COMPLETED: "Completed",
    INVOICED: "Invoiced",
};

export default function PatientProfilePage() {
    const params = useParams<{ id: string }>();
    const patientId = params.id;


    const [visitNote, setVisitNote] = useState("");
    const [activeTab, setActiveTab] = useState("overview");

    const createVisitNote = api.visitNotes.create.useMutation({
        onSuccess: async () => {
            setVisitNote("");
            await refetchVisitNotes();
        },
    });

const deleteVisitNote = api.visitNotes.delete.useMutation({
    onSuccess: async () => {
        await refetchVisitNotes();
    },
});



    const { data: patient, isLoading, isError } = api.patients.getById.useQuery(
        { id: patientId as string },
        { enabled: !!patientId }
    );

const { data: visitNotes, refetch: refetchVisitNotes } =
    api.visitNotes.getByPatientId.useQuery({
        patientId: patientId as string,
    });



    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="mx-auto max-w-5xl py-20 text-center text-gray-500">
                    Loading...
                </div>
            </div>
        );
    }

    if (isError || !patient) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="mx-auto max-w-5xl py-20 text-center text-red-500">
                    Patient not found.
                </div>
            </div>
        );
    }

    const anamnesis = patient.anamnesis;
    const now = new Date();

    const completedAppointments = patient.appointments.filter(
        (a) => a.status === "COMPLETED"
    );
    const lastVisit = completedAppointments[0];

    const nextAppointment = patient.appointments
        .filter(
            (a) =>
                new Date(a.startTime) > now && a.status !== "CANCELLED"
        )
        .sort(
            (a, b) =>
                new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )[0];

    const activeTreatments = patient.treatments.filter(
        (t) => t.status === "PLANNED"
    );
    const treatmentHistory = patient.treatments.filter(
        (t) => t.status !== "PLANNED"
    );

    const display = (value: string | null | undefined) => value?.trim() || "—";



    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-5xl space-y-6">

                {anamnesis?.allergiesFlag && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">⚠️</div>

                            <div>
                                <h2 className="font-semibold text-red-700">
                                    Allergy warning
                                </h2>

                                <p className="mt-1 text-red-600">
                                    {display(anamnesis?.allergiesDetails)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => window.history.back()}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-100"
                >
                    ← Back
                </button>


                {/* Tabs */}
                <div className="flex gap-4 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab("overview")}
                        className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === "overview" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === "history" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        History
                    </button>
                </div>

                {activeTab === "overview" && (
                    <>
                        <div className="rounded-3xl bg-white p-6 shadow-sm">
                            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-2xl font-semibold text-blue-600">
                                {patient.fullName
                                    .split(" ")
                                    .map((name) => name.charAt(0))
                                    .slice(0, 2)
                                    .join("")}
                            </div>
                            <div>
                                <h1 className="text-3xl font-semibold">
                                    {patient.fullName}
                                </h1>
                                <p className="mt-1 text-gray-500">
                                    Patient profile
                                </p>
                                <div className="mt-3 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                                    Active patient
                                </div>
                            </div>
                        </div>

                        {/* Aksiyon Butonları Alanı (Randevu, Odontogram ve Düzenle) */}
                        <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
                            
                            {/* YENİ EKLENEN RANDEVU BİLEŞENİ */}
                            <AppointmentFormSheet patientId={patientId as string} />

                            <Link
                                href={`/dashboard/patients/${patientId}/odontogram`}
                                className="rounded-xl bg-teal-600 px-4 py-2 text-white font-medium transition hover:bg-teal-700 flex items-center gap-2"
                            >
                                🦷 View Odontogram
                            </Link>

                          <Link
                            href={`/dashboard/invoices/create`}
                            className="rounded-xl bg-green-600 px-4 py-2 text-white font-medium transition hover:bg-green-700 flex items-center"
                          >
                            💳 New Invoice
                          </Link>

                            <Link
                                href={`/dashboard/patients/${patientId}/edit`}
                                className="rounded-xl bg-blue-600 px-4 py-2 text-white font-medium transition hover:bg-blue-700 flex items-center"
                            >
                                Edit patient
                            </Link>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-4">
                        <div className="rounded-2xl bg-gray-50 p-4">
                            <p className="text-sm text-gray-500">Total visits</p>
                            <p className="mt-1 text-2xl font-semibold">
                                {completedAppointments.length}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-4">
                            <p className="text-sm text-gray-500">Last visit</p>
                            <p className="mt-1 text-2xl font-semibold">
                                {lastVisit ? formatDate(lastVisit.startTime) : "—"}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-4">
                            <p className="text-sm text-gray-500">Active treatments</p>
                            <p className="mt-1 text-2xl font-semibold">
                                {activeTreatments.length}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-4">
                            <p className="text-sm text-gray-500">Next appointment</p>
                            <p className="mt-1 text-lg font-semibold">
                                {nextAppointment ? formatDateTime(nextAppointment.startTime) : "—"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-semibold">Personal info</h2>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium">{display(patient.email)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Phone</p>
                            <p className="font-medium">{display(patient.phone)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Address</p>
                            <p className="font-medium">{display(patient.address)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Patient ID</p>
                            <p className="font-medium">{patient.jmb}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Occupation</p>
                            <p className="font-medium">{display(patient.occupation)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Employment status</p>
                            <p className="font-medium">
                                {patient.employmentStatus === "Zaposlen" || patient.employmentStatus === "Employed"
                                    ? "Employed"
                                    : patient.employmentStatus === "Nezaposlen" || patient.employmentStatus === "Unemployed"
                                        ? "Unemployed"
                                        : display(patient.employmentStatus)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Date of birth</p>
                            <p className="font-medium">{formatDate(patient.dateOfBirth)}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-sm">
                    <h2 className="mb-5 text-xl font-semibold">Active treatments</h2>
                    {activeTreatments.length === 0 ? (
                        <p className="text-gray-500">No active treatments.</p>
                    ) : (
                        <div className="space-y-4">
                            {activeTreatments.map((treatment) => (
                                <div key={treatment.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                                    <p className="font-medium">{treatment.therapy}</p>
                                    {treatment.diagnosis && (
                                        <p className="mt-1 text-sm text-gray-500">{treatment.diagnosis}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-sm">
                    <h2 className="mb-5 text-xl font-semibold">Last visits</h2>
                    {patient.appointments.length === 0 ? (
                        <p className="text-gray-500">No recorded visits.</p>
                    ) : (
                        <div className="space-y-4">
                            {patient.appointments.map((visit) => (
                                <div key={visit.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">Appointment</p>
                                            <p className="mt-1 text-sm text-gray-500">
                                                {formatDateTime(visit.startTime)}
                                            </p>
                                        </div>
                                        <div
                                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                                                visit.status === "COMPLETED"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-yellow-100 text-yellow-700"
                                            }`}
                                        >
                                            {APPOINTMENT_STATUS_LABELS[visit.status] ?? visit.status}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Treatment history</h2>
                        <span className="text-sm text-gray-400">Previous treatments</span>
                    </div>
                    {treatmentHistory.length === 0 ? (
                        <p className="text-gray-500">No treatment history.</p>
                    ) : (
                        <div className="space-y-4">
                            {treatmentHistory.map((treatment) => (
                                <div key={treatment.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <p className="font-medium">{treatment.therapy}</p>
                                            <p className="mt-1 text-sm text-gray-500">
                                                {formatDate(treatment.treatmentDate)}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                                                {TREATMENT_STATUS_LABELS[treatment.status] ?? treatment.status}
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                {treatment.toothNumber ? `Tooth ${treatment.toothNumber}` : "—"}
                                            </p>
                                            <p className="text-sm text-gray-500">{treatment.code}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-semibold">Medical History</h2>
                    <div className="grid gap-5 md:grid-cols-2">
                        <div className="rounded-2xl bg-gray-50 p-4">
                            <p className="text-sm text-gray-500">Allergies</p>
                            <p className="mt-1 font-medium">
                                {anamnesis?.allergiesFlag ? display(anamnesis.allergiesDetails) : "No allergies"}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-4">
                            <p className="text-sm text-gray-500">Anesthesia</p>
                            <p className="mt-1 font-medium">
                                {anamnesis?.anesthesiaHistoryFlag ? display(anamnesis.anesthesiaComplications) : "No complications"}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-4">
                            <p className="text-sm text-gray-500">Medications</p>
                            <p className="mt-1 font-medium">
                                {anamnesis?.medicationsFlag ? display(anamnesis.medicationsDetails) : "No medications"}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-4">
                            <p className="text-sm text-gray-500">Previous diseases</p>
                            <p className="mt-1 font-medium">
                                {display(anamnesis?.previousDiseases) === "—" ? "No recorded diseases" : display(anamnesis?.previousDiseases)}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-4 md:col-span-2">
                            <p className="text-sm text-gray-500">Current disease</p>
                            <p className="mt-1 font-medium">
                                {display(anamnesis?.currentDisease) === "—" ? "No current diseases" : display(anamnesis?.currentDisease)}
                            </p>
                        </div>
                    </div>
                </div>


                <div className="rounded-3xl bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-semibold">
                        Visit notes
                    </h2>

                    <textarea
                        value={visitNote}
                        onChange={(e) => setVisitNote(e.target.value)}
                        placeholder="Add note..."
                        className="w-full rounded-xl border border-gray-200 p-3 outline-none transition focus:ring-2 focus:ring-blue-400"
                        rows={4}
                    />

                    <button
                        onClick={() => {
                            if (!visitNote.trim()) return;

                            createVisitNote.mutate({
                                patientId: patientId as string,
                                content: visitNote,
                            });
                        }}
                        className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
                    >
                        Save note
                    </button>


                    <div className="mt-6 space-y-3">
                        {visitNotes?.map((note) => (
                            <div
                                key={note.id}
                                className="rounded-2xl bg-gray-50 p-4"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">
                                            {formatDate(note.createdAt)}
                                        </p>

                                        <p className="mt-2">
                                            {note.content}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() =>
                                            deleteVisitNote.mutate({
                                                id: note.id,
                                            })
                                        }
                                        className="text-sm text-red-500 transition hover:text-red-700"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>


                </div>



                <div className="rounded-3xl bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-semibold">Internal notes</h2>
                    <p className="text-gray-700">
                        {display(patient.notes) === "—" ? "No internal notes." : patient.notes}
                    </p>
                </div>
                </>
                )}
            </div>
        </div>
    );
}