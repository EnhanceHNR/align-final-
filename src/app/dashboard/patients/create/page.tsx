"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PatientForm } from "~/app/_components/patient/patient-form";
import type { PatientFormData } from "~/lib/validators/patient";
import { api } from "~/trpc/react";

export default function CreatePatientPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    const createPatient = api.patients.create.useMutation({
        onSuccess: () => {
            router.push("/dashboard/patients");
            router.refresh();
        },
        onError: (err) => {
            setError(err.message);
        },
    });

    const handleSubmit = (data: PatientFormData) => {
        setError(null);
        createPatient.mutate(data);
    };

    return (
        <div className="mx-auto max-w-2xl py-10">
            <button
                onClick={() => window.history.back()}
                className="mb-6 rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-100"
            >
                ← Back
            </button>

            <h1 className="mb-8 text-3xl font-semibold">Create patient</h1>

            {error && (
                <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-600">{error}</p>
                </div>
            )}

            <PatientForm
                onSubmit={handleSubmit}
                isLoading={createPatient.isPending}
            />
        </div>
    );
}