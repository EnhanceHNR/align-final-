"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import {
    patientSchema,
    type PatientFormData,
} from "~/lib/validators/patient";

type PatientFormProps = {
    patient?: PatientFormData;
    onSubmit: (data: PatientFormData) => void;
    isLoading?: boolean;
};

export function PatientForm({
                                patient,
                                onSubmit,
                                isLoading,
                            }: PatientFormProps) {
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
     } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    mode: "onChange",
        reValidateMode: "onChange",
    defaultValues: patient ?? {
            fullName: "",
            email: "",
            phone: "",

            jmb: "",
            occupation: "",
            employmentStatus: "",

            address: "",

            allergiesFlag: false,
            allergiesDetails: "",

            anesthesiaHistoryFlag: false,
            anesthesiaComplications: "",

            medicationsFlag: false,
            medicationsDetails: "",

            previousDiseases: "",
            currentDisease: "",

            dateOfBirth: "",
            notes:"",
        },
    });
    const [year, setYear] = useState(() => {
        if (typeof window !== "undefined") return localStorage.getItem("patient_id_year") || new Date().getFullYear().toString();
        return new Date().getFullYear().toString();
    });
    const [letter, setLetter] = useState(() => {
        if (typeof window !== "undefined") return localStorage.getItem("patient_id_letter") || "A";
        return "A";
    });
    const [num, setNum] = useState("");

    const isEditing = !!patient?.id;

    const { data: nextIdData } = api.patients.getNextPatientId.useQuery(
        { prefix: `${year}-${letter}` },
        { enabled: !isEditing }
    );

    useEffect(() => {
        if (isEditing && patient.jmb) {
            const parts = patient.jmb.split("-");
            if (parts.length === 3) {
                setYear(parts[0]);
                setLetter(parts[1]);
                setNum(parts[2]);
            } else {
                setNum(patient.jmb);
            }
        }
    }, [isEditing, patient]);

    useEffect(() => {
        if (!isEditing) {
            if (nextIdData?.nextNum) {
                setNum(nextIdData.nextNum);
            }
        }
    }, [nextIdData, isEditing]);

    useEffect(() => {
        if (!isEditing) {
            localStorage.setItem("patient_id_year", year);
            localStorage.setItem("patient_id_letter", letter);
        }
        if (year && letter && num) {
            setValue("jmb", `${year}-${letter}-${num}`, { shouldValidate: true });
        } else if (num) {
            setValue("jmb", num, { shouldValidate: true });
        }
    }, [year, letter, num, isEditing, setValue]);

    useEffect(() => {
        reset(
            patient ?? {
                fullName: "",
                email: "",
                phone: "",

                jmb: "",
                occupation: "",
                employmentStatus: "",

                address: "",

                allergiesFlag: false,
                allergiesDetails: "",

                anesthesiaHistoryFlag: false,
                anesthesiaComplications: "",

                medicationsFlag: false,
                medicationsDetails: "",

                previousDiseases: "",
                currentDisease: "",

                dateOfBirth: "",

                notes: "",
            }
        );
    }, [patient, reset]);

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
        >

            {/* FULL NAME */}
            <div>
                <label className="text-sm text-gray-600">
                    Full Name
                </label>

                <input
                    {...register("fullName")}
                    className={`mt-1 w-full rounded-xl border bg-white p-3 outline-none transition focus:ring-2 focus:ring-blue-400
        ${
                        errors.fullName
                            ? "border-red-400"
                            : "border-gray-200"
                    }`}
                />

                {errors.fullName && (
                    <p className="mt-1 text-sm text-red-500">
                        {errors.fullName.message}
                    </p>
                )}
            </div>

            {/* EMAIL */}
            <div>
                <label className="text-sm text-gray-600">
                    Email
                </label>

                <input
                    type="email"
                    {...register("email")}
                    className={`mt-1 w-full rounded-xl border bg-white p-3 outline-none transition focus:ring-2 focus:ring-blue-400
          ${
                        errors.email
                            ? "border-red-400"
                            : "border-gray-200"
                    }`}
                />

                {errors.email && (
                    <p className="mt-1 text-sm text-red-500">
                        {errors.email.message}
                    </p>
                )}
            </div>

            {/* PHONE */}
            <div>
                <label className="text-sm text-gray-600">
                    Phone
                </label>

                <input
                    {...register("phone")}
                    placeholder="+38761123456"
                    className={`mt-1 w-full rounded-xl border bg-white p-3 outline-none transition focus:ring-2 focus:ring-blue-400
          ${
                        errors.phone
                            ? "border-red-400"
                            : "border-gray-200"
                    }`}
                />

                {errors.phone && (
                    <p className="mt-1 text-sm text-red-500">
                        {errors.phone.message}
                    </p>
                )}
            </div>

            {/* PATIENT ID */}
            <div>
                <label className="text-sm text-gray-600">
                    Patient ID
                </label>

                <div className="mt-1 flex items-center gap-2">
                    <input
                        type="text"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        placeholder="Year"
                        className="w-1/3 rounded-xl border border-gray-200 bg-white p-3 outline-none transition focus:ring-2 focus:ring-blue-400"
                    />
                    <span className="text-gray-400 font-bold">-</span>
                    <input
                        type="text"
                        value={letter}
                        onChange={(e) => setLetter(e.target.value)}
                        placeholder="Ltr"
                        className="w-1/4 rounded-xl border border-gray-200 bg-white p-3 outline-none transition focus:ring-2 focus:ring-blue-400 text-center"
                        maxLength={2}
                    />
                    <span className="text-gray-400 font-bold">-</span>
                    <input
                        type="text"
                        value={num}
                        onChange={(e) => setNum(e.target.value)}
                        placeholder="0001"
                        className="w-1/3 rounded-xl border border-gray-200 bg-white p-3 outline-none transition focus:ring-2 focus:ring-blue-400 font-mono"
                    />
                </div>
                
                {/* Hidden input to register jmb with react-hook-form */}
                <input type="hidden" {...register("jmb")} />

                {errors.jmb && (
                    <p className="mt-1 text-sm text-red-500">
                        {errors.jmb.message}
                    </p>
                )}
            </div>

            {/* OCCUPATION */}
            <div>
                <label className="text-sm text-gray-600">
                    Occupation
                </label>

                <input
                    {...register("occupation")}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 outline-none transition focus:ring-2 focus:ring-blue-400"
                />
            </div>

            {/* EMPLOYMENT STATUS */}
            <div className="space-y-3">

                <label className="text-sm text-gray-600">
                    Employment Status
                </label>

                <div className="flex flex-wrap gap-6 rounded-2xl border border-gray-200 bg-white p-4">

                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="radio"
                            value="Employed"
                            {...register("employmentStatus")}
                        />
                        Employed
                    </label>

                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="radio"
                            value="Unemployed"
                            {...register("employmentStatus")}
                        />
                        Unemployed
                    </label>

                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="radio"
                            value="Student"
                            {...register("employmentStatus")}
                        />
                        Student
                    </label>

                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="radio"
                            value="Pensioner"
                            {...register("employmentStatus")}
                        />
                        Pensioner
                    </label>

                </div>

            </div>

            {/* ADDRESS */}
            <div>
                <label className="text-sm text-gray-600">
                    Address
                </label>

                <input
                    {...register("address")}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 outline-none transition focus:ring-2 focus:ring-blue-400"
                />
            </div>

            {/* DATE OF BIRTH */}
            <div>
                <label className="text-sm text-gray-600">
                    Date of birth
                </label>

                <div className="mt-1 flex gap-2">
                    <select
                        value={(() => {
                            const dob = watch("dateOfBirth") || "";
                            const parts = dob.split(/[.\-\/]/);
                            return parts.length >= 1 ? parts[0] : "";
                        })()}
                        onChange={(e) => {
                            const dob = watch("dateOfBirth") || "";
                            const parts = dob.split(/[.\-\/]/);
                            const m = parts[1] || "";
                            const y = parts[2] || "";
                            setValue("dateOfBirth", `${e.target.value}-${m}-${y}`, { shouldValidate: true });
                        }}
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 outline-none transition focus:ring-2 focus:ring-blue-400"
                    >
                        <option value="">Day</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                            <option key={d} value={String(d).padStart(2, "0")}>
                                {String(d).padStart(2, "0")}
                            </option>
                        ))}
                    </select>

                    <select
                        value={(() => {
                            const dob = watch("dateOfBirth") || "";
                            const parts = dob.split(/[.\-\/]/);
                            return parts.length >= 2 ? parts[1] : "";
                        })()}
                        onChange={(e) => {
                            const dob = watch("dateOfBirth") || "";
                            const parts = dob.split(/[.\-\/]/);
                            const d = parts[0] || "";
                            const y = parts[2] || "";
                            setValue("dateOfBirth", `${d}-${e.target.value}-${y}`, { shouldValidate: true });
                        }}
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 outline-none transition focus:ring-2 focus:ring-blue-400"
                    >
                        <option value="">Month</option>
                        {[
                            "January", "February", "March", "April", "May", "June",
                            "July", "August", "September", "October", "November", "December"
                        ].map((name, i) => (
                            <option key={i} value={String(i + 1).padStart(2, "0")}>
                                {name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={(() => {
                            const dob = watch("dateOfBirth") || "";
                            const parts = dob.split(/[.\-\/]/);
                            return parts.length >= 3 ? parts[2] : "";
                        })()}
                        onChange={(e) => {
                            const dob = watch("dateOfBirth") || "";
                            const parts = dob.split(/[.\-\/]/);
                            const d = parts[0] || "";
                            const m = parts[1] || "";
                            setValue("dateOfBirth", `${d}-${m}-${e.target.value}`, { shouldValidate: true });
                        }}
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 outline-none transition focus:ring-2 focus:ring-blue-400"
                    >
                        <option value="">Year</option>
                        {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(y => (
                            <option key={y} value={String(y)}>
                                {y}
                            </option>
                        ))}
                    </select>
                </div>
                <input type="hidden" {...register("dateOfBirth")} />
            </div>

            {/* ANAMNEZA */}
            <div className="space-y-6 rounded-3xl bg-white p-6 shadow-sm">

                <h2 className="text-xl font-semibold">
                    Medical History
                </h2>

                {/* ALLERGIES */}
                <div className="space-y-3">

                    <label className="text-sm font-medium text-gray-700">
                        Are you allergic?
                    </label>

                    <div className="flex items-center gap-6">

                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                checked={watch("allergiesFlag") === true}
                                onChange={() =>
                                    setValue("allergiesFlag", true, {
                                        shouldValidate: true,
                                    })
                                }
                            />
                            Yes
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                checked={watch("allergiesFlag") === false}
                                onChange={() =>
                                    setValue("allergiesFlag", false, {
                                        shouldValidate: true,
                                    })
                                }
                            />
                            No
                        </label>

                    </div>

                    {watch("allergiesFlag") && (
                        <>
                            <input
                                {...register("allergiesDetails")}
                                placeholder="What are you allergic to?"
                                className="w-full rounded-xl border border-gray-200 bg-white p-3 outline-none focus:ring-2 focus:ring-blue-400"
                            />

                            {errors.allergiesDetails && (
                                <p className="mt-1 text-sm text-red-500">
                                    {errors.allergiesDetails.message}
                                </p>
                            )}
                        </>
                    )}



                </div>

                {/* ANESTHESIA */}
                <div className="space-y-3">

                    <label className="text-sm font-medium text-gray-700">
                        Have you received anesthesia before?
                    </label>

                    <div className="flex items-center gap-6">

                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                checked={watch("anesthesiaHistoryFlag") === true}
                                onChange={() =>
                                    setValue(
                                        "anesthesiaHistoryFlag",
                                        true
                                    )
                                }
                            />
                            Yes
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                checked={watch("anesthesiaHistoryFlag") === false}
                                onChange={() =>
                                    setValue(
                                        "anesthesiaHistoryFlag",
                                        false
                                    )
                                }
                            />
                            No
                        </label>

                    </div>

                    {watch("anesthesiaHistoryFlag") && (
                        <input
                            {...register(
                                "anesthesiaComplications"
                            )}
                            placeholder="Were there any problems?"
                            className="w-full rounded-xl border border-gray-200 bg-white p-3 outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    )}

                </div>

                {/* MEDICATION */}
                <div className="space-y-3">

                    <label className="text-sm font-medium text-gray-700">
                        Are you taking any medications?
                    </label>

                    <div className="flex items-center gap-6">

                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                checked={watch("medicationsFlag") === true}
                                onChange={() =>
                                    setValue("medicationsFlag", true, {
                                        shouldValidate: true,
                                    })
                                }
                            />
                            Yes
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                checked={watch("medicationsFlag") === false}
                                onChange={() =>
                                    setValue("medicationsFlag", false, {
                                        shouldValidate: true,
                                    })
                                }
                            />
                            No
                        </label>

                    </div>

                    {watch("medicationsFlag") && (
                        <>
                            <input
                                {...register("medicationsDetails")}
                                placeholder="What medications are you taking?"
                                className="w-full rounded-xl border border-gray-200 bg-white p-3 outline-none focus:ring-2 focus:ring-blue-400"
                            />

                            {errors.medicationsDetails && (
                                <p className="mt-1 text-sm text-red-500">
                                    {errors.medicationsDetails.message}
                                </p>
                            )}
                        </>
                    )}

                </div>

                {/* PREVIOUS DISEASES */}
                <div>
                    <label className="text-sm text-gray-600">
                        Previous diseases
                    </label>

                    <textarea
                        {...register("previousDiseases")}
                        rows={3}
                        className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 outline-none transition focus:ring-2 focus:ring-blue-400"
                    />
                </div>

                {/* CURRENT DISEASE */}
                <div>
                    <label className="text-sm text-gray-600">
                        Current disease
                    </label>

                    <textarea
                        {...register("currentDisease")}
                        rows={3}
                        className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 outline-none transition focus:ring-2 focus:ring-blue-400"
                    />
                </div>

            </div>
            {/* NOTES */}
            <div>
                <label className="text-sm text-gray-600">
                    Internal notes
                </label>

                <textarea
                    {...register("notes")}
                    rows={4}
                    placeholder="Add internal notes..."
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white p-3 outline-none transition focus:ring-2 focus:ring-blue-400"
                />
            </div>
            {/* ERROR SUMMARY */}
            {Object.keys(errors).length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <h3 className="font-semibold text-red-800">Form has errors:</h3>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-red-600">
                        {Object.entries(errors).map(([key, error]) => (
                            <li key={key}>
                                <strong>{key}:</strong> {error?.message?.toString()}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* BUTTON */}
            <button
                type="submit"
                disabled={isLoading}
                className={`w-full rounded-xl px-4 py-3 font-medium text-white transition
        ${
                    isLoading
                        ? "cursor-not-allowed bg-blue-300"
                        : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
                {isLoading
                    ? "Saving..."
                    : patient
                        ? "Save changes"
                        : "Create patient"}
            </button>

        </form>
    );
}