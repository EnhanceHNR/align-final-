"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { History, CalendarX2, Activity } from "lucide-react";

function formatDateTime(date: Date | string): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}.${month}.${year} - ${hours}:${minutes}`;
}

export default function GlobalHistoryPage() {
    const [activeTab, setActiveTab] = useState<"appointments" | "treatments">("appointments");
    const { data, isLoading } = api.history.getGlobalHistory.useQuery();

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading history...</div>;
    }

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <History className="text-blue-600" />
                    Patient History
                </h1>
                <p className="text-slate-500 mt-2">Audit log of recent completed or cancelled appointments and recorded treatments.</p>
            </div>

            <div className="flex gap-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab("appointments")}
                    className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === "appointments" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <CalendarX2 size={16} /> Appointments Log
                </button>
                <button
                    onClick={() => setActiveTab("treatments")}
                    className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === "treatments" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <Activity size={16} /> Treatments Log
                </button>
            </div>

            {activeTab === "appointments" && (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
                    {data?.appointments.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No historical appointments found.</p>
                    ) : (
                        data?.appointments.map((visit) => (
                            <div key={visit.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-5 flex flex-col sm:flex-row justify-between gap-4">
                                <div>
                                    <Link href={`/dashboard/patients/${visit.patientId}`} className="font-bold text-blue-600 hover:underline text-lg">
                                        {visit.patient.fullName}
                                    </Link>
                                    <p className="text-sm font-medium text-gray-700 mt-1">
                                        {formatDateTime(visit.startTime)} to {formatDateTime(visit.endTime)}
                                    </p>
                                    {visit.reason && <p className="mt-1 text-sm text-gray-600">Booking Reason: {visit.reason}</p>}
                                    {visit.cancelReason && visit.status === "CANCELLED" && (
                                        <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                                            <strong>Cancelled:</strong> {visit.cancelReason}
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                        visit.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                                        visit.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                                        "bg-gray-100 text-gray-700"
                                    }`}>
                                        {visit.status}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === "treatments" && (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
                    {data?.treatments.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No historical treatments found.</p>
                    ) : (
                        data?.treatments.map((treatment) => (
                            <div key={treatment.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-5 flex flex-col sm:flex-row justify-between gap-4">
                                <div>
                                    <Link href={`/dashboard/patients/${treatment.patientId}`} className="font-bold text-blue-600 hover:underline text-lg">
                                        {treatment.patient.fullName}
                                    </Link>
                                    <p className="font-semibold text-gray-900 mt-2">{treatment.therapy}</p>
                                    {treatment.diagnosis && <p className="mt-1 text-sm text-gray-600">Diagnosis: {treatment.diagnosis}</p>}
                                    <p className="mt-2 text-xs font-medium text-gray-400 uppercase tracking-widest">Recorded {formatDateTime(treatment.createdAt)}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                        treatment.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                                        treatment.status === "INVOICED" ? "bg-blue-100 text-blue-700" :
                                        "bg-gray-100 text-gray-700"
                                    }`}>
                                        {treatment.status}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
