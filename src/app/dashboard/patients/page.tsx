"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Eye, Pencil, Trash2, Upload } from "lucide-react";
import { ImportCsvDialog } from "@/components/shared/import-csv-dialog";

import { useDebounce } from "~/hooks/use-debounce";
import { api } from "~/trpc/react";

export default function PatientsPage() {
    const { data: session } = useSession();
    const isMaster = session?.user?.role === "MASTER";

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [confirmId, setConfirmId] = useState<string | null>(null);

    const debouncedSearch = useDebounce(search, 300);
    const isSearching = search !== debouncedSearch;

    const { data, isLoading, refetch } = api.patients.list.useQuery({
        search: debouncedSearch || undefined,
        page,
        perPage: 20,
        sortBy: "fullName",
        sortDir: "asc",
    });

    const deletePatient = api.patients.delete.useMutation({
        onSuccess: () => {
            setConfirmId(null);
            void refetch();
        },
    });

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPage(1);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-6xl space-y-6">

                {/* HEADER */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold">
                            Patient Database
                        </h1>

                        <p className="mt-1 text-gray-500">
                            Overview of all registered patients.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <ImportCsvDialog mode="patients" onSuccess={() => refetch()} trigger={
                            <button className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-50 shadow-sm">
                                <Upload className="h-4 w-4" /> Import CSV
                            </button>
                        } />
                        <Link
                            href="/dashboard/patients/create"
                            className="flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 shadow-sm"
                        >
                            + New patient
                        </Link>
                    </div>
                </div>

                {/* SEARCH */}
                <div className="rounded-3xl bg-white p-5 shadow-sm">
                    <input
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search by name, ID or phone..."
                        className="w-full rounded-xl border border-gray-200 p-3 outline-none transition focus:ring-2 focus:ring-blue-400"
                    />

                    {isSearching && (
                        <p className="mt-2 text-sm text-gray-400">
                            Searching...
                        </p>
                    )}
                </div>

                {/* DELETE MODAL */}
                {confirmId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                        <div className="rounded-2xl bg-white p-8 shadow-xl">
                            <p className="mb-6 text-lg font-medium">
                                Are you sure you want to delete this patient?
                            </p>

                            <div className="flex gap-4">
                                <button
                                    onClick={() =>
                                        deletePatient.mutate({ id: confirmId })
                                    }
                                    disabled={deletePatient.isPending}
                                    className="rounded-xl bg-red-600 px-6 py-2 text-white transition hover:bg-red-700 disabled:opacity-50"
                                >
                                    {deletePatient.isPending
                                        ? "Deleting..."
                                        : "Delete"}
                                </button>

                                <button
                                    onClick={() => setConfirmId(null)}
                                    className="rounded-xl border border-gray-200 px-6 py-2 text-gray-600 transition hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* TABLE */}
                <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
                    <table className="w-full">
                        <thead className="border-b bg-gray-50">
                        <tr className="text-left text-sm text-gray-500">
                            <th className="px-6 py-4">Patient</th>
                            <th className="px-6 py-4">Patient ID</th>
                            <th className="px-6 py-4">Phone</th>
                            <th className="px-6 py-4">Actions</th>
                        </tr>
                        </thead>

                        <tbody>
                        {isLoading && (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-6 py-10 text-center text-gray-400"
                                >
                                    Loading...
                                </td>
                            </tr>
                        )}

                        {!isLoading &&
                            data?.patients.map((patient) => (
                                <tr
                                    key={patient.id}
                                    className="border-b transition hover:bg-gray-50 last:border-0"
                                >
                                    <td className="px-6 py-4 font-medium">
                                        {patient.fullName}
                                    </td>

                                    <td className="px-6 py-4 text-gray-600">
                                        {patient.jmb}
                                    </td>

                                    <td className="px-6 py-4 text-gray-600">
                                        {patient.phone ?? "—"}
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">

                                            <Link
                                                href={`/dashboard/patients/${patient.id}`}
                                                className="text-blue-600 transition hover:text-blue-800"
                                                title="Profile"
                                            >
                                                <Eye size={18} />
                                            </Link>

                                            <Link
                                                href={`/dashboard/patients/${patient.id}/edit`}
                                                className="text-gray-600 transition hover:text-gray-800"
                                                title="Edit"
                                            >
                                                <Pencil size={18} />
                                            </Link>

                                            {isMaster && (
                                                <button
                                                    onClick={() =>
                                                        setConfirmId(patient.id)
                                                    }
                                                    className="text-red-500 transition hover:text-red-700"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}

                        {!isLoading &&
                            data?.patients.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-6 py-10 text-center text-gray-500"
                                    >
                                        No patients found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* PAGINATION */}
                    {data && data.pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between border-t px-6 py-4">
                            <p className="text-sm text-gray-500">
                                Total: {data.pagination.total} patients
                            </p>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage((p) => p - 1)}
                                    disabled={!data.pagination.hasPrev}
                                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm transition hover:bg-gray-50 disabled:opacity-40"
                                >
                                    ← Previous
                                </button>

                                <span className="flex items-center px-3 text-sm text-gray-600">
                                    {data.pagination.page} /{" "}
                                    {data.pagination.totalPages}
                                </span>

                                <button
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={!data.pagination.hasNext}
                                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm transition hover:bg-gray-50 disabled:opacity-40"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}