"use client";
import { useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { api } from "~/trpc/react";

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  PAID: "Paid",
  UNPAID: "Unpaid",
};

export default function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = api.invoice.list.useQuery({
    search: search || undefined,
    page,
    perPage: 20,
  });

  const invoices = data?.invoices || [];
  const pagination = data?.pagination;

  const deleteInvoice = api.invoice.delete.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      deleteInvoice.mutate({ id });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">
              Invoices and Billing
            </h1>

            <p className="mt-1 text-gray-500">
              Overview of all invoices and payments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/invoices/create"
              className="rounded-xl bg-blue-600 px-5 py-3 text-white transition hover:bg-blue-700"
            >
              + New invoice
            </Link>

            <Link
              href="/dashboard/price-list"
              className="rounded-xl bg-teal-600 px-5 py-3 text-white transition hover:bg-teal-700"
            >
              Price list
            </Link>
          </div>
        </div>
        {/* SEARCH */}
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices..."
            className="w-full rounded-xl border border-gray-200 p-3 outline-none transition focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          {isLoading ? (
            <div className="px-6 py-10 text-center text-gray-500">
              Loading...
            </div>
          ) : error ? (
            <div className="px-6 py-10 text-center text-red-500">
              Error loading invoices.
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-6 py-4">Invoice number</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {invoices.map((invoice: any) => (
                  <tr
                    key={invoice.id}
                    className="border-b transition hover:bg-gray-50 last:border-0"
                  >
                    <td className="px-6 py-4 font-medium">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {invoice.patient.fullName}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {new Date(invoice.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {invoice.totalAmount} KM
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-sm ${
                          invoice.status === "PAID"
                            ? "bg-green-100 text-green-700"
                            : invoice.status === "DRAFT"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {statusLabels[invoice.status] || invoice.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <Link
                          href={`/dashboard/invoices/${invoice.id}`}
                          className="text-blue-600 transition hover:text-blue-800"
                          title="View"
                        >
                          <Eye size={18} />
                        </Link>

                        <button
                          onClick={() => handleDelete(invoice.id)}
                          disabled={deleteInvoice.isPending}
                          className="text-red-500 transition hover:text-red-700 disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {invoices.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      No invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrev}
              className="rounded-xl border border-gray-300 px-4 py-2 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNext}
              className="rounded-xl border border-gray-300 px-4 py-2 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}