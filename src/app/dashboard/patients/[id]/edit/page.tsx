"use client";

import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import { PatientForm } from "~/app/_components/patient/patient-form";
import type { PatientFormData } from "~/lib/validators/patient";
import { api } from "~/trpc/react";

export default function EditPatientPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const [error, setError] = useState<string | null>(null);

    const { data, isLoading: isFetching } = api.patients.getById.useQuery(
        { id: params.id },
        { enabled: !!params.id }
    );

    const updatePatient = api.patients.update.useMutation({
        onSuccess: () => {
            router.push(`/dashboard/patients/${params.id}`);
            router.refresh();
        },
        onError: (err) => {
            setError(err.message);
        },
    });

    const handleSubmit = (formData: PatientFormData) => {
        setError(null);
        updatePatient.mutate({ id: params.id, ...formData });
    };

    function formatDateForForm(date: Date | string | undefined): string {
        if (!date) return "";
        const d = new Date(date);
        const day   = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year  = d.getFullYear();
        return `${day}.${month}.${year}`;
    }

    if (isFetching) {
        return (
            <div className="mx-auto max-w-2xl py-10">
                <p className="text-gray-500">Loading...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="mx-auto max-w-2xl py-10">
                <p className="text-red-500">Patient not found.</p>
            </div>
        );
    }

    const patientFormData: PatientFormData = {
        fullName:                data.fullName,
        email:                   data.email ?? "",
        phone:                   data.phone ?? "",
        jmb:                     data.jmb,
        sex:                     (data.sex as "M" | "F") ?? undefined,
        address:                 data.address ?? "",
        occupation:              data.occupation ?? "",
        employmentStatus:        data.employmentStatus ?? "",
        notes:                   data.notes ?? "",
        dateOfBirth:             formatDateForForm(data.dateOfBirth),

        allergiesFlag:           data.anamnesis?.allergiesFlag ?? false,
        allergiesDetails:        data.anamnesis?.allergiesDetails ?? "",
        anesthesiaHistoryFlag:   data.anamnesis?.anesthesiaHistoryFlag ?? false,
        anesthesiaComplications: data.anamnesis?.anesthesiaComplications ?? "",
        medicationsFlag:         data.anamnesis?.medicationsFlag ?? false,
        medicationsDetails:      data.anamnesis?.medicationsDetails ?? "",
        previousDiseases:        data.anamnesis?.previousDiseases ?? "",
        currentDisease:          data.anamnesis?.currentDisease ?? "",
    };

    return (
        <div className="mx-auto max-w-2xl py-10">
            <button
                onClick={() => window.history.back()}
                className="mb-6 rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-100"
            >
                ← Back
            </button>

            <h1 className="mb-8 text-3xl font-semibold">Edit patient</h1>

            {error && (
                <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-600">{error}</p>
                </div>
            )}

            <PatientForm
                patient={patientFormData}
                onSubmit={handleSubmit}
                isLoading={updatePatient.isPending}
            />
        </div>
    );
}
